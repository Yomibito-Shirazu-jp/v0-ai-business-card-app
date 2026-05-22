import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// 認証必須のルートと、未認証で許可するルートを定義
// 未認証アクセスは /login に転送
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // 静的アセット・画像・worker・auth コールバック自身は除外
    '/((?!_next/static|_next/image|favicon|icon|apple-icon|placeholder|api/auth|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|map|woff|woff2|ttf|otf|eot|wasm)$).*)',
  ],
}
