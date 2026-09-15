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
    return serverMessage ?? 'Too many sign-in attempts. Please wait a minute and try again.'
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
