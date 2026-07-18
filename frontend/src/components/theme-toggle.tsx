'use client';
import { useTheme } from '@/lib/use-theme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center font-mono text-xs tracking-[0.12em] uppercase select-none"
      style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
    >
      {(['light', 'dark'] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            aria-label={`${t} theme`}
            onClick={() => setTheme(t)}
            className="inline-flex items-center justify-center min-h-[44px] px-4 transition-colors cursor-pointer"
            style={{
              background: active ? 'color-mix(in oklch, var(--primary) 12%, transparent)' : 'transparent',
              color: active ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
