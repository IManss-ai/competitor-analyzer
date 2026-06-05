import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rivalscope',
  description: 'AI-powered competitor intelligence dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className={`${inter.variable} font-sans antialiased min-h-full bg-[#06030c] text-zinc-100 selection:bg-sky-600/30 selection:text-zinc-50`}>
        {children}
      </body>
    </html>
  );
}
