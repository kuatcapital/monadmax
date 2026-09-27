import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { usePortfolio } from './hooks/usePortfolio'
import { usePortfolioHistory } from './hooks/usePortfolioHistory'
import { AppBar } from './components/AppBar'
import { AddressForm } from './components/AddressForm'
import { PortfolioHero } from './components/PortfolioHero'
import { MarketHero } from './components/MarketHero'
import { AssetsCard } from './components/AssetsCard'
import { StakingCard } from './components/StakingCard'
import { LadderCard } from './components/LadderCard'
import { McapCard } from './components/McapCard'
import { FaithCta } from './components/FaithCta'
import { FaithModal } from './components/FaithModal'
import { ChallengeBanner } from './components/ChallengeBanner'
import { readChallengeFromUrl } from './lib/faith'

// "Watch" mode: viewing any address without connecting (read-only).
// Remembered so a reload keeps showing it.
const ADDRESS_KEY = 'monadmax:address'
// Calculator mode (no wallet): how much MON the visitor says they hold
const CALC_KEY = 'monadmax:calcAmount'
const DEFAULT_CALC_AMOUNT = 10000

function loadCalcAmount() {
  try {
    const v = parseFloat(localStorage.getItem(CALC_KEY))
    return Number.isFinite(v) ? v : DEFAULT_CALC_AMOUNT
  } catch {
    return DEFAULT_CALC_AMOUNT
  }
}

function loadAddress() {
  // ?address=0x… in the URL wins — handy for sharing a portfolio link
  const fromUrl = new URLSearchParams(window.location.search).get('address')
  if (/^0x[0-9a-fA-F]{40}$/.test(fromUrl ?? '')) return fromUrl
  try {
    return localStorage.getItem(ADDRESS_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  // Two ways to pick whose dashboard to show:
  // - a connected wallet (wagmi) → full access, can sign staking actions
  // - a pasted/linked address ("watch") → read-only
  const { address: connected, status: walletStatus } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [watchAddress, setWatchAddress] = useState(loadAddress)
  const address = watchAddress || connected || ''
  const watching = !!watchAddress && watchAddress.toLowerCase() !== connected?.toLowerCase()
  // Proven ownership = the viewed address is the connected wallet. Only then
  // may the faith card call the level "yours" / "verified".
  const isOwner = !!connected && !!address && address.toLowerCase() === connected.toLowerCase()
  // Wallet is silently reconnecting after a reload — don't flash the
  // "paste an address" form for a split second
  const restoring = !address && (walletStatus === 'reconnecting' || walletStatus === 'connecting')

  useEffect(() => {
    try {
      if (watchAddress) localStorage.setItem(ADDRESS_KEY, watchAddress)
      else localStorage.removeItem(ADDRESS_KEY)
    } catch {
      // Storage blocked — the address just won't survive a reload
    }
  }, [watchAddress])

  // Connecting (or switching accounts in) a wallet means "show me mine":
  // leave watch mode. A silent reconnect on page load doesn't count.
  const connectRequested = useRef(false)
  const lastConnected = useRef(connected)
  useEffect(() => {
    const prev = lastConnected.current
    lastConnected.current = connected
    if (!connected) return
    if ((prev && prev !== connected) || connectRequested.current) {
      connectRequested.current = false
      setWatchAddress('')
    }
  }, [connected])

  function connectWallet() {
    if (connected) return setWatchAddress('') // already connected → back to my wallet
    connectRequested.current = true
    openConnectModal?.()
  }

  // Opened via a friend's challenge link?
  const [challenge, setChallenge] = useState(readChallengeFromUrl)
  // #maxi in the URL opens the card builder directly
  const [faithOpen, setFaithOpen] = useState(() => window.location.hash === '#maxi')
  const [pendingAccept, setPendingAccept] = useState(false)

  const [calcAmount, setCalcAmount] = useState(loadCalcAmount)
  useEffect(() => {
    try {
      localStorage.setItem(CALC_KEY, String(calcAmount))
    } catch {
      // not persisted — fine
    }
  }, [calcAmount])

  const p = usePortfolio(address)
  const history = usePortfolioHistory(address, p.total, p.ready)

  // With a wallet the "what if" cards use real holdings; without one they
  // work as a calculator on the amount the visitor typed in.
  const monAmount = address ? p.monAmount : calcAmount
  const total = address ? p.total : calcAmount * (p.monPrice ?? 0)
  const t = p.staking?.totals
  const stakedAmount = address ? (t ? t.active + t.pending + t.rewards + t.withdrawing : 0) + p.lstMon : 0

  // Accepting a challenge needs your own holdings: with a wallet open the
  // card builder right away, otherwise ask for an address first.
  function acceptChallenge() {
    if (address) setFaithOpen(true)
    else {
      setPendingAccept(true)
      document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  useEffect(() => {
    if (pendingAccept && address && p.ready) {
      setPendingAccept(false)
      setFaithOpen(true)
    }
  }, [pendingAccept, address, p.ready])

  return (
    <div className="max-w-md mx-auto min-h-screen px-3.5 pt-3.5 pb-6 flex flex-col">
      <AppBar watchAddress={watching ? watchAddress : null} onConnect={connectWallet} onStopWatching={() => setWatchAddress('')} />

      {/* What this app is — for first-time visitors. Kept small so it
          doesn't compete with the logo and name above. */}
      <p className="-mt-2 mb-3.5 px-0.5 text-[12px] leading-snug font-bold">
        <span className="bg-[linear-gradient(120deg,#DDD7FE,#B9ABFF_50%,#8a75ff)] bg-clip-text text-transparent">
          Your personal MON manager: portfolio, staking &amp; what-if.
        </span>
      </p>

      {challenge && (
        <ChallengeBanner challenge={challenge} onAccept={acceptChallenge} onDismiss={() => setChallenge(null)} />
      )}

      {restoring ? (
        <div className="h-40" />
      ) : address ? (
        <div key={address} className="animate-fade">
          <PortfolioHero
            total={p.total}
            change24h={p.change24h}
            change24hUsd={p.change24hUsd}
            tokens={p.tokens}
            monPrice={p.monPrice}
            monChange={p.monChange}
            monLogo={p.markets?.monad?.image}
            monSparkline={p.markets?.monad?.sparkline}
            history={history}
            loading={p.loading}
          />
          <FaithCta monAmount={monAmount} verified={isOwner} onOpen={() => setFaithOpen(true)} />
          <AssetsCard tokens={p.tokens} hiddenCount={p.hiddenCount} loading={p.loading} error={p.error} />
          <StakingCard
            staking={p.staking}
            loading={p.stakingLoading}
            error={p.stakingError}
            monPrice={p.monPrice}
            address={address}
            nativeMon={p.nativeMon}
            onChanged={p.reloadAll}
          />
        </div>
      ) : (
        <div className="animate-fade">
          <MarketHero mon={p.markets?.monad} />
          <FaithCta monAmount={monAmount} onOpen={() => setFaithOpen(true)} />
          <div id="address-form">
            <AddressForm onSubmit={setWatchAddress} onConnect={connectWallet} />
          </div>
        </div>
      )}

      <LadderCard
        total={total}
        monAmount={monAmount}
        monPrice={p.monPrice}
        monChange={p.monChange}
        onAmountChange={address ? undefined : setCalcAmount}
      />
      <McapCard markets={p.markets} monAmount={monAmount} monPrice={p.monPrice} monChange={p.monChange} />

      {p.marketsError && !p.markets && (
        <p className="text-[11px] text-monad-sub text-center">Market data unavailable: {p.marketsError}</p>
      )}

      <FaithModal
        open={faithOpen}
        onClose={() => setFaithOpen(false)}
        monAmount={monAmount}
        stakedAmount={stakedAmount}
        unstaking={t?.withdrawing ?? 0}
        monPrice={p.monPrice}
        address={isOwner ? address : null}
        initial={challenge}
      />

      <footer className="mt-auto pt-6 text-center text-[11px] text-monad-sub/70">© Quat Capital, 2026</footer>
    </div>
  )
}
