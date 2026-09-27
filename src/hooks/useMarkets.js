// src/hooks/useMarkets.js
//
// Market data (CoinMarketCap via /api/markets), polled every minute.
// Polling is cheap: the server caches CMC for 5 minutes, so most polls
// never reach CMC. Doesn't depend on the wallet, so it loads immediately —
// the mcap card works even before an address is entered.

import { useState, useEffect } from 'react'
import { getMarkets } from '../lib/markets'

const REFRESH_MS = 60_000

export function useMarkets() {
  const [markets, setMarkets] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getMarkets()
        if (!cancelled) {
          setMarkets(data)
          setError(null)
        }
      } catch (err) {
        // Keep showing the last good data if a refresh fails
        if (!cancelled) setError(err.message)
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return { markets, error }
}
