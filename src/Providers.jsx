import '@rainbow-me/rainbowkit/styles.css'
import { useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { reconnect } from 'wagmi/actions'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { wagmiConfig, monad } from './lib/wagmi'

const queryClient = new QueryClient()

// RainbowKit modal styled with the Monad brand palette
const theme = darkTheme({
  accentColor: '#6E54FF',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'large',
  overlayBlur: 'small',
})
theme.colors.modalBackground = '#110b22'
theme.colors.modalBorder = '#2f2560'
theme.colors.profileForeground = '#110b22'

// Mobile wallets (MetaMask app ↔ browser) don't always send "network
// changed" back to the page. When the tab becomes visible again (user
// returns from the wallet app), re-read the wallet's state.
function useResyncOnReturn() {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconnect(wagmiConfig).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}

export function Providers({ children }) {
  useResyncOnReturn()
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} initialChain={monad} modalSize="compact" appInfo={{ appName: 'MonadMax' }}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
