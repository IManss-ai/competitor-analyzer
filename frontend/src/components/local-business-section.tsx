import { Competitor } from '@/lib/types';
import { Storefront } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import LocalScanButton from './local-scan-button';

interface LocalBusinessSectionProps {
  competitors: Competitor[];
  isLocalBusiness: boolean;
  userId: string;
}

export default function LocalBusinessSection({
  competitors,
  isLocalBusiness,
  userId,
}: LocalBusinessSectionProps) {
  if (!isLocalBusiness) return null;

  return (
    <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden mb-6 shadow-sm">
      <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Storefront size={18} className="text-[#0a0a0a]" weight="bold" />
          <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
            Local Intelligence
          </h2>
        </div>
      </div>

      {competitors.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-[#525252]">
            Add competitors to start tracking local intelligence
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#f5f5f5]">
          {competitors.map((comp) => {
            const hasGoogleMaps = !!comp.google_maps_url;
            const hasInstagram = !!comp.instagram_handle;
            const hasFacebook = !!comp.facebook_page;
            const hasAnyLocal = hasGoogleMaps || hasInstagram || hasFacebook;

            return (
              <div key={comp.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center flex-shrink-0">
                    <Storefront size={14} className="text-[#a3a3a3]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0a0a0a] truncate">
                      {comp.name || comp.url}
                    </p>
                    <p className="text-xs text-[#a3a3a3] font-mono truncate">
                      {comp.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasGoogleMaps && (
                    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                      Google Reviews
                    </span>
                  )}
                  {hasInstagram && (
                    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded">
                      Instagram
                    </span>
                  )}
                  {hasFacebook && (
                    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      Facebook
                    </span>
                  )}
                  {!hasAnyLocal && (
                    <Link
                      href="/competitors"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Add local details →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state for social data */}
          <div className="px-6 py-8 text-center bg-[#fafafa]">
            <p className="text-sm text-[#6b7280] mb-4">
              Social posts and Google reviews appear here after your next scan.
            </p>
            {competitors.length > 0 && (
              <LocalScanButton
                competitorId={competitors[0].id}
                userId={userId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
