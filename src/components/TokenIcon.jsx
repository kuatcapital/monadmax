// Token logo: live URL from the APIs, else an official logo by ticker,
// else a colored letter tile (also used if the image fails to load).

import { useState } from 'react'
import { safeUrl } from '../lib/safeUrl'

// Official CoinGecko logos for common tickers that APIs don't always
// return an image for (e.g. USDC on Monad has no DexScreener logo).
const CG = 'https://assets.coingecko.com/coins/images'
const KNOWN_LOGOS = {
  USDC: `${CG}/6319/large/USDC.png`,
  USDT: `${CG}/325/large/Tether.png`,
  USDT0: `${CG}/325/large/Tether.png`,
  MUSD: `${CG}/68451/large/MetaMask-mUSD-Icon-200x200.png`,
  ETH: `${CG}/279/large/ethereum.png`,
  WETH: `${CG}/279/large/ethereum.png`,
  BTC: `${CG}/1/large/bitcoin.png`,
  WBTC: `${CG}/1/large/bitcoin.png`,
  BNB: `${CG}/825/large/bnb-icon2_2x.png`,
  SOL: `${CG}/4128/large/solana.png`,
}

const KNOWN_COLORS = {
  MON: '#6E54FF',
  WMON: '#6E54FF',
  USDC: '#2775ca',
  USDT: '#26a17b',
  WETH: '#627eea',
  WBTC: '#f7931a',
}

// Stable color per symbol, so unknown tokens don't flicker between renders
function colorFor(symbol) {
  if (KNOWN_COLORS[symbol]) return KNOWN_COLORS[symbol]
  let h = 0
  for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 55% 45%)`
}

// Official Monad token icon (monad.xyz brand kit), bundled with the app —
// always wins over whatever logo an API returns for MON.
const OFFICIAL = { MON: '/monad.svg', WMON: '/monad.svg' }

export function TokenIcon({ symbol, logo, size = 32, round = false }) {
  const upper = symbol.toUpperCase()
  const official = OFFICIAL[upper]
  const src = official ?? safeUrl(logo) ?? KNOWN_LOGOS[upper]
  // Remember WHICH url failed, so a new url (e.g. after prices load) gets a fresh try
  const [failedSrc, setFailedSrc] = useState(null)
  const radius = round ? '50%' : Math.round(size * 0.31)

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={symbol}
        width={size}
        height={size}
        // The bundled Monad icon is preloaded: load it right away, and while
        // it decodes show its own purple instead of a dark placeholder dot
        loading={official ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        style={{ width: size, height: size, borderRadius: radius, background: official ? colorFor(upper) : undefined }}
        className={`shrink-0 object-cover ${official ? '' : 'bg-monad-card2'}`}
      />
    )
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, background: colorFor(symbol), fontSize: size * 0.42 }}
    >
      {symbol[0]}
    </div>
  )
}
