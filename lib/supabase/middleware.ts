import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // '/' と '/shop' は公開（未認証でも閲覧/購入可能）
  const publicPaths = ['/login', '/auth/callback', '/auth/logout', '/api/auth', '/shop']
  const isPublicPath =
    pathname === '/' || publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublicPath) {
    // /api/* は 401 JSON を返す(リダイレクトしない)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '認証が必要です', code: 'UNAUTHENTICATED' },
        { status: 401 },
      )
    }
    // ブラウザは /login に転送
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // ログイン済みで /login に来た場合はアプリトップへ
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
