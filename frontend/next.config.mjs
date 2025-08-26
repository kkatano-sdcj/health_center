/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
      {
        source: '/ws',
        destination: 'http://localhost:8000/ws',
      },
    ];
  },
  // 実験的機能で大きなファイルサポート
  experimental: {
    proxyTimeout: 600000, // 10分
  },
};

export default nextConfig;
