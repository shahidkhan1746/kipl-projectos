import { serverMessageOf, statusOf } from '@/lib/apiFailure'

/** A login error must never accuse the user unless the API actually did. */
export function loginErrorMessage(error: unknown): string {
  const status = statusOf(error)
  const serverMessage = serverMessageOf(error)
  const code = (error as { code?: unknown } | null | undefined)?.code

  if (status === 401) {
    return serverMessage ?? 'Invalid email or password. Please check your credentials.'
  }

  if (status === 429) {
    const headers = (error as { response?: { headers?: Record<string, any> } })?.response?.headers
    const routing = headers?.['x-render-routing'] ?? (typeof headers?.get === 'function' ? headers.get('x-render-routing') : undefined)
    const isRenderWakeup =
      (typeof routing === 'string' && routing.toLowerCase().includes('hibernate')) ||
      (typeof error === 'object' && String((error as any)?.response?.data || '').includes('Too Many Requests') && (headers?.['rndr-id'] || headers?.server === 'Vercel'))

    if (isRenderWakeup) {
      return 'The project server is waking up from idle sleep (Render free tier). Please wait a few seconds and try again.'
    }
    if (!serverMessage || serverMessage.toLowerCase().trim() === 'too many requests') {
      return 'Too many sign-in attempts. Please wait 60 seconds and try again.'
    }
    return serverMessage
  }

  if (
    status === 502 || status === 503 || status === 504 ||
    code === 'ECONNABORTED' || code === 'ETIMEDOUT'
  ) {
    return 'The project server is still waking up. Please wait a moment and try again.'
  }

  if (status === null) {
    return code === 'ERR_NETWORK'
      ? 'The project server could not be reached. Check your connection and try again.'
      : 'The project server did not answer. Please try again.'
  }

  if (status >= 500) {
    return 'The project server could not complete sign-in. Please try again.'
  }

  return serverMessage ?? 'Unable to sign in. Please try again.'
}
