// src/lib/faith.js
//
// "Monad Maxi" challenge: faith level, badges and target labels.
// Level is based on MON actually held (wallet + staked + WMON) — read
// from the chain, so it can't be faked by typing a number.

import { LEVELS, DEADLINES, targetLabel, challengeSlug, parseChallengeSlug } from './faithData'

export { LEVELS, DEADLINES, targetLabel }

export function levelFor(monAmount) {
  let level = LEVELS[0]
  for (const l of LEVELS) if (monAmount >= l.min) level = l
  const index = LEVELS.indexOf(level)
  const next = LEVELS[index + 1] ?? null
  return { ...level, index, next, toNext: next ? next.min - monAmount : 0 }
}

export function badgesFor({ monAmount, stakedAmount, unstaking = 0, multiple }) {
  const badges = []
  if (monAmount > 0 && stakedAmount / monAmount >= 0.5) badges.push({ emoji: '🔒', name: 'Locked In' })
  else if (stakedAmount > 0) badges.push({ emoji: '🥩', name: 'Staker' })
  // Staked and not unstaking anything right now (checked on-chain).
  // Full "never sold" history would need event logs, which free RPC
  // plans don't serve over the whole chain.
  if (stakedAmount > 0 && unstaking === 0) badges.push({ emoji: '🧘', name: 'No Paper Hands' })
  if (multiple >= 100) badges.push({ emoji: '🌙', name: 'Moon Believer' })
  return badges
}

export const TARGET_PRESETS = [0.1, 0.25, 0.5, 1, 5, 10]

// Public address of MonadMax used in every shared link. Set it once the
// domain is live, so posts always point to the official site — never to a
// preview/hosting URL or a copycat mirror the app happened to run on.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')

// Challenge links: readable path /c/<target>-<year>-<level>[-<0xaddress>]
// (see faithData.js). The address is added ONLY if the user opts in to an
// on-chain verified level — by default nothing identifies the wallet.
export function challengeUrl({ target, deadlineIndex, levelIndex, code }) {
  return `${SITE_URL}/c/${challengeSlug({ target, deadlineIndex, levelIndex, code })}`
}

export function readChallengeFromUrl() {
  // New format: /c/<slug>
  const m = window.location.pathname.match(/^\/c\/([^/]+)\/?$/)
  if (m) return parseChallengeSlug(decodeURIComponent(m[1]))

  // Old format (links shared before): ?c=<target>&by=<index>&lvl=<index>&from=
  const q = new URLSearchParams(window.location.search)
  const target = Number(q.get('c'))
  if (!Number.isFinite(target) || target <= 0 || target > 1_000_000) return null
  const clamp = (v, max) => Math.min(Math.max(parseInt(v, 10) || 0, 0), max)
  const from = /^0x[0-9a-fA-F]{40}$/.test(q.get('from') ?? '') ? q.get('from') : null
  return {
    target,
    deadlineIndex: clamp(q.get('by'), DEADLINES.length - 1),
    levelIndex: q.has('lvl') ? clamp(q.get('lvl'), LEVELS.length - 1) : null,
    from,
  }
}
