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
  webpack(config) {
    // pdfjs-dist が node の canvas モジュールを参照しないようにする
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false }
    return config
  },
}

export default nextConfig
