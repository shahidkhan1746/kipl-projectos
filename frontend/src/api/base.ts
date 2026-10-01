/**
 * Where the API lives, for every module that talks to it.
 *
 * An empty base in a production build means SAME ORIGIN. `vercel.json` rewrites
 * `/api/v1/:path*` through to the Render service, so the browser never makes a
 * cross-origin request: no CORS entry is needed for this domain, and none is
 * needed for the *.vercel.app preview URLs either, which is what the backend's
 * FRONTEND_URL list existed to chase. Every caller builds paths as
 * `API_BASE + '/api/v1/…'`, so an empty base yields a root-relative path.
 *
 * VITE_API_URL still wins when set, for pointing a local dev server at a
 * deployed API. Set it with no trailing slash and no `/api/v1` suffix —
 * callers add that themselves.
 *
 * The localhost fallback is deliberately scoped to a dev build. It used to
 * apply to every build, copy-pasted across four modules, so deleting or
 * forgetting VITE_API_URL pointed the live site at `http://localhost:3000` —
 * broken for every visitor, and working perfectly on the machine of whoever
 * checked it.
 */
const env = (import.meta as any).env

function resolveApiBase(): string {
  // If running in a browser on a deployed/public origin (not localhost/127.0.0.1),
  // we must NEVER point requests to localhost. If VITE_API_URL was accidentally
  // set to localhost in Vercel or environment files, a public HTTPS site requesting
  // localhost triggers Chrome's "Access other apps and services on this device"
  // prompt and fails with ERR_NETWORK.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
    if (!isLocalHost) {
      const configured = env?.VITE_API_URL
      if (typeof configured === 'string' && configured.trim() && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
        return configured.trim()
      }
      return ''
    }
  }

  return env?.VITE_API_URL ?? (env?.DEV ? 'http://localhost:3000' : '')
}

export const API_BASE: string = resolveApiBase()

