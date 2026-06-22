import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No rewrites needed — frontend calls API directly via NEXT_PUBLIC_API_URL.
  // Defensive redirects for legacy / typed / bookmarked URLs that 404 today.
  async redirects() {
    return [
      { source: '/battlecard', destination: '/battlecards', permanent: false },
      { source: '/login', destination: '/auth/login', permanent: false },
    ];
  },
};

export default nextConfig;
