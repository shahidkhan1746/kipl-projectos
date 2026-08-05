import { create } from 'zustand'
import { createPortal } from 'react-dom'
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; msg: string; type: ToastType }
interface ConfirmState { open: boolean; message: string; title?: string; confirmText?: string; danger?: boolean; resolve?: (v: boolean) => void }

interface S {
  toasts: Toast[]
  confirm: ConfirmState
  push: (msg: string, type: ToastType) => void
  dismiss: (id: number) => void
  ask: (message: string, opts?: Partial<ConfirmState>) => Promise<boolean>
  answer: (v: boolean) => void
}
let seq = 1
const useNotify = create<S>((set, get) => ({
  toasts: [],
  confirm: { open: false, message: '' },
  push: (msg, type) => { const id = seq++; set(s => ({ toasts: [...s.toasts, { id, msg, type }] })); setTimeout(() => get().dismiss(id), 4200) },
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  ask: (message, opts) => new Promise<boolean>(resolve => set({ confirm: { open: true, message, resolve, ...opts } })),
  answer: (v) => { const r = get().confirm.resolve; set(s => ({ confirm: { ...s.confirm, open: false, resolve: undefined } })); r?.(v) },
}))

// Public API — importable anywhere, no context/provider threading.
export const toast = Object.assign(
  (msg: string) => useNotify.getState().push(msg, 'info'),
  {
    success: (msg: string) => useNotify.getState().push(msg, 'success'),
    error:   (msg: string) => useNotify.getState().push(String(msg), 'error'),
    info:    (msg: string) => useNotify.getState().push(msg, 'info'),
  },
)
export const confirmAsk = (message: string, opts?: Partial<ConfirmState>) => useNotify.getState().ask(message, opts)

const ACCENT: Record<ToastType, { bar: string; icon: any; color: string }> = {
  success: { bar: '#059669', icon: CheckCircle,   color: '#047857' },
  error:   { bar: '#dc2626', icon: WarningCircle,  color: '#b91c1c' },
  info:    { bar: '#2563eb', icon: Info,           color: '#1d4ed8' },
}

export function Notifier() {
  const { toasts, dismiss, confirm, answer } = useNotify()
  return createPortal(
    <>
      {/* Toasts */}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 12000, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
        {toasts.map(t => {
          const a = ACCENT[t.type]; const Icon = a.icon
          return (
            <div key={t.id} className="fade-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid ' + a.bar, borderRadius: 10, padding: '11px 13px', boxShadow: '0 8px 30px rgba(15,23,42,0.12)' }}>
              <Icon size={17} weight="fill" color={a.bar} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.45, flex: 1 }}>{t.msg}</span>
              <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, flexShrink: 0 }}><X size={14} /></button>
            </div>
          )
        })}
      </div>

      {/* Confirm dialog */}
      {confirm.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 12001, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => answer(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 8px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{confirm.title ?? 'Please confirm'}</p>
              <p style={{ fontSize: 13.5, color: '#475569', margin: 0, lineHeight: 1.55 }}>{confirm.message}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px' }}>
              <button onClick={() => answer(false)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => answer(true)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', background: confirm.danger ? '#dc2626' : '#2563eb', color: '#fff', cursor: 'pointer' }}>{confirm.confirmText ?? 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
