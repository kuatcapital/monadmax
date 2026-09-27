// Vercel function: POST /api/maxi/join { address, issuedAt, signature }
// Verifies a free wallet signature + on-chain MON holdings, then adds the
// wallet (as a salted hash) to the Monad Maxi Army. Returns the share code.

import { join, JoinError, joinMessage, MIN_MON } from '../../server/maxi.js'
import { redisConfigured } from '../../server/redis.js'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function POST(request) {
  if (!redisConfigured() || !process.env.MAXI_SALT) return json({ error: 'Maxi Army is not configured' }, 500)
  const raw = await request.text()
  if (raw.length > 2000) return json({ error: 'Request too large' }, 413)
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }
  try {
    return json(await join(body))
  } catch (err) {
    if (err instanceof JoinError) return json({ error: err.message }, err.status)
    console.error('maxi join:', err.message)
    return json({ error: 'Something went wrong, try again' }, 500)
  }
}

// GET → the exact message format + rules, so the client signs the same text
export function GET() {
  return json({ minMon: MIN_MON, example: joinMessage('0x…', new Date().toISOString()) })
}
