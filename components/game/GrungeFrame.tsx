// The grunge frame container used for ALL local game views.
// Matches the wireframe: dark background, worn border texture, rounded-3xl, max-w-sm.

type GrungeFrameProps = {
  children: React.ReactNode;
  header?: string; // e.g. "3/5" or "VOTA: JUGADOR 1" or "ELIMINACION"
};

export function GrungeFrame({ children, header }: GrungeFrameProps) {
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-0">
      {/* Outer grunge frame */}
      <div
        className="relative w-full rounded-3xl overflow-hidden"
        style={{
          background: "#111111",
          border: "3px solid #3d2e1a",
          boxShadow:
            "inset 0 0 0 1px #1a1008, 0 0 0 1px #3d2e1a, 0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Noise texture overlay for grunge effect */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
          }}
        />

        {/* Header */}
        {header && (
          <div className="relative z-20 pt-5 pb-3 text-center">
            <span
              className="text-text-primary tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)", fontSize: "22px" }}
            >
              {header}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="relative z-20 px-4 pb-5">{children}</div>
      </div>
    </div>
  );
}
