interface QueryBannerProps {
  isError?: boolean
  isLoading?: boolean
  empty?: boolean
  emptyTitle?: string
  emptyAction?: React.ReactNode
  onRetry?: () => void
}

export function QueryBanner({ isError, isLoading, empty, emptyTitle, emptyAction, onRetry }: QueryBannerProps) {
  if (isLoading) return null
  if (isError) {
    return (
      <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
        Could not load this data.{' '}
        {onRetry && (
          <button onClick={onRetry} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        )}
      </div>
    )
  }
  if (empty) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{emptyTitle || 'Nothing here yet'}</p>
        {emptyAction && <div style={{ marginTop: 12 }}>{emptyAction}</div>}
      </div>
    )
  }
  return null
}
