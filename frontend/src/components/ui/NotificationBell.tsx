import { useState } from 'react'
import { Bell, Warning, CheckCircle } from '@phosphor-icons/react'
import { useDataCompleteness, PENDING_ITEMS } from './DataCompletenessModal'

const C = {
  blue:'#2563eb', amber:'#d97706', green:'#059669',
  border:'#e2e8f0', text1:'#0f172a', text3:'#94a3b8', red:'#dc2626',
}

export function NotificationBell() {
  const { pending } = useDataCompleteness()
  const [open, setOpen] = useState(false)
  const count = pending.length

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'relative', background:'none', border:'none', cursor:'pointer',
          width:38, height:38, borderRadius:10, display:'flex', alignItems:'center',
          justifyContent:'center', color: count > 0 ? C.amber : '#94a3b8' }}
        onMouseEnter={e => (e.currentTarget.style.background='#f1f5f9')}
        onMouseLeave={e => (e.currentTarget.style.background='none')}>
        <Bell size={20} weight={count > 0 ? 'fill' : 'regular'} />
        {count > 0 && (
          <span style={{ position:'absolute', top:4, right:4, width:16, height:16,
            borderRadius:'50%', background:C.amber, color:'#fff', fontSize:9, fontWeight:800,
            display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:998 }} onClick={() => setOpen(false)} />
          <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', zIndex:999,
            background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14,
            boxShadow:'0 12px 40px rgba(0,0,0,0.12)', width:340, overflow:'hidden' }}>

            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`,
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Project Data Completeness</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, fontWeight:700,
                background: count === 0 ? '#dcfce7' : '#fffbeb',
                color: count === 0 ? C.green : C.amber }}>
                {count === 0 ? 'All complete ✓' : `${count} pending`}
              </span>
            </div>

            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {PENDING_ITEMS.map(item => {
                const isPending = pending.some(p => p.key === item.key)
                return (
                  <div key={item.key} style={{ padding:'12px 16px', borderBottom:'1px solid #f8fafc',
                    background: isPending ? '#fffbeb' : '#fff',
                    display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ marginTop:1, flexShrink:0 }}>
                      {isPending
                        ? <Warning size={14} color={C.amber} weight='fill' />
                        : <CheckCircle size={14} color={C.green} weight='fill' />}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12, fontWeight:600, margin:'0 0 2px',
                        color: isPending ? C.amber : C.green }}>
                        {item.label}
                        {item.required && isPending && <span style={{ color:C.red }}> *</span>}
                      </p>
                      <p style={{ fontSize:11, color:C.text3, margin:0, lineHeight:1.4 }}>
                        {isPending ? item.source : 'Confirmed ✓'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {count > 0 && (
              <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}`, background:'#f8fafc' }}>
                <p style={{ fontSize:11, color:C.text3, margin:0, textAlign:'center' as any }}>
                  Will popup again on next login until all items are confirmed
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
