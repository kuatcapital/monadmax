// src/hooks/useValidators.js
//
// All active validators (from our /api/validators, cached server-side for
// an hour). Loaded on demand — only when the staking picker opens or the
// staking card wants to compare APRs.

import { useState, useEffect } from 'react'

let shared = null // one fetch per page load, shared by all components

export function useValidators(enabled = true) {
  const [state, setState] = useState({ validators: null, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    shared ??= fetch('/api/validators')
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
        return json.validators
      })
      .catch((err) => {
        shared = null // allow a retry next time
        throw err
      })
    shared
      .then((validators) => !cancelled && setState({ validators, error: null }))
      .catch((err) => !cancelled && setState({ validators: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
