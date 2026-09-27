// src/hooks/useMaxiCount.js
//
// How many verified Monad Maxis have joined. One small cached request per
// page load; after you join, the app bumps the number locally.

import { useState, useEffect, useCallback } from 'react'

let shared = null

export function useMaxiCount() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    shared ??= fetch('/api/maxi/count')
      .then((r) => r.json())
      .then((j) => j.count ?? null)
      .catch(() => null)
    shared.then((n) => !cancelled && setCount(n))
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback((n) => {
    if (typeof n === 'number') {
      shared = Promise.resolve(n)
      setCount(n)
    }
  }, [])

  return { count, update }
}
