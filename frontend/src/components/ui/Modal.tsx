import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'

interface P {
  open:     boolean
  onClose:  () => void
  title:    string
  children: React.ReactNode
  width?:   number | string
  footer?:  React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 540, footer }: P) {
  const titleId = useId()
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const overlay: React.CSSProperties = {
    position:       'fixed',
    inset:          0,
    zIndex:         9999,
    background:     'rgba(15, 23, 42, 0.55)',
    WebkitBackdropFilter: 'blur(4px)',
    backdropFilter: 'blur(4px)',
    overflowY:      'auto',
    padding:        '16px 8px',
    display:        'flex',
    justifyContent: 'center',
    alignItems:     'center',
    boxSizing:      'border-box',
  }

  const box: React.CSSProperties = {
    width:        '96%',
    maxWidth:     width,
    minWidth:     0,
    maxHeight:    'calc(100vh - 32px)',
    background:   '#ffffff',
    border:       '1px solid #e8edf2',
    borderRadius: 14,
    boxShadow:    '0 20px 60px rgba(15,23,42,0.18)',
    overflow:     'hidden',
    display:      'flex',
    flexDirection: 'column',
    boxSizing:    'border-box',
    margin:       'auto',
  }

  const header: React.CSSProperties = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 18px',
    borderBottom:   '1px solid #f1f5f9',
    background:     '#ffffff',
    flexShrink:     0,
  }

  const body: React.CSSProperties = {
    padding: '18px 18px',
    overflowY: 'auto',
    flex: 1,
    boxSizing: 'border-box',
  }

  const ftr: React.CSSProperties = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:            8,
    padding:        '12px 18px',
    borderTop:      '1px solid #f1f5f9',
    background:     '#ffffff',
    flexShrink:     0,
    flexWrap:       'wrap',
  }

  const btnClose: React.CSSProperties = {
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    color:       '#94a3b8',
    padding:     6,
    borderRadius: 6,
    display:     'flex',
    alignItems:  'center',
    lineHeight:  1,
  }

  // Portal renders directly into document.body
  // This ensures position:fixed covers the ENTIRE viewport
  // regardless of any parent CSS transforms or stacking contexts
  return createPortal(
    <div className="modal-overlay" style={overlay} onClick={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} style={box} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={header}>
          <span id={titleId} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            {title}
          </span>
          <button style={btnClose} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={body}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer" style={ftr}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
