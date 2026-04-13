import { pdfApi } from '@/api/pdf.api'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, CurrencyInr, ChartBar, Receipt, Pencil, CheckCircle, ArrowRight } from '@phosphor-icons/react'
import { epcApi } from '@/api/epc.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

const C = {
  card:'#fff', border:'#e2e8f0', bg:'#f0f2f5',
  text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const CAT_LABELS: Record<string,string> = {
  sewer_network: 'Sewer Network',
  ips_civil:     'IPS — Civil',
  ips_em:        'IPS — E&M',
  stp_civil:     'STP — Civil',
  stp_em:        'STP — E&M',
  rising_main:   'Rising Mains',
  road_work:     'Road Works',
  other:         'Other',
}

const CAT_COLORS: Record<string,string> = {
  sewer_network: '#2563eb',
  ips_civil:     '#059669',
  ips_em:        '#7c3aed',
  stp_civil:     '#d97706',
  stp_em:        '#dc2626',
  rising_main:   '#0891b2',
  road_work:     '#64748b',
  other:         '#94a3b8',
}

const STATUS_STYLE: Record<string,any> = {
  draft:     { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  submitted: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  verified:  { bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe' },
  approved:  { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  paid:      { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  rejected:  { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
}

function fmtCr(n: number) {
  return '₹' + (n / 1e7).toFixed(2) + ' Cr'
}

function fmtLac(n: number) {
  return '₹' + (n / 1e5).toFixed(2) + ' L'
}

type TabType = 'boq' | 'ra-bills' | 'summary'

export default function EpcPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab]               = useState<TabType>('boq')
  const [catFilter, setCatFilter]   = useState('')
  const [editItem, setEditItem]     = useState<any>(null)
  const [measureItem, setMeasureItem] = useState<any>(null)
  const [newQty, setNewQty]         = useState('')
  const [showNewRa, setShowNewRa]   = useState(false)
  const [showViewRa, setShowViewRa] = useState<any>(null)
  const [raForm, setRaForm]         = useState({
    billNo: 'RA-1', allotmentNo: 'CE/UEED/PS/01 OF 2025-26',
    billDate: new Date().toISOString().split('T')[0],
    periodFrom: '', periodTo: '',
    grossAmount: '', prevBilled: '0',
    gstPct: '0', tdsPct: '2', securityDepositPct: '5',
    remarks: '',
  })

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['boq-summary', activeProjectId],
    queryFn: () => epcApi.boqSummary(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: boqItems, isLoading: boqLoading } = useQuery({
    queryKey: ['boq-items', activeProjectId, catFilter],
    queryFn: () => epcApi.boqItems(activeProjectId!, catFilter || undefined).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: raBills, isLoading: raLoading } = useQuery({
    queryKey: ['ra-bills', activeProjectId],
    queryFn: () => epcApi.raBills(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const seedM = useMutation({
    mutationFn: () => epcApi.seedBoq(activeProjectId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq-items'] }),
  })

  const measureM = useMutation({
    mutationFn: () => epcApi.measureQty(measureItem.id, parseFloat(newQty)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-items'] })
      qc.invalidateQueries({ queryKey: ['boq-summary'] })
      setMeasureItem(null); setNewQty('')
    },
  })

  const createRaM = useMutation({
    mutationFn: () => epcApi.createRaBill({ ...raForm, projectId: activeProjectId, grossAmount: parseFloat(raForm.grossAmount), prevBilled: parseFloat(raForm.prevBilled), gstPct: parseFloat(raForm.gstPct), tdsPct: parseFloat(raForm.tdsPct), securityDepositPct: parseFloat(raForm.securityDepositPct) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ra-bills'] }); setShowNewRa(false) },
  })

  const statusM = useMutation({
    mutationFn: ({ id, status }: any) => epcApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ra-bills'] }),
  })

  const items   = boqItems ?? []
  const bills   = raBills  ?? []
  const noBoq   = items.length === 0 && !boqLoading

  const grossPreview = parseFloat(raForm.grossAmount) || 0
  const prevBilled   = parseFloat(raForm.prevBilled) || 0
  const net          = grossPreview - prevBilled
  const gstAmt       = net * (parseFloat(raForm.gstPct) || 0) / 100
  const tdsAmt       = (net + gstAmt) * (parseFloat(raForm.tdsPct) || 2) / 100
  const sdAmt        = net * (parseFloat(raForm.securityDepositPct) || 5) / 100
  const netPayable   = net + gstAmt - tdsAmt - sdAmt

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>EPC / BOQ</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Bill of Quantities · Running Account Bills · Measurements</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {noBoq && (
            <Button variant='secondary' size='md' loading={seedM.isPending} onClick={()=>seedM.mutate()}>
              Load Dal Lake BOQ
            </Button>
          )}
          <Button variant='primary' size='md' icon={<Receipt size={15}/>} onClick={()=>setShowNewRa(true)}>
            New RA Bill
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
          {[
            { label:'Total Contract',   value:fmtCr(summary.totalEstimated), color:C.navy },
            { label:'Measured to Date', value:fmtCr(summary.totalMeasured),  color:C.blue },
            { label:'% Complete',       value:summary.percentageComplete+'%', color:parseFloat(summary.percentageComplete)>50?C.green:C.amber },
            { label:'Total Billed',     value:fmtCr(summary.totalBilled),    color:C.green },
            { label:'Balance',          value:fmtCr(summary.balance),        color:C.red },
          ].map(s => (
            <div key={s.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Project info banner */}
      <div style={{ background:C.navy, borderRadius:14, padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Package</p>
          <p style={{ fontSize:14, fontWeight:600, color:'#fff', margin:0 }}>Survey, Design & Execution of Sewerage Scheme for Dal Lake Uncovered Areas — EPC Turnkey</p>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', margin:'3px 0 0' }}>Allotment No: CE/UEED/PS/01 OF 2025-26 · Dated: 07-11-2025 · Client: J&K UEED Srinagar</p>
        </div>
        <div style={{ textAlign:'right', flexShrink:0, marginLeft:24 }}>
          <div style={{ fontSize:28, fontWeight:900, color:'#93c5fd', fontVariantNumeric:'tabular-nums' }}>₹266.29 Cr</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>Quoted Civil Cost</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid '+C.border }}>
        {([['boq','BOQ Items'],['ra-bills','RA Bills ('+bills.length+')'],['summary','Category Summary']] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', borderBottom:tab===t?'2px solid '+C.blue:'2px solid transparent', background:'none', cursor:'pointer', color:tab===t?C.blue:C.text3, marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {/* BOQ Items tab */}
      {tab === 'boq' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {/* Category filter */}
          <div style={{ padding:'12px 20px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={()=>setCatFilter('')} style={{ padding:'5px 14px', borderRadius:999, fontSize:12, fontWeight:600, border:'1.5px solid', cursor:'pointer', background:!catFilter?C.blue:'#fff', color:!catFilter?'#fff':C.text3, borderColor:!catFilter?C.blue:C.border }}>All</button>
            {Object.entries(CAT_LABELS).map(([k,v])=>(
              <button key={k} onClick={()=>setCatFilter(k)} style={{ padding:'5px 14px', borderRadius:999, fontSize:12, fontWeight:600, border:'1.5px solid', cursor:'pointer', background:catFilter===k?CAT_COLORS[k]:CAT_COLORS[k]+'15', color:catFilter===k?'#fff':CAT_COLORS[k], borderColor:CAT_COLORS[k]+'40' }}>{v}</button>
            ))}
          </div>

          {boqLoading ? <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner /></div>
          : noBoq ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:12 }}>
              <Package size={36} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No BOQ items yet</p>
              <p style={{ fontSize:12, color:'#cbd5e1', margin:0 }}>Click "Load Dal Lake BOQ" to pre-load 20 items from the tender</p>
              <Button variant='primary' size='md' loading={seedM.isPending} onClick={()=>seedM.mutate()}>Load Dal Lake BOQ</Button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                <thead>
                  <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                    {['Sl.','Description','Category','Unit','Est. Qty','Est. Amount','Meas. Qty','Meas. Amount','% Done','Action'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item:any, i:number)=>{
                    const pct = item.estimatedAmount > 0 ? (Number(item.measuredAmount)/Number(item.estimatedAmount)*100) : 0
                    const catColor = CAT_COLORS[item.category] ?? C.text3
                    return (
                      <tr key={item.id} style={{ borderBottom:i<items.length-1?'1px solid #f1f5f9':'none' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{ padding:'11px 14px', fontSize:11, fontWeight:700, color:C.blue, fontFamily:'monospace', whiteSpace:'nowrap' }}>{item.slNo}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text1, maxWidth:280 }}>
                          <p style={{ margin:0, lineHeight:1.4 }}>{item.description}</p>
                          {item.subCategory && <p style={{ margin:'2px 0 0', fontSize:10, color:C.text3 }}>{item.subCategory}</p>}
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:catColor+'15', color:catColor, border:'1px solid '+catColor+'30', fontWeight:700, whiteSpace:'nowrap' }}>{CAT_LABELS[item.category]}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{item.unit}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{Number(item.estimatedQty).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:C.text1, whiteSpace:'nowrap' }}>{fmtLac(Number(item.estimatedAmount))}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:Number(item.measuredQty)>0?C.blue:C.text3, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{Number(item.measuredQty).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:Number(item.measuredAmount)>0?C.green:C.text3, whiteSpace:'nowrap' }}>{Number(item.measuredAmount)>0?fmtLac(Number(item.measuredAmount)):'—'}</td>
                        <td style={{ padding:'11px 14px', minWidth:100 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:6, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:999, width:Math.min(pct,100)+'%', background:pct>=100?C.green:pct>50?C.blue:C.amber, transition:'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize:10, color:C.text3, whiteSpace:'nowrap', minWidth:30 }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <button onClick={()=>{ setMeasureItem(item); setNewQty(String(item.measuredQty)) }}
                            style={{ padding:'5px 10px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:6, fontSize:11, color:C.blue, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                            <Pencil size={11}/> Update
                          </button>
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

      {/* RA Bills tab */}
      {tab === 'ra-bills' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {raLoading ? <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner /></div>
          : bills.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <Receipt size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No RA Bills yet</p>
              <Button variant='primary' size='sm' icon={<Plus size={13}/>} onClick={()=>setShowNewRa(true)}>Create RA-1</Button>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Bill No.','Date','Period','Gross Amt','Prev Billed','TDS','SD','Net Payable','Status','Actions'].map(h=>(
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((b:any, i:number)=>{
                  const ss = STATUS_STYLE[b.status] ?? STATUS_STYLE.draft
                  return (
                    <tr key={b.id} style={{ borderBottom:i<bills.length-1?'1px solid #f1f5f9':'none' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'13px 16px', fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{b.billNo}</td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{b.billDate}</td>
                      <td style={{ padding:'13px 16px', fontSize:11, color:C.text3, whiteSpace:'nowrap' }}>{b.periodFrom ? b.periodFrom+' to '+b.periodTo : '—'}</td>
                      <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:C.text1, whiteSpace:'nowrap' }}>{fmtLac(Number(b.grossAmount))}</td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{fmtLac(Number(b.prevBilled))}</td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:C.red, whiteSpace:'nowrap' }}>-{fmtLac(Number(b.tdsAmount))}</td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:C.red, whiteSpace:'nowrap' }}>-{fmtLac(Number(b.securityDepositAmount))}</td>
                      <td style={{ padding:'13px 16px', fontSize:14, fontWeight:800, color:C.green, whiteSpace:'nowrap' }}>{fmtLac(Number(b.netPayable))}</td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{b.status}</span>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>setShowViewRa(b)} style={{ padding:'5px 10px', fontSize:11, color:C.text2, background:'none', border:'1.5px solid '+C.border, borderRadius:6, cursor:'pointer' }}>View</button>
                          {b.status==='draft' && <button onClick={()=>statusM.mutate({id:b.id,status:'submitted'})} style={{ padding:'5px 10px', fontSize:11, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:6, cursor:'pointer', fontWeight:600 }}>Submit</button>}
                          {b.status==='submitted' && <button onClick={()=>statusM.mutate({id:b.id,status:'approved'})} style={{ padding:'5px 10px', fontSize:11, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:6, cursor:'pointer', fontWeight:600 }}>Approve</button>}
                          {b.status==='approved' && <button onClick={()=>statusM.mutate({id:b.id,status:'paid'})} style={{ padding:'5px 10px', fontSize:11, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:6, cursor:'pointer', fontWeight:600 }}>Mark Paid</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Category summary tab */}
      {tab === 'summary' && summary && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {Object.entries(summary.byCategory ?? {}).map(([cat, data]: [string, any])=>(
            <div key={cat} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:CAT_COLORS[cat]??C.text3 }} />
                <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>{CAT_LABELS[cat]??cat}</h3>
                <span style={{ fontSize:11, color:C.text3, marginLeft:'auto' }}>{data.items} items</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <p style={{ fontSize:11, color:C.text3, margin:'0 0 3px' }}>Estimated</p>
                  <p style={{ fontSize:16, fontWeight:700, color:C.text1, margin:0, fontVariantNumeric:'tabular-nums' }}>{fmtCr(data.estimated)}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, color:C.text3, margin:'0 0 3px' }}>Measured</p>
                  <p style={{ fontSize:16, fontWeight:700, color:data.measured>0?C.green:C.text3, margin:0, fontVariantNumeric:'tabular-nums' }}>{data.measured>0?fmtCr(data.measured):'—'}</p>
                </div>
              </div>
              <div style={{ marginTop:12, height:6, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:999, background:CAT_COLORS[cat]??C.blue, width:data.estimated>0?Math.min(data.measured/data.estimated*100,100)+'%':'0%', transition:'width 0.8s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Measurement Modal */}
      <Modal open={!!measureItem} onClose={()=>setMeasureItem(null)} title='Update Measured Quantity' width={480}
        footer={<>
          <Button variant='ghost' onClick={()=>setMeasureItem(null)}>Cancel</Button>
          <Button variant='primary' loading={measureM.isPending} onClick={()=>measureM.mutate()} disabled={!newQty}>Update</Button>
        </>}>
        {measureItem && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'12px 14px', background:'#f8f9fc', borderRadius:8, border:'1px solid '+C.border }}>
              <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 4px' }}>{measureItem.description}</p>
              <p style={{ fontSize:11, color:C.text3, margin:0 }}>Estimated: {Number(measureItem.estimatedQty).toLocaleString('en-IN')} {measureItem.unit} · Rate: ₹{Number(measureItem.rate).toLocaleString('en-IN')}</p>
            </div>
            <Input label={'Measured Quantity (' + measureItem.unit + ')'} type='number' value={newQty} onChange={e=>setNewQty(e.target.value)} placeholder='Enter measured quantity' />
            {newQty && (
              <div style={{ padding:'10px 14px', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:8, fontSize:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:C.text3 }}>Measured Amount</span>
                  <span style={{ color:C.green, fontWeight:700 }}>{fmtLac(parseFloat(newQty)*Number(measureItem.rate))}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                  <span style={{ color:C.text3 }}>% of Estimate</span>
                  <span style={{ color:C.blue, fontWeight:700 }}>{(parseFloat(newQty)/Number(measureItem.estimatedQty)*100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New RA Bill Modal */}
      <Modal open={showNewRa} onClose={()=>setShowNewRa(false)} title='Create Running Account Bill' width={620}
        footer={<>
          <Button variant='ghost' onClick={()=>setShowNewRa(false)}>Cancel</Button>
          <Button variant='primary' loading={createRaM.isPending} onClick={()=>createRaM.mutate()} disabled={!raForm.grossAmount}>Create Bill</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'12px 16px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:8, fontSize:12, color:'#1d4ed8' }}>
            <strong>Payment terms:</strong> As per Allotment CE/UEED/PS/01 OF 2025-26. TDS @ 2%, Security Deposit @ 5% of each bill.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label='Bill No.' value={raForm.billNo} onChange={e=>setRaForm(f=>({...f,billNo:e.target.value}))} />
            <Input label='Bill Date' type='date' value={raForm.billDate} onChange={e=>setRaForm(f=>({...f,billDate:e.target.value}))} />
          </div>
          <Input label='Allotment No.' value={raForm.allotmentNo} onChange={e=>setRaForm(f=>({...f,allotmentNo:e.target.value}))} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label='Period From' type='date' value={raForm.periodFrom} onChange={e=>setRaForm(f=>({...f,periodFrom:e.target.value}))} />
            <Input label='Period To' type='date' value={raForm.periodTo} onChange={e=>setRaForm(f=>({...f,periodTo:e.target.value}))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label='Gross Amount (₹)' type='number' value={raForm.grossAmount} onChange={e=>setRaForm(f=>({...f,grossAmount:e.target.value}))} placeholder='e.g. 97100000 for ₹9.71 Cr' />
            <Input label='Previously Billed (₹)' type='number' value={raForm.prevBilled} onChange={e=>setRaForm(f=>({...f,prevBilled:e.target.value}))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label='GST %' type='number' value={raForm.gstPct} onChange={e=>setRaForm(f=>({...f,gstPct:e.target.value}))} />
            <Input label='TDS %' type='number' value={raForm.tdsPct} onChange={e=>setRaForm(f=>({...f,tdsPct:e.target.value}))} />
            <Input label='Security Deposit %' type='number' value={raForm.securityDepositPct} onChange={e=>setRaForm(f=>({...f,securityDepositPct:e.target.value}))} />
          </div>

          {/* Live preview */}
          {grossPreview > 0 && (
            <div style={{ background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:10, padding:'14px 16px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:'0 0 10px' }}>Bill Preview</p>
              {[
                ['Gross Amount', fmtLac(grossPreview), C.text1],
                ['Less: Previously Billed', '-'+fmtLac(prevBilled), C.text2],
                ['Net This Bill', fmtLac(net), C.blue],
                ['Add: GST ('+raForm.gstPct+'%)', '+'+fmtLac(gstAmt), C.amber],
                ['Less: TDS ('+raForm.tdsPct+'%)', '-'+fmtLac(tdsAmt), C.red],
                ['Less: Security Deposit ('+raForm.securityDepositPct+'%)', '-'+fmtLac(sdAmt), C.red],
              ].map(([l,v,c])=>(
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                  <span style={{ color:C.text3 }}>{l}</span>
                  <span style={{ color:c as string, fontWeight:500 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop:'1.5px solid '+C.border, marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Net Payable</span>
                <span style={{ fontSize:16, fontWeight:800, color:C.green }}>{fmtLac(netPayable)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* View RA Bill Modal */}
      {showViewRa && (
        <Modal open={!!showViewRa} onClose={()=>setShowViewRa(null)} title={'RA Bill — '+showViewRa.billNo} width={600}
          footer={<Button variant='ghost' onClick={()=>setShowViewRa(null)}>Close</Button>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, padding:'14px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12 }}>
                {[['Bill No.',showViewRa.billNo],['Date',showViewRa.billDate],['Allotment No.',showViewRa.allotmentNo],['Period',showViewRa.periodFrom?showViewRa.periodFrom+' to '+showViewRa.periodTo:'—']].map(([l,v])=>(
                  <div key={l as string}><span style={{ color:C.text3 }}>{l}: </span><span style={{ color:C.text1, fontWeight:600 }}>{v}</span></div>
                ))}
              </div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', border:'1.5px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
              {[
                ['Gross Amount', fmtLac(Number(showViewRa.grossAmount)), C.text1, false],
                ['Less: Previously Billed', '-'+fmtLac(Number(showViewRa.prevBilled)), C.text2, false],
                ['Net This Bill', fmtLac(Number(showViewRa.netThisBill)), C.blue, false],
                ['Add: GST ('+showViewRa.gstPct+'%)', '+'+fmtLac(Number(showViewRa.gstAmount)), C.amber, false],
                ['Less: TDS ('+showViewRa.tdsPct+'%)', '-'+fmtLac(Number(showViewRa.tdsAmount)), C.red, false],
                ['Less: Security Deposit ('+showViewRa.securityDepositPct+'%)', '-'+fmtLac(Number(showViewRa.securityDepositAmount)), C.red, false],
                ['NET PAYABLE', fmtLac(Number(showViewRa.netPayable)), C.green, true],
              ].map(([l,v,c,bold]: any)=>(
                <tr key={l} style={{ borderBottom:'1px solid #f1f5f9', background:bold?'#ecfdf5':'transparent' }}>
                  <td style={{ padding:'10px 14px', fontSize:12, color:C.text2, fontWeight:bold?700:400 }}>{l}</td>
                  <td style={{ padding:'10px 14px', fontSize:bold?15:12, color:c, fontWeight:bold?800:500, textAlign:'right' }}>{v}</td>
                </tr>
              ))}
            </table>
            {showViewRa.remarks && <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e' }}>{showViewRa.remarks}</div>}
          </div>
        </Modal>
      )}
    </div>
  )
}