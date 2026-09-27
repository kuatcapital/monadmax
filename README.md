# MonadMax — starter

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and paste your free Alchemy API key
   (create one at alchemy.com, select the Monad network).
3. `npm run dev`

## What's here
- `src/lib/alchemy.js` — raw fetch calls to Alchemy's JSON-RPC endpoint.
  No React here on purpose: keeps the "how do I talk to the chain" logic
  separate from "how do I show this in a component".
- `src/hooks/useMonBalance.js` — the custom hook. Paste an address into
  the input in `App.jsx` and it fetches native MON + your watchlist
  tokens, with loading/error state handled inside the hook.
- `src/App.jsx` — bare-bones UI to exercise the hook. Not styled to
  match the full MonadMax mockup yet — that's the next step once this
  hook is solid.

## Next steps (in order)
1. Get this running with a real address and confirm MON balance shows up.
2. Fill in real contract addresses in `WATCHLIST` (useMonBalance.js).
3. Add a `usePrice(address)` hook for DexScreener (current MON price).
4. Add a `useMarketCaps()` hook for CoinGecko (BTC/ETH/SOL/BNB, for the
   "if MON market cap" card).
5. Port the visual design from the artifact mockup into this app using
   the `monad-*` Tailwind color tokens already set up in
   `tailwind.config.js`.

## Note on the watchlist approach
Alchemy can also return *every* token in a wallet
(`alchemy_getTokenBalances` with no contract list), but that tends to
include spam/dust tokens on any live chain. A fixed watchlist is more
predictable for a personal dashboard — you control exactly what shows up.
