'use client';

import { ArrowsClockwise } from '@phosphor-icons/react';
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/v1/scan/now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // ignore
    } finally {
      setTimeout(() => setScanning(false), 3000);
    }
  };

  return (
    <header className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-[22px] font-semibold text-[#0a0a0a] tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#737373] mt-1.5 font-normal">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        {lastScan && (
          <span className="text-xs text-[#a3a3a3] font-mono">
            {new Date(lastScan).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
        <button
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowsClockwise
            size={14}
            weight="bold"
            className={scanning ? 'animate-spin' : ''}
          />
          {scanning ? 'Scanning...' : 'Scan now'}
        </button>
      </div>
    </header>
  );
}
