import { useAccount } from 'wagmi'
import { useAccountModal, useChainModal } from '@rainbow-me/rainbowkit'
import { monad } from '../lib/wagmi'
import { shortAddr } from '../lib/format'

const chip = 'flex items-center gap-1.5 rounded-full text-xs font-semibold border transition'

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
          width="44"
          height="44"
          className="w-11 h-11 rounded-xl ring-2 ring-monad-purple/70 shadow-[0_0_14px_rgba(110,84,255,.45)]"
        />
        <div className="leading-tight">
          <b className="text-[15px] tracking-[2px] font-extrabold">
            MONAD
            <span className="bg-[linear-gradient(135deg,#FFE9A8_0%,#FFD36B_40%,#FFAE45_100%)] bg-clip-text text-transparent">
              MAX
            </span>
          </b>
          <div className="text-[11px] text-monad-purple2 font-semibold tracking-[.3px] mt-0.5">Still early. 🚀</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {watchAddress ? (
          // Viewing someone else's address — read-only
          <>
            <span className={`${chip} bg-monad-card2 border-monad-line pl-2 pr-1 py-1`} title="Read-only view">
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
            <button onClick={onConnect} className={`${chip} bg-monad-purple border-monad-purple text-white px-3 py-1`}>
              {isConnected ? 'My wallet' : 'Connect'}
            </button>
          </>
        ) : wrongNetwork ? (
          <button onClick={openChainModal} className={`${chip} bg-[#FFAE45]/15 border-[#FFAE45]/60 text-[#FFAE45] px-3 py-1`}>
            ⚠ Wrong network
          </button>
        ) : isConnected ? (
          <button
            onClick={openAccountModal}
            className={`${chip} bg-monad-card2 border-monad-line hover:border-monad-purple pl-2 pr-3 py-1`}
          >
            <span className="w-2 h-2 rounded-full bg-monad-green shadow-[0_0_6px_#2ee67f]" />
            {shortAddr(address)}
          </button>
        ) : (
          <button
            onClick={onConnect}
            className={`${chip} text-white px-3.5 py-1.5 border-transparent bg-[linear-gradient(135deg,#8a75ff,#6E54FF)] shadow-[0_4px_14px_-4px_rgba(110,84,255,.8)] hover:brightness-110`}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}
