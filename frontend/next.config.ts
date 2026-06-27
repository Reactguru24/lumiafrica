import type { NextConfig } from 'next'

function apiImagePattern(): { protocol: 'https' | 'http'; hostname: string; port?: string } | null {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (!raw) return null
  try {
    const u = new URL(raw)
    const protocol = u.protocol === 'http:' ? 'http' : 'https'
    return {
      protocol,
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
    }
  } catch {
    return null
  }
}

const apiPattern = apiImagePattern()

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  // Netlify has no Next.js image optimizer — serve remote/API images directly.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost', port: '8080' },
      ...(apiPattern ? [apiPattern] : []),
    ],
  },
}

export default nextConfig
