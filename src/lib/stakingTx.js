// src/lib/stakingTx.js
//
// Staking actions signed by the user's own wallet (MetaMask, Rabby…).
// The app never holds keys: it builds the transaction, the wallet shows
// it to the user, and nothing is sent without their confirmation.
//
// Every action is simulated first (eth_call with the user's account), so
// a transaction that would fail is caught before the wallet pops up.

import { getAccount, getWalletClient, switchChain } from 'wagmi/actions'
import { STAKING_ADDRESS, stakingAbi } from './stakingAbi'
import { publicClient } from './staking'
import { wagmiConfig, monad } from './wagmi'

export const EXPLORER = monad.blockExplorers.default.url

// The connected wallet (via wagmi/RainbowKit). Refuses to sign for an
// address other than the one the dashboard is showing.
async function getWallet(expectedAddress) {
  const acc = getAccount(wagmiConfig)
  if (!acc.isConnected || !acc.address) throw new Error('Connect your wallet first.')
  if (expectedAddress && acc.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      `Your wallet is on ${acc.address.slice(0, 6)}…${acc.address.slice(-4)} — switch to the address you're viewing.`,
    )
  }
  // Wallet on another network → ask it to switch (adds Monad if unknown)
  if (acc.chainId !== monad.id) await switchChain(wagmiConfig, { chainId: monad.id })
  const wallet = await getWalletClient(wagmiConfig, { chainId: monad.id })
  return { wallet, account: acc.address }
}

// Friendly text for common wallet/RPC errors
export function txErrorMessage(err) {
  const msg = err?.shortMessage || err?.message || String(err)
  if (err?.code === 4001 || /rejected|denied/i.test(msg)) return 'Cancelled in wallet.'
  if (/insufficient funds/i.test(msg)) return 'Not enough MON for amount + gas.'
  // The precompile gives plain-text reasons, e.g. "insufficient stake"
  const reason = `${err?.details ?? ''} ${err?.message ?? ''}`.match(/execution reverted: ([^\n"]+)/)
  if (reason) return `Rejected by the staking contract: ${reason[1].trim()}.`
  return msg.length > 160 ? msg.slice(0, 160) + '…' : msg
}

// Thrown when the transaction WAS sent but we couldn't confirm it (RPC
// timeout etc.). The UI must not treat this as "failed" — retrying could
// send the same action twice.
export class UnconfirmedTxError extends Error {
  constructor(hash) {
    super('Transaction sent, confirmation pending')
    this.hash = hash
  }
}

// Only the staking precompile, only these functions — the app can never
// build a transfer, an approval, or a call to any other contract.
const ALLOWED = new Set(['delegate', 'undelegate', 'withdraw', 'claimRewards', 'compound'])

// Generic runner: simulate → wallet → wait for receipt
async function run(expectedAddress, functionName, args, value) {
  if (!ALLOWED.has(functionName)) throw new Error('Action not allowed.')
  // Clickjacking guard: a malicious site could load us in an invisible
  // iframe and trick the user into clicking. Never sign when framed.
  if (window.top !== window.self) {
    throw new Error('For your safety, open MonadMax directly — not inside another site.')
  }
  const { wallet, account } = await getWallet(expectedAddress)
  const { request } = await publicClient.simulateContract({
    account,
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName,
    args,
    value,
  })
  const hash = await wallet.writeContract(request)
  let receipt
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
  } catch {
    throw new UnconfirmedTxError(hash)
  }
  if (receipt.status !== 'success') throw new Error('Transaction reverted.')
  return hash
}

const toWei = (amount) => {
  if (typeof amount !== 'bigint' || amount <= 0n) throw new Error('Invalid amount.')
  return amount
}

// Amounts are always exact wei bigints (see lib/amount.js) — never floats
export const stake = (addr, validatorId, amountWei) =>
  run(addr, 'delegate', [BigInt(validatorId)], toWei(amountWei))

export const unstake = (addr, validatorId, amountWei, withdrawId) =>
  run(addr, 'undelegate', [BigInt(validatorId), toWei(amountWei), withdrawId])

export const withdraw = (addr, validatorId, withdrawId) => run(addr, 'withdraw', [BigInt(validatorId), withdrawId])
export const claim = (addr, validatorId) => run(addr, 'claimRewards', [BigInt(validatorId)])
export const compound = (addr, validatorId) => run(addr, 'compound', [BigInt(validatorId)])
