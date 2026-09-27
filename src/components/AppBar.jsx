import { useAccount } from 'wagmi'
import { useAccountModal, useChainModal } from '@rainbow-me/rainbowkit'
import { monad } from '../lib/wagmi'
import { shortAddr } from '../lib/format'

const chip =
  'inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-semibold leading-none text-center whitespace-nowrap border transition'

export function AppBar({ watchAddress, onConnect, onStopWatching }) {
  const { address, isConnected, chainId } = useAccount()
  const { openAccountModal } = useAccountModal()
  const { openChainModal } = useChainModal()
  const wrongNetwork = isConnected && chainId !== monad.id

  return (
    <div className="flex items-center justify-between mb-5 px-0.5">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="MonadMax"
          width="48"
          height="48"
          className="w-12 h-12 rounded-[14px] ring-2 ring-monad-purple/70 shadow-[0_0_14px_rgba(110,84,255,.45)]"
        />
        <div className="leading-tight">
          <b className="text-[19px] min-[400px]:text-[21px] tracking-[2px] min-[400px]:tracking-[2.5px] font-extrabold leading-none">
            MONAD
            <span className="bg-[linear-gradient(135deg,#FFE9A8_0%,#FFD36B_40%,#FFAE45_100%)] bg-clip-text text-transparent">
              MAX
            </span>
          </b>
          <div className="text-[11px] text-monad-purple2 font-semibold tracking-[.3px] mt-1">Still early. Stay maxi.</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {watchAddress ? (
          // Viewing someone else's address — read-only
          <>
            <span className={`${chip} bg-monad-card2 border-monad-line pl-2.5 pr-1`} title="Read-only view">
              <span className="text-monad-sub">👁</span>
              {shortAddr(watchAddress)}
              <button
                onClick={onStopWatching}
                className="w-5 h-5 rounded-full hover:bg-white/10 text-monad-sub"
                aria-label="Stop watching"
              >
                ✕
              </button>
            </span>
            <button
              onClick={onConnect}
              title={isConnected ? 'My wallet' : 'Connect wallet'}
              className={`${chip} bg-monad-purple border-monad-purple text-white px-2.5 min-[420px]:px-3`}
            >
              {/* Narrow phones: icon only, so the header fits on one line */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="min-[420px]:hidden" aria-hidden="true">
                <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
                <path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
                <path d="M21 12h-4a2 2 0 0 0 0 4h4v-4z" />
              </svg>
              <span className="hidden min-[420px]:inline">{isConnected ? 'My wallet' : 'Connect'}</span>
            </button>
          </>
        ) : wrongNetwork ? (
          <button onClick={openChainModal} className={`${chip} bg-[#FFAE45]/15 border-[#FFAE45]/60 text-[#FFAE45] px-3`}>
            ⚠ Wrong network
          </button>
        ) : isConnected ? (
          <button
            onClick={openAccountModal}
            className={`${chip} bg-monad-card2 border-monad-line hover:border-monad-purple pl-2.5 pr-3`}
          >
            <span className="w-2 h-2 rounded-full bg-monad-green shadow-[0_0_6px_#2ee67f]" />
            {shortAddr(address)}
          </button>
        ) : (
          <button
            onClick={onConnect}
            className={`${chip} text-white px-4 border-transparent bg-[linear-gradient(135deg,#8a75ff,#6E54FF)] shadow-[0_4px_14px_-4px_rgba(110,84,255,.8)] hover:brightness-110`}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}
