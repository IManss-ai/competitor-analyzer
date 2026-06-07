import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rivalscope.com'),
  title: 'Rivalscope — Competitor Intelligence for Growing Teams',
  description: 'Track competitor pricing changes, messaging shifts, and customer complaints. AI-generated sales playbooks delivered every Monday morning.',
  openGraph: {
    title: 'Rivalscope — Competitor Intelligence for Growing Teams',
    description: 'Track competitor pricing, reviews, and messaging shifts. AI sales playbooks every Monday.',
    url: 'https://rivalscope.com',
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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className={`${GeistSans.variable} font-sans antialiased min-h-full text-zinc-100 selection:bg-sky-500/20 selection:text-sky-50`} style={{ backgroundColor: 'var(--surface-base)' }}>
        {children}
      </body>
    </html>
  );
}
