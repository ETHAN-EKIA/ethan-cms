import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: '**.railway.app' },
    ],
  },
  // HTTPS强制: Railway/Vercel自动处理HTTPS，此处确保HSTS头
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // HSTS: 强制浏览器始终使用HTTPS（max-age=1年）
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/admin/(.*)',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },
  // 生产环境HTTP到HTTPS重定向（Railway/Vercel已自动处理，此为备份）
  async redirects() {
    // 仅在检测到生产环境时启用
    if (process.env.NODE_ENV === 'production') {
      return [
        // Railway 和 Vercel 自动处理 HTTPS 重定向
        // 此处不需要额外配置
      ]
    }
    return []
  },
};

export default nextConfig;
