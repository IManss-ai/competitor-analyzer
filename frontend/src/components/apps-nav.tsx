import Link from 'next/link';

// Slim top nav for the public /apps SEO surface. These pages render outside
// the marketing layout, so without it visitors landing from search or a shared
// link have no path back to the site or into signup. CTA follows the landing
// convention: mono foreground fill, never the blue accent.
export function AppsNav() {
  return (
    <nav className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span className="h-[18px] w-[18px] rounded-md" style={{ backgroundImage: 'var(--gradient-primary)' }} />
        <span className="font-display text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Rivalscope</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/auth/login" className="px-2 text-sm text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
        <Link href="/auth/login" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90">Start free</Link>
      </div>
    </nav>
  );
}
