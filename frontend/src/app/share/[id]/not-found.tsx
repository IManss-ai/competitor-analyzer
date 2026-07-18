// Branded not-found for public share links, rendered via notFound() in
// page.tsx so the response carries a real 404 status (crawlers were indexing
// arbitrary /share/* URLs as valid 200 pages).
export default function ShareNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: 'var(--background)' }}>
      <div className="rs-card p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-lg font-bold bg-[var(--tone-danger)]/10 text-[var(--tone-danger)] border border-[var(--tone-danger)]/20">
          !
        </div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Battle Card Not Found</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          The competitor battle card you are looking for does not exist, has been deleted, or is currently inactive.
        </p>
        <a href="/auth/login" className="rs-btn-primary text-sm">
          Go to Rivalscope
        </a>
      </div>
    </div>
  );
}
