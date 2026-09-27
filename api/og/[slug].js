// Vercel function: GET /api/og/<slug> → 1200×630 PNG preview image
//   /api/og/home                   → default MonadMax card
//   /api/og/1-2027-diamond-nad     → challenge card (see src/lib/faithData.js)
// X / Telegram / Discord fetch this from the og:image tag of a shared link.

import { challengePng, homePng } from '../../server/ogCard.js'
import { parseChallengeSlug } from '../../src/lib/faithData.js'

const ORIGIN = (process.env.VITE_SITE_URL || 'https://monadmax.com').replace(/\/+$/, '')

// Today's MON price, for the "37×" on the card. Optional: on any error the
// card is simply drawn without the multiple.
async function monPrice() {
  try {
    const r = await fetch(`${ORIGIN}/api/markets`, { signal: AbortSignal.timeout(3000) })
    const j = await r.json()
    return j?.data?.monad?.price ?? null
  } catch {
    return null
  }
}

const png = (buf) =>
  new Response(buf, {
    headers: {
      'Content-Type': 'image/png',
      // Rendered once, then served from the CDN for a day
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })

export async function GET(request) {
  const url = new URL(request.url)
  // Each unique URL is a fresh render on the CDN — don't allow "?junk"
  // variations to bypass the cache and burn CPU.
  if (url.search) return new Response('No query parameters allowed', { status: 400 })

  const slug = decodeURIComponent(url.pathname.split('/').pop() || '').replace(/\.png$/, '')
  if (slug === 'home') return png(await homePng())

  const challenge = parseChallengeSlug(slug)
  if (!challenge) return new Response('Not found', { status: 404 })
  return png(await challengePng(challenge, await monPrice()))
}
