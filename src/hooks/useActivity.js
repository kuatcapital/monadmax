// src/hooks/useActivity.js
//
// Recent transactions for the Activity tab. Loaded ONLY when the tab is
// opened (enabled=true), then cached for 2 minutes per address — the
// transfer index is one of Alchemy's pricier calls, so no auto-refresh.

import { useState, useEffect } from 'react'
import { getActivity } from '../lib/activity'

const TTL_MS = 2 * 60_000
const cache = new Map() // address -> { at, items }

export function useActivity(address, enabled) {
  const key = address?.toLowerCase()
  const hit = key ? cache.get(key) : null
  const fresh = hit && Date.now() - hit.at < TTL_MS
  const [state, setState] = useState({ items: fresh ? hit.items : null, error: null, loading: false })

  useEffect(() => {
    if (!enabled || !key) return
    const c = cache.get(key)
    if (c && Date.now() - c.at < TTL_MS) {
      setState({ items: c.items, error: null, loading: false })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    getActivity(key)
      .then((items) => {
        cache.set(key, { at: Date.now(), items })
        if (!cancelled) setState({ items, error: null, loading: false })
      })
      .catch((err) => !cancelled && setState({ items: null, error: err.message, loading: false }))
    return () => {
      cancelled = true
    }
  }, [enabled, key])

  return state
}
