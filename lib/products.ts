// 名刺パッケージ商品カタログ（サーバが信頼する真実のソース）
// 価格はサーバ側で必ず引き直すこと。クライアントから送られた金額は使わない。

export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number // JPY 最小単位（円） / Stripe は JPY を整数円で扱う
  features: string[]
  highlight?: boolean
  badge?: string
}

export const PRODUCTS: Product[] = [
  {
    id: 'cards-100',
    name: '名刺 100枚パック',
    description: '基本デザインの名刺 100枚（片面カラー / 上質紙）',
    priceInCents: 2980,
    features: [
      '上質紙 / 片面カラー印刷',
      '送料込み（国内）',
      '初校無料',
      '営業日3日以内に発送',
    ],
  },
  {
    id: 'cards-300',
    name: '名刺 300枚パック',
    description: 'もっとも選ばれている標準パック',
    priceInCents: 5980,
    features: [
      '上質紙 / 両面カラー印刷',
      'AI レイアウト提案 1回付き',
      '送料込み（国内）',
      '営業日3日以内に発送',
    ],
    highlight: true,
    badge: '人気',
  },
  {
    id: 'cards-500',
    name: '名刺 500枚パック（プレミアム）',
    description: '厚紙＋マット加工のプレミアム仕様',
    priceInCents: 9800,
    features: [
      '厚紙180kg / マットPP加工',
      'AI レイアウト提案 3回付き',
      'デザイナー監修 1回',
      '送料込み（国内）',
    ],
  },
]

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function formatJpy(cents: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(cents)
}
