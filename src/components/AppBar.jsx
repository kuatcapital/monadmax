import { useAccount } from 'wagmi'
import { useAccountModal } from '@rainbow-me/rainbowkit'
import { monad } from '../lib/wagmi'
import { shortAddr } from '../lib/format'

const chip =
  'inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-semibold leading-none text-center whitespace-nowrap border transition'

export function AppBar({ watchAddress, onConnect, onStopWatching }) {
  const { address, isConnected, chainId } = useAccount()
  const { openAccountModal } = useAccountModal()
  const wrongNetwork = isConnected && chainId !== monad.id

  return (
    <>
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
          <b className="text-[19px] min-[400px]:text-[21px] tracking-[0.04em] font-extrabold leading-none">
            MONAD
            <span className="bg-[linear-gradient(135deg,#FFE9A8_0%,#FFD36B_40%,#FFAE45_100%)] bg-clip-text text-transparent">
              MAX
            </span>
          </b>
          <div className="text-[11px] text-monad-purple2 font-semibold tracking-[.3px] mt-1">Still early. Stay maxi.</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {watchAddress && isConnected ? (
          // Watching someone else while your own wallet is connected
          <button onClick={onConnect} className={`${chip} bg-monad-purple border-monad-purple text-white px-3.5`}>
            My wallet
          </button>
        ) : watchAddress ? (
          <button
            onClick={onConnect}
            className={`${chip} text-white px-4 border-transparent bg-[linear-gradient(135deg,#8a75ff,#6E54FF)] shadow-[0_4px_14px_-4px_rgba(110,84,255,.8)] hover:brightness-110`}
          >
            Connect
          </button>
        ) : isConnected ? (
          // Other network in the wallet isn't an error: the app reads Monad via
          // its own RPC and asks the wallet to switch right before signing.
          <button
            onClick={openAccountModal}
            title={wrongNetwork ? 'Your wallet is on another network — it will be switched to Monad when you sign' : undefined}
            className={`${chip} bg-monad-card2 border-monad-line hover:border-monad-purple pl-2.5 pr-3`}
          >
            <span
              className={`w-2 h-2 rounded-full ${wrongNetwork ? 'bg-[#FFAE45] shadow-[0_0_6px_#FFAE45]' : 'bg-monad-green shadow-[0_0_6px_#2ee67f]'}`}
            />
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

    {/* Read-only view of someone else's address: its own slim bar, so the
        header keeps a single button and never collides with the logo */}
    {watchAddress && (
      <div className="-mt-2.5 mb-4 flex items-center justify-between gap-2 rounded-xl border border-monad-line bg-monad-card2/60 px-3 py-1.5 text-[11px]">
        <span className="text-monad-sub truncate">
          👁 Viewing <b className="text-monad-txt">{shortAddr(watchAddress)}</b> · read-only
        </span>
        <button onClick={onStopWatching} className="shrink-0 font-semibold text-monad-purple2 hover:text-monad-txt">
          Stop ✕
        </button>
      </div>
    )}
    </>
  )
}
