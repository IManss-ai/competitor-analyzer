import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Space_Grotesk } from 'next/font/google';
import { InlineScript } from '@/components/inline-script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from '@/components/ui/sonner';

// shadcn neutral-modern: Geist Sans (UI/display) + Geist Mono (numerals/code).
// The geist package exposes --font-geist-sans / --font-geist-mono, which the
// --font-sans / --font-mono tokens in globals.css resolve to.

// AppKittie-in-blue: Space Grotesk display face (bold headlines).
// Exposes --font-space-grotesk, which the --font-display token resolves to.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn("dark", "h-full", "antialiased", "font-sans", GeistSans.variable, GeistMono.variable, spaceGrotesk.variable)}
    >
      <body className="font-sans antialiased min-h-full text-foreground selection:bg-sky-500/20 selection:text-sky-50" style={{ backgroundColor: 'var(--background)' }}>
        {/* No-JS / crawler / OG-snapshot fallback: Framer Motion SSRs scroll-reveal
            content with inline opacity:0 that only clears via JS. Without JS those
            regions stay blank for bots, so force them visible. Mirrors the
            prefers-reduced-motion override in globals.css. */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <InlineScript html={`try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}`} />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
