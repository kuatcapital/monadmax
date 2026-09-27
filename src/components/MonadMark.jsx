// Official Monad logomark (from monad.xyz/brand-and-media-kit) as a
// vector shape, so it can be used as a big, soft, transparent watermark at
// any size. The same path is drawn on the share image (lib/faithImage.js).

export const MONAD_MARK_VIEWBOX = { w: 182, h: 184 }
export const MONAD_MARK_PATH =
  'M90.5358 0C64.3911 0 0 65.2598 0 91.7593C0 118.259 64.3911 183.52 90.5358 183.52C116.681 183.52 181.073 118.258 181.073 91.7593C181.073 65.2609 116.682 0 90.5358 0ZM76.4273 144.23C65.4024 141.185 35.7608 88.634 38.7655 77.4599C41.7703 66.2854 93.62 36.2439 104.645 39.2892C115.67 42.3341 145.312 94.8846 142.307 106.059C139.302 117.234 87.4522 147.276 76.4273 144.23Z'

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
