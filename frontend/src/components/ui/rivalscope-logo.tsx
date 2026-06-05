'use client';

interface RivalscopeLogoProps {
  size?: number;
  className?: string;
}

export function RivalscopeLogo({ size = 14, className = '' }: RivalscopeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer scope ring — faint */}
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Inner precision ring */}
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
      {/* Center target dot */}
      <circle cx="7" cy="7" r="1.4" fill="currentColor" />
      {/* Top tick mark */}
      <line x1="7" y1="0.5" x2="7" y2="3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      {/* Right tick mark */}
      <line x1="10.5" y1="7" x2="13.5" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      {/* Signal spark — top-right diagonal */}
      <path d="M 10 4 L 11.6 2.4" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
