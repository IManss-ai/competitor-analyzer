import Link from 'next/link';

// §4c Footer — proper multi-column footer. Every link is a real destination
// (anchors + existing routes + support mailto); no dead links to unbuilt pages.

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Product', href: '#product' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Sign in', href: '/auth/login' },
      { label: 'Contact', href: 'mailto:support@rivalscope.dev' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

function FooterLink({ label, href }: { label: string; href: string }) {
  const cls = 'block py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground';
  if (href.startsWith('#') || href.startsWith('mailto:')) {
    return <a href={href} className={cls}>{label}</a>;
  }
  return <Link href={href} className={cls}>{label}</Link>;
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-14">
      <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-md" style={{ backgroundImage: 'var(--gradient-primary)' }} />
            <span className="font-display text-[16px] font-semibold tracking-tight text-foreground">Rivalscope</span>
          </div>
          <p className="mt-3 max-w-[28ch] text-[13px] leading-relaxed text-muted-foreground">
            Competitive intelligence for modern sales teams.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">{col.heading}</h4>
            {col.links.map((l) => (
              <FooterLink key={l.label} label={l.label} href={l.href} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground sm:flex-row">
        <span>© 2026 Rivalscope</span>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <a href="mailto:support@rivalscope.dev" className="transition-colors hover:text-foreground">Support</a>
        </div>
      </div>
    </footer>
  );
}
