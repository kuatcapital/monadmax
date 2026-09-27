// src/lib/dexscreener.js
//
// USD prices for Monad ERC-20 tokens from DexScreener's free API (no key).
// A token can trade in many pools; we take the pool with the most
// liquidity, since thin pools have unreliable prices.

const BASE = 'https://api.dexscreener.com/tokens/v1/monad'
const MAX_PER_REQUEST = 30 // DexScreener limit per call

// -> { [lowercaseAddress]: { priceUsd, change24h, liquidityUsd, imageUrl } }
export async function getTokenPrices(addresses) {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))]
  const chunks = []
  for (let i = 0; i < unique.length; i += MAX_PER_REQUEST) {
    chunks.push(unique.slice(i, i + MAX_PER_REQUEST))
  }

  const pairLists = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(`${BASE}/${chunk.join(',')}`)
      if (!res.ok) throw new Error(`DexScreener HTTP ${res.status}`)
      return res.json()
    }),
  )

  const prices = {}
  const images = {} // token logo can sit on any of its pools, not just the biggest
  for (const pair of pairLists.flat()) {
    const addr = pair.baseToken?.address?.toLowerCase()
    if (!addr || !unique.includes(addr)) continue
    if (pair.info?.imageUrl) images[addr] ??= pair.info.imageUrl
    if (!pair.priceUsd) continue
    const liquidityUsd = pair.liquidity?.usd ?? 0
    if (prices[addr] && prices[addr].liquidityUsd >= liquidityUsd) continue
    prices[addr] = {
      priceUsd: Number(pair.priceUsd),
      change24h: pair.priceChange?.h24 ?? null,
      liquidityUsd,
    }
  }
  for (const addr of Object.keys(prices)) prices[addr].imageUrl = images[addr] ?? null
  return prices
}
