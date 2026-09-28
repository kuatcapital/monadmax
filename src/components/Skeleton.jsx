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
