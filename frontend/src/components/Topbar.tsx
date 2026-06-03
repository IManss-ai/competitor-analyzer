"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const titleMap: Record<string, string> = {
  "/dashboard":   "Dashboard",
  "/competitors": "Competitors",
  "/queue":       "Dataset Queue",
  "/trends":      "Compliance Trends",
  "/settings":    "Settings",
  "/billing":     "Billing",
};

export default function Topbar() {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "TDCR";

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex-shrink-0">
      <h1 className="text-white font-semibold text-lg">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-400">
          <Search className="w-3.5 h-3.5" />
          <span>Search…</span>
          <kbd className="ml-2 text-xs bg-slate-700 border border-slate-600 rounded px-1 py-0.5">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* Clerk user button */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-7 h-7",
            },
          }}
        />
      </div>
    </header>
  );
}
