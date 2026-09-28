import { useState, useMemo, useEffect } from 'react'
import { useValidators } from '../hooks/useValidators'
import { useTx, TxStatus } from '../hooks/useTx'
import { FEATURED_VALIDATORS } from '../config/featured'
import { fmtUsd, fmtAmount } from '../lib/format'
import { parseMonAmount } from '../lib/amount'
import { ContractLine } from './ContractLine'
import { Sheet } from './Sheet'
import { TokenIcon } from './TokenIcon'
import { SkeletonRows } from './Skeleton'

// Keep some MON for gas when the user taps "Max"
const GAS_RESERVE_MON = 0.5
// Warn before staking with a validator that keeps a big share of rewards
const HIGH_FEE_PCT = 20

const SORTS = [
  { key: 'random', label: 'Random' },
  { key: 'apr', label: 'APR' },
  { key: 'fee', label: 'Low fee' },
  { key: 'small', label: 'Smaller' },
]

// Fair default: a fresh random order on every visit, so small validators
// get the same visibility as big ones (good for decentralization).
function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function StakeSheet({ open, onClose, address, nativeMon, monPrice, initialSort = 'random', initialValidatorId, onDone }) {
  const { validators, error } = useValidators(open)
  const [sort, setSort] = useState(initialSort)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')
  const tx = useTx(onDone)

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setSort(initialSort)
      setSelected(null)
      setAmount('')
      setQuery('')
      tx.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSort])

  // Deep link: preselect a validator once the list is loaded
  useEffect(() => {
    if (open && validators && initialValidatorId != null) {
      const v = validators.find((x) => x.id === initialValidatorId)
      if (v) setSelected(v)
    }
  }, [open, validators, initialValidatorId])

  const randomOrder = useMemo(() => (validators ? shuffle(validators) : []), [validators])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let l = randomOrder.filter((v) => !q || v.name.toLowerCase().includes(q) || String(v.id) === q)
    if (sort === 'apr') l = [...l].sort((a, b) => (b.apr ?? -1) - (a.apr ?? -1))
    if (sort === 'fee') l = [...l].sort((a, b) => a.commission - b.commission || (b.apr ?? 0) - (a.apr ?? 0))
    if (sort === 'small') l = [...l].sort((a, b) => a.stake - b.stake)
    const featuredIds = new Set(FEATURED_VALIDATORS.map((f) => f.id))
    const featured = l.filter((v) => featuredIds.has(v.id))
    return [...featured, ...l.filter((v) => !featuredIds.has(v.id))]
  }, [randomOrder, sort, query])

  const featuredIds = new Set(FEATURED_VALIDATORS.map((f) => f.id))
  const maxAmount = Math.max(0, nativeMon - GAS_RESERVE_MON)
  // One parsed value drives the label AND the transaction
  const parsed = parseMonAmount(amount)
  const valid = parsed && !parsed.error
  const amt = valid ? Number(parsed.mon) : 0
  const tooMuch = valid && amt > maxAmount
  const yearly = selected?.apr != null ? (amt * selected.apr) / 100 : null

  async function submit() {
    if (!valid || tooMuch) return
    const ok = await tx.run(`Stake ${parsed.mon} MON`, (m) => m.stake(address, selected.id, parsed.wei))
    if (ok) setAmount('')
  }

  return (
    <Sheet open={open} onClose={onClose} title={selected ? 'Stake MON' : 'Choose a validator'}>
      {!selected && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or #id"
            className="w-full bg-monad-card2 border border-monad-line rounded-xl px-3 py-2 text-sm outline-none focus:border-monad-purple"
          />
          <div className="flex gap-1.5 mt-2 mb-2">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                  sort === s.key ? 'bg-monad-purple border-monad-purple text-white' : 'bg-monad-card2 border-monad-line text-monad-sub'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-monad-sub/70 mb-2">
            {sort === 'random'
              ? 'Shuffled on every visit so every validator gets a fair chance.'
              : 'APR is measured from the last ~24h of rewards, after the validator fee.'}
          </p>

          {error && <p className="text-[#ff7a7a] text-xs">Couldn't load validators: {error}</p>}
          {!validators && !error && <SkeletonRows rows={7} />}

          <div className="space-y-1">
            {list.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-monad-card2 text-left"
              >
                <TokenIcon symbol={v.name} logo={v.logo} size={28} round />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">
                    {v.name}
                    <span className="text-monad-sub font-semibold text-[11px]"> #{v.id}</span>
                    {featuredIds.has(v.id) && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-[#FFAE45]/20 text-[#FFAE45] font-bold">
                        SPONSORED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-monad-sub">
                    {v.commission}% fee · {(v.stake / 1e6).toFixed(1)}M staked
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-monad-green">{v.apr != null ? `${v.apr.toFixed(2)}%` : '—'}</div>
                  <div className="text-[10px] text-monad-sub">APR</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selected && (
        <>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-monad-card2">
            <TokenIcon symbol={selected.name} logo={selected.logo} size={34} round />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{selected.name}</div>
              <div className="text-[11px] text-monad-sub">
                #{selected.id} · {selected.commission}% fee · {selected.apr != null ? `${selected.apr.toFixed(2)}% APR` : 'APR n/a'}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-monad-purple2 font-semibold">
              Change
            </button>
          </div>

          <label className="block mt-3">
            <span className="flex justify-between text-[11px] text-monad-sub mb-1">
              <span>Amount</span>
              <span>Available: {fmtAmount(nativeMon)} MON</span>
            </span>
            <span className="flex items-center gap-2 bg-monad-card2 border border-monad-line rounded-xl px-3 focus-within:border-monad-purple">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(',', '.'))}
                placeholder="0"
                className="flex-1 bg-transparent py-2.5 font-bold text-lg outline-none min-w-0"
              />
              <span className="text-monad-sub font-semibold">MON</span>
              <button
                onClick={() => setAmount((Math.floor(maxAmount * 1e4) / 1e4).toFixed(4))}
                className="text-[11px] font-bold text-monad-purple2 bg-monad-purple/15 rounded-md px-2 py-1"
              >
                MAX
              </button>
            </span>
          </label>
          <div className="text-[11px] text-monad-sub mt-1.5 flex justify-between">
            <span>{monPrice && amt > 0 ? `≈ ${fmtUsd(amt * monPrice)}` : ''}</span>
            {yearly != null && amt > 0 && <span className="text-monad-green">≈ {fmtAmount(yearly)} MON / year</span>}
          </div>
          {parsed?.error && <p className="text-[11px] text-[#ff7a7a] mt-1">{parsed.error}</p>}
          {selected.commission >= HIGH_FEE_PCT && (
            <p className="text-[11px] text-[#FFAE45] bg-[#FFAE45]/10 rounded-lg px-2.5 py-1.5 mt-2">
              ⚠ This validator keeps {selected.commission}% of your rewards. Most charge 10–15%.
            </p>
          )}
          {tooMuch && (
            <p className="text-[11px] text-[#ff7a7a] mt-1">Keep ~{GAS_RESERVE_MON} MON for gas (max {fmtAmount(maxAmount)}).</p>
          )}

          <button
            disabled={!valid || tooMuch || tx.pending}
            onClick={submit}
            className="w-full mt-3 py-3 rounded-xl bg-monad-purple enabled:hover:brightness-110 disabled:opacity-40 text-white font-bold text-sm"
          >
            {tx.pending ? 'Waiting for wallet…' : `Stake ${valid ? parsed.mon : ''} MON`}
          </button>
          <TxStatus tx={tx} />
          <ContractLine fn="delegate" />
          <p className="text-[10px] text-monad-sub/70 mt-2 leading-snug">
            Your wallet will ask you to confirm. Stake starts earning from the next epoch (~4h). Unstaking takes ~2–3 epochs.
          </p>
        </>
      )}
    </Sheet>
  )
}
