import Topbar from '@/components/topbar';

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <Topbar title="Dashboard" subtitle="Loading your data..." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e5e5e5] p-5 h-[104px] flex flex-col justify-between shadow-sm">
            <div className="w-1/2 h-3 bg-zinc-200 rounded"></div>
            <div className="w-1/3 h-6 bg-zinc-200 rounded mt-2"></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-8 h-[120px] shadow-sm">
        <div className="w-full h-full bg-zinc-100 rounded"></div>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden mb-6 shadow-sm">
        <div className="px-6 py-4 border-b border-[#f0f0f0]">
          <div className="w-32 h-4 bg-zinc-200 rounded"></div>
        </div>
        <div className="divide-y divide-[#f5f5f5]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-5 flex items-start gap-4">
              <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-zinc-200"></div>
              <div className="w-9 h-9 rounded-lg bg-zinc-200"></div>
              <div className="flex-1 space-y-2">
                <div className="w-1/4 h-4 bg-zinc-200 rounded"></div>
                <div className="w-3/4 h-3 bg-zinc-200 rounded"></div>
                <div className="w-1/2 h-3 bg-zinc-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
