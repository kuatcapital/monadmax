// src/lib/amount.js
//
// Strict MON amount parsing for transactions. The SAME wei value is used
// for the button label and for the transaction, so what the user reads is
// exactly what gets signed. Anything unusual (negative, "1e5", "1,5",
// more than 18 decimals, spaces) is rejected instead of guessed.

import { parseEther, formatEther } from 'viem'

const DECIMAL = /^(\d+\.?\d*|\.\d+)$/

// -> { wei: bigint, mon: string } or { error: string } or null (empty)
export function parseMonAmount(input) {
  const s = String(input ?? '').trim()
  if (!s) return null
  if (!DECIMAL.test(s)) return { error: 'Enter a plain number, e.g. 12.5' }
  const decimals = s.includes('.') ? s.split('.')[1].length : 0
  if (decimals > 18) return { error: 'Max 18 decimal places' }
  const wei = parseEther(s)
  if (wei <= 0n) return { error: 'Amount must be greater than 0' }
  return { wei, mon: formatEther(wei) }
}
