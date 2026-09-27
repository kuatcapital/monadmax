import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { fmtUsd, fmtAmount } from '../lib/format'
import { useTx, TxStatus } from '../hooks/useTx'
import { useValidators } from '../hooks/useValidators'
import { Card, CardTitle, InfoTip } from './Card'
import { TokenIcon } from './TokenIcon'
import { Sheet } from './Sheet'
import { StakeSheet } from './StakeSheet'
import { ContractLine } from './ContractLine'
import { parseMonAmount } from '../lib/amount'
import { safeUrl } from '../lib/safeUrl'
import { compoundPlan } from '../lib/compound'
import { formatEther } from 'viem'

// Rough epoch length on mainnet (50,000 blocks at ~0.3s)
const EPOCH_HOURS = 4
// Only suggest other validators when the APR gap is meaningful
const COMPARE_GAP_PCT = 1
// Typical gas used, to tell whether claiming/compounding is worth it yet
const GAS_COMPOUND = 315_000
const GAS_CLAIM = 180_000

// Deep links: #stake opens the picker, #stake=58 opens it on validator #58
// (e.g. a validator's own "stake with us" link)
function readStakeHash() {
  const m = window.location.hash.match(/^#stake(?:=(\d+))?$/)
  return m ? { open: true, validatorId: m[1] ? Number(m[1]) : null } : { open: false, validatorId: null }
}

export function StakingCard({ staking, loading, error, monPrice, address, nativeMon, onChanged }) {
  const [deepLink] = useState(readStakeHash)
  const [stakeOpen, setStakeOpen] = useState(deepLink.open)
  const [stakeSort, setStakeSort] = useState('random')
  const [stakePreset, setStakePreset] = useState(deepLink.validatorId) // "Add more" → same validator
  const [unstakeFor, setUnstakeFor] = useState(null) // { p, mode: 'unstake' | 'redelegate' }
  const tx = useTx(onChanged)
  const { validators } = useValidators(!!staking?.positions.length)

  // Network fee per gas in MON — only fetched when there are positions
  const [gasPriceMon, setGasPriceMon] = useState(null)
  useEffect(() => {
    if (!staking?.positions.length) return
    import('../lib/staking')
      .then((m) => m.getGasPrice())
      .then((wei) => setGasPriceMon(Number(wei) / 1e18))
      .catch(() => {})
  }, [staking?.positions.length])

  // Only the owner of the viewed address can sign. Not connected → open
  // the wallet picker; connected as someone else → explain.
  const { address: connected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const canSign = !!connected && connected.toLowerCase() === address?.toLowerCase()
  const [signNotice, setSignNotice] = useState(false)
  const guard =
    (fn) =>
    (...args) => {
      if (canSign) return fn(...args)
      if (!connected) return openConnectModal?.()
      setSignNotice(true)
    }

  const usd = (mon) => (monPrice != null ? fmtUsd(mon * monPrice) : '')
  const openStake = (sort = 'random', validatorId = null) => {
    setStakeSort(sort)
    setStakePreset(validatorId)
    setStakeOpen(true)
  }

  const totals = staking?.totals
  const staked = totals ? totals.active + totals.pending : 0
  const best = validators?.reduce((b, v) => (v.apr != null && (!b || v.apr > b.apr) ? v : b), null)
  const showCompare = best && totals?.apr != null && best.apr - totals.apr >= COMPARE_GAP_PCT

  return (
    <Card>
      <div className="flex justify-between items-center mb-2.5">
        <CardTitle>
          Staking
          <InfoTip>
            Read live from the Monad staking contract. APR is measured from the last ~24h of rewards, after the
            validator fee. Actions are signed in your own wallet, and nothing happens without your confirmation.
          </InfoTip>
        </CardTitle>
        <div className="flex items-center gap-2">
          {staking && <span className="text-[10px] text-monad-sub/70">epoch {staking.epoch}</span>}
          <button
            onClick={guard(() => openStake())}
            className="group flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-[12px] font-bold text-white bg-[linear-gradient(135deg,#8a75ff,#6E54FF)] shadow-[0_4px_14px_-4px_rgba(110,84,255,.8)] hover:brightness-110 active:scale-[.97] transition"
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 1.5v9M1.5 6h9" />
              </svg>
            </span>
            Stake
          </button>
        </div>
      </div>

      {signNotice && !canSign && (
        <p className="text-[11px] text-[#FFAE45] bg-[#FFAE45]/10 rounded-lg px-2.5 py-1.5 mb-2">
          👁 You're viewing another address. Only its owner can manage this stake. Connect that wallet.
        </p>
      )}
      {loading && !staking && <p className="text-[11px] text-monad-purple2">Loading…</p>}
      {error && !staking && <p className="text-[#ff7a7a] text-xs">Couldn't read staking: {error}</p>}

      {staking && staking.positions.length === 0 && (
        <p className="text-monad-sub text-xs">No MON staked yet. Earn ~10-12% a year by staking with a validator.</p>
      )}

      {staking && staking.positions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <Stat label="Staked" value={fmtAmount(staked)} sub={usd(staked)} />
            <Stat label="Rewards" value={fmtAmount(totals.rewards)} sub={usd(totals.rewards)} accent />
            <Stat
              label="APR"
              value={totals.apr != null ? `${totals.apr.toFixed(1)}%` : '—'}
              sub={totals.apr != null ? `≈ ${fmtAmount((staked * totals.apr) / 100 / 12)} MON/month` : ''}
            />
          </div>

          <div className="mt-2 space-y-1.5">
            {staking.positions.map((p) => (
              <Position
                key={p.validatorId}
                p={p}
                epoch={staking.epoch}
                busy={tx.pending}
                defaultOpen={staking.positions.length === 1}
                gasPriceMon={gasPriceMon}
                onAddMore={guard(() => openStake('random', p.validatorId))}
                onClaim={guard(() => tx.run('Claim rewards', (m) => m.claim(address, p.validatorId)))}
                onCompound={guard(() => tx.run('Compound', (m) => m.compound(address, p.validatorId)))}
                onUnstake={guard(() => setUnstakeFor({ p, mode: 'unstake' }))}
                onRedelegate={guard(() => setUnstakeFor({ p, mode: 'redelegate' }))}
                onWithdraw={guard((w) =>
                  tx.run(`Withdraw ${fmtAmount(w.amount)} MON`, (m) => m.withdraw(address, p.validatorId, w.withdrawId)),
                )}
              />
            ))}
          </div>
          <TxStatus tx={tx} />
          {/* While the wallet is open: what it should show (Claim / Compound / Withdraw) */}
          {tx.pending && (
            <ContractLine
              fn={/^claim/i.test(tx.label) ? 'claimRewards' : /^compound/i.test(tx.label) ? 'compound' : 'withdraw'}
            />
          )}

          {showCompare && (
            <button
              onClick={() => openStake('apr')}
              className="mt-2 w-full text-left text-[11px] px-2.5 py-2 rounded-xl bg-monad-green/10 text-monad-green hover:bg-monad-green/15"
            >
              💡 Top validators earn up to <b>{best.apr.toFixed(1)}%</b> (yours {totals.apr.toFixed(1)}%). Compare →
            </button>
          )}
        </>
      )}

      <StakeSheet
        open={stakeOpen}
        onClose={() => setStakeOpen(false)}
        address={address}
        nativeMon={nativeMon}
        monPrice={monPrice}
        initialSort={stakeSort}
        initialValidatorId={stakePreset}
        onDone={onChanged}
      />
      <UnstakeSheet
        p={unstakeFor?.p}
        mode={unstakeFor?.mode}
        onClose={() => setUnstakeFor(null)}
        address={address}
        onDone={onChanged}
      />
    </Card>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="bg-monad-card2 rounded-xl px-2.5 py-2 min-w-0">
      <div className="text-[9px] uppercase tracking-[.5px] text-monad-sub font-semibold">{label}</div>
      <div className={`text-[14px] font-bold truncate ${accent ? 'text-monad-green' : ''}`}>{value}</div>
      {sub && <div className="text-[10px] text-monad-sub truncate">{sub}</div>}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold border transition disabled:opacity-35 disabled:cursor-not-allowed ${
        primary
          ? 'bg-monad-purple/20 border-monad-purple/50 text-monad-purple2 enabled:hover:bg-monad-purple/30'
          : 'bg-monad-card2 border-monad-line text-monad-txt enabled:hover:border-monad-purple'
      }`}
    >
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </button>
  )
}

function Position({ p, epoch, busy, defaultOpen, gasPriceMon, onAddMore, onClaim, onCompound, onUnstake, onRedelegate, onWithdraw }) {
  const [open, setOpen] = useState(defaultOpen)
  const status =
    p.pending > 0
      ? `${fmtAmount(p.pending)} MON activates in epoch ${p.activationEpoch ?? epoch + 1}`
      : p.active > 0
        ? 'Earning'
        : 'Unstaked'

  const hasRewards = p.rewards > 0
  const hasActive = p.active > 0
  const activationEpoch = p.activationEpoch ?? epoch + 1
  const hoursToActive = Math.max(1, (activationEpoch - epoch) * EPOCH_HOURS)
  // Why some buttons are greyed out, shown under the action row
  const compoundFee = gasPriceMon != null ? gasPriceMon * GAS_COMPOUND : null
  const claimFee = gasPriceMon != null ? gasPriceMon * GAS_CLAIM : null
  const plan = hasActive && compoundFee != null ? compoundPlan({ stake: p.active, aprPct: p.apr, rewards: p.rewards, fee: compoundFee }) : null
  const hint = !hasActive
    ? `Unstake & Redelegate unlock when your stake activates (epoch ${activationEpoch}, ~${hoursToActive}h). Rewards start then too.`
    : !hasRewards
      ? 'Claim & Compound unlock once rewards accrue.'
      : null

  return (
    <div className="rounded-xl border border-monad-line overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-white/[.02]">
        <TokenIcon symbol={p.name} logo={p.logo} size={26} round />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate">
            {p.name}
            <span className="text-monad-sub font-semibold text-[11px]"> · {p.commission}% fee</span>
          </div>
          <div className={`text-[11px] truncate ${p.pending > 0 ? 'text-[#FFAE45]' : 'text-monad-green'}`}>{status}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[13px] font-bold">{fmtAmount(p.active + p.pending)}</div>
          <div className="text-[10px] text-monad-sub">{p.apr != null ? `${p.apr.toFixed(1)}% APR` : ''}</div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`shrink-0 text-monad-sub transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {p.withdrawals.map((w) => (
        <div key={w.withdrawId} className="flex items-center justify-between px-2.5 pb-2 text-[11px]">
          <span className="text-monad-sub">
            ⏳ {fmtAmount(w.amount)} MON unstaking
            {!w.ready && ` · ready ~${Math.max(1, (w.withdrawEpoch - epoch) * EPOCH_HOURS)}h`}
          </span>
          {w.ready && (
            <button
              onClick={() => onWithdraw(w)}
              disabled={busy}
              className="text-[11px] font-bold rounded-lg px-2.5 py-1 bg-monad-purple text-white disabled:opacity-40"
            >
              Withdraw
            </button>
          )}
        </div>
      ))}

      {open && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-monad-line/60 bg-black/10">
          <div className="grid grid-cols-5 gap-1.5 mt-1.5">
            <ActionBtn icon="＋" label="Add" onClick={onAddMore} disabled={busy} primary />
            <ActionBtn icon="🎁" label="Claim" onClick={onClaim} disabled={busy || !hasRewards} />
            <ActionBtn icon="♻️" label="Compound" onClick={onCompound} disabled={busy || !hasRewards} primary={!!plan?.ready} />
            <ActionBtn icon="↩" label="Unstake" onClick={onUnstake} disabled={busy || !hasActive} />
            <ActionBtn icon="⇄" label="Redelegate" onClick={onRedelegate} disabled={busy || !hasActive} />
          </div>
          {hint && <p className="text-[10px] text-monad-sub/70 mt-1.5 leading-snug">{hint}</p>}
          {plan && <SmartCompound plan={plan} rewards={p.rewards} fee={compoundFee} claimFee={claimFee} />}
          {safeUrl(p.website) && (
            <a href={safeUrl(p.website)} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] text-monad-purple2/80 mt-1 hover:underline">
              About {p.name} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function UnstakeSheet({ p, mode = 'unstake', onClose, address, onDone }) {
  const moving = mode === 'redelegate'
  const [amount, setAmount] = useState('')
  const [isMax, setIsMax] = useState(false)
  const tx = useTx(onDone)
  // "Max" = the exact on-chain wei (no dust left); otherwise strict parse.
  // The same wei drives the label and the transaction.
  const parsed = isMax && p ? { wei: p.activeWei, mon: formatEther(p.activeWei) } : parseMonAmount(amount)
  const valid = parsed && !parsed.error
  const tooMuch = valid && p && parsed.wei > p.activeWei

  async function submit() {
    if (!valid || tooMuch) return
    const ok = await tx.run(`Unstake ${parsed.mon} MON`, (m) =>
      m.unstake(address, p.validatorId, parsed.wei, p.freeWithdrawId),
    )
    if (ok) {
      setAmount('')
      setIsMax(false)
    }
  }

  return (
    <Sheet
      open={!!p}
      onClose={() => {
        tx.reset()
        setAmount('')
        onClose()
      }}
      title={moving ? 'Redelegate to another validator' : 'Unstake MON'}
    >
      {p && (
        <>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-monad-card2">
            <TokenIcon symbol={p.name} logo={p.logo} size={34} round />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{p.name}</div>
              <div className="text-[11px] text-monad-sub">Staked: {fmtAmount(p.active)} MON</div>
            </div>
          </div>

          <span className="flex items-center gap-2 mt-3 bg-monad-card2 border border-monad-line rounded-xl px-3 focus-within:border-monad-purple">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(',', '.'))
                setIsMax(false)
              }}
              placeholder="0"
              className="flex-1 bg-transparent py-2.5 font-bold text-lg outline-none min-w-0"
            />
            <span className="text-monad-sub font-semibold">MON</span>
            <button
              onClick={() => {
                setAmount(formatEther(p.activeWei))
                setIsMax(true)
              }}
              className="text-[11px] font-bold text-monad-purple2 bg-monad-purple/15 rounded-md px-2 py-1"
            >
              MAX
            </button>
          </span>
          {parsed?.error && <p className="text-[11px] text-[#ff7a7a] mt-1">{parsed.error}</p>}
          {tooMuch && <p className="text-[11px] text-[#ff7a7a] mt-1">More than you have staked here.</p>}
          {p.freeWithdrawId == null && (
            <p className="text-[11px] text-[#ff7a7a] mt-1">Too many pending withdrawals. Withdraw some first.</p>
          )}

          <button
            disabled={!valid || tooMuch || tx.pending || p.freeWithdrawId == null}
            onClick={submit}
            className="w-full mt-3 py-3 rounded-xl bg-monad-purple enabled:hover:brightness-110 disabled:opacity-40 text-white font-bold text-sm"
          >
            {tx.pending
              ? 'Waiting for wallet…'
              : moving
                ? `Step 1: Unstake ${valid ? parsed.mon : ''} MON`
                : `Unstake ${valid ? parsed.mon : ''} MON`}
          </button>
          <TxStatus tx={tx} />
          <ContractLine fn="undelegate" />
          {moving ? (
            <ol className="text-[11px] text-monad-sub mt-3 space-y-1 list-decimal pl-4 leading-snug">
              <li className={tx.status === 'success' ? 'text-monad-green' : ''}>Unstake from {p.name} (now).</li>
              <li>Wait ~2–3 epochs (≈8–14h). Monad has no one-step redelegation, and there are no rewards meanwhile.</li>
              <li>
                Tap <b>Withdraw</b> on this card, then <b>Stake</b> with the new validator.
              </li>
            </ol>
          ) : (
            <p className="text-[10px] text-monad-sub/70 mt-2 leading-snug">
              Unstaked MON stops earning and can be withdrawn after ~2–3 epochs (≈8–14h).
            </p>
          )}
        </>
      )}
    </Sheet>
  )
}

// "When should I compound?" — optimal timing from stake, APR and gas fee
// (see lib/compound.js). Compounding too early just burns fees.
function SmartCompound({ plan, rewards, fee, claimFee }) {
  const days = (d) => (d < 1 ? 'today' : d < 2 ? 'in ~1 day' : `in ~${Math.round(d)} days`)
  const claimPct = rewards > 0 ? (claimFee / rewards) * 100 : null

  return (
    <div className="mt-2.5 p-2.5 rounded-xl bg-monad-card2/70 border border-monad-line">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold">
          ♻️ Smart compound
          <InfoTip>
            Unclaimed rewards earn nothing, but every compound costs a network fee (~{fmtAmount(fee)} MON). The best
            moment is when rewards reach √(2 × fee × stake) — earlier, fees eat the gain; later, rewards sit idle.
          </InfoTip>
        </span>
        <span className={`text-[10px] font-bold ${plan.ready ? 'text-monad-green' : 'text-monad-sub'}`}>
          {fmtAmount(rewards)} / {fmtAmount(plan.threshold)} MON
        </span>
      </div>
      <div className="h-1.5 mt-1.5 rounded-full bg-black/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${plan.ready ? 'bg-monad-green' : 'bg-monad-purple'}`}
          style={{ width: `${Math.max(2, plan.progress * 100)}%` }}
        />
      </div>
      <p className="text-[10px] leading-snug mt-1.5 text-monad-sub">
        {plan.ready ? (
          <span className="text-monad-green">✓ Good time to compound — the fee is small next to your rewards.</span>
        ) : plan.notWorthIt ? (
          <>At this stake size compounding costs more than it earns. Let rewards accumulate — or add more MON.</>
        ) : (
          <>
            Best to compound at ~{fmtAmount(plan.threshold)} MON of rewards — {days(plan.daysLeft)}, then about every{' '}
            {Math.round(plan.intervalDays)} days.
          </>
        )}
        {claimPct != null && claimPct > 10 && (
          <span className="block mt-0.5">
            Claiming now: the fee (~{fmtAmount(claimFee)} MON){' '}
            {claimPct >= 100 ? 'is more than your rewards.' : `would take ~${Math.round(claimPct)}% of your rewards.`}
          </span>
        )}
      </p>
    </div>
  )
}
