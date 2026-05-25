import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGeminiGenerateContent } from '@/lib/gemini-fetch'

export const runtime = 'nodejs'
export const maxDuration = 60

// Gemini Chat エンドポイント
// company_secrets.gemini_api_key を使い、生 Gemini API (generativelanguage.googleapis.com) を直接叩く。
// 文脈として: 自社情報、自分の名刺数, 上位企業 / タグ / 最近の名刺 を system instruction に詰める。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id, company_id, role, display_name, email, department, position')
    .eq('auth_user_id', user.id).eq('status', 'active').single()
  if (!employee) {
    return NextResponse.json({ error: '社員登録がありません' }, { status: 403 })
  }

  const { data: secrets } = await supabase
    .from('company_secrets')
    .select('gemini_api_key')
    .eq('company_id', employee.company_id)
    .single()
  if (!secrets?.gemini_api_key) {
    return NextResponse.json({
      error: 'Gemini API キーが未設定です。設定 → Google Document AI から登録してください。',
      code: 'GEMINI_NOT_CONFIGURED',
    }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const messages: { role: 'user' | 'assistant'; text: string }[] = Array.isArray(body?.messages) ? body.messages : []
  if (messages.length === 0) {
    return NextResponse.json({ error: 'メッセージがありません' }, { status: 400 })
  }

  // 文脈データ収集
  const [{ count: totalCards }, { count: totalEmployees }, { data: company }] = await Promise.all([
    supabase.from('business_cards').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('companies').select('name, domain').eq('id', employee.company_id).single(),
  ])

  // 最近の名刺 5 件 + 上位企業 5 件
  const { data: recentCards } = await supabase
    .from('business_cards')
    .select('full_name, company_name, position, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const systemInstruction = `あなたは「名刺Plus」というアプリで動く、社内向けの営業/秘書アシスタントです。日本語で丁寧にやり取りしてください。
回答は簡潔に。マークダウンの見出しや絵文字は使わず、必要なら箇条書き程度に留める。
以下が現在の社内状況です:

会社: ${company?.name ?? '不明'} (${company?.domain ?? ''})
ユーザー: ${employee.display_name ?? employee.email} (${employee.role}, ${employee.department ?? ''} ${employee.position ?? ''})
名刺総数: ${totalCards ?? 0}
アクティブ社員: ${totalEmployees ?? 0}

最近登録された名刺 (上位 5):
${(recentCards || []).map((c, i) => `${i + 1}. ${c.full_name || '不明'} / ${c.company_name || '—'} / ${c.position || '—'}`).join('\n')}

ユーザーの質問が:
- 「今日のスケジュールは？」のような Google Calendar に関するものなら、Gmail/Calendar 連携が未完了な可能性を案内する。
- 「○○さんの名刺を出して」のような検索ものなら、現状この AI は DB を直接読めないため「名刺一覧画面で検索してください」と案内する。
- 営業のアドバイスや文章作成は、提供された文脈をもとに具体的に提案する。`

  // Gemini contents 構造に変換
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))

  let data: any
  try {
    data = await callGeminiGenerateContent({
      apiKey: secrets.gemini_api_key,
      body: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      },
    })
  } catch (e: any) {
    const code = e?.code === 'RATE_LIMITED' ? 429 : 502
    return NextResponse.json({ error: e?.message || 'AI 応答失敗', code: e?.code }, { status: code })
  }
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ reply })
}
