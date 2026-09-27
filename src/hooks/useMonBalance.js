// src/hooks/useMonBalance.js
//
// Custom hook: given a wallet address, fetch native MON balance +
// a fixed watchlist of ERC-20 tokens, and keep it in React state.
//
// Why a custom hook and not just calling the functions in App.jsx?
// - Reusable: any component that needs "this address's holdings" can
//   call useMonBalance(address) instead of duplicating fetch logic.
// - Encapsulates loading/error/data state together, instead of three
//   separate useState calls scattered in the component.

import { useState, useEffect, useCallback } from 'react'
import { getNativeBalance, getTokenBalances, getTokenMetadata } from '../lib/alchemy'

// Tokens are auto-discovered: Alchemy returns every ERC-20 the wallet
// holds. Spam filtering happens below (and later by price/liquidity).

// Airdropped spam tokens often use URLs or "claim/visit" text as their
// name/symbol to lure you to a phishing site.
const SPAM_PATTERN = /https?:|www\.|\.(com|io|org|xyz|net)|claim|visit|reward|airdrop/i

function looksLikeSpam(meta) {
  if (!meta?.symbol || meta.decimals == null) return true
  if (meta.symbol.length > 12) return true
  return SPAM_PATTERN.test(`${meta.symbol} ${meta.name ?? ''}`)
}

export function useMonBalance(address) {
  // Three pieces of state:
  // - tokens: the data we actually want (array of {symbol, amount, ...})
  // - loading: true while a fetch is in flight, so the UI can show a spinner
  // - error: set if something goes wrong, so the UI can show a message
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Which address `tokens` belongs to — lets callers ignore stale data
  // for a moment right after the address changes
  const [loadedFor, setLoadedFor] = useState(null)
  const [nonce, setNonce] = useState(0) // bump to re-fetch (e.g. after a transaction)
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    // Guard: no address yet (e.g. input is empty) — do nothing.
    if (!address) {
      setTokens([])
      return
    }

    // `cancelled` is the standard pattern for avoiding a classic React bug:
    // if the address changes while a fetch is still in flight, the OLD
    // fetch's response should not overwrite state after the component has
    // moved on to a NEW address. We flip this flag in the cleanup function.
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // 1. Native MON balance
        const monBalance = await getNativeBalance(address)

        // 2. Every ERC-20 token this wallet holds (auto-discovery)
        const raw = await getTokenBalances(address, 'erc20')

        // 3. For each non-zero balance, fetch metadata (symbol/decimals)
        //    Promise.all runs these concurrently instead of one-by-one.
        const found = await Promise.all(
          raw
            // Alchemy returns zero as a padded hex string ("0x000…0"),
            // so compare as a number, not against the literal '0x0'.
            .filter((t) => t.tokenBalance && BigInt(t.tokenBalance) !== 0n)
            .map(async (t) => {
              const meta = await getTokenMetadata(t.contractAddress)
              if (looksLikeSpam(meta)) return null
              const amount = Number(BigInt(t.tokenBalance)) / 10 ** meta.decimals
              return {
                id: t.contractAddress,
                symbol: meta.symbol,
                name: meta.name,
                amount,
                logo: meta.logo,
                contractAddress: t.contractAddress,
              }
            }),
        )
        const erc20 = found.filter(Boolean)

        if (!cancelled) {
          setTokens([{ id: 'native', symbol: 'MON', amount: monBalance }, ...erc20])
          setLoadedFor(address)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    // Cleanup function: React calls this before re-running the effect
    // (e.g. address changed) or when the component unmounts.
    return () => {
      cancelled = true
    }
  }, [address, nonce]) // re-run when `address` changes or reload() is called

  return { tokens, loading, error, loadedFor, reload }
}
