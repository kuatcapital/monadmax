// src/hooks/useStaking.js
//
// On-chain staking positions for an address, refreshed every 5 minutes
// (rewards accrue per block, but an epoch lasts hours — no need to hammer
// the RPC).

import { useState, useEffect, useCallback } from 'react'

// viem is big — load the staking module only when a wallet is shown
const loadStaking = () => import('../lib/staking')

const REFRESH_MS = 5 * 60_000

export function useStaking(address) {
  const [staking, setStaking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0) // bump to force a reload after a transaction
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    setStaking(null)
    setError(null)
    if (!address) return

    let cancelled = false

    async function load(initial) {
      if (initial) setLoading(true)
      try {
        const { getStaking } = await loadStaking()
        const data = await getStaking(address)
        if (!cancelled) {
          setStaking({ ...data, owner: address })
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err.shortMessage ?? err.message)
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    load(true)
    const timer = setInterval(() => load(false), REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [address, nonce])

  // Ignore data that belongs to a previous address
  const current = staking?.owner === address ? staking : null
  return { staking: current, loading, error, done: !!current || !!error, reload }
}
