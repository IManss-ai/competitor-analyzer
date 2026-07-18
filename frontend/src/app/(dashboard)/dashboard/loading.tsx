import Topbar from '@/components/topbar';

export default function DashboardLoading() {
  return (
    <div>
      <Topbar title="Dashboard" subtitle="Loading your data..." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rs-card p-6 h-[104px] flex flex-col justify-between">
            <div className="w-1/2 h-3 rs-skeleton"></div>
            <div className="w-1/3 h-6 rs-skeleton mt-2"></div>
          </div>
        ))}
      </div>

      <div className="rs-card p-6 mb-8 h-[120px]">
        <div className="w-full h-full rs-skeleton"></div>
      </div>

      <div className="rs-card overflow-hidden mb-6">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-32 h-4 rs-skeleton"></div>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-6 flex items-start gap-4">
              <div className="mt-2 w-2.5 h-2.5 rounded-full bg-accent"></div>
              <div className="w-9 h-9 rounded rs-skeleton"></div>
              <div className="flex-1 space-y-2">
                <div className="w-1/4 h-4 rs-skeleton"></div>
                <div className="w-3/4 h-3 rs-skeleton"></div>
                <div className="w-1/2 h-3 rs-skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
