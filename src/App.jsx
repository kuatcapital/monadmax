import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { usePortfolio } from './hooks/usePortfolio'
import { usePortfolioHistory } from './hooks/usePortfolioHistory'
import { useMaxiCount } from './hooks/useMaxiCount'
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

  const [calcAmount, setCalcAmount] = useState(loadCalcAmount)
  useEffect(() => {
    try {
      localStorage.setItem(CALC_KEY, String(calcAmount))
    } catch {
      // not persisted — fine
    }
  }, [calcAmount])

  const p = usePortfolio(address)
  const maxiArmy = useMaxiCount()
  const history = usePortfolioHistory(address, p.total, p.ready)

  // With a wallet the "what if" cards use real holdings; without one they
  // work as a calculator on the amount the visitor typed in.
  const monAmount = address ? p.monAmount : calcAmount
  const total = address ? p.total : calcAmount * (p.monPrice ?? 0)
  // Faith level: real holdings only when the viewed wallet is provably yours
  const faithMon = isOwner ? p.monAmount : calcAmount
  const t = p.staking?.totals
  const stakedAmount = address ? (t ? t.active + t.pending + t.rewards + t.withdrawing : 0) + p.lstMon : 0

  // Accepting a challenge opens the card builder with the friend's target.
  // Connected wallet → real level; otherwise the builder asks "how much MON
  // do you hold?" (pasting someone's address wouldn't prove anything).
  function acceptChallenge() {
    setFaithOpen(true)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen px-3.5 pt-3.5 pb-6 flex flex-col">
      <AppBar watchAddress={watching ? watchAddress : null} onConnect={connectWallet} onStopWatching={() => setWatchAddress('')} />

      {/* What this app is — for first-time visitors. Kept small so it
          doesn't compete with the logo and name above. */}
      <p className="-mt-1 mb-7 px-0.5 text-[12px] leading-snug font-bold">
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
          <FaithCta monAmount={faithMon} verified={isOwner} maxiCount={maxiArmy.count} onOpen={() => setFaithOpen(true)} />
          <AssetsCard tokens={p.tokens} hiddenCount={p.hiddenCount} loading={p.loading} error={p.error} address={address} />
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
          <FaithCta monAmount={faithMon} maxiCount={maxiArmy.count} onOpen={() => setFaithOpen(true)} />
          <div id="address-form">
            <AddressForm onSubmit={setWatchAddress} onConnect={connectWallet} />
          </div>
        </div>
      )}

      <McapCard markets={p.markets} monAmount={monAmount} monPrice={p.monPrice} monChange={p.monChange} />
      <LadderCard
        total={total}
        monAmount={monAmount}
        monPrice={p.monPrice}
        monChange={p.monChange}
        onAmountChange={address ? undefined : setCalcAmount}
      />

      {p.marketsError && !p.markets && (
        <p className="text-[11px] text-monad-sub text-center">Market data unavailable: {p.marketsError}</p>
      )}

      <FaithModal
        maxiCount={maxiArmy.count}
        onMaxiJoined={maxiArmy.update}
        open={faithOpen}
        onClose={() => setFaithOpen(false)}
        monAmount={faithMon}
        stakedAmount={isOwner ? stakedAmount : 0}
        unstaking={isOwner ? (t?.withdrawing ?? 0) : 0}
        onAmountChange={isOwner ? undefined : setCalcAmount}
        monPrice={p.monPrice}
        address={isOwner ? address : null}
        initial={challenge}
      />

      <footer className="mt-auto pt-6 flex flex-col items-center gap-2 text-[11px] text-monad-sub/70">
        <div className="flex items-center gap-3">
          <a
            href="https://x.com/monadmaxis"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="MonadMax on X"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[.05] border border-monad-line text-monad-sub hover:text-monad-txt hover:border-monad-purple transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://github.com/kuatcapital/monadmax"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source code on GitHub"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[.05] border border-monad-line text-monad-sub hover:text-monad-txt hover:border-monad-purple transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
        </div>
        <span>© Quat Capital, 2026 · open source</span>
      </footer>
    </div>
  )
}
