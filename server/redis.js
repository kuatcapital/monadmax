// server/redis.js
//
// Minimal Upstash Redis client over its REST API (no connection pooling
// needed in serverless functions). Credentials come from the Vercel ↔
// Upstash integration: KV_REST_API_URL / KV_REST_API_TOKEN.

const URL = process.env.KV_REST_API_URL
const TOKEN = process.env.KV_REST_API_TOKEN

export const redisConfigured = () => !!(URL && TOKEN)

// Several commands in one round trip: [['SADD', 'k', 'v'], ['SCARD', 'k']]
export async function pipeline(commands) {
  const res = await fetch(`${URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`)
  const out = await res.json()
  return out.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}

export async function cmd(...args) {
  const [result] = await pipeline([args])
  return result
}
