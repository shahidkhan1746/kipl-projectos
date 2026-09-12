import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { shouldAutoReload, isChunkLoadError } from './lib/chunkReload'
import { shouldRetryQuery } from './lib/apiFailure'

// A new deploy rotates chunk hashes; reload once to pick up the fresh build.
window.addEventListener('vite:preloadError', () => { if (shouldAutoReload()) window.location.reload() })
window.addEventListener('unhandledrejection', e => { if (isChunkLoadError(e?.reason) && shouldAutoReload()) window.location.reload() })

const qc = new QueryClient({
  defaultOptions: {
    // Not a blanket count: a 429 or a 403 is answered the same way twice, and
    // repeating it made the refusal worse. See lib/apiFailure.ts.
    queries: { retry: shouldRetryQuery, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
