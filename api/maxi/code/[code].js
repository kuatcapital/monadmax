// Vercel function: GET /api/maxi/code/<code> → { levelIndex, verifiedAt }
// What a shared "✓ Verified" link proves — the level, never the address.
import { lookupCode } from '../../../server/maxi.js'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.pathname.split('/').pop()
  if ([...url.searchParams].some(([k, v]) => k !== 'code' || v !== code)) {
    return new Response('No query parameters allowed', { status: 400 })
  }
  const found = await lookupCode(code).catch(() => null)
  if (!found) return Response.json({ error: 'Unknown code' }, { status: 404 })
  return Response.json(found, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } })
}
