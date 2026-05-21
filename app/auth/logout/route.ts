import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', new URL(request.url).origin))
}

// GET でも叩けるようにしておく(リンクから直接ログアウト用)
export async function GET(request: NextRequest) {
  return POST(request)
}
