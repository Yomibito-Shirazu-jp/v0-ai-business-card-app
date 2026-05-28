import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// 業種一括推定エンドポイント
// 1 リクエストで N 社 (デフォルト 30 社) ずつ処理する。完了するまで UI が繰り返し叩く。
const BATCH_SIZE = 30
const MAX_BATCH = 100

// 控えめな共通分類 (Gemini にも提示)
const INDUSTRIES = [
  '製造業 (一般)', '製造業 (自動車)', '製造業 (電機)', '製造業 (食品)', '製造業 (医薬・化学)',
  '建設・不動産', '小売・卸売', '物流・運輸', 'IT・ソフトウェア', '通信・キャリア',
  '広告・マーケティング', '出版・印刷・メディア', '映像・コンテンツ', '金融 (銀行)', '金融 (証券・保険)',
  'コンサルティング・専門サービス', '人材・教育', '医療・介護', '宿泊・観光・飲食', '電力・ガス・水道',
  'エネルギー・資源', '官公庁・自治体', '非営利・社団・財団', '研究・開発機関', '不動産・住宅',
  '商社', '個人事業主・士業', 'その他',
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: '認証が必要です' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees').select('id, company_id, role, status')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!emp || !['owner', 'admin'].includes(emp.role)) {
    return NextResponse.json({ ok: false, error: '管理者権限が必要です' }, { status: 403 })
  }

  const { data: secrets } = await supabase
    .from('company_secrets').select('gemini_api_key').eq('company_id', emp.company_id).single()
  if (!secrets?.gemini_api_key) {
    return NextResponse.json({ ok: false, error: 'Gemini API キーが未設定です', code: 'NO_GEMINI' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = Math.min(MAX_BATCH, Math.max(1, Number(body?.limit) || BATCH_SIZE))

  // 未分類の company_name を business_cards から集める
  // (company_profiles に industry が NULL / 未登録の会社のみ対象)
  const { data: cards } = await supabase
    .from('business_cards')
    .select('company_name')
    .not('company_name', 'is', null)

  const allNames = new Set<string>()
  for (const c of cards || []) {
    if (c.company_name) allNames.add(c.company_name.trim())
  }

  // 既に industry がある会社を除外
  const { data: existing } = await supabase
    .from('company_profiles')
    .select('company_name, industry')
    .not('industry', 'is', null)
  const known = new Set((existing || []).map(e => e.company_name))

  const targets = Array.from(allNames).filter(n => !known.has(n)).slice(0, limit)

  if (targets.length === 0) {
    const totalRemaining = Array.from(allNames).filter(n => !known.has(n)).length
    return NextResponse.json({ ok: true, processed: 0, remaining: totalRemaining, done: true })
  }

  // Gemini に N 社まとめて投げて 1 度で分類させる
  const prompt = `あなたは日本のビジネスデータを扱うアシスタントです。
以下の会社名のリストに対し、それぞれの業種を次の選択肢から 1 つだけ選んでください。
選択肢: ${INDUSTRIES.join(' / ')}
- 不明な場合は「その他」を選ぶ。
- 法人格 (株式会社, 一般社団法人 等) を除いた会社名の本体から判断する。
- 結果は配列で、入力と同じ順序で返す。

入力:
${targets.map((n, i) => `${i + 1}. ${n}`).join('\n')}`

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` +
    `?key=${encodeURIComponent(secrets.gemini_api_key)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  industry: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error('[classify] gemini error:', res.status, txt)
    return NextResponse.json({ ok: false, error: `Gemini エラー ${res.status}` }, { status: 502 })
  }

  const data = (await res.json()) as any
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  let parsed: { results?: { name: string; industry: string }[] } = {}
  try { parsed = JSON.parse(text) } catch { /* ignore */ }
  const results = parsed.results || []

  // upsert company_profiles
  let updated = 0
  for (const r of results) {
    if (!r?.name || !r?.industry) continue
    const industry = INDUSTRIES.includes(r.industry) ? r.industry : 'その他'

    // 既存の company_profiles 行を探す
    const { data: row } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('company_name', r.name)
      .maybeSingle()
    if (row?.id) {
      const { error } = await supabase
        .from('company_profiles')
        .update({ industry, enriched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (!error) updated++
    } else {
      const { error } = await supabase
        .from('company_profiles')
        .insert({
          company_id: emp.company_id,
          company_name: r.name,
          industry,
          source: 'gemini',
          enriched_at: new Date().toISOString(),
        })
      if (!error) updated++
    }
  }

  // 残件数を再計算
  const { data: existing2 } = await supabase
    .from('company_profiles')
    .select('company_name')
    .not('industry', 'is', null)
  const known2 = new Set((existing2 || []).map(e => e.company_name))
  const remaining = Array.from(allNames).filter(n => !known2.has(n)).length

  return NextResponse.json({
    ok: true,
    processed: targets.length,
    updated,
    remaining,
    done: remaining === 0,
  })
}
