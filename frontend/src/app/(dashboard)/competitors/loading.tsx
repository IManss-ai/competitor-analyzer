import Topbar from '@/components/topbar';

export default function CompetitorsLoading() {
  return (
    <div>
      <Topbar title="Competitors" subtitle="Loading your data..." />

      <div className="pb-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="w-2/3 h-4 rs-skeleton"></div>
          <div className="w-32 h-9 rs-skeleton"></div>
        </div>

        <div className="mb-8 rs-card p-3">
          <div className="h-10 rs-skeleton"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rs-card p-5 h-[180px] flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded rs-skeleton"></div>
                <div className="flex-1 space-y-2 mt-1">
                  <div className="w-1/2 h-4 rs-skeleton"></div>
                  <div className="w-3/4 h-3 rs-skeleton"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-8 rs-skeleton"></div>
                <div className="h-8 rs-skeleton"></div>
                <div className="h-8 rs-skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
