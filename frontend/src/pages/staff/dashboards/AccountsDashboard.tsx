import { useQuery } from '@tanstack/react-query'
import { CreditCard, FileText, ClipboardText } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { accountingApi } from '@/api/accounting.api'
import { tasksApi } from '@/api/tasks.api'
import api from '@/api/client'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff"}
const fmtL = (n:number) => n ? '₹'+(n/100000).toFixed(2)+' L' : '₹0.00 L'
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function AccountsDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const { data: dash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn: () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: recentTx } = useQuery({
    queryKey: ['recent-tx', activeProjectId],
    queryFn: () => api.get('/accounting/transactions', { params:{ projectId:activeProjectId, limit:5 } }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: invoices } = useQuery({
    queryKey: ['invoices', activeProjectId],
    queryFn: () => api.get('/accounting/invoices', { params:{ projectId:activeProjectId } }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const openTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const pendingInvoices = (invoices??[]).filter((i:any) => i.status === 'submitted')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Accounts Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Accounts & Finance · {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        {[
          { label:'Total Expenses',    value:fmtL(dash?.totalExpenses??0),  color:C.text1, path:'/accounting' },
          { label:'Pending Payment',   value:fmtL(dash?.totalPending??0),   color:C.amber, path:'/accounting/invoices' },
          { label:'Pending RA Bills',  value:pendingInvoices.length,         color:pendingInvoices.length>0?C.amber:C.green, path:'/accounting/invoices' },
          { label:'My Open Tasks',     value:openTasks.length,               color:C.blue,  path:'/tasks' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
        {[
          { label:'Record Expense',  desc:'Log site expenses and bills',       path:'/accounting',         Icon:CreditCard },
          { label:'RA Bills',        desc:'Manage running account bills',       path:'/accounting/invoices', Icon:FileText },
          { label:'My Timesheet',    desc:'Submit daily activity log',          path:'/hr/timesheets',       Icon:ClipboardText },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ marginBottom:10 }}><a.Icon size={26} color={C.blue} weight="duotone" /></div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions + pending invoices */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        {/* Recent transactions */}
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Transactions</h2>
            <button onClick={() => nav('/accounting')}
              style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentTx??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No transactions yet.</p>
          ) : (recentTx??[]).map((tx:any, i:number) => (
            <div key={tx.id??i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'11px 18px', borderBottom:'1px solid #f1f5f9' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{tx.description??'Transaction'}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{tx.category??''} · {fmtD(tx.date??tx.createdAt)}</p>
              </div>
              <p style={{ fontSize:13, fontWeight:700, color:tx.type==='credit'?C.green:C.red, margin:0 }}>
                {tx.type==='credit'?'+':'-'}₹{(tx.amount??0).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Pending RA Bills */}
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Pending RA Bills</h2>
            <button onClick={() => nav('/accounting/invoices')}
              style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {pendingInvoices.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, margin:0, fontWeight:600 }}>No pending bills</p>
          ) : pendingInvoices.slice(0,4).map((inv:any, i:number) => (
            <div key={inv.id??i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'11px 18px', borderBottom:'1px solid #f1f5f9' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>RA-{inv.raNumber}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{fmtD(inv.billDate)}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.amber, margin:'0 0 2px' }}>₹{((inv.netPayable??0)/100000).toFixed(2)} L</p>
                <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:'#fffbeb', padding:'2px 8px', borderRadius:10 }}>Submitted</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
