import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// POST: Google権限を無効化（アプリ側でフラグ管理）
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { service } = body

  const validServices = ['contacts', 'calendar', 'gmail', 'drive']
  if (!service || !validServices.includes(service)) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 })
  }

  // 現在のdisabled_google_servicesを取得
  const { data: employee } = await supabase
    .from('employees')
    .select('disabled_google_services')
    .eq('auth_user_id', user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const currentDisabled = employee.disabled_google_services || []
  
  // すでに無効なら何もしない
  if (currentDisabled.includes(service)) {
    return NextResponse.json({ success: true, message: "Already disabled" })
  }

  // disabled_google_servicesに追加
  const { error } = await supabase
    .from('employees')
    .update({ 
      disabled_google_services: [...currentDisabled, service] 
    })
    .eq('auth_user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: `${service} disabled` })
}

// DELETE: Google権限を再有効化
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { service } = body

  const validServices = ['contacts', 'calendar', 'gmail', 'drive']
  if (!service || !validServices.includes(service)) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 })
  }

  // 現在のdisabled_google_servicesを取得
  const { data: employee } = await supabase
    .from('employees')
    .select('disabled_google_services')
    .eq('auth_user_id', user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const currentDisabled = employee.disabled_google_services || []
  
  // disabled_google_servicesから削除
  const { error } = await supabase
    .from('employees')
    .update({ 
      disabled_google_services: currentDisabled.filter((s: string) => s !== service) 
    })
    .eq('auth_user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: `${service} enabled` })
}
