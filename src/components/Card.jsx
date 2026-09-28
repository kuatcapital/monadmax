import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

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
    <div className="text-right leading-none">
      <div className="text-xs font-bold leading-none">{price}</div>
      <ChangeText value={change} className="block text-[10px] font-bold leading-none mt-0.5" />
    </div>
  )
}

// Small ⓘ next to a card title: explanations stay out of the way until
// someone actually wants them.

export function InfoTip({ children }) {
  const [pos, setPos] = useState(null) // { left, top } in viewport px, null = closed
  const btn = useRef(null)
  const pop = useRef(null)
  const WIDTH = 240
  const MARGIN = 12

  // Rendered in <body> with fixed position: never clipped by a card's
  // rounded/overflow edges, and clamped so it stays inside the screen.
  function place() {
    const r = btn.current.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const w = Math.min(WIDTH, vw - MARGIN * 2)
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, MARGIN), vw - w - MARGIN)
    setPos({ left, top: r.bottom + 8, width: w, anchorTop: r.top, anchorBottom: r.bottom, ready: false })
  }

  // After it renders, measure it: if it doesn't fit below the icon (e.g.
  // near the bottom of a phone screen, under Safari's toolbar), open it
  // above instead; never let it leave the visible area.
  useLayoutEffect(() => {
    if (!pos || pos.ready || !pop.current) return
    const vh = window.visualViewport?.height ?? window.innerHeight
    const h = pop.current.offsetHeight
    let top = pos.anchorBottom + 8
    if (top + h > vh - MARGIN) top = pos.anchorTop - 8 - h
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - h - MARGIN))
    setPos({ ...pos, top, maxHeight: vh - MARGIN * 2, ready: true })
  }, [pos])

  useEffect(() => {
    if (!pos) return
    const close = (e) => {
      if (btn.current?.contains(e.target) || pop.current?.contains(e.target)) return
      setPos(null)
    }
    const hide = () => setPos(null)
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [pos])

  return (
    <span className="inline-flex align-middle">
      <button
        ref={btn}
        type="button"
        onClick={() => (pos ? setPos(null) : place())}
        aria-label="More info"
        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors ${
          pos ? 'bg-monad-purple/25 text-monad-purple2' : 'bg-white/[.06] text-monad-sub/80 hover:bg-monad-purple/20 hover:text-monad-purple2'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3.2" r="1.6" />
          <rect x="6.6" y="6.2" width="2.8" height="8" rx="1.4" />
        </svg>
      </button>
      {pos &&
        createPortal(
          <span
            ref={pop}
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              width: pos.width,
              maxHeight: pos.maxHeight,
              overflowY: 'auto',
              visibility: pos.ready ? 'visible' : 'hidden',
            }}
            className="z-[60] p-2.5 rounded-xl bg-monad-card2 border border-monad-line shadow-xl text-[11px] leading-snug text-monad-sub normal-case tracking-normal font-normal"
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  )
}
