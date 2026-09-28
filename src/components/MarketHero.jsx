import { fmtPrice, fmtPct, fmtBig } from '../lib/format'
import { Sparkline } from './Sparkline'
import { TokenIcon } from './TokenIcon'
import { MonadMark } from './MonadMark'
import { DashboardSkeleton } from './Skeleton'

// Hero shown when no wallet is connected: MON market overview.
export function MarketHero({ mon }) {
  const up = (mon?.change24h ?? 0) >= 0
  // Market data not loaded yet: same skeleton as the Portfolio card
  if (!mon) return <DashboardSkeleton heroOnly />

  return (
    <div className="relative overflow-hidden isolate [clip-path:inset(0_round_22px)] rounded-[22px] px-4 py-3.5 mb-3 border border-white/10 bg-[linear-gradient(150deg,#8a75ff_0%,#6E54FF_38%,#2d1c8f_76%,#150d3a_100%)] shadow-[0_16px_40px_-12px_rgba(110,84,255,.55)]">
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-monad-berry/20 blur-3xl" />
      {/* big transparent Monad mark as a watermark */}
      <MonadMark className="pointer-events-none absolute -right-14 top-1/2 -translate-y-1/2 w-[300px] h-[300px] text-white/[.08]" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <TokenIcon symbol="MON" logo={mon?.image} size={22} round />
          <span className="text-[11px] tracking-[1.5px] uppercase text-white/75">Monad · MON</span>
          {mon?.rank && (
            <span className="ml-auto text-[11px] font-bold text-white bg-black/25 rounded-full px-2.5 py-1">
              #{mon.rank}
            </span>
          )}
        </div>

        <div className="mt-1.5 text-white text-[32px] font-extrabold tracking-tight leading-none">
          {fmtPrice(mon?.price)}
        </div>
        {mon?.change24h != null && (
          <div className={`mt-2 text-[13px] font-bold ${up ? 'text-monad-green' : 'text-[#ff9a9a]'}`}>
            {up ? '▲' : '▼'} {fmtPct(mon.change24h)} <span className="text-white/55 font-medium">24h</span>
          </div>
        )}

        <Sparkline values={mon?.sparkline} className="h-10 mt-2" />
        <div className="text-[9px] text-white/45 mt-1">7 days</div>

        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <Stat label="Market cap" value={fmtBig(mon?.marketCap)} />
          <Stat
            label="Circulating"
            value={mon?.circulatingSupply ? `${(mon.circulatingSupply / 1e9).toFixed(2)}B MON` : '—'}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-black/20 rounded-xl px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-[.5px] text-white/60 font-semibold">{label}</div>
      <div className="text-sm font-bold text-white mt-0.5">{value}</div>
    </div>
  )
}
