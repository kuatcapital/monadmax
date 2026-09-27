// Vercel function behind the pretty challenge link /c/<slug> (rewrite in
// vercel.json). Returns the normal app HTML with Open Graph / Twitter tags
// for THIS challenge, so X, Telegram and Discord show the card image under
// the link. Real visitors get the same page; the app reads /c/<slug> itself
// and shows the challenge banner.

import { parseChallengeSlug, LEVELS, DEADLINES, CARD_VERSION } from '../../src/lib/faithData.js'
import { lookupCode } from '../../server/maxi.js'
import { redisConfigured } from '../../server/redis.js'

// New design version → new image URL → X and the CDN refetch
const IMAGE_VERSION = CARD_VERSION

const ORIGIN = (process.env.VITE_SITE_URL || 'https://monadmax.com').replace(/\/+$/, '')
const TEMPLATE_TTL_MS = 10 * 60_000

let template = { at: 0, html: null }
async function appHtml() {
  if (template.html && Date.now() - template.at < TEMPLATE_TTL_MS) return template.html
  const r = await fetch(`${ORIGIN}/index.html`, { signal: AbortSignal.timeout(4000) })
  if (!r.ok) throw new Error(`index.html ${r.status}`)
  template = { at: Date.now(), html: await r.text() }
  return template.html
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function slugFrom(url) {
  const last = decodeURIComponent(url.pathname.split('/').pop() || '')
  return last && last !== 'share' ? last : url.searchParams.get('slug') || ''
}

export async function GET(request) {
  const url = new URL(request.url)
  const slug = slugFrom(url)
  const c = parseChallengeSlug(slug)
  // Unknown / malformed → send people to the home page instead of a broken card
  if (!c) return Response.redirect(`${ORIGIN}/`, 302)

  const proof = c.code && redisConfigured() ? await lookupCode(c.code).catch(() => null) : null
  const level = LEVELS[proof ? proof.levelIndex : c.levelIndex]
  const title = `${proof ? '✓ ' : ''}${level.emoji} ${level.name} believes MON hits $${c.target} by ${DEADLINES[c.deadlineIndex]}`
  const description = "I'm a Monad Maximalist 💜 Think you believe harder? Take the challenge on MonadMax."
  const pageUrl = `${ORIGIN}/c/${slug}`
  const image = `${ORIGIN}/api/og/${slug}.v${IMAGE_VERSION}.png`

  const meta = [
    `<title>${esc(title)} · MonadMax</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="MonadMax" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@monadmaxis" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join('\n    ')

  let html
  try {
    html = await appHtml()
  } catch {
    return Response.redirect(`${ORIGIN}/`, 302)
  }
  // Drop the home page's own title/description/OG tags, insert this challenge's
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[\s\S]*?\/>/g, '')
    .replace('</head>', `    ${meta}\n  </head>`)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
