// src/lib/staking.js
//
// Reads a wallet's native MON staking straight from Monad's staking
// precompile (a built-in "contract" at 0x…1000). Read-only: eth_call only.
// Calls are batched through Multicall3, so even 256 withdrawal slots per
// validator cost a single RPC request.
//
// This module pulls in viem (~250 KB), so the app loads it lazily.

import { createPublicClient, http, formatEther } from 'viem'
import { monad } from 'viem/chains'
import { RPC_URL } from './alchemy'
import { STAKING_ADDRESS, ACC_DENOMINATOR, MAX_WITHDRAW_IDS, stakingAbi, REGISTRY_URL } from './stakingAbi'

const APR_LOOKBACK_BLOCKS = 250_000n // ≈ 1 day of blocks

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(RPC_URL),
  batch: { multicall: true },
})

const read = (functionName, args = [], blockNumber) =>
  publicClient.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName, args, blockNumber })

const infoCache = new Map()
function getValidatorInfo(secpPubkey) {
  const key = secpPubkey.replace(/^0x/, '')
  if (!infoCache.has(key)) {
    infoCache.set(
      key,
      fetch(`${REGISTRY_URL}/${key}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    )
  }
  return infoCache.get(key)
}

// Real APR: how much one staked MON earned over the last ~day (growth of
// the validator's reward accumulator), annualized. Net of commission.
async function measureApr(validatorId, accNow, blockNow) {
  try {
    const past = blockNow.number - APR_LOOKBACK_BLOCKS
    const [v, pastBlock] = await Promise.all([
      read('getValidator', [validatorId], past),
      publicClient.getBlock({ blockNumber: past }),
    ])
    const seconds = Number(blockNow.timestamp - pastBlock.timestamp)
    const growth = Number(accNow - v[3]) / 1e36
    if (seconds <= 0 || growth < 0) return null
    return growth * ((365 * 86400) / seconds) * 100
  } catch {
    return null
  }
}

async function getDelegatedValidatorIds(address) {
  const ids = []
  let start = 0n
  for (let page = 0; page < 20; page++) {
    const [isDone, nextValId, valIds] = await read('getDelegations', [address, start])
    ids.push(...valIds)
    if (isDone) break
    start = nextValId
  }
  return ids
}

// All 256 withdrawal slots for one validator in one multicall
async function getWithdrawals(validatorId, address) {
  const results = await publicClient.multicall({
    contracts: Array.from({ length: MAX_WITHDRAW_IDS }, (_, id) => ({
      address: STAKING_ADDRESS,
      abi: stakingAbi,
      functionName: 'getWithdrawalRequest',
      args: [validatorId, address, id],
    })),
  })
  const list = []
  let freeId = null
  results.forEach((r, id) => {
    const amount = r.status === 'success' ? r.result[0] : 0n
    if (amount > 0n) list.push({ withdrawId: id, amount: Number(formatEther(amount)), withdrawEpoch: Number(r.result[2]) })
    else if (freeId === null && r.status === 'success') freeId = id
  })
  return { list, freeId }
}

// Current network fee per gas (wei) — for "is compounding worth it yet?"
export const getGasPrice = () => publicClient.getGasPrice()

// -> { epoch, positions: [...], totals: { active, pending, rewards, withdrawing, apr } }
export async function getStaking(address) {
  const [[epoch], ids, blockNow] = await Promise.all([
    read('getEpoch'),
    getDelegatedValidatorIds(address),
    publicClient.getBlock(),
  ])
  const epochNum = Number(epoch)

  const positions = await Promise.all(
    ids.map(async (id) => {
      const [d, v, w] = await Promise.all([
        read('getDelegator', [id, address]),
        read('getValidator', [id]),
        getWithdrawals(id, address),
      ])
      const [stake, delAcc, unclaimed, deltaStake, nextDeltaStake, deltaEpoch, nextDeltaEpoch] = d
      const [, , validatorStake, valAcc, commission, , , , , , secpPubkey] = v

      // Rewards accrued since the delegator was last settled on-chain
      const accrued = delAcc > 0n && valAcc > delAcc ? (stake * (valAcc - delAcc)) / ACC_DENOMINATOR : 0n

      const [info, apr] = await Promise.all([getValidatorInfo(secpPubkey), measureApr(id, valAcc, blockNow)])

      const activatesAt = [deltaEpoch, nextDeltaEpoch].filter((e) => e > 0n)
      return {
        validatorId: Number(id),
        name: info?.name ?? `Validator #${id}`,
        logo: info?.logo ?? null,
        website: info?.website ?? null,
        commission: Number(commission) / 1e16, // 1e18 = 100%
        validatorStake: Number(formatEther(validatorStake)),
        active: Number(formatEther(stake)),
        activeWei: stake,
        pending: Number(formatEther(deltaStake + nextDeltaStake)),
        activationEpoch: activatesAt.length ? Number(activatesAt[activatesAt.length - 1]) : null,
        rewards: Number(formatEther(unclaimed + accrued)),
        apr,
        // Unstaked MON waiting to be withdrawn. Claimable once the
        // current epoch reaches withdrawEpoch.
        withdrawals: w.list.map((x) => ({ ...x, ready: epochNum >= x.withdrawEpoch })),
        freeWithdrawId: w.freeId,
      }
    }),
  )

  const live = positions.filter(
    (p) => p.active + p.pending + p.rewards > 0 || p.withdrawals.length > 0,
  )
  const sum = (k) => live.reduce((s, p) => s + p[k], 0)
  const withdrawing = live.reduce((s, p) => s + p.withdrawals.reduce((a, w) => a + w.amount, 0), 0)
  const weight = live.reduce((s, p) => s + (p.apr != null ? p.active + p.pending : 0), 0)
  const apr = weight > 0 ? live.reduce((s, p) => s + (p.apr ?? 0) * (p.active + p.pending), 0) / weight : null

  return {
    epoch: epochNum,
    positions: live,
    totals: { active: sum('active'), pending: sum('pending'), rewards: sum('rewards'), withdrawing, apr },
  }
}
