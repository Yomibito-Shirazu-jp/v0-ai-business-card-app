import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST: 全セッション無効化
export async function POST() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Supabaseの全セッションを無効化
  const { error } = await supabase.auth.signOut({ scope: 'global' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "All sessions signed out" })
}
