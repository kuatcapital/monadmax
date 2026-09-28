// Official Monad logomark (from monad.xyz/brand-and-media-kit) as a
// vector shape, so it can be used as a big, soft, transparent watermark at
// any size. The same path is drawn on the share image (lib/faithImage.js).

import { MONAD_MARK_PATH, MONAD_MARK_VIEWBOX } from '../lib/monadMark'

export { MONAD_MARK_PATH, MONAD_MARK_VIEWBOX }

export function MonadMark({ className = '', style }) {
  return (
    <svg
      viewBox={`0 0 ${MONAD_MARK_VIEWBOX.w} ${MONAD_MARK_VIEWBOX.h}`}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={MONAD_MARK_PATH} fill="currentColor" />
    </svg>
  )
}
