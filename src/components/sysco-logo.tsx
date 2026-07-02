export function SyscoLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Sysco Logo"
    >
      <defs>
        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id="greenGrad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
        <linearGradient id="yellowGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="sGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id="sGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      {/* Blue arrow — top-right, sweeping clockwise from ~11 o'clock to ~2 o'clock */}
      <path
        d="M 35.5 13.8 A 30 30 0 0 1 64.5 13.8"
        stroke="url(#blueGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="67.4,10.2 72,17.6 62.4,16.2" fill="url(#blueGrad)" />

      {/* Red arrow — right side, sweeping clockwise from ~2 o'clock to ~5 o'clock */}
      <path
        d="M 74.7 31.0 A 30 30 0 0 1 74.7 69.0"
        stroke="url(#redGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="78.6,67.0 71.2,72.0 72.6,62.4" fill="url(#redGrad)" />

      {/* Green arrow — bottom-left, sweeping clockwise from ~5 o'clock to ~8 o'clock */}
      <path
        d="M 64.5 86.2 A 30 30 0 0 1 35.5 86.2"
        stroke="url(#greenGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="32.6,89.8 28,82.4 37.6,83.8" fill="url(#greenGrad)" />

      {/* Yellow arrow — left side, sweeping clockwise from ~8 o'clock to ~11 o'clock */}
      <path
        d="M 25.3 69.0 A 30 30 0 0 1 25.3 31.0"
        stroke="url(#yellowGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="21.4,33.0 28.8,28.0 27.4,37.6" fill="url(#yellowGrad)" />

      {/* Center "S" — two overlapping ribbon strokes for a 3D look */}
      <path
        d="M 39 38 C 39 32, 61 32, 61 38 C 61 44, 39 44, 39 50 C 39 56, 61 56, 61 62"
        stroke="url(#sGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 41 40 C 41 34, 63 34, 63 40 C 63 46, 41 46, 41 52 C 41 58, 63 58, 63 64"
        stroke="url(#sGrad2)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
