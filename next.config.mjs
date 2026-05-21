/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Phase 1 ではローカル base64 のみで動作。外部ストレージ追加時に remotePatterns を拡張
    remotePatterns: [],
  },
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
