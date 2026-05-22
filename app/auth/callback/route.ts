import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth / Magic Link コールバック
// /auth/callback?code=...&next=/ で叩かれ、code をセッションに交換 → next に遷移
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

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    const emailLower = user.email.toLowerCase()

    // 既存 employees レコードを ilike で大文字小文字無視で検索 → 紐付け
    const { data: matched } = await supabase
      .from('employees')
      .select('id, auth_user_id, status')
      .ilike('email', emailLower)
      .single()

    if (matched) {
      const updates: Record<string, any> = {}
      if (!matched.auth_user_id) updates.auth_user_id = user.id
      if (matched.status !== 'active') {
        updates.status = 'active'
        updates.activated_at = new Date().toISOString()
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('employees').update(updates).eq('id', matched.id)
      }

      // ログイン履歴(login_events テーブルがある場合のみ、失敗しても止めない)
      try {
        const forwardedFor = request.headers.get('x-forwarded-for')
        const ip = forwardedFor?.split(',')[0]?.trim() || null
        const userAgent = request.headers.get('user-agent') || null
        await supabase.from('login_events').insert({
          employee_id: matched.id,
          ip_address: ip,
          user_agent: userAgent,
          method: code.includes('email') ? 'magic_link' : 'oauth',
        })
      } catch { /* ignore */ }
    } else {
      // employees に未登録 → 招待されていないユーザー
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL('/login?error=not_invited', url.origin),
      )
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
