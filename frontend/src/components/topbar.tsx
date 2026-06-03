'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  lastScan?: string | null;
}

export default function Topbar({ title, subtitle, lastScan }: TopbarProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setTimeout(() => setScanning(false), 3000);
    }
  };

  return (
    <header className="flex items-center justify-between pb-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 font-heading">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {lastScan && (
          <span className="text-xs text-zinc-400">
            Last scan: {new Date(lastScan).toLocaleDateString()}
          </span>
        )}
        <button
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-950 text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>
    </header>
  );
}
