import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 社員一覧取得 (同company内のみ)
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
  }

  // 自分のemployeeレコードを取得してcompany_idを特定
  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentEmployee) {
    return NextResponse.json({ success: false, error: '社員登録がありません' }, { status: 403 })
  }

  // 同company内の社員一覧を取得
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      id,
      email,
      display_name,
      name_kana,
      department,
      position,
      phone,
      mobile,
      role,
      status,
      invited_at,
      activated_at,
      invited_by,
      staff_id,
      birth_date
    `)
    .eq('company_id', currentEmployee.company_id)
    .order('display_name', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: employees,
    currentEmployee: {
      id: currentEmployee.id,
      role: currentEmployee.role,
    },
  })
}

// 社員招待 (owner/adminのみ)
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 })
  }

  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentEmployee) {
    return NextResponse.json({ success: false, error: '社員登録がありません' }, { status: 403 })
  }

  // owner/adminのみ招待可能
  if (!['owner', 'admin'].includes(currentEmployee.role)) {
    return NextResponse.json({ success: false, error: '招待権限がありません' }, { status: 403 })
  }

  const body = await request.json()
  const { email, display_name, name_kana, department, position, role, phone, mobile, staff_id } = body

  if (!email) {
    return NextResponse.json({ success: false, error: 'メールアドレスは必須です' }, { status: 400 })
  }

  // 既に同じメールアドレスが存在するか確認
  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', currentEmployee.company_id)
    .eq('email', email.toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json({ success: false, error: 'このメールアドレスは既に登録されています' }, { status: 400 })
  }

  // ownerの招待はownerのみ可能
  if (role === 'owner' && currentEmployee.role !== 'owner') {
    return NextResponse.json({ success: false, error: 'owner権限の付与はownerのみ可能です' }, { status: 403 })
  }

  const { data: newEmployee, error } = await supabase
    .from('employees')
    .insert({
      company_id: currentEmployee.company_id,
      email: email.toLowerCase(),
      display_name: display_name || null,
      name_kana: name_kana || null,
      department: department || null,
      position: position || null,
      role: role || 'member',
      phone: phone || null,
      mobile: mobile || null,
      staff_id: staff_id || null,
      status: 'invited',
      invited_by: currentEmployee.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: newEmployee })
}
