import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No rewrites needed — frontend calls API directly via NEXT_PUBLIC_API_URL.
  // Defensive redirects for legacy / typed / bookmarked URLs that 404 today.
  async redirects() {
    return [
      { source: '/battlecard', destination: '/battlecards', permanent: false },
      { source: '/login', destination: '/auth/login', permanent: false },
      // Signup IS login (account created on first sign-in) — no signup route exists.
      { source: '/auth/signup', destination: '/auth/login', permanent: false },
      { source: '/signup', destination: '/auth/login', permanent: false },
    ];
  },
  // Baseline hardening headers; Vercel only sends HSTS by default. SAMEORIGIN
  // (not DENY) so nothing breaks if share cards ever get an embed surface.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
