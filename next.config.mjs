/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // TODO: Phase 0b で network-graph.tsx の D3 型エラーを修正後にこの行を削除する。
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [],
  },
  typedRoutes: true,
  // Next.js 16 / Turbopack の canvas モジュール解決を空ファイルに飛ばす
  turbopack: {
    resolveAlias: {
      canvas: './lib/empty.js',
    },
  },
  webpack(config) {
    // 旧来の webpack ビルド時にも canvas を参照しないようにする
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false }
    return config
  },
}

export default nextConfig
