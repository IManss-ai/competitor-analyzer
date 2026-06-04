import Topbar from '@/components/topbar';

export default function CompetitorsLoading() {
  return (
    <div>
      <Topbar title="Competitors" subtitle="Loading your data..." />
      
      <div className="pb-12 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="w-2/3 h-4 bg-zinc-200 rounded"></div>
          <div className="w-32 h-9 bg-zinc-200 rounded-lg"></div>
        </div>

        <div className="mb-8 p-1 bg-zinc-50 border border-zinc-200/40 rounded-xl">
          <div className="bg-white border border-zinc-100 rounded-[calc(0.75rem-0.125rem)] px-4 py-3 h-10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl h-[180px]">
              <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] p-5 h-full flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-200"></div>
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="w-1/2 h-4 bg-zinc-200 rounded"></div>
                    <div className="w-3/4 h-3 bg-zinc-200 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-8 bg-zinc-200 rounded"></div>
                  <div className="h-8 bg-zinc-200 rounded"></div>
                  <div className="h-8 bg-zinc-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
