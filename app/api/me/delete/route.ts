import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST: 退会処理（status='suspended'に変更）
export async function POST() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // employeeのstatusをsuspendedに変更
  const { error } = await supabase
    .from('employees')
    .update({ status: 'suspended' })
    .eq('auth_user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ログアウト
  await supabase.auth.signOut()

  return NextResponse.json({ success: true, message: "Account suspended" })
}
