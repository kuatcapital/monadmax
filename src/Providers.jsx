import '@rainbow-me/rainbowkit/styles.css'
import { WagmiProvider } from 'wagmi'
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

export function Providers({ children }) {
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
