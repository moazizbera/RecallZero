import { cn } from "@/lib/utils"

export function BrandMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl bg-background/70 text-primary shadow-[0_18px_70px_color-mix(in_oklab,var(--primary)_22%,transparent)]",
        animated && "rz-mark-animated",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible" role="img">
        <defs>
          <linearGradient id="rz-mark-gold" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" stopOpacity="1" />
            <stop offset="0.48" stopColor="currentColor" stopOpacity="0.58" />
            <stop offset="1" stopColor="var(--success)" stopOpacity="0.95" />
          </linearGradient>
          <filter id="rz-mark-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M32 4 52.8 12.6 61 32 52.8 51.4 32 60 11.2 51.4 3 32 11.2 12.6 32 4Z"
          fill="color-mix(in oklab, var(--background) 84%, black)"
          stroke="url(#rz-mark-gold)"
          strokeWidth="2.4"
        />
        <path
          className="rz-mark-orbit"
          d="M18.8 18.5A18.6 18.6 0 1 1 14 36.7"
          fill="none"
          stroke="url(#rz-mark-gold)"
          strokeLinecap="round"
          strokeWidth="3.8"
        />
        <path
          d="M21.8 41.8 42.2 21.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          className="rz-mark-scan"
          d="M14 31.7h36"
          fill="none"
          stroke="var(--success)"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <circle className="rz-mark-pulse" cx="32" cy="32" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="32" cy="32" r="3.2" fill="currentColor" filter="url(#rz-mark-glow)" />
      </svg>
    </span>
  )
}

export function BrandLockup({ className, markClassName, animated = false }: { className?: string; markClassName?: string; animated?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark animated={animated} className={cn("h-9 w-9", markClassName)} />
      <span className="flex flex-col leading-none">
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">RecallZero</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Decision Cockpit</span>
      </span>
    </span>
  )
}
