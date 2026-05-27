import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // デモモードでは認証チェックをスキップ
  // ドメイン優先で判定 (誤 env var による事故防止: plus.* は強制 OFF)
  const host = (request.headers.get('host') || '').toLowerCase()
  const isPlus = host.startsWith('plus.')
  const isDemo = !isPlus && (host.startsWith('demo.') || host.startsWith('demo-') || process.env.NEXT_PUBLIC_DEMO_MODE === 'true')
  if (isDemo) {
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

  // '/shop' のみ公開、'/' は認証必須のダッシュボード
  const publicPaths = ['/login', '/auth/callback', '/auth/logout', '/api/auth', '/shop', '/lp', '/terms', '/privacy', '/contact-sales', '/api/contact-sales']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

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

  // ログイン済みで /login に来た場合はトップへ
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
