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

export const API_BASE: string =
  env?.VITE_API_URL ?? (env?.DEV ? 'http://localhost:3000' : '')
