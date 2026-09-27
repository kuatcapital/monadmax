// src/lib/alchemy.js
//
// Thin wrapper around Alchemy's JSON-RPC endpoint for Monad.
// We keep the raw fetch logic separate from React (no hooks here) so it's
// easy to test and reuse outside components.

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY
export const RPC_URL = `https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
// For testnet while Monad mainnet access isn't live for you yet:
// const RPC_URL = `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_KEY}`

async function rpcCall(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
  })
  if (!res.ok) throw new Error(`RPC HTTP error ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'RPC error')
  return json.result
}

// Native MON balance. eth_getBalance returns a hex string in wei.
export async function getNativeBalance(address) {
  const hexWei = await rpcCall('eth_getBalance', [address, 'latest'])
  return Number(BigInt(hexWei)) / 1e18
}

// ERC-20 balances. Pass an array of contract addresses for a fixed
// watchlist, or the string 'erc20' to get EVERY token the wallet holds
// (auto-discovery — may include spam, so filter the result).
export async function getTokenBalances(address, contracts = 'erc20') {
  const result = await rpcCall('alchemy_getTokenBalances', [address, contracts])
  return result.tokenBalances // [{ contractAddress, tokenBalance (hex) }, ...]
}

// Metadata (symbol, decimals, logo) for a single token contract.
export async function getTokenMetadata(contractAddress) {
  return rpcCall('alchemy_getTokenMetadata', [contractAddress])
  // -> { name, symbol, decimals, logo }
}
