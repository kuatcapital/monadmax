// src/lib/markets.js
//
// Market data (price, market cap, rank, 24h change, 7d sparkline) for MON
// and the big caps we compare it against. Data comes from CoinMarketCap
// via our own /api/markets endpoint (server/marketsApi.js) — the browser
// never talks to CMC directly and never sees the API key.

// Keys of the returned object (CoinMarketCap slugs)
export const COMPARE_IDS = ['bitcoin', 'ethereum', 'bnb', 'solana']

// -> { [slug]: { id, name, symbol, image, price, marketCap, rank, circulatingSupply, change24h, sparkline? } }
export async function getMarkets() {
  const res = await fetch('/api/markets')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Markets HTTP ${res.status}`)
  return json.data
}
