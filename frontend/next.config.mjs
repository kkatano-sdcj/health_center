/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Docker環境ではbackend、ローカル開発ではlocalhostを使用
    const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:8000';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
      {
        source: '/api/aichat/:path*',
        destination: `${apiUrl}/api/aichat/:path*`,
      },
      {
        source: '/ws',
        destination: `${apiUrl}/ws`,
      },
    ];
  },
  // 実験的機能で大きなファイルサポート
  experimental: {
    proxyTimeout: 600000, // 10分
  },
};

export default nextConfig;
