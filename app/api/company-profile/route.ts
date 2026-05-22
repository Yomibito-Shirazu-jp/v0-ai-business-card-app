import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 60

const CACHE_MS = 7 * 24 * 60 * 60 * 1000 // 7 日

type EnrichedProfile = {
  industry: string | null
  description: string | null
  hq_address: string | null
  website: string | null
  employee_size: string | null
  is_listed: boolean | null
  established: string | null
}

function emptyProfile(): EnrichedProfile {
  return {
    industry: null,
    description: null,
    hq_address: null,
    website: null,
    employee_size: null,
    is_listed: null,
    established: null,
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const companyName = url.searchParams.get('company')?.trim()
  if (!companyName) {
    return NextResponse.json({ error: 'company required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) {
    return NextResponse.json({ error: 'employee not found' }, { status: 401 })
  }

  // キャッシュ確認
  const { data: cached } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('company_id', emp.company_id)
    .ilike('company_name', companyName)
    .maybeSingle()

  if (
    cached?.enriched_at &&
    Date.now() - new Date(cached.enriched_at).getTime() < CACHE_MS
  ) {
    return NextResponse.json({ profile: cached, cached: true })
  }

  // AI Gateway 未設定 or 失敗時は null プロファイルを返してUI側で非表示
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ profile: cached ?? null, cached: !!cached, ai_unavailable: true })
  }

  let profile: EnrichedProfile = emptyProfile()
  try {
    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4-5',
      prompt: `次の日本企業について、公開情報を JSON のみで返してください。
会社名: ${companyName}

返す JSON 形式（情報がない項目は null）:
{
  "industry": "業種（IT/製造/印刷/金融/メディア/サービス 等）",
  "description": "事業内容を 100 文字程度で",
  "hq_address": "本社所在地",
  "website": "公式サイト URL",
  "employee_size": "大手/中堅/中小/SOHO のいずれか",
  "is_listed": true または false,
  "established": "設立年（西暦）"
}

JSON のみを返してください。説明文は一切不要です。`,
    })

    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      profile = { ...emptyProfile(), ...parsed }
    }
  } catch (err) {
    console.log('[v0] company-profile AI fetch failed:', (err as Error).message)
    return NextResponse.json({ profile: cached ?? null, cached: !!cached, ai_unavailable: true })
  }

  const { data: upserted } = await supabase
    .from('company_profiles')
    .upsert(
      {
        company_id: emp.company_id,
        company_name: companyName,
        ...profile,
        enriched_at: new Date().toISOString(),
        source: 'ai',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,company_name' },
    )
    .select('*')
    .single()

  return NextResponse.json({ profile: upserted ?? profile, cached: false })
}
