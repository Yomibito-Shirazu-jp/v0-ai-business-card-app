import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// meishi.b-p.co.jp = 顧客用 LP ドメイン
// このドメインでは LP・問合せ・法務ページのみ公開、それ以外はルート (LP) に戻す
const MEISHI_PUBLIC_PATHS = [
  '/lp',
  '/contact-sales',
  '/terms',
  '/privacy',
  '/api/contact-sales',
]

function isMeishiHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase()
  return h.startsWith('meishi.') || h.startsWith('meishi-')
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const { pathname } = request.nextUrl

  if (isMeishiHost(host)) {
    // ルートアクセスは LP を表示 (rewrite で URL を変えずにコンテンツだけ差し替え)
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone()
      url.pathname = '/lp'
      return NextResponse.rewrite(url)
    }
    // LP 関連ページは公開
    if (MEISHI_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next()
    }
    // 静的アセット類はそのまま通す (matcher で既に除外されているが念のため)
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/icon') ||
      pathname.startsWith('/apple-icon')
    ) {
      return NextResponse.next()
    }
    // その他 (社内アプリのページ・API) は LP に戻す
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // plus.* / その他のドメイン: 通常の認証フロー
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icon|apple-icon|placeholder|api/auth|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|map|woff|woff2|ttf|otf|eot|wasm)$).*)',
  ],
}
