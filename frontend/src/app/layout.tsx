import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { InlineScript } from '@/components/inline-script';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://competitor-analyzer-zeta.vercel.app'),
  title: 'Rivalscope — Competitor Intelligence for Growing Teams',
  description: 'Track competitor pricing changes, messaging shifts, and customer complaints. AI-generated sales playbooks delivered every Monday morning.',
  openGraph: {
    title: 'Rivalscope — Competitor Intelligence for Growing Teams',
    description: 'Track competitor pricing, reviews, and messaging shifts. AI sales playbooks every Monday.',
    url: 'https://competitor-analyzer-zeta.vercel.app',
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
      className={`${archivo.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className={`${archivo.variable} font-sans antialiased min-h-full text-[var(--text-primary)] selection:bg-sky-500/20 selection:text-sky-50`} style={{ backgroundColor: 'var(--surface-base)' }}>
        <InlineScript html={`try{var t=localStorage.getItem('theme');if(t==='ink'||t==='paper'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`} />
        {children}
      </body>
    </html>
  );
}
