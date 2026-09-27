// src/lib/faithImage.js
//
// Draws the shareable "Monad Maxi" card as a 1200×675 PNG (X/Twitter's
// preview ratio) using a plain <canvas> — no libraries, no server.

import { MONAD_MARK_PATH, MONAD_MARK_VIEWBOX } from '../components/MonadMark'

const W = 1200
const H = 675
const FONT = `-apple-system, "Segoe UI", Roboto, sans-serif`
const EMOJI = `"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"`

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function blob(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

// Color emoji inherit the fill color's alpha in canvas, so a translucent
// fillStyle makes them dim/dark. Always draw emoji with an opaque fill.
function emoji(ctx, char, x, y, size) {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.font = `${size}px ${EMOJI}`
  ctx.fillText(char, x, y)
  const w = ctx.measureText(char).width
  ctx.restore()
  return w
}

function pill(ctx, x, y, text, { bg, fg, size = 22, padX = 16, h = 42 }) {
  ctx.font = `700 ${size}px ${FONT}, ${EMOJI}`
  const w = ctx.measureText(text).width + padX * 2
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = fg
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + h / 2 + 1)
  ctx.textBaseline = 'alphabetic'
  return w
}

// data: { level, badges, monAmount, stakedPct, target, multiple, targetLabel,
//         deadline, valueAtTarget, showAmount, proof: 'onchain'|'private'|'self' }
export async function drawFaithCard(data) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#8a75ff')
  bg.addColorStop(0.42, '#6E54FF')
  bg.addColorStop(0.8, '#2d1c8f')
  bg.addColorStop(1, '#0E091C')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  blob(ctx, 1050, 60, 380, 'rgba(255,255,255,.18)')
  blob(ctx, 120, 700, 420, 'rgba(255,142,228,.26)')

  // Big transparent Monad mark as a watermark (right side)
  ctx.save()
  const markSize = 580
  ctx.translate(W - 470, H / 2 - markSize / 2)
  ctx.scale(markSize / MONAD_MARK_VIEWBOX.h, markSize / MONAD_MARK_VIEWBOX.h)
  ctx.fillStyle = 'rgba(255,255,255,.07)'
  ctx.fill(new Path2D(MONAD_MARK_PATH))
  ctx.restore()

  // Brand
  const [logo, monadLogo] = await Promise.all([loadImage('/logo.png'), loadImage('/monad.svg')])
  if (logo) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(60, 52, 64, 64, 16)
    ctx.clip()
    ctx.drawImage(logo, 60, 52, 64, 64)
    ctx.restore()
  }
  ctx.fillStyle = '#fff'
  ctx.font = `800 30px ${FONT}`
  ctx.fillText('MONAD', 140, 96)
  const mw = ctx.measureText('MONAD').width
  const gold = ctx.createLinearGradient(140 + mw, 70, 140 + mw + 80, 100)
  gold.addColorStop(0, '#FFE9A8')
  gold.addColorStop(0.4, '#FFD36B')
  gold.addColorStop(1, '#FFAE45')
  ctx.fillStyle = gold
  ctx.fillText('MAX', 140 + mw, 96)

  // Monad mark (top right) — makes it obvious which chain this is about
  if (monadLogo) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'
    ctx.beginPath()
    ctx.roundRect(W - 260, 48, 200, 72, 36)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(W - 252, 56, 56, 56, 28)
    ctx.clip()
    ctx.drawImage(monadLogo, W - 252, 56, 56, 56)
    ctx.restore()
    ctx.fillStyle = '#fff'
    ctx.font = `800 30px ${FONT}`
    ctx.fillText('Monad', W - 184, 95)
  }

  // Headline
  ctx.fillStyle = '#fff'
  ctx.font = `800 64px ${FONT}`
  ctx.fillText("I'm a Monad Maximalist.", 60, 210)
  ctx.font = `600 38px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  const sub = 'I strongly believe in Monad! '
  ctx.fillText(sub, 60, 264)
  emoji(ctx, '💜', 60 + ctx.measureText(sub).width, 264, 36)

  // Faith level block
  ctx.fillStyle = 'rgba(0,0,0,.28)'
  ctx.beginPath()
  ctx.roundRect(60, 300, 620, 170, 28)
  ctx.fill()
  emoji(ctx, data.level.emoji, 88, 420, 92)
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.font = `700 20px ${FONT}`
  ctx.fillText('FAITH LEVEL', 210, 350)
  ctx.fillStyle = '#fff'
  ctx.font = `800 48px ${FONT}`
  ctx.fillText(data.level.name, 210, 404)
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.font = `500 24px ${FONT}`
  ctx.fillText(data.level.line, 210, 442)

  // Target block (right)
  ctx.fillStyle = 'rgba(0,0,0,.28)'
  ctx.beginPath()
  ctx.roundRect(700, 300, 440, 170, 28)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.font = `700 20px ${FONT}`
  ctx.fillText(`MY TARGET · ${data.deadline.toUpperCase()}`, 730, 350)
  let tx = 730
  if (monadLogo) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(tx, 368, 48, 48, 24)
    ctx.clip()
    ctx.drawImage(monadLogo, tx, 368, 48, 48)
    ctx.restore()
    tx += 60
  }
  ctx.fillStyle = '#fff'
  ctx.font = `800 56px ${FONT}`
  ctx.fillText(`$${data.target}`, tx, 414)
  const tw = tx - 730 + ctx.measureText(`$${data.target}`).width
  ctx.fillStyle = '#2ee67f'
  ctx.font = `800 30px ${FONT}`
  ctx.fillText(`${Math.round(data.multiple).toLocaleString('en-US')}×`, 730 + tw + 14, 414)
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  const ew = emoji(ctx, data.targetLabel.emoji, 730, 450, 24)
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.font = `500 24px ${FONT}`
  ctx.fillText(data.targetLabel.name, 730 + ew + 8, 450)

  // Chips row: holdings, staking, badges
  let x = 60
  const y = 500
  const chip = (t, bg = 'rgba(255,255,255,.14)', fg = '#fff') => {
    x += pill(ctx, x, y, t, { bg, fg }) + 10
  }
  if (data.showAmount) chip(`${Math.round(data.monAmount).toLocaleString('en-US')} MON`)
  if (data.stakedPct > 0) chip(`${Math.round(data.stakedPct)}% staked`)
  for (const b of data.badges) chip(`${b.emoji} ${b.name}`, 'rgba(46,230,127,.2)', '#7dffb5')
  if (data.showAmount && data.valueAtTarget > 0) {
    chip(`→ $${Math.round(data.valueAtTarget).toLocaleString('en-US')} at target`, 'rgba(196,168,255,.22)', '#e4d6ff')
  }

  // Footer
  ctx.fillStyle = '#fff'
  ctx.font = `700 28px ${FONT}, ${EMOJI}`
  ctx.fillText('Think you believe harder? Take the challenge →', 60, 610)
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.font = `500 18px ${FONT}`
  ctx.textAlign = 'right'
  const proofText = {
    onchain: '✓ Level verified on-chain',
    private: 'Level from a real wallet · address private',
    self: 'Self-reported · not verified',
  }[data.proof]
  ctx.fillText(proofText, W - 60, 610)
  ctx.textAlign = 'left'

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
