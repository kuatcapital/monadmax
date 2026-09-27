// Vercel serverless function: GET /api/validators (all Monad validators + measured APR)
import { createValidatorsHandler } from '../server/validatorsApi.js'

// Server-only key (no VITE_ prefix → never shipped to the browser)
const key = process.env.ALCHEMY_SERVER_KEY
export default createValidatorsHandler(key ? `https://monad-mainnet.g.alchemy.com/v2/${key}` : null)
