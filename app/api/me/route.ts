import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { DEMO_USER, isDemoMode } from "@/lib/demo-data"

// GET: 自分のemployee情報取得
export async function GET() {
  // デモモードではモックデータを返す
  if (isDemoMode()) {
    return NextResponse.json(DEMO_USER)
  }

  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // employeesテーブルからユーザー情報取得（拡張カラム含む）
  const { data: employee } = await supabase
    .from('employees')
    .select(`
      id,
      display_name,
      name_kana,
      email,
      role,
      avatar_url,
      phone,
      mobile,
      department,
      position,
      timezone,
      language,
      theme,
      disabled_google_services,
      notification_prefs,
      company_id,
      status,
      created_at
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (employee) {
    return NextResponse.json({
      id: employee.id,
      name: employee.display_name || user.email?.split('@')[0] || '名無し',
      nameKana: employee.name_kana || '',
      email: employee.email || user.email || '',
      plan:
        employee.role === 'owner'
          ? '経営者'
          : employee.role === 'admin'
            ? '管理者'
            : '社員',
      role: employee.role,
      avatarUrl: employee.avatar_url,
      phone: employee.phone,
      mobile: employee.mobile,
      department: employee.department,
      position: employee.position,
      timezone: employee.timezone || 'Asia/Tokyo',
      language: employee.language || 'ja',
      theme: employee.theme || 'dark',
      disabledGoogleServices: employee.disabled_google_services || [],
      notificationPrefs: employee.notification_prefs || {
        new_card_email: false,
        order_status_email: true,
        cold_customer_weekly: false,
      },
      companyId: employee.company_id,
      status: employee.status,
      createdAt: employee.created_at,
    })
  }

  // employeesに登録がない場合はauth.usersから
  return NextResponse.json({
    id: null,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || '名無し',
    email: user.email || '',
    plan: '社員',
    role: null,
  })
}

// PATCH: 自分のプロフィール更新
export async function PATCH(request: NextRequest) {
  // デモモードでは成功を返すだけ
  if (isDemoMode()) {
    const body = await request.json()
    return NextResponse.json({ success: true, data: { ...DEMO_USER, ...body } })
  }

  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  
  // 更新可能なフィールドのみ抽出
  const allowedFields = [
    'display_name',
    'name_kana',
    'avatar_url',
    'phone',
    'mobile',
    'department',
    'position',
    'timezone',
    'language',
    'theme',
    'notification_prefs',
  ]
  
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('auth_user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
