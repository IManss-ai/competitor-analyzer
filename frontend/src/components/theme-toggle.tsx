'use client';
import { useTheme } from '@/lib/use-theme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center font-mono text-[10px] tracking-[0.12em] uppercase select-none"
      style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
    >
      {(['paper', 'ink'] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            aria-label={`${t} theme`}
            onClick={() => setTheme(t)}
            className="inline-flex items-center justify-center min-h-[44px] px-3.5 transition-colors cursor-pointer"
            style={{
              background: active ? 'var(--accent-subtle)' : 'transparent',
              color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
