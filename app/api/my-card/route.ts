import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// 自分の名刺デザイン取得（is_current=true）。なければ employees から雛形生成して返す。
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, display_name, name_kana, department, position, email, phone, mobile, avatar_url')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const { data: design } = await supabase
    .from('name_card_designs')
    .select('*')
    .eq('employee_id', emp.id)
    .eq('is_current', true)
    .maybeSingle()

  if (design) {
    return NextResponse.json({ exists: true, design })
  }

  // 雛形を返す（保存はPUT時に作成）
  return NextResponse.json({
    exists: false,
    design: {
      employee_id: emp.id,
      company_id: emp.company_id,
      version: 1,
      is_current: true,
      display_name: emp.display_name || '',
      display_name_kana: emp.name_kana || '',
      department: emp.department || '',
      position: emp.position || '',
      email: emp.email || '',
      phone: emp.phone || '',
      mobile: emp.mobile || '',
      fax: '',
      company_name: '',
      postal_code: '',
      address: '',
      website: '',
      logo_url: '',
      photo_url: emp.avatar_url || '',
      qr_code_data: '',
      template_id: 'default',
      background_color: '#ffffff',
      text_color: '#111111',
      notes: '',
    },
  })
}

// 自分の名刺デザインを保存（既存があれば更新、なければ作成）
export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const body = await request.json()

  const allowed = [
    'display_name', 'display_name_kana', 'department', 'position',
    'email', 'phone', 'mobile', 'fax', 'company_name', 'postal_code',
    'address', 'website', 'logo_url', 'photo_url', 'qr_code_data',
    'template_id', 'background_color', 'text_color', 'notes',
  ] as const

  const payload: Record<string, unknown> = {}
  for (const k of allowed) if (body[k] !== undefined) payload[k] = body[k]

  const { data: existing } = await supabase
    .from('name_card_designs')
    .select('id')
    .eq('employee_id', emp.id)
    .eq('is_current', true)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('name_card_designs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, design: data })
  }

  const { data, error } = await supabase
    .from('name_card_designs')
    .insert({
      ...payload,
      employee_id: emp.id,
      company_id: emp.company_id,
      version: 1,
      is_current: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, design: data })
}
