// src/hooks/usePortfolioHistory.js
//
// Portfolio value over time. No API gives the history of an arbitrary
// wallet's USD value for free, so we record it ourselves: every time the
// app has a complete, fresh total, we store a snapshot in this browser
// (localStorage, per address). History starts the first day you use the app.

import { useState, useEffect } from 'react'

const MIN_GAP_MS = 10 * 60_000 // at most one point every 10 minutes
const KEEP_MS = 90 * 86_400_000 // keep 90 days
const MAX_POINTS = 5000

const keyFor = (address) => `monadmax:history:${address.toLowerCase()}`

function load(address) {
  try {
    const list = JSON.parse(localStorage.getItem(keyFor(address)))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// -> [{ t: timestampMs, v: usd }, ...] oldest first
export function usePortfolioHistory(address, total, ready) {
  const [history, setHistory] = useState(() => (address ? load(address) : []))

  // Switching wallets → switch to that wallet's history
  useEffect(() => {
    setHistory(address ? load(address) : [])
  }, [address])

  useEffect(() => {
    // Only record complete data: a half-loaded total would show a fake dip
    if (!address || !ready || !(total > 0)) return

    const now = Date.now()
    const list = load(address)
    const last = list[list.length - 1]
    if (last && now - last.t < MIN_GAP_MS) {
      // Too soon for a new point — just refresh the latest one
      last.v = total
    } else {
      list.push({ t: now, v: total })
    }
    const trimmed = list.filter((p) => now - p.t < KEEP_MS).slice(-MAX_POINTS)

    try {
      localStorage.setItem(keyFor(address), JSON.stringify(trimmed))
    } catch {
      // Storage blocked/full — history just won't persist
    }
    setHistory(trimmed)
  }, [address, total, ready])

  return history
}
