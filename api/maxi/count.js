// Vercel function: GET /api/maxi/count → { count } of verified Monad Maxis
import { count } from '../../server/maxi.js'
import { redisConfigured } from '../../server/redis.js'

export async function GET(request) {
  if (new URL(request.url).search) return new Response('No query parameters allowed', { status: 400 })
  if (!redisConfigured()) return Response.json({ count: null })
  try {
    return Response.json(
      { count: await count() },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch {
    return Response.json({ count: null }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
