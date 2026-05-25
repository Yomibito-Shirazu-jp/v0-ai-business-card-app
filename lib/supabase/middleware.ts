import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // デモモードでは認証チェックをスキップ
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.next({ request })
  }

  // Supabase の環境変数が無い場合は middleware を素通りさせる(本番未設定での 500 を防止)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  let supabase
  try {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    })
  } catch (e) {
    console.error('[v0] middleware: createServerClient failed', e)
    return NextResponse.next({ request })
  }

  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    console.error('[v0] middleware: getUser failed', e)
    // セッション取得失敗時は素通りさせて UI 側でハンドルさせる
    return NextResponse.next({ request })
  }

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
