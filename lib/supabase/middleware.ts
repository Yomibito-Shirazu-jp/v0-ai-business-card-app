import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// セッション cookie を毎リクエストで更新する Supabase 公式パターン
// 加えて、未認証ユーザーを /login にリダイレクトする
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 必須: ここで getUser() を呼ぶことで、有効期限切れトークンを自動更新する
  // (Server Component で createClient → getUser() しても OK だが、middleware で先に
  //  リフレッシュしておけば全てのページが同じ最新セッションを共有できる)
  const { data: { user } } = await supabase.auth.getUser()

  // 認証必須でないパス
  const publicPaths = ['/login', '/auth/callback']
  const isPublicPath = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // 元の URL を next クエリで保持(ログイン後に戻す)
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // ログイン済みで /login に来た場合はトップへ
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
