import { useState, useRef, useEffect } from 'react'

// Shared card shell + the small uppercase heading used in every card.

export function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-monad-card border border-monad-line rounded-[18px] p-3.5 mb-3 shadow-[0_6px_24px_-12px_rgba(0,0,0,.7)] ${className}`}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children }) {
  return (
    <h2 className="flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px] text-monad-sub font-bold m-0">
      {children}
    </h2>
  )
}

export function ChangeText({ value, className = '' }) {
  if (value == null) return null
  const up = value >= 0
  return (
    <span className={`${up ? 'text-monad-green' : 'text-[#ff7a7a]'} ${className}`}>
      {(up ? '+' : '') + value.toFixed(1)}%
    </span>
  )
}

// Right side of card headers: live MON price + 24h change
export function HeadPrice({ price, change }) {
  return (
    <div className="text-right">
      <div className="text-xs font-bold">{price}</div>
      <ChangeText value={change} className="text-[10px] font-bold" />
    </div>
  )
}

// Small ⓘ next to a card title: explanations stay out of the way until
// someone actually wants them.

export function InfoTip({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors ${
          open ? 'bg-monad-purple/25 text-monad-purple2' : 'bg-white/[.06] text-monad-sub/80 hover:bg-monad-purple/20 hover:text-monad-purple2'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3.2" r="1.6" />
          <rect x="6.6" y="6.2" width="2.8" height="8" rx="1.4" />
        </svg>
      </button>
      {open && (
        <span className="absolute left-1/2 -translate-x-1/2 top-6 z-30 w-60 p-2.5 rounded-xl bg-monad-card2 border border-monad-line shadow-xl text-[11px] leading-snug text-monad-sub normal-case tracking-normal font-normal">
          {children}
        </span>
      )}
    </span>
  )
}
