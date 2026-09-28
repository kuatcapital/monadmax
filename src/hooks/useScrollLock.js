// src/hooks/useScrollLock.js
//
// While a modal/sheet is open, the page behind it must not scroll (mouse
// wheel or touch). Keeps the scrollbar's width so the layout doesn't jump.
// Supports stacked modals via a simple counter.

import { useEffect } from 'react'

let locks = 0

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    const html = document.documentElement
    if (locks++ === 0) {
      const gap = window.innerWidth - html.clientWidth
      html.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      if (gap > 0) document.body.style.paddingRight = `${gap}px`
    }
    return () => {
      if (--locks === 0) {
        html.style.overflow = ''
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
    }
  }, [active])
}
