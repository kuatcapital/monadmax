import { fmtBig, fmtPrice, fmtUsd } from '../lib/format'
import { Card, CardTitle, InfoTip } from './Card'
import { TokenIcon } from './TokenIcon'
import { COMPARE_IDS } from '../lib/markets'

export function McapCard({ markets, monAmount, monPrice, monChange }) {
  const mon = markets?.monad
  if (!mon || !monPrice) {
    return (
      <Card>
        <CardTitle>If MON market cap</CardTitle>
        <p className="text-[11px] text-monad-sub mt-3">Loading market data…</p>
      </Card>
    )
  }

  // Same number of coins in circulation, bigger market cap → higher price
  const supply = mon.circulatingSupply

  return (
    <Card>
      <div className="flex justify-between items-start min-h-[24px] mb-2.5">
        <CardTitle>
          If MON market cap
          <InfoTip>
            What 1 MON would cost if Monad had the market cap of each coin, with today's{' '}
            {(supply / 1e9).toFixed(2)}B MON in circulation. Live data from CoinMarketCap, updated every 5 minutes.
          </InfoTip>
        </CardTitle>
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2 mb-1.5 rounded-xl border border-monad-purple bg-[linear-gradient(135deg,rgba(110,84,255,.18),rgba(110,84,255,.05))]">
        <TokenIcon symbol="MON" logo={mon.image} size={26} round />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold flex items-center">
            Monad <Pill>MON</Pill>
          </div>
          <div className="text-[10px] text-monad-sub font-semibold mt-px">#{mon.rank} in market cap</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-extrabold text-monad-purple2">{fmtBig(mon.marketCap)}</div>
          <span className="block text-[10px] text-monad-green font-semibold mt-px">current mcap</span>
        </div>
      </div>

      {COMPARE_IDS.map((id) => {
        const c = markets[id]
        if (!c) return null
        const price = c.marketCap / supply
        const mult = price / monPrice
        return (
          <div key={id} className="flex items-center gap-2.5 px-3 py-2 mb-1.5 rounded-xl bg-monad-card2 border border-monad-line">
            <TokenIcon symbol={c.symbol} logo={c.image} size={26} round />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold flex items-center">
                {c.name}
                <Pill>{fmtBig(c.marketCap)}</Pill>
              </div>
              <div className="text-[12px] mt-px truncate">
                <b>1 MON = {fmtPrice(price)}</b>
                {monAmount > 0 && <span className="text-monad-sub"> · yours {fmtUsd(monAmount * price)}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[15px] font-extrabold text-monad-purple2">
                {mult.toLocaleString('en-US', { maximumFractionDigits: mult >= 100 ? 0 : 1 })}×
              </div>
            </div>
          </div>
        )
      })}

    </Card>
  )
}

function Pill({ children }) {
  return (
    <span className="text-[9px] px-[7px] py-[3px] rounded-md bg-[#85E6FF]/[.16] text-[#9BEBFF] ml-1.5 font-bold">
      {children}
    </span>
  )
}
