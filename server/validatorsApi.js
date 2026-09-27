// server/validatorsApi.js
//
// GET /api/validators — every active Monad validator with name, logo,
// commission, total stake and a *measured* APR (reward accumulator growth
// over the last ~day, net of commission). Heavy to compute (hundreds of
// contract reads + registry lookups), so it runs on the server and is
// cached for an hour; the browser gets one small JSON.

import { createPublicClient, http, formatEther } from 'viem'
import { monad } from 'viem/chains'
import { STAKING_ADDRESS, stakingAbi, REGISTRY_URL } from '../src/lib/stakingAbi.js'

const TTL_MS = 60 * 60_000
const REGISTRY_TTL_MS = 24 * 60 * 60_000
const APR_LOOKBACK_BLOCKS = 250_000n

let cache = { at: 0, data: null }
let inFlight = null
const registry = new Map() // secp -> { at, info }

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

async function registryInfo(secp) {
  const key = secp.replace(/^0x/, '')
  const hit = registry.get(key)
  if (hit && Date.now() - hit.at < REGISTRY_TTL_MS) return hit.info
  try {
    const res = await fetch(`${REGISTRY_URL}/${key}.json`)
    const info = res.ok ? await res.json() : null
    registry.set(key, { at: Date.now(), info })
    return info
  } catch {
    return hit?.info ?? null
  }
}

async function build(client) {
  // 1. All active validator ids (paginated, 100 per page)
  const ids = []
  let start = 0
  for (let page = 0; page < 20; page++) {
    const [isDone, next, valIds] = await client.readContract({
      address: STAKING_ADDRESS,
      abi: stakingAbi,
      functionName: 'getExecutionValidatorSet',
      args: [start],
    })
    ids.push(...valIds)
    if (isDone) break
    start = next
  }

  // 2. Validator state now and ~1 day ago (two multicalls)
  const blockNow = await client.getBlock()
  const pastNumber = blockNow.number - APR_LOOKBACK_BLOCKS
  const pastBlock = await client.getBlock({ blockNumber: pastNumber })
  const seconds = Number(blockNow.timestamp - pastBlock.timestamp)
  const calls = ids.map((id) => ({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'getValidator', args: [id] }))
  const [now, past] = await Promise.all([
    client.multicall({ contracts: calls, blockNumber: blockNow.number }),
    client.multicall({ contracts: calls, blockNumber: pastNumber }),
  ])

  // 3. Names/logos from the official registry
  const infos = await mapLimit(
    ids.map((_, i) => i),
    16,
    (i) => (now[i].status === 'success' ? registryInfo(now[i].result[10]) : null),
  )

  const list = []
  ids.forEach((id, i) => {
    if (now[i].status !== 'success') return
    const [, flags, stake, acc, commission] = now[i].result
    const pastAcc = past[i].status === 'success' ? past[i].result[3] : null
    const growth = pastAcc != null && pastAcc > 0n ? Number(acc - pastAcc) / 1e36 : null
    const info = infos[i]
    if (info?.decommissioned) return
    list.push({
      id: Number(id),
      name: info?.name ?? `Validator #${id}`,
      logo: info?.logo ?? null,
      website: info?.website ?? null,
      vdp: !!info?.vdp,
      commission: Number(commission) / 1e16,
      stake: Number(formatEther(stake)),
      apr: growth != null && growth >= 0 && seconds > 0 ? growth * ((365 * 86400) / seconds) * 100 : null,
      flags: Number(flags),
    })
  })
  return list
}

// Plain Node (req, res) handler — used by the Vite dev server locally and
// by the Vercel serverless function in production (api/validators.js).
export function createValidatorsHandler(rpcUrl) {
  const client = rpcUrl
    ? createPublicClient({ chain: monad, transport: http(rpcUrl), batch: { multicall: true } })
    : null

  async function get() {
    if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data
    inFlight ??= (async () => {
      try {
        const data = await build(client)
        cache = { at: Date.now(), data }
        return data
      } catch (err) {
        if (cache.data) return cache.data // serve stale on RPC trouble
        throw err
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  }

  async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }
    if (!client) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Server RPC key is missing' }))
      return
    }
    try {
      const data = await get()
      // CDN caches for 1h — the list changes slowly
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
      res.end(JSON.stringify({ updatedAt: cache.at, validators: data }))
    } catch (err) {
      res.statusCode = 502
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ error: 'Validator list temporarily unavailable' }))
      console.error('validators:', err.shortMessage ?? err.message)
    }
  }

  handler.warm = () => get().catch(() => {})
  return handler
}

// Vite plugin: mounts the endpoint on both `vite` (dev) and `vite preview`
export function validatorsApi(rpcUrl) {
  const handler = createValidatorsHandler(rpcUrl)
  return {
    name: 'validators-api',
    configureServer(server) {
      server.middlewares.use('/api/validators', handler)
      handler.warm() // warm the cache on startup
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/validators', handler)
    },
  }
}
