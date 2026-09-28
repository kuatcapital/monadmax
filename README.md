# MonadMax

Your personal MON manager: portfolio, staking and what-if, in one place.

**Live:** https://monadmax.com · **X:** [@monadmaxis](https://x.com/monadmaxis)

Still early. Stay maxi.

## What it does

- **Portfolio.** Native MON, WMON, ERC-20 and liquid staking tokens with USD prices, 24h change and recent activity. Spam tokens are filtered out.
- **Native staking.** Stake, unstake, withdraw, claim and compound right from the app through Monad's own staking contract (`0x…1000`). No custom contracts, no token approvals, no extra fees.
- **Validators.** All active validators with APR measured on-chain over the last ~24h, after commission. Shown in random order by default, so smaller operators get the same visibility as big ones.
- **Smart compound.** Tells you when compounding actually pays off for your stake size, so you don't burn rewards on gas.
- **What if.** What your MON would be worth at a higher price, or at the market cap of BTC, ETH, BNB or SOL.
- **Monad Maxi card.** Pick a price target, get your faith level and share it on X. Friends open your link and take the challenge. You can verify your level with a free wallet signature; your address is never put in the link.

## Security

- Only five functions of the Monad staking contract can be called: `delegate`, `undelegate`, `withdraw`, `claimRewards`, `compound`. Nothing else, ever.
- Every transaction is simulated before your wallet opens, and you sign it yourself.
- Amounts are parsed strictly (no floats), double submits are blocked.
- CSP and anti-clickjacking headers; the app refuses to sign when embedded in another site.
- API keys for CoinMarketCap and the server-side RPC never reach the browser.

## Stack

React + Vite + Tailwind, wagmi + RainbowKit for wallets, viem for chain reads.
Data: Alchemy (Monad RPC), DexScreener (token prices), CoinMarketCap (market data), official [validator-info](https://github.com/monad-developers/validator-info) registry.
Hosting: Vercel (static app + serverless functions in `api/`), Upstash Redis for the Maxis counter.

## Run locally

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

Keys you need (see `.env.example`):

| Variable | Where to get it |
|---|---|
| `VITE_ALCHEMY_KEY` | Alchemy app on Monad Mainnet (browser key) |
| `ALCHEMY_SERVER_KEY` | Second Alchemy app, used only by the server |
| `CMC_API_KEY` | pro.coinmarketcap.com |
| `VITE_WALLETCONNECT_PROJECT_ID` | cloud.reown.com |
| `VITE_SITE_URL` | Public URL used in share links |

## Project layout

```
api/          Vercel functions: market data, validators, share previews, Maxis
server/       Shared server code (CMC, validators, preview images, Redis)
src/lib/      Chain reads, staking transactions, formatting
src/hooks/    Portfolio, staking, prices, activity
src/components/  UI cards and sheets
```

## Feedback

Found a bug or have an idea? Open an issue or ping [@monadmaxis](https://x.com/monadmaxis).

© Quat Capital, 2026
