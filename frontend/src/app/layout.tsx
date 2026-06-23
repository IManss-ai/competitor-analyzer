import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { InlineScript } from '@/components/inline-script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

// Redesign: Space Grotesk (appkittie language) flows through the existing
// --font-archivo variable so the whole app re-fonts in one swap.
const archivo = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rivalscope.dev'),
  title: 'Rivalscope — Competitor Intelligence for Growing Teams',
  description: 'Track competitor pricing changes, messaging shifts, and customer complaints. AI-generated sales playbooks delivered every Monday morning.',
  openGraph: {
    title: 'Rivalscope — Competitor Intelligence for Growing Teams',
    description: 'Track competitor pricing, reviews, and messaging shifts. AI sales playbooks every Monday.',
    url: 'https://rivalscope.dev',
    siteName: 'Rivalscope',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Rivalscope — Competitor Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rivalscope — Competitor Intelligence for Growing Teams',
    description: 'Track competitor pricing, reviews, and messaging shifts. AI sales playbooks every Monday.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="ink"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${archivo.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className={`${archivo.variable} font-sans antialiased min-h-full text-[var(--text-primary)] selection:bg-sky-500/20 selection:text-sky-50`} style={{ backgroundColor: 'var(--surface-base)' }}>
        {/* No-JS / crawler / OG-snapshot fallback: Framer Motion SSRs scroll-reveal
            content with inline opacity:0 that only clears via JS. Without JS those
            regions stay blank for bots, so force them visible. Mirrors the
            prefers-reduced-motion override in globals.css. */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <InlineScript html={`try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='paper'?'paper':'ink')}catch(e){document.documentElement.setAttribute('data-theme','ink')}`} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
