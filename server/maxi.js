// server/maxi.js
//
// "Monad Maxi Army": wallets that proved ownership with a free signature
// and hold at least MIN_MON on-chain. Each joined wallet gets a short code;
// shared links carry that code (never the address) and show "✓ Verified".
//
// Stored in Redis (addresses are only kept as salted hashes):
//   maxi:members            SET   of hash(address)          → the counter
//   maxi:byhash:<hash>      STRING code                     (same wallet → same code)
//   maxi:code:<code>        HASH  { level, mon, at }        (what a link proves)

import { createHash, randomBytes } from 'node:crypto'
import { createPublicClient, http, verifyMessage, formatEther, isAddress, getAddress, parseAbi } from 'viem'
import { monad } from 'viem/chains'
import { STAKING_ADDRESS, stakingAbi } from '../src/lib/stakingAbi.js'
import { LEVELS, joinMessage, MAXI_CODE } from '../src/lib/faithData.js'
import { pipeline } from './redis.js'

// Costs real money per fake wallet → the count stays meaningful
export const MIN_MON = 1
const MESSAGE_MAX_AGE_MS = 10 * 60_000
const WMON = '0x3bd359c1119da7da1d913d1c4d2b7c461115433a'
const erc20 = parseAbi(['function balanceOf(address) view returns (uint256)'])

const serverKey = process.env.ALCHEMY_SERVER_KEY
const client = createPublicClient({
  chain: monad,
  transport: http(serverKey ? `https://monad-mainnet.g.alchemy.com/v2/${serverKey}` : undefined),
  batch: { multicall: true },
})

export { joinMessage }

const hashAddress = (address) =>
  createHash('sha256').update(`${process.env.MAXI_SALT}:${address.toLowerCase()}`).digest('hex')

const newCode = () => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789' // no look-alikes (l/1, o/0)
  const bytes = randomBytes(6)
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

// Native MON + WMON + natively staked MON (active, pending, rewards)
async function monHoldings(address) {
  const [native, wmon] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({ address: WMON, abi: erc20, functionName: 'balanceOf', args: [address] }).catch(() => 0n),
  ])
  let staked = 0n
  let unstaking = false
  try {
    const [, , valIds] = await client.readContract({
      address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'getDelegations', args: [address, 0n],
    })
    const dels = await Promise.all(
      valIds.map((id) =>
        client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'getDelegator', args: [id, address] }),
      ),
    )
    for (const d of dels) staked += d[0] + d[2] + d[3] + d[4] // stake + unclaimed + pending deltas
    // Any open withdrawal request (slot 0 is the one apps use first)?
    const w = await Promise.all(
      valIds.map((id) =>
        client
          .readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'getWithdrawalRequest', args: [id, address, 0] })
          .then((r) => r[0] > 0n)
          .catch(() => false),
      ),
    )
    unstaking = w.some(Boolean)
  } catch {
    // staking read failed → count wallet MON only
  }
  const total = Number(formatEther(native + wmon + staked))
  return { total, staked: Number(formatEther(staked)), unstaking }
}

function levelIndexFor(mon) {
  let idx = 0
  LEVELS.forEach((l, i) => mon >= l.min && (idx = i))
  return idx
}

export class JoinError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export async function join({ address, issuedAt, signature }) {
  if (!isAddress(address ?? '')) throw new JoinError('Bad address')
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature) || signature.length > 1000) {
    throw new JoinError('Bad signature')
  }
  const t = Date.parse(issuedAt)
  if (!Number.isFinite(t) || Math.abs(Date.now() - t) > MESSAGE_MAX_AGE_MS) throw new JoinError('Signature expired, try again')

  const checksum = getAddress(address)
  const ok = await verifyMessage({ address: checksum, message: joinMessage(checksum, issuedAt), signature }).catch(() => false)
  if (!ok) throw new JoinError('Signature does not match this wallet', 401)

  const holdings = await monHoldings(checksum)
  const mon = holdings.total
  // Share-card facts, frozen at verification time (refreshed on re-verify).
  // Percent and flags only — never amounts or the address.
  const stakedPct = mon > 0 ? Math.round((holdings.staked / mon) * 100) : 0
  const badges = [
    stakedPct >= 50 ? 'locked' : holdings.staked > 0 ? 'staker' : null,
    holdings.staked > 0 && !holdings.unstaking ? 'nopaper' : null,
  ].filter(Boolean)
  if (mon < MIN_MON) throw new JoinError(`Hold at least ${MIN_MON} MON (wallet or staked) to join`, 403)
  const level = levelIndexFor(mon)

  const hash = hashAddress(checksum)
  const [existing] = await pipeline([['GET', `maxi:byhash:${hash}`]])
  const code = existing || newCode()
  const [, , , count] = await pipeline([
    ['SADD', 'maxi:members', hash],
    ['SET', `maxi:byhash:${hash}`, code],
    ['HSET', `maxi:code:${code}`, 'level', String(level), 'mon', String(Math.floor(mon)), 'staked', String(stakedPct), 'badges', badges.join(','), 'at', new Date().toISOString()],
    ['SCARD', 'maxi:members'],
  ])
  return { code, levelIndex: level, count, rejoined: !!existing }
}

export async function count() {
  const [n] = await pipeline([['SCARD', 'maxi:members']])
  return n ?? 0
}

// What a shared code proves: the verified level (never the address)
export async function lookupCode(code) {
  if (!MAXI_CODE.test(code ?? '')) return null
  const [h] = await pipeline([['HGETALL', `maxi:code:${code}`]])
  if (!h || !h.length) return null
  const obj = Object.fromEntries(h.reduce((acc, v, i) => (i % 2 ? acc : [...acc, [v, h[i + 1]]]), []))
  return {
    levelIndex: Number(obj.level),
    mon: Number(obj.mon) || 0,
    stakedPct: Number(obj.staked) || 0,
    badges: obj.badges ? obj.badges.split(',') : [],
    verifiedAt: obj.at,
  }
}
