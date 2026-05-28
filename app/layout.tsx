import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

// 日本語フォント: 'latin' しか指定していなかったため日本語グリフのプリロードが効いていなかった
// 'latin' に加えて日本語サブセットも明示
const notoSansJP = Noto_Sans_JP({
  // next/font/google の Noto Sans JP は subsets を 'latin' のみにしておくとデフォルトで japanese も含まれる仕様だが、
  // 明示することで意図を残す
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://plus.b-p.co.jp'),
  title: {
    default: '名刺Plus - AI名刺管理',
    template: '%s | 名刺Plus',
  },
  description:
    'Google Workspace 連携の AI 名刺管理アプリ。日本企業・SOHO 向けスマートビジネスツール。',
  applicationName: '名刺Plus',
  authors: [{ name: 'b-p' }],
  generator: 'v0.app',
  // 検索エンジン制御: デモサイトとして公開している間は indexing しない
  // Phase 7 で本番ドメインを切り出した時点で本番側のみ index: true に切り替える
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: '名刺Plus',
    title: '名刺Plus - AI名刺管理',
    description:
      'Google Workspace 連携の AI 名刺管理アプリ。日本企業・SOHO 向けスマートビジネスツール。',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

// viewport はメタデータから分離するのが Next 16 推奨
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e2327' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning は next-themes の推奨設定
    // クライアント側でテーマクラスを差し替えるためサーバー HTML との差分が出るがそれは想定通り
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${notoSansJP.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
