import { useState, useEffect } from 'react'
import { fmtUsd, fmtPrice, fmtPct } from '../lib/format'
import { WMON_ADDRESS } from '../hooks/usePortfolio'
import { Sparkline } from './Sparkline'
import { TokenIcon } from './TokenIcon'
import { MonadMark } from './MonadMark'

// Recorded portfolio history needs a few points before it's worth charting;
// until then the chart shows MON's 7-day price instead.
const MIN_HISTORY_POINTS = 3
const HIDE_KEY = 'monadmax:hideBalance'

// Allocation groups for the bar under the chart
const GROUPS = [
  { key: 'mon', label: 'MON', color: '#DDD7FE' },
  { key: 'staked', label: 'Staked', color: '#2ee67f' },
  { key: 'stable', label: 'Stables', color: '#85E6FF' },
  { key: 'other', label: 'Other', color: '#FF8EE4' },
]

function groupOf(t) {
  if (t.id === 'staked' || t.lst) return 'staked'
  if (t.id === 'native' || t.contractAddress?.toLowerCase() === WMON_ADDRESS) return 'mon'
  if (/USD|DAI/i.test(t.symbol)) return 'stable'
  return 'other'
}

function loadHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}

// "$1,234.56" -> ["$1,234", ".56"] so cents can be rendered smaller
function splitCents(s) {
  const i = s.lastIndexOf('.')
  return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i)]
}

export function PortfolioHero({
  total,
  change24h,
  change24hUsd,
  tokens,
  monPrice,
  monChange,
  monLogo,
  monSparkline,
  history,
  loading,
}) {
  const [hidden, setHidden] = useState(loadHidden)
  useEffect(() => {
    try {
      localStorage.setItem(HIDE_KEY, hidden ? '1' : '0')
    } catch {
      // not persisted — fine
    }
  }, [hidden])

  const hasHistory = history.length >= MIN_HISTORY_POINTS
  const since = history[0] ? new Date(history[0].t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
  const up = (change24h ?? 0) >= 0

  const [whole, cents] = splitCents(fmtUsd(total))
  const mask = (s) => (hidden ? '••••' : s)

  // Allocation by group, as % of total
  const alloc = GROUPS.map((g) => {
    const v = tokens.filter((t) => groupOf(t) === g.key).reduce((s, t) => s + (t.value ?? 0), 0)
    return { ...g, pct: total > 0 ? (v / total) * 100 : 0 }
  }).filter((g) => g.pct > 0)

  return (
    <div className="relative overflow-hidden rounded-[22px] px-4 py-3.5 mb-3 border border-white/10 bg-[linear-gradient(150deg,#8a75ff_0%,#6E54FF_38%,#2d1c8f_76%,#150d3a_100%)] shadow-[0_16px_40px_-12px_rgba(110,84,255,.55)]">
      {/* soft light blobs for depth */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-monad-berry/20 blur-3xl" />
      {/* big transparent Monad mark as a watermark */}
      <MonadMark className="pointer-events-none absolute -right-14 top-1/2 -translate-y-1/2 w-[300px] h-[300px] text-white/[.08]" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setHidden((h) => !h)}
            className="flex items-center gap-1.5 text-[11px] tracking-[1.5px] uppercase text-white/75 hover:text-white"
            title={hidden ? 'Show balance' : 'Hide balance'}
          >
            Total balance
            <EyeIcon off={hidden} />
          </button>
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur rounded-full pl-1 pr-2.5 py-1">
            <TokenIcon symbol="MON" logo={monLogo} size={16} round />
            <span className="text-white text-xs font-bold">{fmtPrice(monPrice)}</span>
            {monChange != null && (
              <span className={`text-[11px] font-semibold ${monChange >= 0 ? 'text-monad-green' : 'text-[#ff9a9a]'}`}>
                {fmtPct(monChange)}
              </span>
            )}
          </div>
        </div>

        <div className={`mt-2 text-white font-extrabold tracking-tight leading-none ${loading ? 'opacity-50' : ''}`}>
          <span className="text-[32px]">{mask(whole)}</span>
          {!hidden && <span className="text-[20px] text-white/70">{cents}</span>}
        </div>

        {change24h != null && (
          <div className={`mt-1 inline-flex items-center gap-1 text-[12px] font-bold ${up ? 'text-monad-green' : 'text-[#ff9a9a]'}`}>
            <span>{up ? '▲' : '▼'}</span>
            <span>{mask(fmtUsd(Math.abs(change24hUsd ?? 0)))}</span>
            <span className="opacity-80">({fmtPct(change24h)})</span>
            <span className="text-white/55 font-medium ml-0.5">today</span>
          </div>
        )}

        <Sparkline values={hasHistory ? history.map((p) => p.v) : monSparkline} className="h-10 mt-2" />
        <div className="text-[9px] text-white/45 mt-1">
          {hasHistory ? `Your portfolio since ${since}` : 'MON price · 7d'}
        </div>

        {alloc.length > 0 && (
          <div className="mt-2.5">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-black/25 gap-[2px]">
              {alloc.map((g) => (
                <div key={g.key} style={{ width: `${g.pct}%`, background: g.color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {alloc.map((g) => (
                <span key={g.key} className="flex items-center gap-1.5 text-[11px] text-white/80">
                  <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                  {g.label}
                  <span className="text-white/55">{g.pct.toFixed(0)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EyeIcon({ off }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}
