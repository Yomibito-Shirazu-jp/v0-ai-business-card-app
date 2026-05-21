import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // employeesテーブルからユーザー情報取得
  const { data: employee } = await supabase
    .from('employees')
    .select('display_name, email, role')
    .eq('user_id', user.id)
    .single()

  if (employee) {
    return NextResponse.json({
      name: employee.display_name || user.email?.split('@')[0] || '名無し',
      email: employee.email || user.email || '',
      plan: employee.role === 'admin' ? 'Admin' : 'Standard',
    })
  }

  // employeesに登録がない場合はauth.usersから
  return NextResponse.json({
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || '名無し',
    email: user.email || '',
    plan: 'Free',
  })
}
