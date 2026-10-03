import { useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowSquareOut, Printer, ArrowLeft } from '@phosphor-icons/react'

export default function MprReportPage() {
  const [searchParams] = useSearchParams()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const month = searchParams.get('month') || '9'
  const year = searchParams.get('year') || '2026'
  const audience = searchParams.get('audience') || 'ueed'
  const print = searchParams.get('print') === 'true'

  const iframeSrc = `/mpr.html?month=${month}&year=${year}&audience=${audience}${print ? '&print=true' : ''}`

  function handlePrint() {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    } else {
      window.open(iframeSrc + '&print=true', '_blank')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)', margin: '-20px -24px -32px', background: '#0f172a' }}>
      <div style={{
        background: '#0f172a',
        color: '#fff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        flexShrink: 0,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/reports"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#94a3b8',
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            <ArrowLeft size={14} />
            <span>Reports Hub</span>
          </Link>
          <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.01em' }}>
            Official Monthly Progress Report (MPR)
          </span>
          <span style={{ fontSize: 11, background: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
            Tender Clauses 34 &amp; 23.2
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} weight="bold" />
            <span>Print / Save as PDF (A4)</span>
          </button>
          <a
            href={iframeSrc}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.1)',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <span>Open Standalone Tab</span>
            <ArrowSquareOut size={14} weight="bold" />
          </a>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Official Monthly Progress Report"
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          background: '#cbd5e1'
        }}
      />
    </div>
  )
}
