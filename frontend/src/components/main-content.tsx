'use client';

export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex-1 min-w-0"
      style={{ marginLeft: 'var(--sidebar-width)' }}
    >
      <div className="max-w-[1140px] px-8 py-8">
        {children}
      </div>
    </main>
  );
}
