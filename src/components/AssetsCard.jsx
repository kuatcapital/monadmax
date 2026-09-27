import { useState } from 'react'
import { fmtUsd, fmtAmount, fmtPrice } from '../lib/format'
import { Card, CardTitle } from './Card'
import { TokenIcon } from './TokenIcon'

// Show the biggest positions first; the long tail (dust, small bags)
// sits behind a "Show all" button instead of an inner scroll area,
// which is awkward on phones.
const COLLAPSED_ROWS = 4

export function AssetsCard({ tokens, hiddenCount, loading, error }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? tokens : tokens.slice(0, COLLAPSED_ROWS)
  const rest = tokens.length - COLLAPSED_ROWS

  return (
    <Card>
      <div className="flex justify-between items-center mb-1.5">
        <CardTitle>Assets{tokens.length > 0 && <span className="text-monad-sub/70"> · {tokens.length}</span>}</CardTitle>
        {loading && <span className="text-[11px] text-monad-purple2">Loading…</span>}
      </div>

      {error && <p className="text-[#ff7a7a] text-xs mb-2">Error: {error}</p>}
      {!loading && !error && tokens.length === 0 && <p className="text-monad-sub text-xs">No assets found.</p>}

      {shown.map((t) => (
        <div
          key={t.id}
          className="flex justify-between items-center py-2 border-b border-monad-line last:border-b-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <TokenIcon symbol={t.symbol} logo={t.logo} />
            <div className="min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1.5">
                {t.symbol}
                {t.label && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-monad-purple/20 text-monad-purple2 font-bold uppercase tracking-wide">
                    {t.label}
                  </span>
                )}
              </div>
              <div className="text-monad-sub text-[11px] truncate">
                {fmtAmount(t.amount)} {t.symbol}
                {t.price != null && <> · {fmtPrice(t.price)}</>}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            <div className="font-bold text-sm">{fmtUsd(t.value)}</div>
            {t.pct != null && <div className="text-[11px] text-monad-purple2 mt-px">{t.pct.toFixed(1)}%</div>}
          </div>
        </div>
      ))}

      {rest > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-2 py-2 rounded-xl bg-monad-card2 border border-monad-line text-xs font-semibold text-monad-purple2 hover:border-monad-purple"
        >
          {expanded ? 'Show less' : `Show all (${rest} more)`}
        </button>
      )}

      {hiddenCount > 0 && (
        <p className="text-[10px] text-monad-sub/60 mt-2">
          {hiddenCount} spam/unpriced token{hiddenCount > 1 ? 's' : ''} hidden
        </p>
      )}
    </Card>
  )
}
