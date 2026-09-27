// src/hooks/usePortfolio.js
//
// Combines the three data sources into one portfolio view:
//   balances (Alchemy) + staking (Monad staking precompile)
//   + token prices (DexScreener) + MON market (CoinMarketCap)
// Components only read the result; none of them fetch anything themselves.

import { useMemo } from 'react'
import { useMonBalance } from './useMonBalance'
import { useTokenPrices } from './useTokenPrices'
import { useMarkets } from './useMarkets'
import { useStaking } from './useStaking'

// Wrapped MON — used as a price fallback for native MON if market data fails
export const WMON_ADDRESS = '0x3bd359c1119da7da1d913d1c4d2b7c461115433a'

// Tokens with less pool liquidity than this are hidden. Spam tokens
// usually have no pool at all, or a tiny fake one.
const MIN_LIQUIDITY_USD = 1000

// Liquid staking tokens: staked MON wrapped in an ERC-20 (aprMON by
// aPriori, shMON by FastLane, gMON by Magma, sMON by Kintsu…). They count
// as staked MON — valued at their market price, converted to MON.
const LST_PATTERN = /^(apr|sh|g|s|st|ls|mag|kin|mu)MON$/i
export const isLiquidStaking = (symbol) => LST_PATTERN.test(symbol ?? '')

export function usePortfolio(address) {
  const { tokens: walletBalances, loading, error, loadedFor, reload: reloadBalances } = useMonBalance(address)
  const { markets, error: marketsError } = useMarkets()
  const {
    staking,
    loading: stakingLoading,
    error: stakingError,
    done: stakingDone,
    reload: reloadStaking,
  } = useStaking(address)

  // Staked MON is still MON you own: show it as its own row, count it in
  // the total and in the "what if" math.
  const balances = useMemo(() => {
    const t = staking?.totals
    // Includes MON that is unstaking (still yours until withdrawn)
    const stakedTotal = t ? t.active + t.pending + t.rewards + t.withdrawing : 0
    return stakedTotal > 0
      ? [...walletBalances, { id: 'staked', symbol: 'MON', label: 'Staked', amount: stakedTotal }]
      : walletBalances
  }, [walletBalances, staking])

  const erc20Addresses = balances.filter((t) => t.contractAddress).map((t) => t.contractAddress)
  const { prices, ready: pricesReady } = useTokenPrices([WMON_ADDRESS, ...erc20Addresses])

  return useMemo(() => {
    const monMarket = markets?.monad
    const wmon = prices[WMON_ADDRESS]
    const monPrice = monMarket?.price ?? wmon?.priceUsd ?? null
    const monChange = monMarket?.change24h ?? wmon?.change24h ?? null

    const priced = balances.map((t) => {
      if (!t.contractAddress) {
        return {
          ...t,
          logo: monMarket?.image ?? null,
          price: monPrice,
          change24h: monChange,
          value: monPrice != null ? t.amount * monPrice : null,
        }
      }
      const p = prices[t.contractAddress.toLowerCase()]
      return {
        ...t,
        ...(isLiquidStaking(t.symbol) ? { lst: true, label: 'Liquid staked' } : {}),
        // Logo priority: Alchemy metadata → DexScreener token page
        logo: t.logo ?? p?.imageUrl ?? null,
        price: p?.priceUsd ?? null,
        change24h: p?.change24h ?? null,
        liquidityUsd: p?.liquidityUsd ?? 0,
        value: p ? t.amount * p.priceUsd : null,
      }
    })

    // Until prices arrive, show everything; after that, hide unpriced tokens
    const visible = pricesReady
      ? priced.filter((t) => !t.contractAddress || t.liquidityUsd >= MIN_LIQUIDITY_USD)
      : priced
    const hiddenCount = priced.length - visible.length

    const total = visible.reduce((s, t) => s + (t.value ?? 0), 0)

    // Portfolio 24h change: compare today's value with yesterday's value
    // reconstructed from each token's own 24h change.
    let prevTotal = 0
    for (const t of visible) {
      if (t.value == null) continue
      prevTotal += t.change24h != null ? t.value / (1 + t.change24h / 100) : t.value
    }
    const change24h = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
    const change24hUsd = prevTotal > 0 ? total - prevTotal : null

    const tokens = visible
      .map((t) => ({ ...t, pct: total > 0 && t.value != null ? (t.value / total) * 100 : null }))
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))

    // MON exposure = native + staked MON + WMON (same asset, different
    // wrapper) + liquid staking tokens converted to MON by value
    const lstMon = monPrice
      ? visible.filter((t) => t.lst && t.value != null).reduce((s, t) => s + t.value / monPrice, 0)
      : 0
    const monAmount =
      visible
        .filter((t) => !t.contractAddress || t.contractAddress.toLowerCase() === WMON_ADDRESS)
        .reduce((s, t) => s + t.amount, 0) + lstMon
    const nativeMon = walletBalances.find((t) => t.id === 'native')?.amount ?? 0

    // Everything for this address has loaded — safe to record in history
    const ready =
      !!address && loadedFor === address && !loading && pricesReady && monPrice != null && stakingDone

    return {
      ready,
      staking,
      // After a transaction: refresh both the wallet and the staking view
      reloadAll: () => {
        reloadBalances()
        reloadStaking()
      },
      lstMon,
      nativeMon,
      stakingLoading,
      stakingError,
      tokens,
      hiddenCount,
      total,
      change24h,
      change24hUsd,
      monAmount,
      monPrice,
      monChange,
      markets,
      loading,
      error: error ?? null,
      marketsError,
    }
  }, [
    address,
    balances,
    loadedFor,
    prices,
    pricesReady,
    markets,
    loading,
    error,
    marketsError,
    staking,
    stakingLoading,
    stakingError,
    stakingDone,
    reloadStaking,
    reloadBalances,
    walletBalances,
  ])
}
