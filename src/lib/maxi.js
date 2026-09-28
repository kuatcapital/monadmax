// src/lib/maxi.js
//
// Joining the Monad Maxi Army from the browser: the connected wallet signs
// a plain-text message (free — no transaction, no gas, no approval), the
// server verifies it + reads MON holdings on-chain, and returns a short
// code. Links carry that code, never the address.

import { getAddress } from 'viem'
import { getAccount, signMessage } from 'wagmi/actions'
import { wagmiConfig } from './wagmi'
import { joinMessage } from './faithData'

const key = (address) => `monadmax:maxi:${address.toLowerCase()}`

// Remembered per wallet in this browser: { code, levelIndex, at }
export function loadMaxi(address) {
  if (!address) return null
  try {
    return JSON.parse(localStorage.getItem(key(address)))
  } catch {
    return null
  }
}

export async function joinMaxi(address) {
  if (window.top !== window.self) throw new Error('For your safety, open MonadMax directly — not inside another site.')
  const acc = getAccount(wagmiConfig)
  if (!acc.isConnected || acc.address?.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Connect the wallet you want to verify.')
  }
  const checksum = getAddress(address)
  const issuedAt = new Date().toISOString()
  const signature = await signMessage(wagmiConfig, { account: checksum, message: joinMessage(checksum, issuedAt) })

  const res = await fetch('/api/maxi/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: checksum, issuedAt, signature }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Join failed (${res.status})`)

  const saved = { code: json.code, levelIndex: json.levelIndex, at: new Date().toISOString() }
  try {
    localStorage.setItem(key(address), JSON.stringify(saved))
  } catch {
    // not persisted — the card still works this session
  }
  return { ...saved, count: json.count, stakedPct: json.stakedPct, badges: json.badges ?? [] }
}

export function joinErrorMessage(err) {
  const msg = err?.shortMessage || err?.message || String(err)
  if (err?.code === 4001 || /rejected|denied/i.test(msg)) return 'Cancelled in wallet.'
  return msg.length > 140 ? msg.slice(0, 140) + '…' : msg
}
