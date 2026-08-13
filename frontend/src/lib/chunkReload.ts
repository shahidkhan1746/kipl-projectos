// Handles the "stale chunk after a new deploy" problem. When a new build is
// deployed, the hashed JS filenames change; a tab still running the old
// index.html then fails to lazy-import a route chunk that no longer exists
// ("Failed to fetch dynamically imported module"). Reloading fetches the fresh
// index.html and fixes it — so we do that automatically, once, with a cooldown
// to avoid an infinite reload loop if the reload doesn't actually help.

export function isChunkLoadError(err: any): boolean {
  const msg = (err?.message || String(err) || '').toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('failed to load module script') ||
    msg.includes('chunkloaderror') ||
    /loading chunk [\w-]+ failed/.test(msg)
  )
}

// Returns true (and records the attempt) only if we haven't already reloaded in
// the last 10s — so at most one auto-reload per stale-chunk episode.
export function shouldAutoReload(): boolean {
  const KEY = 'chunk-reload-at'
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 10_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch { /* sessionStorage unavailable — allow the reload */ }
  return true
}

export function reloadIfChunkError(err: any): boolean {
  if (isChunkLoadError(err) && shouldAutoReload()) {
    window.location.reload()
    return true
  }
  return false
}
