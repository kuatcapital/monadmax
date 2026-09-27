// Vercel serverless function: GET /api/markets (CoinMarketCap, key stays server-side)
import { createMarketsHandler } from '../server/marketsApi.js'

export default createMarketsHandler(process.env.CMC_API_KEY)
