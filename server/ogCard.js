// server/ogCard.js
//
// Renders the 1200×630 preview image X / Telegram / Discord show under a
// MonadMax link (Open Graph). Runs on the server: satori turns the layout
// into SVG (flexbox-only), resvg turns SVG into PNG. Fonts and logos are
// bundled from server/assets; emoji come from Twemoji (as on X).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { LEVELS, DEADLINES, targetLabel } from '../src/lib/faithData.js'
import { MONAD_MARK_PATH, MONAD_MARK_VIEWBOX } from '../src/lib/monadMark.js'

const ASSETS = join(process.cwd(), 'server', 'assets')
const file = (name) => readFileSync(join(ASSETS, name))
const dataUrl = (name, mime) => `data:${mime};base64,${file(name).toString('base64')}`

// Loaded once per function instance
const fonts = [500, 700, 800].map((weight) => ({ name: 'Inter', data: file(`inter-${weight}.ttf`), weight, style: 'normal' }))
const LOGO = dataUrl('logo.png', 'image/png')
const MONAD = dataUrl('monad.svg', 'image/svg+xml')

// Emoji → Twemoji SVG (file names are lowercase hex code points; the
// variation selector FE0F is dropped unless the emoji is a ZWJ sequence)
const emojiCache = new Map()
async function loadEmoji(segment) {
  if (!emojiCache.has(segment)) {
    const cps = [...segment].map((c) => c.codePointAt(0).toString(16))
    const name = (segment.includes('‍') ? cps : cps.filter((c) => c !== 'fe0f')).join('-')
    emojiCache.set(
      segment,
      fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${name}.svg`)
        .then((r) => (r.ok ? r.text() : null))
        .then((svg) => (svg ? `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` : ''))
        .catch(() => ''),
    )
  }
  return emojiCache.get(segment)
}

async function render(tree) {
  const svg = await satori(tree, {
    width: W,
    height: H,
    fonts,
    loadAdditionalAsset: async (code, segment) => (code === 'emoji' ? loadEmoji(segment) : []),
  })
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
}

const W = 1200
const H = 630
const box = { display: 'flex', background: 'rgba(0,0,0,0.28)', borderRadius: 28 }

function Brand(maxis, verified = false) {
  return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
      h('img', { src: LOGO, width: 64, height: 64, style: { borderRadius: 16 } }),
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { display: 'flex', fontSize: 32, fontWeight: 800, letterSpacing: 1.3, color: '#fff', lineHeight: 1 } },
          'MONAD', h('span', { style: { color: '#FFD36B' } }, 'MAX')),
        h('div', { style: { fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 6 } }, 'monadmax.com'),
      ),
    ),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      verified
        ? h('div', { style: { display: 'flex', alignItems: 'center', padding: '14px 20px', borderRadius: 40, fontSize: 22, fontWeight: 800, background: 'rgba(46,230,127,.2)', color: '#7dffb5' } },
            '✓ Verified')
        : null,
      maxis
        ? h('div', { style: { ...box, alignItems: 'center', padding: '14px 22px', borderRadius: 40, fontSize: 24, fontWeight: 700 } },
            `💜 ${maxis.toLocaleString('en-US')} ${maxis === 1 ? 'Maxi' : 'Maxis'}`)
        : null,
      h('div', { style: { ...box, alignItems: 'center', gap: 12, padding: '10px 22px 10px 10px', borderRadius: 40 } },
        h('img', { src: MONAD, width: 48, height: 48, style: { borderRadius: 24 } }),
        h('div', { style: { fontSize: 28, fontWeight: 800, color: '#fff' } }, 'Monad'),
      ),
    ),
  )
}

// X now lays the link title over the bottom-left of the preview, so the
// bottom ~90px stay empty (SAFE_BOTTOM) and everything important sits above.
const SAFE_BOTTOM = 92

// Big soft Monad mark on the right, as on the in-app card
const MARK_SVG = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MONAD_MARK_VIEWBOX.w} ${MONAD_MARK_VIEWBOX.h}"><path d="${MONAD_MARK_PATH}" fill="#fff" fill-opacity="0.07"/></svg>`,
).toString('base64')}`
function Watermark() {
  return h('img', { src: MARK_SVG, width: 580, height: 586, style: { position: 'absolute', right: -110, top: 22 } })
}

function Frame(children, gap = 30) {
  return h('div', {
    style: {
      width: W, height: H, display: 'flex', flexDirection: 'column', gap, position: 'relative', overflow: 'hidden',
      padding: `44px 56px ${SAFE_BOTTOM}px`, fontFamily: 'Inter', color: '#fff',
      backgroundImage: 'linear-gradient(135deg, #8a75ff 0%, #6E54FF 42%, #2d1c8f 80%, #0E091C 100%)',
    },
  }, ...children)
}

const label18 = { fontSize: 22, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.62)' }

// A challenge card: "I'm a Monad Maximalist" + level + target
const BADGES = {
  locked: { emoji: '🔒', name: 'Locked In' },
  staker: { emoji: '🥩', name: 'Staker' },
  nopaper: { emoji: '🧘', name: 'No Paper Hands' },
}

function Chip(text, green, lilac) {
  return h('div', {
    style: {
      display: 'flex', alignItems: 'center', height: 38, padding: '0 14px', borderRadius: 19, fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
      background: green ? 'rgba(46,230,127,.2)' : lilac ? 'rgba(196,168,255,.22)' : 'rgba(255,255,255,.14)',
      color: green ? '#7dffb5' : lilac ? '#e4d6ff' : '#fff',
    },
  }, text)
}

export function challengePng({ target, deadlineIndex, levelIndex, verified = false, maxis = null, stakedPct = 0, badges = [], monAmount = null }, monPrice) {
  const level = LEVELS[levelIndex]
  const multiple = monPrice ? target / monPrice : null
  const label = multiple ? targetLabel(multiple) : null
  const longName = level.name.length > 13
  const priceText = `$${Number(target).toLocaleString('en-US', { maximumFractionDigits: 4 })}`
  // Same chips as the in-app card. Stake facts only come from a verified
  // Maxi code (checked on-chain); Moon Believer follows from the target.
  const chips = []
  if (monAmount) chips.push(Chip(`${Math.round(monAmount).toLocaleString('en-US')} MON`))
  if (stakedPct > 0) chips.push(Chip(`${stakedPct}% staked`))
  for (const b of badges) if (BADGES[b]) chips.push(Chip(`${BADGES[b].emoji} ${BADGES[b].name}`, true))
  if (multiple >= 100) chips.push(Chip('🌙 Moon Believer', true))
  if (monAmount) chips.push(Chip(`→ $${Math.round(monAmount * target).toLocaleString('en-US')} at target`, false, true))

  return render(
    Frame([
      Watermark(),
      Brand(maxis, verified),
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontSize: 30, fontWeight: 800, color: '#FFD36B', marginBottom: 4 } }, 'Gmonad!'),
        h('div', { style: { fontSize: chips.length ? 68 : 76, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 } }, "I'm a Monad Maximalist."),
        h('div', { style: { fontSize: chips.length ? 32 : 36, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: 6 } }, 'I strongly believe in Monad! 💜'),
      ),
      // Boxes mirror the in-app card (lib/faithImage.js) 1:1: same sizes,
      // each box's content centered as one group
      h('div', { style: { display: 'flex', gap: 20, flex: 1 } },
        h('div', { style: { ...box, flex: 620, alignItems: 'center', justifyContent: 'center', padding: '0 24px' } },
          h('div', { style: { display: 'flex', justifyContent: 'center', width: 110, marginRight: 12, flexShrink: 0, fontSize: 92 } }, level.emoji),
          h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
            h('div', { style: { fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.6)' } }, 'FAITH LEVEL'),
            h('div', { style: { fontSize: 48, fontWeight: 800, lineHeight: 1.2 } }, level.name),
            h('div', { style: { fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.7)' } }, level.line),
          ),
        ),
        h('div', { style: { ...box, flex: 440, alignItems: 'center', justifyContent: 'center', padding: '0 24px' } },
          h('div', { style: { display: 'flex', flexDirection: 'column' } },
            h('div', { style: { fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.6)' } }, `MY TARGET · ${DEADLINES[deadlineIndex].toUpperCase()}`),
            h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 8 } },
              h('img', { src: MONAD, width: 48, height: 48, style: { borderRadius: 24, marginRight: 12 } }),
              h('div', { style: { fontSize: priceText.length > 6 ? 46 : 56, fontWeight: 800 } }, priceText),
              multiple
                ? h('div', { style: { fontSize: 30, fontWeight: 800, color: '#2ee67f', marginLeft: 14 } }, `${Math.round(multiple).toLocaleString('en-US')}×`)
                : null,
            ),
            label ? h('div', { style: { fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginTop: 6 } }, `${label.emoji} ${label.name}`) : null,
          ),
        ),
      ),
      chips.length ? h('div', { style: { display: 'flex', gap: 10 } }, ...chips) : null,
    ].filter(Boolean), chips.length ? 20 : 30),
  )
}

// Default card for the home page link
export function homePng(maxis = null) {
  return render(
    Frame([
      Brand(maxis),
      h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' } },
        h('div', { style: { fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 } }, 'Your personal MON manager'),
        h('div', { style: { fontSize: 38, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: 16 } },
          'Portfolio · native staking with real APR · what-if'),
        h('div', { style: { fontSize: 40, fontWeight: 800, color: '#FFD36B', marginTop: 26 } }, 'Still early. Stay maxi.'),
      ),
    ]),
  )
}
