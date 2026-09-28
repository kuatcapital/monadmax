// Placeholder shown while the wallet reconnects after a reload: the shape
// of the Portfolio card and the next card, softly pulsing, instead of an
// empty gap.

const bar = 'rounded-md bg-white/[.12]'

export function DashboardSkeleton({ heroOnly = false }) {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="rounded-[22px] px-4 py-3.5 mb-3 border border-white/10 bg-[linear-gradient(150deg,#8a75ff_0%,#6E54FF_38%,#2d1c8f_76%,#150d3a_100%)] opacity-60">
        <div className="flex items-center justify-between">
          <div className={`${bar} h-3 w-28`} />
          <div className={`${bar} h-6 w-32 rounded-full`} />
        </div>
        <div className={`${bar} h-8 w-36 mt-3`} />
        <div className={`${bar} h-3 w-40 mt-2.5`} />
        <div className={`${bar} h-10 w-full mt-3`} />
        <div className={`${bar} h-1.5 w-full mt-3 rounded-full`} />
        <div className="flex gap-3 mt-2">
          {[14, 16, 18, 14].map((w, i) => (
            <div key={i} className={`${bar} h-2.5`} style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>
      {!heroOnly && (
      <div className="rounded-[18px] p-3.5 mb-3 bg-monad-card border border-monad-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[.07]" />
          <div className="flex-1">
            <div className="h-2.5 w-24 rounded bg-white/[.07]" />
            <div className="h-4 w-36 rounded bg-white/[.07] mt-2" />
          </div>
          <div className="h-8 w-24 rounded-full bg-white/[.07]" />
        </div>
      </div>
      )}
    </div>
  )
}

// Row placeholders for list cards (assets, market caps, validators, staking):
// icon circle + two text bars on the left, one bar on the right. Same soft
// white-on-card tint everywhere, so skeletons blend into the palette.
export function SkeletonRows({ rows = 3, boxed = false }) {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-1.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex items-center gap-2.5 py-2 ${boxed ? 'px-3 rounded-xl bg-monad-card2/80' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-white/[.07] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 w-20 rounded bg-white/[.07]" />
            <div className="h-2.5 w-32 rounded bg-white/[.05] mt-1.5" />
          </div>
          <div className="h-3.5 w-14 rounded bg-white/[.07]" />
        </div>
      ))}
    </div>
  )
}

// Title-only card with skeleton rows, for cards that can't render yet
export function SkeletonCard({ title, rows = 3, boxed = false, children }) {
  return (
    <div className="bg-monad-card border border-monad-line rounded-[18px] p-3.5 mb-3">
      <h2 className="flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px] text-monad-sub font-bold m-0 min-h-[24px] mb-2.5">
        {title}
      </h2>
      {children ?? <SkeletonRows rows={rows} boxed={boxed} />}
    </div>
  )
}
