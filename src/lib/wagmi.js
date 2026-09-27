// src/lib/wagmi.js
//
// Wallet connection config (wagmi + RainbowKit).
// - Monad mainnet only, reads go through our Alchemy RPC
// - Installed browser wallets are discovered automatically (EIP-6963), so
//   MetaMask, Rabby, Phantom, OKX… each show up by name
// - Mobile wallets connect via WalletConnect (QR / deep link) — needs a free
//   Project ID from cloud.reown.com in VITE_WALLETCONNECT_PROJECT_ID

import { http, createConfig } from 'wagmi'
import { monad } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  rabbyWallet,
  phantomWallet,
  okxWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { RPC_URL } from './alchemy'

export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''
export const HAS_WALLETCONNECT = !!WALLETCONNECT_PROJECT_ID

const appInfo = { appName: 'MonadMax', projectId: WALLETCONNECT_PROJECT_ID || 'missing' }

// Without a Project ID, WalletConnect-based options would fail — offer only
// wallets that live in the browser.
const connectors = connectorsForWallets(
  HAS_WALLETCONNECT
    ? [
        { groupName: 'Popular', wallets: [metaMaskWallet, rabbyWallet, phantomWallet, okxWallet] },
        { groupName: 'More', wallets: [walletConnectWallet, coinbaseWallet, injectedWallet] },
      ]
    : [{ groupName: 'Browser wallets', wallets: [injectedWallet] }],
  appInfo,
)

export const wagmiConfig = createConfig({
  chains: [monad],
  connectors,
  transports: { [monad.id]: http(RPC_URL) },
  multiInjectedProviderDiscovery: true, // EIP-6963: list every installed wallet
})

export { monad }
