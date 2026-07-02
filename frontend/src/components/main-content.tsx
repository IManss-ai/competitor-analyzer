'use client';

export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-w-0 md:ml-[var(--sidebar-width)] max-md:pt-14 bg-background">
      <div className="max-w-[1140px] px-4 md:px-8 py-6 md:py-8">
        {children}
      </div>
    </main>
  );
}
