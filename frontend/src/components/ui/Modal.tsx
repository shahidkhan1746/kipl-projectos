import { useEffect, useRef } from 'react'
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
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const overlay: React.CSSProperties = {
    position:   'fixed',
    inset:      0,
    zIndex:     9999,
    background: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    overflowY:  'auto',
    padding:    '40px 20px',
    display:    'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  }

  const box: React.CSSProperties = {
    width:        '92%',
    maxWidth:     width,
    minWidth:     320,
    background:   '#ffffff',
    border:       '1px solid #e8edf2',
    borderRadius: 14,
    boxShadow:    '0 20px 60px rgba(15,23,42,0.16)',
    overflow:     'hidden',
    display:      'flex',
    flexDirection: 'column',
  }

  const header: React.CSSProperties = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '16px 22px',
    borderBottom:   '1px solid #f1f5f9',
    background:     '#ffffff',
    flexShrink:     0,
  }

  const body: React.CSSProperties = {
    padding: '22px 22px',
    overflowY: 'auto',
  }

  const ftr: React.CSSProperties = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:            8,
    padding:        '14px 22px',
    borderTop:      '1px solid #f1f5f9',
    background:     '#ffffff',
    flexShrink:     0,
  }

  const btnClose: React.CSSProperties = {
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    color:       '#94a3b8',
    padding:     4,
    borderRadius: 6,
    display:     'flex',
    alignItems:  'center',
    lineHeight:  1,
  }

  // Portal renders directly into document.body
  // This ensures position:fixed covers the ENTIRE viewport
  // regardless of any parent CSS transforms or stacking contexts
  return createPortal(
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            {title}
          </span>
          <button style={btnClose} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div style={body}>
          {children}
        </div>
        {footer && (
          <div style={ftr}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}