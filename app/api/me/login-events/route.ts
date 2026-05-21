import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: 自分のログイン履歴取得
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // employeeを取得
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  // ログイン履歴を取得（最新10件）
  const { data: events, error } = await supabase
    .from('login_events')
    .select('*')
    .eq('employee_id', employee.id)
    .order('occurred_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events })
}
