import type { MetadataRoute } from 'next';

// Crawler entry point: advertise the sitemap and keep bots out of the
// auth-gated app shell (the (dashboard) route-group segments + /auth/).
// /share is intentionally crawlable (public battlecard share pages).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/competitors',
          '/battlecards',
          '/billing',
          '/campaigns',
          '/queue',
          '/settings',
          '/trends',
          '/discover',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://rivalscope.dev/sitemap.xml',
  };
}
