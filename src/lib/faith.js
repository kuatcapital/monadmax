// src/lib/faith.js
//
// "Monad Maxi" challenge: faith level, badges and target labels.
// Level is based on MON actually held (wallet + staked + WMON) — read
// from the chain, so it can't be faked by typing a number.

export const LEVELS = [
  { min: 0, emoji: '🥚', name: 'Curious Nad', line: 'Just looking around' },
  { min: 100, emoji: '🐣', name: 'Fresh Believer', line: 'Took the first step' },
  { min: 1_000, emoji: '💜', name: 'Purple Pilled', line: 'Took the purple pill' },
  { min: 10_000, emoji: '🔥', name: 'Diamond Nad', line: 'Hands never shake' },
  { min: 50_000, emoji: '⚡', name: 'Parallel Maxi', line: 'Believes in 10,000 TPS' },
  { min: 250_000, emoji: '🚀', name: 'Monad Maximalist', line: 'All in on MON' },
  { min: 1_000_000, emoji: '👑', name: 'Purple Whale', line: 'A living legend' },
]

export function levelFor(monAmount) {
  let level = LEVELS[0]
  for (const l of LEVELS) if (monAmount >= l.min) level = l
  const index = LEVELS.indexOf(level)
  const next = LEVELS[index + 1] ?? null
  return { ...level, index, next, toNext: next ? next.min - monAmount : 0 }
}

// How bold is the price target, relative to today's price
export function targetLabel(multiple) {
  if (multiple < 5) return { emoji: '🧐', name: 'Realist' }
  if (multiple < 25) return { emoji: '😎', name: 'Optimist' }
  if (multiple < 100) return { emoji: '🔮', name: 'Visionary' }
  return { emoji: '🤯', name: 'Delusional (respect)' }
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
export const DEADLINES = ['End of 2026', '2027', '2028', '2030']

// Public address of MonadMax used in every shared link. Set it once the
// domain is live, so posts always point to the official site — never to a
// preview/hosting URL or a copycat mirror the app happened to run on.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')

// Challenge links: ?c=<target>&by=<deadline index>&lvl=<level index>
// The wallet address (&from=) is added ONLY if the user opts in to an
// on-chain verified level — by default nothing identifies the wallet.
export function challengeUrl({ target, deadlineIndex, levelIndex, from }) {
  const params = new URLSearchParams({ c: String(target), by: String(deadlineIndex), lvl: String(levelIndex) })
  if (from) params.set('from', from)
  return `${SITE_URL}/?${params}`
}

export function readChallengeFromUrl() {
  const q = new URLSearchParams(window.location.search)
  const target = Number(q.get('c'))
  // Reject junk like Infinity / 1e308 / negatives from a crafted link
  if (!Number.isFinite(target) || target <= 0 || target > 1_000_000) return null
  const clamp = (v, max) => Math.min(Math.max(parseInt(v, 10) || 0, 0), max)
  const from = /^0x[0-9a-fA-F]{40}$/.test(q.get('from') ?? '') ? q.get('from') : null
  return {
    target,
    deadlineIndex: clamp(q.get('by'), DEADLINES.length - 1),
    levelIndex: q.has('lvl') ? clamp(q.get('lvl'), LEVELS.length - 1) : null, // self-reported
    from, // present only if the sender chose to verify on-chain
  }
}
