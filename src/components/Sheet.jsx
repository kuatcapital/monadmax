import { useEffect } from 'react'

// Bottom sheet (phone) / centered dialog (desktop) used for staking flows.
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-monad-card border border-monad-line rounded-t-[24px] sm:rounded-[24px] animate-fade">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="font-bold">{title}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-monad-card2 text-monad-sub hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">{children}</div>
      </div>
    </div>
  )
}
