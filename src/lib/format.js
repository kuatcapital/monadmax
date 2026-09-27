// src/lib/format.js
//
// Number formatting helpers shared by all cards. Balances on Monad range
// from fractions of a cent to millions, so one fixed format doesn't fit.

// $1,234 for big values, $3.35 for small ones, "<$0.01" for dust.
export function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n > 0 && n < 0.01) return '<$0.01'
  const digits = Math.abs(n) >= 1000 ? 0 : 2
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// Token price: $84,560.00 / $0.02597 / $0.001874
export function fmtPrice(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}

// Market caps: $1.70T / $328.4B / $307.1M
export function fmtBig(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [v, s] of units) {
    if (Math.abs(n) >= v) return '$' + (n / v).toFixed(n / v >= 100 ? 1 : 2) + s
  }
  return fmtUsd(n)
}

export function fmtAmount(n) {
  if (n == null) return '—'
  if (n > 0 && n < 0.0001) return '<0.0001'
  return n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 2 : 4 })
}

export function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

export function shortAddr(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ''
}
