import { useState } from 'react'
import { fmtUsd, fmtPrice } from '../lib/format'
import { Card, CardTitle, HeadPrice, InfoTip } from './Card'
import { SkeletonCard } from './Skeleton'

// Levels scale with total portfolio value
function levelFor(usd) {
  if (usd < 3000) return 'Cocktail 🍹'
  if (usd < 15000) return 'Beach 🏖️'
  if (usd < 100000) return 'Lambo 🏎️'
  if (usd < 1000000) return 'Yacht 🛥️'
  return 'Tycoon 🎩'
}

// `onAmountChange` = calculator mode (no wallet): the user types how much
// MON they hold instead of it being read from the chain.
export function LadderCard({ total, monAmount, monPrice, monChange, onAmountChange }) {
  const [mode, setMode] = useState('step')

  if (!monPrice) return <SkeletonCard title="What if price goes up" rows={4} />

  const prices =
    mode === 'step'
      ? Array.from({ length: 6 }, (_, i) => monPrice + 0.01 * (i + 1))
      : [2, 5, 10, 25, 50, 100].map((m) => monPrice * m)

  // Only the MON part of the portfolio is repriced; everything else stays
  const otherUsd = total - monAmount * monPrice

  const tabCls = (active) =>
    `flex-1 border rounded-lg px-1.5 py-1.5 text-xs font-semibold ${
      active ? 'bg-monad-purple text-white border-monad-purple' : 'bg-monad-card2 text-monad-sub border-monad-line'
    }`

  return (
    <Card>
      <div className="flex justify-between items-start mb-2.5">
        <CardTitle>
          What if price goes up
          <InfoTip>
            {onAmountChange
              ? 'Calculator mode: type how much MON you hold. Connect a wallet to use your real balance.'
              : `Uses ${monAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} MON (wallet + staked + WMON + liquid staking). Other tokens keep their current value.`}{' '}
            Levels: cocktail → beach → lambo → yacht → tycoon.
          </InfoTip>
        </CardTitle>
        <HeadPrice price={fmtPrice(monPrice)} change={monChange} />
      </div>

      {onAmountChange && (
        <label className="flex items-center justify-between gap-3 mb-2.5 px-2.5 py-2 bg-monad-card2 rounded-xl">
          <span className="text-[13px] text-monad-sub leading-tight">
            I hold
            {/* Today's value of the typed amount — a reference point for the table */}
            {monAmount > 0 && (
              <span className="block text-[11px] text-monad-txt/80 font-semibold">≈ {fmtUsd(monAmount * monPrice)}</span>
            )}
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[13px]">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={monAmount || ''}
              placeholder="0"
              onChange={(e) => onAmountChange(Math.max(0, parseFloat(e.target.value) || 0))}
              className="bg-monad-bg border border-monad-line rounded-lg px-2 py-1 w-28 text-right font-bold outline-none focus:border-monad-purple"
            />
            MON
          </span>
        </label>
      )}

      <div className="flex gap-1.5 mb-1.5">
        <button className={tabCls(mode === 'step')} onClick={() => setMode('step')}>
          +$0.01
        </button>
        <button className={tabCls(mode === 'mult')} onClick={() => setMode('mult')}>
          ×2 … ×100
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-monad-sub text-[10px] uppercase tracking-[.5px] border-b border-monad-line">
              <th className="text-left font-semibold px-1 py-1.5">MON price</th>
              <th className="text-right font-semibold px-1 py-1.5">Portfolio</th>
              <th className="text-right font-semibold px-1 py-1.5">Level</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => {
              const usd = otherUsd + monAmount * p
              return (
                <tr key={p}>
                  <td className="text-left px-1 py-1.5 whitespace-nowrap">
                    {fmtPrice(p)} <Badge>{(p / monPrice).toFixed(1)}×</Badge>
                  </td>
                  <td className="text-right px-1 py-1.5">{fmtUsd(usd)}</td>
                  <td className="text-right px-1 py-1.5">
                    <Badge>{levelFor(usd)}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </Card>
  )
}

function Badge({ children }) {
  return (
    <span className="text-[10px] px-[7px] py-[3px] rounded-lg bg-monad-card2 text-monad-sub font-semibold whitespace-nowrap">
      {children}
    </span>
  )
}
