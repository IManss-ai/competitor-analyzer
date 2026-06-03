'use client';

export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex-1 min-w-0 transition-[margin-left] duration-200 ease-out"
      style={{ marginLeft: 'var(--sidebar-width, 15rem)' }}
    >
      <div className="max-w-[1100px] px-8 py-8">
        {children}
      </div>
    </main>
  );
}
