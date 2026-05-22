import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 }) }
  }
  const { data: employee } = await supabase
    .from('employees')
    .select('id, company_id, role, status')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single()
  if (!employee || (employee.role !== 'owner' && employee.role !== 'admin')) {
    return { error: NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 }) }
  }
  return { supabase, employee }
}

function extractClientEmail(jsonStr: string | null | undefined): string | null {
  if (!jsonStr) return null
  try {
    const o = JSON.parse(jsonStr)
    return typeof o.client_email === 'string' ? o.client_email : null
  } catch {
    return null
  }
}

export async function GET() {
  const guard = await requireAdmin()
  if ('error' in guard) return guard.error
  const { supabase, employee } = guard

  const { data: row } = await supabase
    .from('company_secrets')
    .select('gcp_project_id, gcp_location, gcp_processor_id, gcp_service_account_json, gemini_api_key, updated_at')
    .eq('company_id', employee.company_id)
    .single()

  if (!row) {
    return NextResponse.json({
      gcp_project_id: null,
      gcp_location: 'us',
      gcp_processor_id: null,
      has_service_account: false,
      service_account_email: null,
      has_gemini_api_key: false,
      updated_at: null,
    })
  }

  return NextResponse.json({
    gcp_project_id: row.gcp_project_id,
    gcp_location: row.gcp_location || 'us',
    gcp_processor_id: row.gcp_processor_id,
    has_service_account: !!row.gcp_service_account_json,
    service_account_email: extractClientEmail(row.gcp_service_account_json),
    has_gemini_api_key: !!row.gemini_api_key,
    updated_at: row.updated_at,
  })
}

const VALID_LOCATIONS = ['us', 'eu', 'asia-northeast1', 'asia-northeast3', 'asia-southeast1']

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin()
  if ('error' in guard) return guard.error
  const { supabase, employee } = guard

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if (typeof body.gcp_project_id === 'string' && body.gcp_project_id.trim().length > 0) {
    update.gcp_project_id = body.gcp_project_id.trim()
  }
  if (typeof body.gcp_location === 'string' && body.gcp_location.length > 0) {
    if (!VALID_LOCATIONS.includes(body.gcp_location)) {
      return NextResponse.json(
        { success: false, error: `リージョンは ${VALID_LOCATIONS.join(' / ')} のいずれかを指定してください` },
        { status: 400 },
      )
    }
    update.gcp_location = body.gcp_location
  }
  if (typeof body.gcp_processor_id === 'string' && body.gcp_processor_id.trim().length > 0) {
    update.gcp_processor_id = body.gcp_processor_id.trim()
  }
  if (typeof body.gcp_service_account_json === 'string' && body.gcp_service_account_json.trim().length > 0) {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(body.gcp_service_account_json)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Service Account JSON のパースに失敗しました' },
        { status: 400 },
      )
    }
    if (parsed.type !== 'service_account' || typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Service Account JSON に必要なフィールド (type, client_email, private_key) がありません' },
        { status: 400 },
      )
    }
    update.gcp_service_account_json = body.gcp_service_account_json
  }
  if (typeof body.gemini_api_key === 'string' && body.gemini_api_key.trim().length > 0) {
    // 形式チェック (AIza で始まる場合が多い、最低 30 文字)
    const k = body.gemini_api_key.trim()
    if (k.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Gemini API キーが短すぎます' },
        { status: 400 },
      )
    }
    update.gemini_api_key = k
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: '更新する項目がありません' }, { status: 400 })
  }

  update.updated_by = employee.id
  update.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('company_secrets')
    .upsert({ company_id: employee.company_id, ...update }, { onConflict: 'company_id' })

  if (error) {
    return NextResponse.json(
      { success: false, error: `保存に失敗しました: ${error.message}` },
      { status: 500 },
    )
  }

  const { data: row } = await supabase
    .from('company_secrets')
    .select('gcp_project_id, gcp_location, gcp_processor_id, gcp_service_account_json, gemini_api_key, updated_at')
    .eq('company_id', employee.company_id)
    .single()

  return NextResponse.json({
    success: true,
    gcp_project_id: row?.gcp_project_id ?? null,
    gcp_location: row?.gcp_location ?? 'us',
    gcp_processor_id: row?.gcp_processor_id ?? null,
    has_service_account: !!row?.gcp_service_account_json,
    service_account_email: extractClientEmail(row?.gcp_service_account_json),
    has_gemini_api_key: !!row?.gemini_api_key,
    updated_at: row?.updated_at ?? null,
  })
}
