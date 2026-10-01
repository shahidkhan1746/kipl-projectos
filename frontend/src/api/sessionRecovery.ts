import { waitForApi } from './coldStart'

/** One readiness check + one rotating POST shared by concurrent callers. */
export function createSessionRecovery<T>(base: string, send: () => Promise<T>, ready = waitForApi) {
  let pending: Promise<T> | null = null
  return () => {
    if (!pending) {
      pending = (async () => {
        if (!await ready(base)) throw new Error('The project API could not be reached. Your saved session has not been cleared; please retry.')
        return send()
      })().finally(() => { pending = null })
    }
    return pending
  }
}
