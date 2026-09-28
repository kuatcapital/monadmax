// src/lib/faithData.js
//
// Pure challenge data + link format, with no browser APIs, so the same code
// runs in the app AND on the server that renders the X/Telegram preview
// image (api/og) and the link's meta tags (api/share).

export const LEVELS = [
  { slug: 'curious-nad', min: 0, emoji: '🥚', name: 'Curious Nad', line: 'Just looking around' },
  { slug: 'fresh-believer', min: 100, emoji: '🐣', name: 'Fresh Believer', line: 'Took the first step' },
  { slug: 'purple-pilled', min: 1_000, emoji: '💜', name: 'Purple Pilled', line: 'Took the purple pill' },
  { slug: 'diamond-nad', min: 10_000, emoji: '🔥', name: 'Diamond Nad', line: 'Hands never shake' },
  { slug: 'parallel-maxi', min: 50_000, emoji: '⚡', name: 'Parallel Maxi', line: 'Believes in 10,000 TPS' },
  { slug: 'monad-maximalist', min: 250_000, emoji: '🚀', name: 'Monad Maximalist', line: 'All in on MON' },
  { slug: 'purple-whale', min: 1_000_000, emoji: '👑', name: 'Purple Whale', line: 'A living legend' },
]

// Label shown in the UI, and the short token used in links
export const DEADLINES = ['End of 2026', '2027', '2028', '2030']
const DEADLINE_TOKENS = ['2026', '2027', '2028', '2030']

// How bold is the price target, relative to today's price
export function targetLabel(multiple) {
  if (multiple < 5) return { emoji: '🧐', name: 'Realist' }
  if (multiple < 25) return { emoji: '😎', name: 'Optimist' }
  if (multiple < 100) return { emoji: '🔮', name: 'Visionary' }
  return { emoji: '🤯', name: 'Delusional (respect)' }
}

const MAX_TARGET = 1_000_000

// Monad Maxi Army: the exact text a wallet signs to join (free, no gas).
// Shared by the app (to sign) and the server (to verify) — must match 1:1.
export function joinMessage(address, issuedAt) {
  return [
    "I'm a Monad Maxi 💜",
    '',
    'Joining the Monad Maxi Army on monadmax.com.',
    'This is a free signature: no transaction, no gas, no access to funds.',
    '',
    `Wallet: ${address}`,
    `Issued: ${issuedAt}`,
  ].join('\n')
}

export const MAXI_CODE = /^[a-z2-9]{6}$/

// Version of the preview-card design. X caches a link's preview for about
// a week, so shared links carry ?v=<this>: after a redesign, new posts use
// a URL X hasn't seen and it fetches the new image. Bump on design changes.
export const CARD_VERSION = 8

// Readable link path: /c/<target>-<year>-<level>[-v<code>]
// e.g. /c/1-2027-diamond-nad  ·  /c/1-2027-diamond-nad-vk7x2ab (verified Maxi)
// The code proves a verified level via the server — no wallet address.
// (Old links may still end in -0x<address>; they're parsed, never created.)
export function challengeSlug({ target, deadlineIndex, levelIndex, code }) {
  const t = String(Number(target))
  const parts = [t, DEADLINE_TOKENS[deadlineIndex] ?? DEADLINE_TOKENS[1], LEVELS[levelIndex]?.slug ?? LEVELS[0].slug]
  if (code && MAXI_CODE.test(code)) parts.push(`v${code}`)
  return parts.join('-')
}

// -> { target, deadlineIndex, levelIndex, from, code } or null if malformed
export function parseChallengeSlug(slug) {
  if (typeof slug !== 'string' || slug.length > 120) return null
  const m = slug.match(/^(\d+(?:\.\d+)?)-(\d{4})-([a-z-]+?)(?:-(0x[0-9a-fA-F]{40}))?(?:-v([a-z2-9]{6}))?$/)
  if (!m) return null
  const target = Number(m[1])
  if (!Number.isFinite(target) || target <= 0 || target > MAX_TARGET) return null
  const deadlineIndex = DEADLINE_TOKENS.indexOf(m[2])
  const levelIndex = LEVELS.findIndex((l) => l.slug === m[3])
  if (deadlineIndex < 0 || levelIndex < 0) return null
  return { target, deadlineIndex, levelIndex, from: m[4] ?? null, code: m[5] ?? null }
}
