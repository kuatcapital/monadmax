// src/hooks/useTokenPrices.js
//
// DexScreener prices for a list of token addresses, refreshed every minute.

import { useState, useEffect } from 'react'
import { getTokenPrices } from '../lib/dexscreener'

const REFRESH_MS = 60_000

export function useTokenPrices(addresses) {
  const [prices, setPrices] = useState({})
  const [ready, setReady] = useState(false)

  // Arrays are new objects on every render; a string key lets the effect
  // re-run only when the actual set of addresses changes.
  const key = addresses.map((a) => a.toLowerCase()).sort().join(',')

  useEffect(() => {
    if (!key) {
      setPrices({})
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    async function load() {
      try {
        const data = await getTokenPrices(key.split(','))
        if (!cancelled) setPrices(data)
      } catch {
        // Prices are optional — the portfolio still shows raw amounts
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [key])

  return { prices, ready }
}
