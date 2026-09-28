// Vercel function: GET /api/og/<slug>[.v<N>].png → 1200×630 PNG preview
//   /api/og/home.v2.png                   → default MonadMax card
//   /api/og/1-2027-diamond-nad.v2.png     → challenge card (src/lib/faithData.js)
//   /api/og/1-2027-diamond-nad-vk7x2ab…   → verified Maxi card (code → level)
// X / Telegram / Discord fetch this from the og:image tag of a shared link.
// The ".v<N>" part only exists to bust X's and the CDN's image caches when
// the design changes.

import { challengePng, homePng } from '../../server/ogCard.js'
import { parseChallengeSlug } from '../../src/lib/faithData.js'
import { lookupCode, count } from '../../server/maxi.js'
import { redisConfigured } from '../../server/redis.js'

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
  const file = decodeURIComponent(url.pathname.split('/').pop() || '')
  const slug = file.replace(/(?:\.v\d+)?\.png$/, '')

  // Each unique URL is a fresh render on the CDN — don't allow "?junk"
  // variations to bypass the cache and burn CPU. Vercel itself adds
  // ?slug=<path segment> for this [slug] route; that one is fine.
  if ([...url.searchParams].some(([k, v]) => k !== 'slug' || (v !== slug && v !== file))) {
    return new Response('No query parameters allowed', { status: 400 })
  }

  const maxis = redisConfigured() ? await count().catch(() => null) : null
  if (slug === 'home') return png(await homePng(maxis))

  const challenge = parseChallengeSlug(slug)
  if (!challenge) return new Response('Not found', { status: 404 })
  // A Maxi code proves the level server-side; it overrides the level in the URL
  const proof = challenge.code && redisConfigured() ? await lookupCode(challenge.code).catch(() => null) : null
  const card = proof
    ? {
        ...challenge,
        levelIndex: proof.levelIndex,
        verified: true,
        stakedPct: proof.stakedPct,
        badges: proof.badges,
        monAmount: challenge.showAmount ? proof.mon : null,
      }
    : { ...challenge, monAmount: challenge.selfAmount, selfReported: !challenge.code }
  return png(await challengePng({ ...card, maxis }, await monPrice()))
}
