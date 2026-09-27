// src/lib/activity.js
//
// Recent wallet activity from Alchemy's transfer index. Raw transfers are
// grouped by transaction into readable actions:
//   MON out + token in (same tx)  → Swapped 1 MON → 13.69 CHOG
//   only out                       → Sent 5 MON to 0xabc…
//   only in                        → Received 98 MON from 0xdef…
// Note: calls to the staking precompile aren't "transfers" in Alchemy's
// index, so stakes don't appear here (the Staking card shows them).

import { RPC_URL } from './alchemy'

const STAKING = '0x0000000000000000000000000000000000001000'
const WMON = '0x3bd359c1119da7da1d913d1c4d2b7c461115433a'
// Airdropped spam tokens love URLs / "claim" names — never show them
const SPAM = /https?:|www\.|\.(com|io|org|xyz|net)|claim|visit|reward|airdrop/i

async function transfers(address, direction, count) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromBlock: '0x0',
          [direction]: address,
          category: ['external', 'erc20'],
          withMetadata: true,
          order: 'desc',
          excludeZeroValue: true,
          maxCount: '0x' + count.toString(16),
        },
      ],
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result.transfers
}

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')
const leg = (t) => ({ asset: t.asset ?? '?', value: t.value ?? 0, token: t.rawContract?.address?.toLowerCase() ?? null })

// -> [{ hash, time, kind: 'swap'|'send'|'receive'|'stake'|'wrap', outs, ins, counterparty }]
export async function getActivity(address, limit = 8) {
  const me = address.toLowerCase()
  const [out, inc] = await Promise.all([transfers(address, 'fromAddress', 25), transfers(address, 'toAddress', 25)])

  const byHash = new Map()
  const add = (t, dir) => {
    if (dir === 'in' && t.category === 'erc20' && SPAM.test(t.asset ?? '')) return
    const g = byHash.get(t.hash) ?? { hash: t.hash, time: t.metadata?.blockTimestamp, outs: [], ins: [], to: null, from: null }
    if (dir === 'out') {
      g.outs.push(leg(t))
      g.to = t.to?.toLowerCase() ?? null
    } else {
      g.ins.push(leg(t))
      g.from = t.from?.toLowerCase() ?? null
    }
    byHash.set(t.hash, g)
  }
  out.forEach((t) => add(t, 'out'))
  inc.forEach((t) => add(t, 'in'))

  return [...byHash.values()]
    .map((g) => {
      let kind = 'receive'
      if (g.outs.length && g.to === STAKING) kind = 'stake'
      else if (g.outs.length && g.to === WMON) kind = 'wrap'
      else if (g.outs.length && g.ins.length) kind = 'swap'
      else if (g.outs.length) kind = 'send'
      return { ...g, kind, counterparty: kind === 'receive' ? short(g.from) : short(g.to), self: g.to === me }
    })
    .sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''))
    .slice(0, limit)
}
