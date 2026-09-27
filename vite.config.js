import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { marketsApi } from './server/marketsApi.js'
import { validatorsApi } from './server/validatorsApi.js'

// Security headers live in vercel.json (production). `vite preview` applies
// the same ones, so the CSP can be tested locally before deploying.
const securityHeaders = Object.fromEntries(
  JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')).headers[0].headers.map((h) => [
    h.key,
    h.value,
  ]),
)
delete securityHeaders['Strict-Transport-Security'] // HTTPS-only; pointless on localhost

export default defineConfig(({ mode }) => {
  // '' prefix = load ALL .env vars here on the server side, including
  // secrets without the VITE_ prefix (never shipped to the browser)
  const env = loadEnv(mode, process.cwd(), '')
  const serverKey = env.ALCHEMY_SERVER_KEY || env.VITE_ALCHEMY_KEY
  const rpcUrl = serverKey ? `https://monad-mainnet.g.alchemy.com/v2/${serverKey}` : null

  return {
    plugins: [react(), marketsApi(env.CMC_API_KEY), validatorsApi(rpcUrl)],
    preview: { headers: securityHeaders },
  }
})
