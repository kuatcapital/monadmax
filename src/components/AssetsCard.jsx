import { useState } from 'react'
import { fmtUsd, fmtAmount, fmtPrice } from '../lib/format'
import { useActivity } from '../hooks/useActivity'
import { Card, InfoTip } from './Card'
import { TokenIcon } from './TokenIcon'
import { SkeletonRows } from './Skeleton'

// Show the biggest positions first; the long tail (dust, small bags)
// sits behind a "Show all" button instead of an inner scroll area,
// which is awkward on phones.
const COLLAPSED_ROWS = 4
const EXPLORER = 'https://monadscan.com/tx/'

export function AssetsCard({ tokens, hiddenCount, loading, error, address }) {
  const [tab, setTab] = useState('assets')

  const tabCls = (active) =>
    `px-2.5 h-6 rounded-md text-[10px] font-bold uppercase tracking-[.8px] transition ${
      active ? 'bg-monad-purple text-white' : 'text-monad-sub hover:text-monad-txt'
    }`

  return (
    <Card>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-monad-card2 border border-monad-line">
          <button className={tabCls(tab === 'assets')} onClick={() => setTab('assets')}>
            Assets{tokens.length > 0 && <span className="opacity-70"> · {tokens.length}</span>}
          </button>
          <button className={tabCls(tab === 'activity')} onClick={() => setTab('activity')}>
            Activity
          </button>
        </div>
        {tab === 'activity' && (
          <InfoTip>
            Your latest swaps, sends and receives. Staking actions live in the Staking card below. Spam airdrops are
            hidden.
          </InfoTip>
        )}
      </div>

      {tab === 'assets' ? (
        <AssetsList tokens={tokens} hiddenCount={hiddenCount} loading={loading} error={error} />
      ) : (
        <ActivityList address={address} />
      )}
    </Card>
  )
}

function AssetsList({ tokens, hiddenCount, loading, error }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? tokens : tokens.slice(0, COLLAPSED_ROWS)
  const rest = tokens.length - COLLAPSED_ROWS

  return (
    <>
      {loading && tokens.length === 0 && <SkeletonRows rows={4} />}
      {error && <p className="text-[#ff7a7a] text-xs mb-2">Error: {error}</p>}
      {!loading && !error && tokens.length === 0 && <p className="text-monad-sub text-xs">No assets found.</p>}

      {shown.map((t) => (
        <div key={t.id} className="flex justify-between items-center py-2 border-b border-monad-line last:border-b-0">
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
    </>
  )
}

const KIND = {
  swap: { icon: '⇄', title: 'Swap', tint: 'bg-monad-purple/20 text-monad-purple2' },
  send: { icon: '↗', title: 'Sent', tint: 'bg-[#FF8EE4]/15 text-[#FF8EE4]' },
  receive: { icon: '↙', title: 'Received', tint: 'bg-monad-green/15 text-monad-green' },
  stake: { icon: '🥩', title: 'Staked', tint: 'bg-[#FFAE45]/15 text-[#FFAE45]' },
  compound: { icon: '♻️', title: 'Compounded rewards', tint: 'bg-monad-green/15 text-monad-green' },
  claim: { icon: '🎁', title: 'Claimed rewards', tint: 'bg-monad-green/15 text-monad-green' },
  unstake: { icon: '↩', title: 'Unstake requested', tint: 'bg-[#FFAE45]/15 text-[#FFAE45]' },
  withdraw: { icon: '📥', title: 'Withdrew stake', tint: 'bg-[#85E6FF]/15 text-[#85E6FF]' },
  staking: { icon: '🥩', title: 'Staking action', tint: 'bg-[#FFAE45]/15 text-[#FFAE45]' },
  wrap: { icon: '⟳', title: 'Wrapped MON', tint: 'bg-[#85E6FF]/15 text-[#85E6FF]' },
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 30 * 86400) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const legText = (l) => `${fmtAmount(l.value)} ${l.asset}`

function ActivityList({ address }) {
  const { items, error, loading } = useActivity(address, true)
  const [expanded, setExpanded] = useState(false)

  if (error) return <p className="text-[#ff7a7a] text-xs py-2">Couldn't load activity: {error}</p>
  if (!items)
    return (
      <div className="space-y-2 py-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-monad-card2 animate-pulse" />
        ))}
      </div>
    )
  if (items.length === 0) return <p className="text-monad-sub text-xs py-2">No transactions yet.</p>

  return (
    <div className={loading ? 'opacity-60' : ''}>
      {(expanded ? items : items.slice(0, COLLAPSED_ROWS)).map((a) => {
        const k = KIND[a.kind]
        const staking = ['compound', 'claim', 'unstake', 'withdraw', 'staking'].includes(a.kind)
        const main = staking
          ? 'Monad staking'
          : a.kind === 'swap'
            ? `${a.outs.map(legText).join(' + ')} → ${a.ins.map(legText).join(' + ')}`
            : a.kind === 'receive'
              ? `+${a.ins.map(legText).join(' + ')}`
              : `−${a.outs.map(legText).join(' + ')}`
        const sub = a.kind === 'send' ? `to ${a.counterparty}` : a.kind === 'receive' ? `from ${a.counterparty}` : ''
        return (
          <a
            key={a.hash}
            href={EXPLORER + a.hash}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 py-2 border-b border-monad-line last:border-b-0 hover:bg-white/[.02] -mx-1 px-1 rounded-lg"
          >
            <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[14px] font-bold ${k.tint}`}>
              {k.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2">
                <span className="text-[13px] font-bold">{k.title}</span>
                <span className="text-[10px] text-monad-sub shrink-0">{timeAgo(a.time)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span
                  className={`text-[11px] truncate ${
                    a.kind === 'receive' ? 'text-monad-green' : a.kind === 'swap' ? 'text-monad-txt/85' : 'text-monad-sub'
                  }`}
                >
                  {main}
                </span>
                {sub && <span className="text-[10px] text-monad-sub/70 shrink-0">{sub}</span>}
              </div>
            </div>
          </a>
        )
      })}
      {items.length > COLLAPSED_ROWS && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-2 py-2 rounded-xl bg-monad-card2 border border-monad-line text-xs font-semibold text-monad-purple2 hover:border-monad-purple"
        >
          {expanded ? 'Show less' : `Show all (${items.length - COLLAPSED_ROWS} more)`}
        </button>
      )}
      <p className="text-[10px] text-monad-sub/60 mt-2">Tap a row to open it on Monadscan.</p>
    </div>
  )
}
