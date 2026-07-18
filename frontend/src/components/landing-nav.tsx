'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mobile-only hamburger menu for the landing nav.
// Rendered alongside the desktop nav (which stays `md:flex`); this is `md:hidden`.
// shadcn semantic tokens only, theme-aware, ≥44px tap targets in the panel.

const AUTH = '/auth/login';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#product', label: 'Product' },
  { href: '#pricing', label: 'Pricing' },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-border bg-card px-6 pb-6 pt-2 shadow-elevated">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center border-b border-border text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              href={AUTH}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center border-b border-border text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button size="lg" className="mt-4 min-h-11 gap-2" asChild>
              <Link href={AUTH} onClick={() => setOpen(false)}>
                Start free <ArrowRight size={16} />
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
