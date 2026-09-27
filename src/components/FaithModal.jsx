import { useState, useEffect, useMemo } from 'react'
import { levelFor, targetLabel, badgesFor, TARGET_PRESETS, DEADLINES, challengeUrl } from '../lib/faith'
import { drawFaithCard } from '../lib/faithImage'

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
}) {
  const [target, setTarget] = useState(initial?.target ?? 1)
  const [deadlineIndex, setDeadlineIndex] = useState(initial?.deadlineIndex ?? 1)
  const [preview, setPreview] = useState(null) // { url, blob }
  const [copied, setCopied] = useState(false)
  const [shareBlocked, setShareBlocked] = useState(null) // intent URL if the popup was blocked
  // Privacy: both off by default — nothing identifies the wallet unless
  // the user explicitly opts in.
  const [verify, setVerify] = useState(false) // put address in link → verified level
  const [showAmount, setShowAmount] = useState(false) // exact MON amount on the image

  const card = useMemo(() => {
    const multiple = monPrice ? target / monPrice : 0
    return {
      level: levelFor(monAmount),
      badges: badgesFor({ monAmount, stakedAmount, unstaking, multiple }),
      monAmount,
      stakedPct: monAmount > 0 ? (stakedAmount / monAmount) * 100 : 0,
      target,
      multiple,
      targetLabel: targetLabel(multiple),
      deadline: DEADLINES[deadlineIndex],
      valueAtTarget: monAmount * target,
      showAmount,
      // onchain = address shared, anyone can check · private = real wallet,
      // address kept hidden · self = calculator number, no wallet
      proof: !address ? 'self' : verify ? 'onchain' : 'private',
    }
  }, [monAmount, stakedAmount, unstaking, monPrice, target, deadlineIndex, address, verify, showAmount])

  const link = challengeUrl({
    target,
    deadlineIndex,
    levelIndex: card.level.index,
    from: address && verify ? address : null,
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
    "I'm a Monad Maximalist 💜 I strongly believe in @monad!",
    `Faith level: ${card.level.emoji} ${card.level.name}`,
    `My target: $${target} by ${card.deadline} (${Math.round(card.multiple)}×)`,
    'Think you believe harder? 👇',
    '',
    '#Monad #MON',
  ].join('\n')

  // The link carries the card: X / Telegram / Discord read its Open Graph
  // tags (server/ogCard.js) and show the image under the post by themselves.
  function shareOnX() {
    const intent =
      `https://x.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(link)}` +
      (X_HANDLE ? `&via=${X_HANDLE}` : '')
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
      <div className="relative w-full max-w-md max-h-[calc(100dvh-56px)] overflow-y-auto bg-monad-card border border-monad-line rounded-t-[24px] sm:rounded-[24px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] animate-fade">
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
          {preview && <img src={preview.url} alt="Your Monad Maxi card" className="w-full h-full object-cover" />}
        </div>

        {onAmountChange && (
          <label className="flex items-center justify-between gap-3 mt-3 px-3 py-2.5 rounded-xl bg-monad-card2 border border-[#FFAE45]/40">
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
            {level.next && (
              <div className="text-[11px] text-monad-sub">
                {Math.ceil(level.toNext).toLocaleString('en-US')} MON to {level.next.emoji} {level.next.name}
              </div>
            )}
          </div>
          {!address && <span className="text-[10px] text-[#ffc46b] font-semibold text-right">not verified</span>}
        </div>

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
            Off: the image shows only your level and % staked.
          </Toggle>
          {address && (
            <Toggle checked={verify} onChange={setVerify} title="✅ Verify my level on-chain">
              {verify ? (
                <span className="text-[#ffc46b]">
                  Your wallet address goes into the link, so anyone can look up your full balance and history.
                </span>
              ) : (
                'Off: the link carries only your level; your address stays private.'
              )}
            </Toggle>
          )}
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
