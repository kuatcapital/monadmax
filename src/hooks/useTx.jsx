// src/hooks/useTx.js
//
// Tracks one wallet transaction: idle → pending (wallet open / waiting
// for the block) → success (with explorer link) or error (readable text).

import { useState, useCallback, useRef } from 'react'

// viem + wallet code is loaded only when the user actually transacts
const loadTx = () => import('../lib/stakingTx')

export function useTx(onSuccess) {
  const [state, setState] = useState({ status: 'idle', error: null, hash: null, label: null })
  // Synchronous lock: a fast double-click must never open two wallet prompts
  const busy = useRef(false)

  const run = useCallback(
    async (label, action) => {
      if (busy.current) return false
      busy.current = true
      setState({ status: 'pending', error: null, hash: null, label })
      let tx = null
      try {
        tx = await loadTx()
        const hash = await action(tx)
        setState({ status: 'success', error: null, hash, label, url: `${tx.EXPLORER}/tx/${hash}` })
        onSuccess?.()
        return true
      } catch (err) {
        if (tx && err instanceof tx.UnconfirmedTxError) {
          // Sent, but not confirmed yet — do NOT invite a retry
          setState({ status: 'unconfirmed', error: null, hash: err.hash, label, url: `${tx.EXPLORER}/tx/${err.hash}` })
          onSuccess?.()
          return true
        }
        setState({ status: 'error', error: tx ? tx.txErrorMessage(err) : 'Could not load wallet code.', hash: null, label })
        return false
      } finally {
        busy.current = false
      }
    },
    [onSuccess],
  )

  const reset = useCallback(() => setState({ status: 'idle', error: null, hash: null, label: null }), [])

  return { ...state, pending: state.status === 'pending', run, reset }
}

// Inline status line under action buttons
export function TxStatus({ tx }) {
  if (tx.status === 'idle') return null
  if (tx.pending)
    return <p className="text-[11px] text-monad-purple2 mt-2">⏳ {tx.label}: confirm in your wallet…</p>
  if (tx.status === 'error') return <p className="text-[11px] text-[#ff7a7a] mt-2">✕ {tx.error}</p>
  if (tx.status === 'unconfirmed')
    return (
      <p className="text-[11px] text-[#FFAE45] mt-2">
        ⏳ {tx.label} sent, still confirming. Don't repeat it —{' '}
        <a href={tx.url} target="_blank" rel="noreferrer" className="underline">
          check Monadscan
        </a>{' '}
        first.
      </p>
    )
  return (
    <p className="text-[11px] text-monad-green mt-2">
      ✓ {tx.label} done ·{' '}
      <a href={tx.url} target="_blank" rel="noreferrer" className="underline">
        view on Monadscan
      </a>
    </p>
  )
}
