import type { Metadata } from 'next'
import ShopClient from './shop-client'

export const metadata: Metadata = {
  title: '名刺の購入 | b-p plus',
  description:
    'プロ品質の名刺を 100/300/500 枚パックから購入。国内印刷・送料込み・初校無料。Stripe による安全な決済に対応。',
  robots: { index: true, follow: true },
}

export default function Page() {
  return <ShopClient />
}
