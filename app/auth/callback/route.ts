import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth / Magic Link コールバック
// /auth/callback?code=...&next=/cards 等で叩かれ、code をセッションに交換 → next に遷移
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    )
  }

  // ログイン直後に employees に紐付けを試みる
  // (社長が登録済みのメールであれば、Supabase auth ユーザーと employees レコードを連結)
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email) {
    await supabase
      .from('employees')
      .update({
        auth_user_id: user.id,
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      .eq('email', user.email.toLowerCase())
      .is('auth_user_id', null)

    // ログイン履歴を記録
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email.toLowerCase())
      .single()

    if (employee) {
      const forwardedFor = request.headers.get('x-forwarded-for')
      const ip = forwardedFor?.split(',')[0]?.trim() || null
      const userAgent = request.headers.get('user-agent') || null

      await supabase.from('login_events').insert({
        employee_id: employee.id,
        ip_address: ip,
        user_agent: userAgent,
        method: 'google_oauth',
      })
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
