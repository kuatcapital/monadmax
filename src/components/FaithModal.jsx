import { useState, useEffect, useMemo } from 'react'
import { levelFor, targetLabel, badgesFor, TARGET_PRESETS, DEADLINES, LEVELS, challengeUrl } from '../lib/faith'
import { loadMaxi, joinMaxi, joinErrorMessage } from '../lib/maxi'
import { drawFaithCard } from '../lib/faithImage'
import { useScrollLock } from '../hooks/useScrollLock'

// MonadMax's own X account, without "@". When set, posts end with
// "via @<handle>" so every share also promotes the app. null = not yet.
const X_HANDLE = null

// Bottom sheet where the user picks a price target and gets a shareable
// "I'm a Monad Maximalist" card (PNG + challenge link).
export function FaithModal({
  open,
  onClose,
  monAmount,
  stakedAmount,
  unstaking = 0,
  monPrice,
  address,
  initial,
  onAmountChange, // set when there's no connected wallet: the visitor types their amount
  maxiCount = null,
  onMaxiJoined, // (count) => void — bump the Maxi Army counter
}) {
  useScrollLock(open)
  const [target, setTarget] = useState(initial?.target ?? 1)
  const [deadlineIndex, setDeadlineIndex] = useState(initial?.deadlineIndex ?? 1)
  const [preview, setPreview] = useState(null) // { url, blob }
  const [copied, setCopied] = useState(false)
  const [shareBlocked, setShareBlocked] = useState(null) // intent URL if the popup was blocked
  // Privacy: both off by default — nothing identifies the wallet unless
  // the user explicitly opts in.
  const [showAmount, setShowAmount] = useState(false) // exact MON amount on the image
  // Maxi Army membership for this wallet (verified level + share code)
  const [maxi, setMaxi] = useState(() => loadMaxi(address))
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  useEffect(() => {
    setMaxi(loadMaxi(address))
    setJoinError(null)
  }, [address])

  // What the server has on file for this code (level + stake badges, frozen
  // at signing). Compared with the wallet's live data to tell whether the
  // shared card is out of date — then, and only then, ask to re-sign.
  const [onFile, setOnFile] = useState(null)
  const [justUpdated, setJustUpdated] = useState(false)
  useEffect(() => {
    if (!open || !maxi?.code) return
    let cancelled = false
    fetch(`/api/maxi/code/${maxi.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !cancelled && setOnFile(j))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, maxi?.code, maxi?.at])

  async function onJoin() {
    setJoining(true)
    setJoinError(null)
    try {
      const res = await joinMaxi(address)
      setMaxi(res)
      // Use what the server just saved (the lookup endpoint is CDN-cached)
      setOnFile({ levelIndex: res.levelIndex, stakedPct: res.stakedPct, badges: res.badges })
      setJustUpdated(true)
      onMaxiJoined?.(res.count)
    } catch (err) {
      setJoinError(joinErrorMessage(err))
    } finally {
      setJoining(false)
    }
  }

  const card = useMemo(() => {
    const multiple = monPrice ? target / monPrice : 0
    // A verified Maxi's level comes from the server's on-chain check
    const verifiedLevel = maxi ? { ...LEVELS[maxi.levelIndex], index: maxi.levelIndex, next: null, toNext: 0 } : null
    return {
      level: verifiedLevel ?? levelFor(monAmount),
      badges: badgesFor({ monAmount, stakedAmount, unstaking, multiple }),
      monAmount,
      stakedPct: monAmount > 0 ? (stakedAmount / monAmount) * 100 : 0,
      target,
      multiple,
      targetLabel: targetLabel(multiple),
      deadline: DEADLINES[deadlineIndex],
      valueAtTarget: monAmount * target,
      showAmount,
      // onchain = verified Maxi (signature + server check, no address in the
      // link) · private = connected wallet, not joined · self = typed amount
      proof: maxi ? 'onchain' : address ? 'private' : 'self',
    }
  }, [monAmount, stakedAmount, unstaking, monPrice, target, deadlineIndex, address, showAmount, maxi])

  // Out of date = level or stake badges on file differ from the wallet now
  const liveBadges = new Set(
    card.badges.map((b) => ({ 'Locked In': 'locked', Staker: 'staker', 'No Paper Hands': 'nopaper' })[b.name]).filter(Boolean),
  )
  const liveLevel = levelFor(monAmount).index
  const stale =
    !!address &&
    !!onFile &&
    (onFile.levelIndex !== liveLevel ||
      ['locked', 'staker', 'nopaper'].some((b) => liveBadges.has(b) !== (onFile.badges ?? []).includes(b)))

  const link = challengeUrl({
    target,
    deadlineIndex,
    levelIndex: card.level.index,
    code: maxi?.code ?? null, // proves a verified level; never the address
    showAmount,
    // Not verified → the shown amount rides in the link (marked
    // "Self-reported"); verified → the server takes it from the code
    amount: maxi ? 0 : monAmount,
  })

  // Re-render the PNG whenever the inputs change
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let url = null
    drawFaithCard(card).then((blob) => {
      if (cancelled || !blob) return
      url = URL.createObjectURL(blob)
      setPreview({ url, blob })
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, card])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const tweet = [
    'Gmonad!',
    "I'm a Monad Maximalist 💜 I strongly believe in @monad!",
    `Faith level: ${card.level.emoji} ${card.level.name}`,
    `My target: $${target} by ${card.deadline} (${Math.round(card.multiple)}×)`,
    'Think you believe harder? 👇',
    '',
    '#Monad #MON #MonadMaxis @monadmaxis',
  ].join('\n')

  // The link carries the card: X / Telegram / Discord read its Open Graph
  // tags (server/ogCard.js) and show the image under the post by themselves.
  function shareOnX() {
    const intent =
      `https://x.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(link)}` +
      (X_HANDLE ? `&via=${X_HANDLE}` : '')
    // Phones: x.com links open the X app, so a new tab would just stay blank
    // behind it. Navigate this tab instead — the app intercepts the link and
    // our page stays where it was (without the X app, x.com opens here and
    // Back returns to MonadMax).
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      window.location.href = intent
      return
    }
    const w = window.open(intent, '_blank')
    if (w) w.opener = null
    else setShareBlocked(intent) // popup blocked → show a plain link instead
  }

  function download() {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview.url
    a.download = `monad-maxi-${card.level.name.toLowerCase().replace(/\W+/g, '-')}.png`
    a.click()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${tweet}\n${link}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked — nothing to do
    }
  }

  const multiple = card.multiple
  const level = card.level

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* dvh = the height actually visible on phones (vh includes the hidden
          browser toolbar, which pushed the top — and the ✕ — off screen) */}
      <div className="relative w-full max-w-md max-h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain bg-monad-card border border-monad-line rounded-t-[24px] sm:rounded-[24px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] animate-fade">
        {/* Sticky header: the close button stays reachable while scrolling */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 mb-1 flex items-center justify-between bg-monad-card rounded-t-[24px]">
          <div className="font-bold">Your Monad Maxi card</div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-monad-card2 border border-monad-line text-monad-txt hover:bg-monad-line flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden border border-monad-line bg-monad-card2 aspect-[16/9]">
          {preview ? (
            <img src={preview.url} alt="Your Monad Maxi card" className="w-full h-full object-cover" />
          ) : (
            <div aria-hidden="true" className="w-full h-full animate-pulse bg-[linear-gradient(135deg,rgba(138,117,255,.35),rgba(45,28,143,.35))]" />
          )}
        </div>

        {onAmountChange && (
          <label className="flex items-center justify-between gap-3 mt-3 px-3 py-2.5 rounded-xl bg-monad-card2 border border-[#FFAE45]/25">
            <span className="text-[12px] text-monad-sub leading-snug">
              How much MON do you hold?
              <span className="block text-[10px] text-[#FFAE45]">Not verified · connect your wallet to prove it</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-[13px] shrink-0">
              <input
                type="text"
                inputMode="decimal"
                value={monAmount ? String(monAmount) : ''}
                placeholder="0"
                onChange={(e) => {
                  const v = parseFloat(e.target.value.replace(',', '.'))
                  onAmountChange(Number.isFinite(v) && v >= 0 ? Math.min(v, 1e10) : 0)
                }}
                className="bg-monad-bg border border-monad-line rounded-lg px-2 py-1 w-24 text-right font-bold outline-none focus:border-monad-purple"
              />
              MON
            </span>
          </label>
        )}

        {/* Level summary */}
        <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-monad-card2">
          <div className="text-3xl leading-none">{level.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[.5px] text-monad-sub font-semibold">Faith level</div>
            <div className="font-bold">{level.name}</div>
            {/* "X MON to next level" only makes sense for a real, connected wallet */}
            {address && level.next && (
              <div className="text-[11px] text-monad-sub">
                {Math.ceil(level.toNext).toLocaleString('en-US')} MON to {level.next.emoji} {level.next.name}
              </div>
            )}
            {!address && <div className="text-[11px] text-monad-sub">Based on the amount you entered</div>}
          </div>
          {!address && <span className="text-[10px] text-[#ffc46b] font-semibold text-right">not verified</span>}
          {maxi && <span className="text-[10px] font-bold text-monad-navy bg-monad-green rounded-md px-1.5 py-0.5">✓ VERIFIED</span>}
        </div>

        {/* Monad Maxi Army: verify the level with a free signature */}
        {address && !maxi && (
          <div className="mt-2 p-3 rounded-xl border border-monad-purple/30 bg-[linear-gradient(120deg,rgba(110,84,255,.18),rgba(255,142,228,.08))]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-bold">Join the Monad Maxi Army</div>
                <div className="text-[11px] text-monad-sub leading-snug">
                  {maxiCount != null ? `${maxiCount.toLocaleString('en-US')} verified so far. ` : ''}
                  Your card gets ✓ Verified — your address stays private.
                </div>
              </div>
              <button
                onClick={onJoin}
                disabled={joining}
                className="shrink-0 h-9 px-3.5 rounded-full text-[12px] font-bold text-white bg-[linear-gradient(135deg,#8a75ff,#6E54FF)] disabled:opacity-50 inline-flex items-center justify-center"
              >
                {joining ? 'Sign in wallet…' : 'Join 💜'}
              </button>
            </div>
            <p className="text-[10px] text-monad-sub/80 mt-1.5 leading-snug">
              🔒 Free signature of a plain text message: no transaction, no gas, no access to funds. Needs ≥ 1 MON.
            </p>
            {joinError && <p className="text-[11px] text-[#ff7a7a] mt-1.5">{joinError}</p>}
          </div>
        )}
        {maxi && !stale && (
          <p className="mt-2 text-[11px] text-monad-green">
            {justUpdated
              ? '✓ Updated! Your shared card now shows your current level and stake badges.'
              : "✓ You're a verified Monad Maxi. Your link shows it, without your address."}
          </p>
        )}
        {maxi && stale && (
          <div className="mt-2 p-3 rounded-xl border border-[#FFAE45]/25 bg-[#FFAE45]/10 flex items-center justify-between gap-3">
            <div className="text-[11px] leading-snug">
              <b className="text-[#FFAE45]">Your verified card is out of date</b>
              <div className="text-monad-sub">
                Your stake or level changed since you verified. Sign once to update what your shared card shows.
              </div>
            </div>
            <button
              onClick={onJoin}
              disabled={joining}
              className="shrink-0 h-8 px-3 rounded-full text-[11px] font-bold text-white bg-monad-purple disabled:opacity-50"
            >
              {joining ? 'Sign…' : 'Update'}
            </button>
          </div>
        )}
        {maxi && joinError && (
          <p className="text-[11px] text-[#ff7a7a] mt-1">{joinError}</p>
        )}

        {/* Target */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-[.5px] text-monad-sub font-semibold mb-2">MON will reach</div>
          <div className="grid grid-cols-3 gap-1.5">
            {TARGET_PRESETS.map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`py-2 rounded-xl text-sm font-bold border ${
                  target === t ? 'bg-monad-purple border-monad-purple text-white' : 'bg-monad-card2 border-monad-line text-monad-sub'
                }`}
              >
                ${t}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-2 text-[13px] text-monad-sub">
            or
            <span className="flex items-center flex-1 bg-monad-card2 border border-monad-line rounded-xl px-3 focus-within:border-monad-purple">
              $
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                className="bg-transparent w-full py-2 pl-1 font-bold text-monad-txt outline-none"
              />
            </span>
          </label>
          {monPrice > 0 && target > 0 && (
            <div className="text-[12px] mt-2">
              <span className="text-monad-green font-bold">{Math.round(multiple).toLocaleString('en-US')}×</span>
              <span className="text-monad-sub"> from today · </span>
              <span className="font-semibold">
                {card.targetLabel.emoji} {card.targetLabel.name}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-[.5px] text-monad-sub font-semibold mb-2">By</div>
          <div className="grid grid-cols-4 gap-1.5">
            {DEADLINES.map((d, i) => (
              <button
                key={d}
                onClick={() => setDeadlineIndex(i)}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  deadlineIndex === i ? 'bg-monad-purple border-monad-purple text-white' : 'bg-monad-card2 border-monad-line text-monad-sub'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="mt-4 space-y-2">
          <Toggle checked={showAmount} onChange={setShowAmount} title="Show exact MON amount">
            {showAmount
              ? 'On: your MON amount and its value at the target are on the card.'
              : 'Off: the image shows only your level and % staked.'}
          </Toggle>
        </div>

        {/* Share */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={shareOnX} className="col-span-2 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90">
            Share on 𝕏
          </button>
          {shareBlocked && (
            <p className="col-span-2 text-[12px] text-monad-sub">
              Your browser blocked the X window —{' '}
              <a href={shareBlocked} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-monad-purple2">
                open X here
              </a>
              .
            </p>
          )}
          <button onClick={download} className="py-2.5 rounded-xl bg-monad-card2 border border-monad-line font-semibold text-sm">
            Download PNG
          </button>
          <button onClick={copyLink} className="py-2.5 rounded-xl bg-monad-card2 border border-monad-line font-semibold text-sm">
            {copied ? 'Copied ✓' : 'Copy text + link'}
          </button>
        </div>
        <p className="text-[11px] text-monad-sub mt-3 leading-relaxed">
          Your link shows this card as a big preview on X, Telegram and Discord. Friends who open it can take the
          challenge with their own wallet.
        </p>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, title, children }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl bg-monad-card2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <span
        className={`mt-0.5 shrink-0 w-9 h-5 rounded-full relative transition-colors ${
          checked ? 'bg-monad-purple' : 'bg-monad-line'
        } peer-focus-visible:ring-2 peer-focus-visible:ring-monad-purple2`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block text-[11px] text-monad-sub leading-snug mt-0.5">{children}</span>
      </span>
    </label>
  )
}
