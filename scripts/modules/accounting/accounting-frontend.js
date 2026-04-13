// Run: node scripts/modules/accounting/frontend.js
const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', '..')
const SRC  = path.join(ROOT, 'frontend', 'src')

function w(p, lines) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, lines.join('\n'), 'utf8')
}

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

console.log('\n\x1b[1mBuilding Accounting Frontend\x1b[0m\n')

w(path.join(SRC, 'api/accounting.api.ts'), [
  "import api from './client'",
  "const B = '/api/v1/accounting'",
  "export const accApi = {",
  "  dashboard:    (projectId?: string) => api.get(B+'/dashboard', { params: { projectId } }),",
  "  vendors:      (p?: any) => api.get(B+'/vendors', { params: p }),",
  "  createVendor: (d: any) => api.post(B+'/vendors', d),",
  "  updateVendor: (id: string, d: any) => api.patch(B+'/vendors/'+id, d),",
  "  transactions: (p?: any) => api.get(B+'/transactions', { params: p }),",
  "  createTx:     (d: any) => api.post(B+'/transactions', d),",
  "  updateTx:     (id: string, d: any) => api.patch(B+'/transactions/'+id, d),",
  "  markPaid:     (id: string, d: any) => api.patch(B+'/transactions/'+id+'/pay', d),",
  "  tds:          (p?: any) => api.get(B+'/tds', { params: p }),",
  "  recordTdsPay: (d: any) => api.post(B+'/tds/payment', d),",
  "}",
])
ok('accounting.api.ts')

// Full AccountingPage
const accPage = `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CurrencyInr, Plus, Receipt, Users, WarningCircle, CheckCircle, ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { accApi } from '@/api/accounting.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const C = { card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626' }

const CAT_LABELS: Record<string,string> = { labour:'Labour',material:'Material',equipment_hire:'Equipment Hire',equipment_fuel:'Fuel',subcontractor:'Subcontractor',transport:'Transport',site_office:'Site Office',safety:'Safety',testing_qa:'Testing/QA',liaison:'Liaison',salary:'Salary',petty_cash:'Petty Cash',gst_payment:'GST Payment',tds_payment:'TDS Payment',bank_charges:'Bank Charges',other:'Other' }
const CAT_COLORS: Record<string,string> = { labour:'#7c3aed',material:'#2563eb',equipment_hire:'#d97706',equipment_fuel:'#d97706',subcontractor:'#059669',transport:'#0891b2',site_office:'#64748b',safety:'#dc2626',testing_qa:'#0891b2',liaison:'#9333ea',salary:'#2563eb',petty_cash:'#94a3b8',gst_payment:'#dc2626',tds_payment:'#dc2626',bank_charges:'#64748b',other:'#94a3b8' }
const CAT_OPTS = Object.entries(CAT_LABELS).map(([v,l]) => ({ value:v,label:l }))
const VENDOR_CATS = ['subcontractor','material','equipment','labour','consultant','utility','other'].map(v => ({ value:v,label:v.charAt(0).toUpperCase()+v.slice(1) }))
const PAY_MODES = ['rtgs','neft','cheque','cash','upi','other'].map(v => ({ value:v,label:v.toUpperCase() }))

function fmtL(n: number) { return '\u20b9' + (n/1e5).toFixed(1) + 'L' }
function fmtFull(n: number) { return '\u20b9' + Number(n).toLocaleString('en-IN',{maximumFractionDigits:0}) }

type Tab = 'transactions' | 'vendors' | 'tds'
const TX_BLANK = { type:'expense',date:new Date().toISOString().split('T')[0],description:'',category:'material',vendorId:'',invoiceNo:'',grossAmount:'',gstRate:'18',tdsRate:'0',paymentMode:'rtgs',remarks:'' }
const VN_BLANK = { name:'',contactPerson:'',phone:'',email:'',gstin:'',pan:'',category:'subcontractor',tdsApplicable:false,tdsSection:'194C',tdsRate:'1' }

export default function AccountingPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('transactions')
  const [showTx, setShowTx] = useState(false)
  const [showVn, setShowVn] = useState(false)
  const [payModal, setPayModal] = useState<any>(null)
  const [txForm, setTxForm] = useState<any>(TX_BLANK)
  const [vnForm, setVnForm] = useState<any>(VN_BLANK)
  const [payForm, setPayForm] = useState({ paymentMode:'rtgs',paymentRef:'',paymentDate:new Date().toISOString().split('T')[0] })
  const [txFilter, setTxFilter] = useState({ type:'',category:'',status:'' })

  const { data: dash } = useQuery({ queryKey:['acc-dash',activeProjectId], queryFn:() => accApi.dashboard(activeProjectId??undefined).then(r=>r.data), enabled:!!activeProjectId })
  const { data: transactions, isLoading: txLoading } = useQuery({ queryKey:['transactions',activeProjectId,txFilter], queryFn:() => accApi.transactions({ projectId:activeProjectId,...txFilter }).then(r=>r.data), enabled:!!activeProjectId })
  const { data: vendors } = useQuery({ queryKey:['vendors',activeProjectId], queryFn:() => accApi.vendors({ projectId:activeProjectId }).then(r=>r.data), enabled:!!activeProjectId })
  const { data: tdsEntries, isLoading: tdsLoading } = useQuery({ queryKey:['tds',activeProjectId], queryFn:() => accApi.tds({ projectId:activeProjectId }).then(r=>r.data), enabled:!!activeProjectId&&tab==='tds' })

  const createTxM = useMutation({ mutationFn:() => accApi.createTx({ ...txForm,projectId:activeProjectId,grossAmount:parseFloat(txForm.grossAmount),gstRate:parseFloat(txForm.gstRate||'0'),tdsRate:parseFloat(txForm.tdsRate||'0') }), onSuccess:() => { qc.invalidateQueries({queryKey:['transactions']}); qc.invalidateQueries({queryKey:['acc-dash']}); setShowTx(false); setTxForm(TX_BLANK) } })
  const createVnM = useMutation({ mutationFn:() => accApi.createVendor({ ...vnForm,projectId:activeProjectId,tdsRate:parseFloat(vnForm.tdsRate||'0') }), onSuccess:() => { qc.invalidateQueries({queryKey:['vendors']}); setShowVn(false); setVnForm(VN_BLANK) } })
  const markPaidM = useMutation({ mutationFn:() => accApi.markPaid(payModal.id,payForm), onSuccess:() => { qc.invalidateQueries({queryKey:['transactions']}); qc.invalidateQueries({queryKey:['acc-dash']}); setPayModal(null) } })

  const vendorMap: Record<string,any> = {}
  ;(vendors??[]).forEach((v: any) => { vendorMap[v.id] = v })
  const vendorOpts = [{ value:'',label:'\u2014 No vendor \u2014' }, ...(vendors??[]).map((v: any) => ({ value:v.id,label:v.name }))]

  const g = parseFloat(txForm.grossAmount)||0
  const gst = g*(parseFloat(txForm.gstRate)||0)/100
  const tds = g*(parseFloat(txForm.tdsRate)||0)/100
  const net = g+gst-tds

  const txs = transactions??[]
  const vnds = vendors??[]
  const tdsRows = tdsEntries??[]
  const totalTdsDeducted = tdsRows.filter((t:any)=>t.type==='deducted').reduce((s:number,t:any)=>s+Number(t.tdsAmount),0)
  const totalTdsPaid = tdsRows.filter((t:any)=>t.type==='paid').reduce((s:number,t:any)=>s+Number(t.tdsAmount),0)
  const tdsLiability = totalTdsDeducted - totalTdsPaid

  return (
    <div className="fade-in" style={{ display:'flex',flexDirection:'column',gap:24 }}>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24,fontWeight:800,color:C.text1,margin:0,letterSpacing:'-0.02em' }}>Accounting</h1>
          <p style={{ fontSize:14,color:C.text3,marginTop:4 }}>Expenses \u00b7 Vendors \u00b7 TDS Ledger \u00b7 Payments</p>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <Button variant="secondary" size="md" icon={<Users size={15}/>} onClick={()=>setShowVn(true)}>Add Vendor</Button>
          <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={()=>setShowTx(true)}>New Transaction</Button>
        </div>
      </div>

      {dash && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12 }}>
          {[
            { label:'Total Expenses',value:fmtL(dash.totalExpenses),color:C.red },
            { label:'Total Income',value:fmtL(dash.totalIncome),color:C.green },
            { label:'Pending',value:fmtL(dash.totalPending),color:C.amber },
            { label:'This Month',value:fmtL(dash.thisMonthExpenses),color:C.blue },
            { label:'TDS Deducted',value:fmtL(dash.totalTds),color:'#7c3aed' },
            { label:'GST Paid',value:fmtL(dash.totalGst),color:'#0891b2' },
          ].map(s => (
            <div key={s.label} style={{ background:C.card,border:'1.5px solid '+C.border,borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:20,fontWeight:800,color:s.color,fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {dash?.byCategory && Object.keys(dash.byCategory).length > 0 && (
        <div style={{ background:C.card,border:'1.5px solid '+C.border,borderRadius:14,padding:'16px 20px' }}>
          <h2 style={{ fontSize:13,fontWeight:700,color:C.text1,margin:'0 0 12px' }}>Expenses by Category</h2>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {Object.entries(dash.byCategory).sort(([,a],[,b])=>Number(b)-Number(a)).map(([cat,amt]: any) => {
              const color = CAT_COLORS[cat]??C.text3
              return (
                <div key={cat} style={{ padding:'7px 12px',borderRadius:10,background:color+'12',border:'1.5px solid '+color+'25',display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:7,height:7,borderRadius:'50%',background:color }} />
                  <span style={{ fontSize:12,color:C.text2,fontWeight:500 }}>{CAT_LABELS[cat]??cat}</span>
                  <span style={{ fontSize:12,fontWeight:800,color }}>{fmtL(Number(amt))}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display:'flex',borderBottom:'1.5px solid '+C.border }}>
        {([['transactions','Transactions ('+txs.length+')'],['vendors','Vendors ('+vnds.length+')'],['tds','TDS Ledger']] as const).map(([t,l]) => (
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'10px 20px',fontSize:13,fontWeight:600,border:'none',borderBottom:tab===t?'2px solid '+C.blue:'2px solid transparent',background:'none',cursor:'pointer',color:tab===t?C.blue:C.text3,marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div style={{ background:C.card,borderRadius:16,border:'1.5px solid '+C.border,overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'12px 20px',borderBottom:'1.5px solid '+C.border,background:'#f8f9fc',display:'flex',gap:10 }}>
            {[
              { val:txFilter.type,    opts:[{v:'',l:'All Types'},{v:'expense',l:'Expense'},{v:'income',l:'Income'}], key:'type' },
              { val:txFilter.status,  opts:[{v:'',l:'All Status'},{v:'pending',l:'Pending'},{v:'paid',l:'Paid'}], key:'status' },
            ].map(f => (
              <select key={f.key} value={f.val} onChange={e=>setTxFilter(x=>({...x,[f.key]:e.target.value}))} style={{ padding:'7px 12px',border:'1.5px solid '+C.border,borderRadius:8,fontSize:12,color:C.text1,background:'#fff',outline:'none',cursor:'pointer',fontFamily:'inherit' }}>
                {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}
            <span style={{ marginLeft:'auto',fontSize:12,color:C.text3,alignSelf:'center' }}>{txs.length} records</span>
          </div>
          {txLoading ? <div style={{ display:'flex',justifyContent:'center',padding:40 }}><Spinner /></div>
          : txs.length === 0 ? (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'56px 24px',gap:10 }}>
              <CurrencyInr size={32} color={C.border} />
              <p style={{ fontSize:14,fontWeight:600,color:C.text3,margin:0 }}>No transactions yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={()=>setShowTx(true)}>Add first transaction</Button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',minWidth:900 }}>
                <thead>
                  <tr style={{ background:'#f8f9fc',borderBottom:'1.5px solid '+C.border }}>
                    {['Date','Type','Description','Category','Vendor','Gross','GST','TDS','Net','Status','Action'].map(h => (
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx: any, i: number) => {
                    const catColor = CAT_COLORS[tx.category]??C.text3
                    const isIncome = tx.type === 'income'
                    return (
                      <tr key={tx.id} style={{ borderBottom:i<txs.length-1?'1px solid #f1f5f9':'none' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{ padding:'11px 14px',fontSize:12,color:C.text2,whiteSpace:'nowrap' }}>{tx.date}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontSize:11,fontWeight:700,color:isIncome?C.green:C.red }}>{isIncome?'\u2191 Income':'\u2193 Expense'}</span>
                        </td>
                        <td style={{ padding:'11px 14px',fontSize:12,color:C.text1,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{tx.description}</td>
                        <td style={{ padding:'11px 14px' }}>
                          {tx.category && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:999,background:catColor+'15',color:catColor,border:'1px solid '+catColor+'30',fontWeight:700 }}>{CAT_LABELS[tx.category]??tx.category}</span>}
                        </td>
                        <td style={{ padding:'11px 14px',fontSize:12,color:C.text2,whiteSpace:'nowrap' }}>{vendorMap[tx.vendorId]?.name??tx.vendorName??'\u2014'}</td>
                        <td style={{ padding:'11px 14px',fontSize:12,fontWeight:600,color:C.text1,whiteSpace:'nowrap' }}>{fmtFull(Number(tx.grossAmount))}</td>
                        <td style={{ padding:'11px 14px',fontSize:12,color:C.amber,whiteSpace:'nowrap' }}>{Number(tx.gstAmount)>0?'+'+fmtFull(Number(tx.gstAmount)):'\u2014'}</td>
                        <td style={{ padding:'11px 14px',fontSize:12,color:C.red,whiteSpace:'nowrap' }}>{Number(tx.tdsAmount)>0?'-'+fmtFull(Number(tx.tdsAmount)):'\u2014'}</td>
                        <td style={{ padding:'11px 14px',fontSize:13,fontWeight:800,color:isIncome?C.green:C.text1,whiteSpace:'nowrap' }}>{fmtFull(Number(tx.netAmount))}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ display:'inline-flex',padding:'2px 8px',borderRadius:999,fontSize:10,fontWeight:700,background:tx.status==='paid'?'#ecfdf5':'#fffbeb',color:tx.status==='paid'?C.green:C.amber,border:'1.5px solid '+(tx.status==='paid'?'#a7f3d0':'#fde68a') }}>{tx.status}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          {tx.status==='pending' && <button onClick={()=>setPayModal(tx)} style={{ padding:'5px 10px',background:'#ecfdf5',border:'1.5px solid #a7f3d0',borderRadius:6,fontSize:11,color:C.green,cursor:'pointer',fontWeight:600 }}>Mark Paid</button>}
                          {tx.status==='paid' && <span style={{ fontSize:11,color:C.green }}>\u2713 {tx.paymentMode?.toUpperCase()}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'vendors' && (
        <div style={{ background:C.card,borderRadius:16,border:'1.5px solid '+C.border,overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {vnds.length === 0 ? (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'56px 24px',gap:10 }}>
              <Users size={32} color={C.border} />
              <p style={{ fontSize:14,fontWeight:600,color:C.text3,margin:0 }}>No vendors yet</p>
              <Button variant="secondary" size="sm" icon={<Plus size={13}/>} onClick={()=>setShowVn(true)}>Add vendor</Button>
            </div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc',borderBottom:'1.5px solid '+C.border }}>
                  {['Vendor','Category','Contact','GSTIN','PAN','TDS'].map(h => (
                    <th key={h} style={{ padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vnds.map((v: any, i: number) => (
                  <tr key={v.id} style={{ borderBottom:i<vnds.length-1?'1px solid #f1f5f9':'none' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <td style={{ padding:'12px 16px' }}>
                      <p style={{ fontSize:13,fontWeight:600,color:C.text1,margin:0 }}>{v.name}</p>
                      {v.email && <p style={{ fontSize:11,color:C.text3,margin:'2px 0 0' }}>{v.email}</p>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11,padding:'2px 8px',borderRadius:999,background:'#eff6ff',color:C.blue,border:'1px solid #bfdbfe',fontWeight:600,textTransform:'capitalize' }}>{v.category}</span>
                    </td>
                    <td style={{ padding:'12px 16px',fontSize:12,color:C.text2 }}>{v.contactPerson??'\u2014'}<br/><span style={{ color:C.text3 }}>{v.phone??''}</span></td>
                    <td style={{ padding:'12px 16px',fontSize:12,color:C.text2,fontFamily:'monospace' }}>{v.gstin??'\u2014'}</td>
                    <td style={{ padding:'12px 16px',fontSize:12,color:C.text2,fontFamily:'monospace' }}>{v.pan??'\u2014'}</td>
                    <td style={{ padding:'12px 16px',fontSize:12,fontWeight:700,color:v.tdsApplicable?C.red:C.text3 }}>{v.tdsApplicable?(v.tdsSection+' @ '+Number(v.tdsRate)+'%'):'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'tds' && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
            {[
              { label:'TDS Deducted',value:fmtFull(totalTdsDeducted),color:C.red },
              { label:'TDS Paid to Govt',value:fmtFull(totalTdsPaid),color:C.green },
              { label:'Outstanding Liability',value:fmtFull(tdsLiability),color:tdsLiability>0?C.amber:C.green },
            ].map(s => (
              <div key={s.label} style={{ background:C.card,border:'1.5px solid '+C.border,borderRadius:12,padding:'16px 20px' }}>
                <div style={{ fontSize:11,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:22,fontWeight:800,color:s.color,fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background:C.card,borderRadius:16,border:'1.5px solid '+C.border,overflow:'hidden' }}>
            <div style={{ padding:'14px 22px',background:'#f8f9fc',borderBottom:'1.5px solid '+C.border }}>
              <h2 style={{ fontSize:14,fontWeight:700,color:C.text1,margin:0 }}>TDS Ledger — auto-generated on each transaction</h2>
            </div>
            {tdsLoading ? <div style={{ display:'flex',justifyContent:'center',padding:40 }}><Spinner /></div>
            : tdsRows.length === 0 ? (
              <div style={{ padding:'40px 24px',textAlign:'center' }}>
                <p style={{ fontSize:14,color:C.text3 }}>No TDS entries yet. TDS entries are auto-created when you add a transaction with TDS rate {'>'} 0.</p>
              </div>
            ) : (
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8f9fc',borderBottom:'1.5px solid '+C.border }}>
                    {['Date','Vendor','PAN','Section','Rate','Taxable','TDS Amount','FY','Qtr','Type'].map(h => (
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tdsRows.map((t: any, i: number) => (
                    <tr key={t.id} style={{ borderBottom:i<tdsRows.length-1?'1px solid #f1f5f9':'none' }}>
                      <td style={{ padding:'11px 14px',fontSize:12,color:C.text2 }}>{t.date}</td>
                      <td style={{ padding:'11px 14px',fontSize:12,fontWeight:600,color:C.text1 }}>{t.vendorName??'\u2014'}</td>
                      <td style={{ padding:'11px 14px',fontSize:11,color:C.text2,fontFamily:'monospace' }}>{t.deducteePan??'\u2014'}</td>
                      <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11,padding:'2px 8px',borderRadius:999,background:'#f5f3ff',color:'#6d28d9',border:'1px solid #ddd6fe',fontWeight:700 }}>{t.tdsSection}</span></td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:C.red }}>{Number(t.tdsRate)}%</td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:C.text1,fontVariantNumeric:'tabular-nums' }}>{fmtFull(Number(t.taxableAmount))}</td>
                      <td style={{ padding:'11px 14px',fontSize:13,fontWeight:800,color:C.red }}>{fmtFull(Number(t.tdsAmount))}</td>
                      <td style={{ padding:'11px 14px',fontSize:11,color:C.text3 }}>{t.financialYear}</td>
                      <td style={{ padding:'11px 14px',fontSize:11,color:C.text3 }}>{t.quarter}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:10,padding:'2px 8px',borderRadius:999,fontWeight:700,background:t.type==='paid'?'#ecfdf5':'#fef2f2',color:t.type==='paid'?C.green:C.red,border:'1.5px solid '+(t.type==='paid'?'#a7f3d0':'#fecaca') }}>{t.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal open={showTx} onClose={()=>setShowTx(false)} title="New Transaction" width={600}
        footer={<><Button variant="ghost" onClick={()=>setShowTx(false)}>Cancel</Button><Button variant="primary" loading={createTxM.isPending} onClick={()=>createTxM.mutate()} disabled={!txForm.description||!txForm.grossAmount}>Save</Button></>}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5 }}>Type</label>
              <div style={{ display:'flex',gap:8 }}>
                {['expense','income'].map(t => (
                  <button key={t} onClick={()=>setTxForm((f: any)=>({...f,type:t}))} style={{ flex:1,padding:'9px',border:'1.5px solid',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',background:txForm.type===t?(t==='expense'?'#fef2f2':'#ecfdf5'):'#fff',color:txForm.type===t?(t==='expense'?C.red:C.green):C.text3,borderColor:txForm.type===t?(t==='expense'?'#fecaca':'#a7f3d0'):'#d1d5db' }}>{t==='expense'?'\u2193 Expense':'\u2191 Income'}</button>
                ))}
              </div>
            </div>
            <Input label="Date" type="date" value={txForm.date} onChange={(e: any)=>setTxForm((f: any)=>({...f,date:e.target.value}))} />
          </div>
          <Input label="Description *" value={txForm.description} onChange={(e: any)=>setTxForm((f: any)=>({...f,description:e.target.value}))} placeholder="Cement supply, Labour payment..." />
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <Select label="Category" value={txForm.category} onChange={(e: any)=>setTxForm((f: any)=>({...f,category:e.target.value}))} options={CAT_OPTS} />
            <Select label="Vendor" value={txForm.vendorId} onChange={(e: any)=>setTxForm((f: any)=>({...f,vendorId:e.target.value}))} options={vendorOpts} />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <Input label="Invoice No." value={txForm.invoiceNo} onChange={(e: any)=>setTxForm((f: any)=>({...f,invoiceNo:e.target.value}))} placeholder="INV-2025-001" />
            <Input label="Invoice Date" type="date" value={txForm.invoiceDate} onChange={(e: any)=>setTxForm((f: any)=>({...f,invoiceDate:e.target.value}))} />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
            <Input label="Gross Amount (\u20b9) *" type="number" value={txForm.grossAmount} onChange={(e: any)=>setTxForm((f: any)=>({...f,grossAmount:e.target.value}))} placeholder="500000" />
            <Input label="GST %" type="number" value={txForm.gstRate} onChange={(e: any)=>setTxForm((f: any)=>({...f,gstRate:e.target.value}))} />
            <Input label="TDS %" type="number" value={txForm.tdsRate} onChange={(e: any)=>setTxForm((f: any)=>({...f,tdsRate:e.target.value}))} />
          </div>
          {g > 0 && (
            <div style={{ padding:'12px 14px',background:'#f8f9fc',border:'1.5px solid '+C.border,borderRadius:8 }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,fontSize:12 }}>
                {[['Gross',fmtFull(g),C.text1],['+GST','+'+fmtFull(gst),C.amber],['-TDS','-'+fmtFull(tds),C.red],['Net',fmtFull(net),C.green]].map(([l,v,c]) => (
                  <div key={l as string}><div style={{ color:C.text3,marginBottom:2 }}>{l}</div><div style={{ fontWeight:700,color:c as string }}>{v}</div></div>
                ))}
              </div>
            </div>
          )}
          <Select label="Payment Mode" value={txForm.paymentMode} onChange={(e: any)=>setTxForm((f: any)=>({...f,paymentMode:e.target.value}))} options={PAY_MODES} />
        </div>
      </Modal>

      <Modal open={showVn} onClose={()=>setShowVn(false)} title="Add Vendor / Contractor" width={560}
        footer={<><Button variant="ghost" onClick={()=>setShowVn(false)}>Cancel</Button><Button variant="primary" loading={createVnM.isPending} onClick={()=>createVnM.mutate()} disabled={!vnForm.name}>Save Vendor</Button></>}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <Input label="Vendor Name *" value={vnForm.name} onChange={(e: any)=>setVnForm((f: any)=>({...f,name:e.target.value}))} placeholder="ABC Constructions" />
            <Select label="Category" value={vnForm.category} onChange={(e: any)=>setVnForm((f: any)=>({...f,category:e.target.value}))} options={VENDOR_CATS} />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <Input label="Contact Person" value={vnForm.contactPerson} onChange={(e: any)=>setVnForm((f: any)=>({...f,contactPerson:e.target.value}))} />
            <Input label="Phone" value={vnForm.phone} onChange={(e: any)=>setVnForm((f: any)=>({...f,phone:e.target.value}))} />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <Input label="GSTIN" value={vnForm.gstin} onChange={(e: any)=>setVnForm((f: any)=>({...f,gstin:e.target.value}))} placeholder="01AAAAA0000A1Z5" />
            <Input label="PAN" value={vnForm.pan} onChange={(e: any)=>setVnForm((f: any)=>({...f,pan:e.target.value}))} placeholder="AAAAA0000A" />
          </div>
          <div style={{ padding:'12px 14px',background:'#faf5ff',border:'1.5px solid #ddd6fe',borderRadius:8 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
              <input type="checkbox" checked={vnForm.tdsApplicable} onChange={(e: any)=>setVnForm((f: any)=>({...f,tdsApplicable:e.target.checked}))} id="tds-chk" />
              <label htmlFor="tds-chk" style={{ fontSize:13,fontWeight:600,color:'#6d28d9',cursor:'pointer' }}>TDS Applicable</label>
            </div>
            {vnForm.tdsApplicable && (
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5 }}>TDS Section</label>
                  <select value={vnForm.tdsSection} onChange={(e: any)=>setVnForm((f: any)=>({...f,tdsSection:e.target.value}))} style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #d1d5db',borderRadius:8,fontSize:13,color:'#111827',outline:'none',fontFamily:'inherit',background:'#fff' }}>
                    <option value="194C">194C \u2014 Contractors (1%)</option>
                    <option value="194I">194I \u2014 Rent (10%)</option>
                    <option value="194J">194J \u2014 Professional (10%)</option>
                    <option value="194A">194A \u2014 Interest (10%)</option>
                    <option value="194H">194H \u2014 Commission (5%)</option>
                  </select>
                </div>
                <Input label="TDS Rate %" type="number" value={vnForm.tdsRate} onChange={(e: any)=>setVnForm((f: any)=>({...f,tdsRate:e.target.value}))} />
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={!!payModal} onClose={()=>setPayModal(null)} title="Mark as Paid" width={440}
        footer={<><Button variant="ghost" onClick={()=>setPayModal(null)}>Cancel</Button><Button variant="success" loading={markPaidM.isPending} onClick={()=>markPaidM.mutate()} icon={<CheckCircle size={14}/>}>Confirm Payment</Button></>}>
        {payModal && (
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ padding:'12px 14px',background:'#f8f9fc',border:'1.5px solid '+C.border,borderRadius:8 }}>
              <p style={{ fontSize:13,fontWeight:600,color:C.text1,margin:'0 0 4px' }}>{payModal.description}</p>
              <p style={{ fontSize:12,color:C.text3,margin:0 }}>Net: <strong style={{ color:C.green }}>{fmtFull(Number(payModal.netAmount))}</strong></p>
            </div>
            <Select label="Payment Mode" value={payForm.paymentMode} onChange={(e: any)=>setPayForm(f=>({...f,paymentMode:e.target.value}))} options={PAY_MODES} />
            <Input label="UTR / Reference No." value={payForm.paymentRef} onChange={(e: any)=>setPayForm(f=>({...f,paymentRef:e.target.value}))} placeholder="UTR123456789" />
            <Input label="Payment Date" type="date" value={payForm.paymentDate} onChange={(e: any)=>setPayForm(f=>({...f,paymentDate:e.target.value}))} />
          </div>
        )}
      </Modal>
    </div>
  )
}
`

w(path.join(SRC, 'pages/accounting/AccountingPage.tsx'), accPage.split('\n'))
ok('AccountingPage — Transactions, Vendors, TDS Ledger')

// Simple InvoicesPage
const invPage = `
import { useQuery } from '@tanstack/react-query'
import { accApi } from '@/api/accounting.api'
import { useAuthStore } from '@/store/auth.store'
import { Receipt } from '@phosphor-icons/react'

export default function InvoicesPage() {
  const { activeProjectId } = useAuthStore()
  const { data } = useQuery({ queryKey:['invoices',activeProjectId], queryFn:() => accApi.transactions({ projectId:activeProjectId,type:'income' }).then(r=>r.data), enabled:!!activeProjectId })
  const list = data ?? []
  return (
    <div className="fade-in" style={{ display:'flex',flexDirection:'column',gap:24 }}>
      <div>
        <h1 style={{ fontSize:24,fontWeight:800,color:'#0f172a',margin:0,letterSpacing:'-0.02em' }}>Invoices Received</h1>
        <p style={{ fontSize:14,color:'#94a3b8',marginTop:4 }}>Payments received from UEED against RA bills</p>
      </div>
      <div style={{ background:'#fff',borderRadius:16,border:'1.5px solid #e2e8f0',overflow:'hidden' }}>
        {list.length === 0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'56px 24px',gap:10 }}>
            <Receipt size={32} color="#e2e8f0" />
            <p style={{ fontSize:14,color:'#94a3b8',fontWeight:600,margin:0 }}>No income entries yet</p>
            <p style={{ fontSize:12,color:'#cbd5e1',margin:0 }}>Add an Income transaction in Accounting to see it here</p>
          </div>
        ) : (
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc',borderBottom:'1.5px solid #e2e8f0' }}>
                {['Date','Description','Invoice No.','Gross','GST','TDS','Net Received','Status'].map(h => (
                  <th key={h} style={{ padding:'10px 18px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((t: any, i: number) => (
                <tr key={t.id} style={{ borderBottom:i<list.length-1?'1px solid #f1f5f9':'none' }}>
                  <td style={{ padding:'12px 18px',fontSize:12,color:'#475569' }}>{t.date}</td>
                  <td style={{ padding:'12px 18px',fontSize:13,color:'#0f172a',fontWeight:500 }}>{t.description}</td>
                  <td style={{ padding:'12px 18px',fontSize:12,color:'#2563eb',fontFamily:'monospace' }}>{t.invoiceNo??'\u2014'}</td>
                  <td style={{ padding:'12px 18px',fontSize:12,fontWeight:600 }}>\u20b9{Number(t.grossAmount).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 18px',fontSize:12,color:'#d97706' }}>{Number(t.gstAmount)>0?'+\u20b9'+Number(t.gstAmount).toLocaleString('en-IN'):'\u2014'}</td>
                  <td style={{ padding:'12px 18px',fontSize:12,color:'#dc2626' }}>{Number(t.tdsAmount)>0?'-\u20b9'+Number(t.tdsAmount).toLocaleString('en-IN'):'\u2014'}</td>
                  <td style={{ padding:'12px 18px',fontSize:14,fontWeight:800,color:'#059669' }}>\u20b9{Number(t.netAmount).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 18px' }}>
                    <span style={{ fontSize:11,padding:'2px 8px',borderRadius:999,fontWeight:700,background:t.status==='paid'?'#ecfdf5':'#fffbeb',color:t.status==='paid'?'#047857':'#b45309',border:'1.5px solid '+(t.status==='paid'?'#a7f3d0':'#fde68a') }}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
`
w(path.join(SRC, 'pages/accounting/InvoicesPage.tsx'), invPage.split('\n'))
ok('InvoicesPage')

console.log('\n' + G + '\x1b[1m  Accounting Frontend complete!\x1b[0m' + NC)
console.log('\n  /accounting     — Transactions, Vendors, TDS Ledger')
console.log('  /accounting/invoices — Income / RA bill receipts\n')
