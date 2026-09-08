import axios from 'axios'
import { API_BASE as BASE } from '@/api/base'
import { attachColdStartRetry, WARM_TIMEOUT_MS } from '@/api/coldStart'

/**
 * Unauthenticated reads for the public site — no token, no refresh handling.
 *
 * It carries the cold-start retry for the same reason the authed client does,
 * and with more at stake: a visitor arriving at kiplstpsrinagar.com is the most
 * likely person to hit a sleeping instance, and the least likely to reload and
 * try again.
 */
const publicApi = attachColdStartRetry(
  axios.create({ baseURL: BASE, timeout: WARM_TIMEOUT_MS }),
)

export default publicApi
