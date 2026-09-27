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

function Brand() {
  return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
      h('img', { src: LOGO, width: 64, height: 64, style: { borderRadius: 16 } }),
      h('div', { style: { display: 'flex', fontSize: 32, fontWeight: 800, letterSpacing: 3, color: '#fff' } },
        'MONAD', h('span', { style: { color: '#FFD36B' } }, 'MAX')),
    ),
    h('div', { style: { ...box, alignItems: 'center', gap: 12, padding: '10px 22px 10px 10px', borderRadius: 40 } },
      h('img', { src: MONAD, width: 48, height: 48, style: { borderRadius: 24 } }),
      h('div', { style: { fontSize: 28, fontWeight: 800, color: '#fff' } }, 'Monad'),
    ),
  )
}

function Frame(children) {
  return h('div', {
    style: {
      width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '52px 60px', fontFamily: 'Inter', color: '#fff',
      backgroundImage: 'linear-gradient(135deg, #8a75ff 0%, #6E54FF 42%, #2d1c8f 80%, #0E091C 100%)',
    },
  }, ...children)
}

// A challenge card: "I'm a Monad Maximalist" + level + target
export function challengePng({ target, deadlineIndex, levelIndex }, monPrice) {
  const level = LEVELS[levelIndex]
  const multiple = monPrice ? target / monPrice : null
  const label = multiple ? targetLabel(multiple) : null

  return render(
    Frame([
      Brand(),
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontSize: 66, fontWeight: 800, letterSpacing: -1 } }, "I'm a Monad Maximalist."),
        h('div', { style: { fontSize: 36, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: 6 } }, 'I strongly believe in Monad! 💜'),
      ),
      h('div', { style: { display: 'flex', gap: 22 } },
        h('div', { style: { ...box, flex: 1.4, alignItems: 'center', gap: 26, padding: '26px 30px' } },
          h('div', { style: { fontSize: 92 } }, level.emoji),
          h('div', { style: { display: 'flex', flexDirection: 'column' } },
            h('div', { style: { fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' } }, 'FAITH LEVEL'),
            h('div', { style: { fontSize: 50, fontWeight: 800 } }, level.name),
            h('div', { style: { fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.7)' } }, level.line),
          ),
        ),
        h('div', { style: { ...box, flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '26px 30px' } },
          h('div', { style: { fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' } },
            `MY TARGET · ${DEADLINES[deadlineIndex].toUpperCase()}`),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 } },
            h('img', { src: MONAD, width: 50, height: 50, style: { borderRadius: 25 } }),
            h('div', { style: { fontSize: 60, fontWeight: 800 } }, `$${target}`),
            multiple ? h('div', { style: { fontSize: 32, fontWeight: 800, color: '#2ee67f' } }, `${Math.round(multiple).toLocaleString('en-US')}×`) : null,
          ),
          label ? h('div', { style: { fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: 4 } }, `${label.emoji} ${label.name}`) : null,
        ),
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', { style: { fontSize: 30, fontWeight: 700 } }, 'Think you believe harder? Take the challenge →'),
        h('div', { style: { fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.6)' } }, 'monadmax.com'),
      ),
    ]),
  )
}

// Default card for the home page link
export function homePng() {
  return render(
    Frame([
      Brand(),
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontSize: 72, fontWeight: 800, letterSpacing: -1 } }, 'Your personal MON manager'),
        h('div', { style: { fontSize: 38, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: 10 } },
          'Portfolio · native staking with real APR · what-if'),
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', { style: { fontSize: 34, fontWeight: 800, color: '#FFD36B' } }, 'Still early. Stay maxi.'),
        h('div', { style: { fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.7)' } }, 'monadmax.com'),
      ),
    ]),
  )
}
