/**
 * VOXEL brand mark — an isometric voxel cube with nexus nodes.
 * Pure SVG, scales cleanly from 16px favicons to launch screens.
 */
export function NexusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nexus-top" x1="32" y1="10" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b79cff" />
          <stop offset="1" stopColor="#9155ff" />
        </linearGradient>
        <linearGradient id="nexus-left" x1="12" y1="20" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3580f7" />
          <stop offset="1" stopColor="#2a6bff" />
        </linearGradient>
        <linearGradient id="nexus-right" x1="52" y1="20" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b3dff" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
      </defs>

      {/* Isometric voxel cube */}
      <polygon points="32,10 52,20 32,30 12,20" fill="url(#nexus-top)" />
      <polygon points="12,20 32,30 32,52 12,42" fill="url(#nexus-left)" />
      <polygon points="52,20 32,30 32,52 52,42" fill="url(#nexus-right)" />

      {/* Edge highlights */}
      <polyline
        points="32,10 52,20 52,42 32,52 12,42 12,20 32,10"
        stroke="#3ee7fb"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        fill="none"
      />
      <polyline
        points="32,30 32,52"
        stroke="#3ee7fb"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />

      {/* Nexus nodes */}
      <circle cx="32" cy="10" r="2.6" fill="#3ee7fb" />
      <circle cx="52" cy="20" r="2.6" fill="#3ee7fb" />
      <circle cx="12" cy="20" r="2.6" fill="#3ee7fb" />
      <circle cx="32" cy="52" r="2.6" fill="#3ee7fb" />
      <circle cx="52" cy="42" r="2.6" fill="#3ee7fb" fillOpacity="0.85" />
      <circle cx="12" cy="42" r="2.6" fill="#3ee7fb" fillOpacity="0.85" />
      <circle cx="32" cy="30" r="2.2" fill="#eaf6ff" />
    </svg>
  );
}

export function NexusLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <NexusMark className="h-8 w-8" />
        <div className="leading-none">
          <span className="text-sm font-bold tracking-[0.18em] text-foreground">
            VOXEL
          </span>
          {!compact && (
            <span className="ml-1.5 text-[10px] font-semibold tracking-[0.28em] text-primary">
              AI CREATION
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
