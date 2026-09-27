import { useState } from 'react'

// Shown when no address is set: paste any address, or connect a wallet.
export function AddressForm({ onSubmit, onConnect }) {
  const [input, setInput] = useState('')
  const valid = /^0x[0-9a-fA-F]{40}$/.test(input.trim())

  return (
    <div className="bg-monad-card border border-monad-line rounded-[18px] p-4 mb-3.5">
      <div className="font-bold text-sm">Track your portfolio</div>
      <p className="text-[12px] text-monad-sub mt-0.5 mb-3">
        Balances, staking rewards and price what-ifs. Paste any address or connect a wallet.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSubmit(input.trim())
        }}
        className="flex gap-2 mb-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a wallet address 0x…"
          spellCheck={false}
          className="flex-1 min-w-0 bg-monad-card2 border border-monad-line rounded-xl px-3 py-2 text-sm outline-none focus:border-monad-purple"
        />
        <button
          type="submit"
          disabled={!valid}
          className="bg-monad-purple enabled:hover:bg-monad-purple2 disabled:opacity-40 text-white font-semibold rounded-xl px-4 py-2 text-sm"
        >
          Load
        </button>
      </form>
      <button
        onClick={onConnect}
        className="w-full border border-monad-line text-monad-purple2 rounded-xl px-4 py-2 text-sm font-semibold"
      >
        Connect Wallet
      </button>
      <p className="text-[10px] text-monad-sub/70 mt-2 leading-snug">
        Viewing is read-only. Staking actions are signed in your own wallet, and nothing happens without your OK.
      </p>
    </div>
  )
}
