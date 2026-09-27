// server/marketsApi.js
//
// Server-side endpoint GET /api/markets, backed by CoinMarketCap.
// Runs inside the Vite dev/preview server (see vite.config.js), so:
// - the CMC key never reaches the browser (CMC also blocks browser calls)
// - responses are cached, so credit usage doesn't grow with users/tabs
//
// Budget: free plan = 15,000 credits/month. One call for all 5 coins
// costs 1 credit; with a 5-minute cache that's at most 288/day ≈ 8,640/month
// even if the app is open 24/7.

const CMC_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
const SLUGS = ['monad', 'bitcoin', 'ethereum', 'bnb', 'solana']
const QUOTES_TTL_MS = 5 * 60_000
const SPARKLINE_TTL_MS = 60 * 60_000

const logoUrl = (id) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`
const sparklineUrl = (id) => `https://s3.coinmarketcap.com/generated/sparklines/web/7d/2781/${id}.svg`

let quotesCache = { at: 0, data: null }
let inFlight = null // concurrent requests share one CMC call
const sparklineCache = {} // id -> { at, values }

async function fetchQuotes(apiKey) {
  const res = await fetch(`${CMC_URL}?slug=${SLUGS.join(',')}`, {
    headers: { 'X-CMC_PRO_API_KEY': apiKey, Accept: 'application/json' },
  })
  const json = await res.json()
  if (!res.ok || json.status?.error_code) {
    throw new Error(json.status?.error_message || `CMC HTTP ${res.status}`)
  }

  // CMC keys the response by numeric id; re-key by slug for the app
  const out = {}
  for (const c of Object.values(json.data)) {
    const q = c.quote.USD
    out[c.slug] = {
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      image: logoUrl(c.id),
      price: q.price,
      marketCap: q.market_cap,
      rank: c.cmc_rank,
      circulatingSupply: c.circulating_supply,
      change24h: q.percent_change_24h,
    }
  }
  return out
}

// CMC's public 7d sparkline is an SVG made of <line> segments. We read the
// y coordinates back into a series (shape only — values are relative).
async function fetchSparkline(id) {
  const cached = sparklineCache[id]
  if (cached && Date.now() - cached.at < SPARKLINE_TTL_MS) return cached.values
  try {
    const res = await fetch(sparklineUrl(id))
    if (!res.ok) throw new Error()
    const svg = await res.text()
    const ys = [...svg.matchAll(/<line[^>]*\sy1="([\d.]+)"[^>]*\sy2="([\d.]+)"/g)]
    const values = ys.map((m) => -Number(m[1]))
    if (ys.length) values.push(-Number(ys[ys.length - 1][2]))
    sparklineCache[id] = { at: Date.now(), values }
    return values
  } catch {
    return cached?.values ?? []
  }
}

async function getMarkets(apiKey) {
  if (quotesCache.data && Date.now() - quotesCache.at < QUOTES_TTL_MS) return quotesCache.data

  inFlight ??= (async () => {
    try {
      const data = await fetchQuotes(apiKey)
      if (data.monad) data.monad.sparkline = await fetchSparkline(data.monad.id)
      quotesCache = { at: Date.now(), data }
      return data
    } catch (err) {
      // CMC down or rate-limited: serve the last good data if we have it
      if (quotesCache.data) return quotesCache.data
      throw err
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

// Plain Node (req, res) handler — used by the Vite dev server locally and
// by the Vercel serverless function in production (api/markets.js).
export function createMarketsHandler(apiKey) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }
    // The CDN caches per full URL, so "?anything" would skip the cache and
    // reach upstream APIs on every request (burning credits). The app never
    // sends a query string — reject it before doing any work.
    if ((req.url ?? '').includes('?')) {
      res.statusCode = 400
      res.setHeader('Cache-Control', 'public, s-maxage=3600')
      res.end(JSON.stringify({ error: 'No query parameters allowed' }))
      return
    }
    if (!apiKey) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'CMC_API_KEY is missing in .env' }))
      return
    }
    try {
      const data = await getMarkets(apiKey)
      // CDN (Vercel) caches for 5 min → CMC credits don't grow with traffic
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      res.end(JSON.stringify({ updatedAt: quotesCache.at, data }))
    } catch (err) {
      res.statusCode = 502
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ error: 'Market data temporarily unavailable' }))
      console.error('markets:', err.message)
    }
  }
}

// Vite plugin: mounts the endpoint on both `vite` (dev) and `vite preview`
export function marketsApi(apiKey) {
  const handler = createMarketsHandler(apiKey)
  return {
    name: 'markets-api',
    configureServer(server) {
      server.middlewares.use('/api/markets', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/markets', handler)
    },
  }
}
