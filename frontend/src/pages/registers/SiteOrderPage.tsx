import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ClipboardText } from '@phosphor-icons/react'
import { siteOrderApi } from '@/api/registers.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'

const C = { card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540' }
const ISSUERS = ['JE (UEED)','AEE (UEED)','XEN (UEED)','SE (UEED)','Chief Engineer (UEED)','Consultant']
const STATUS: Record<string, { bg:string; color:string }> = { pending:{bg:'#fffbeb',color:'#b45309'}, complied:{bg:'#ecfdf5',color:'#047857'}, na:{bg:'#f1f5f9',color:'#64748b'} }
const BLANK: any = { date: new Date().toISOString().split('T')[0], issuedBy:'', instruction:'', remarks:'' }

export default function SiteOrderPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState<any>(BLANK)
  const [ack, setAck] = useState<any>(null)
  const [ackName, setAckName] = useState('')

  const { data: rows, isLoading } = useQuery({
    queryKey: ['site-orders', activeProjectId], queryFn: () => siteOrderApi.list(activeProjectId!).then(r => r.data), enabled: !!activeProjectId,
  })
  const inv = () => qc.invalidateQueries({ queryKey: ['site-orders'] })
  const createM = useMutation({
    mutationFn: () => siteOrderApi.create({ projectId: activeProjectId, date: form.date, issuedBy: form.issuedBy, instruction: form.instruction, remarks: form.remarks || undefined }),
    onSuccess: () => { inv(); setShow(false); setForm(BLANK) },
    onError: (e: any) => alert('Could not save: ' + (e?.response?.data?.message ?? e?.message)),
  })
  const ackM = useMutation({
    mutationFn: () => siteOrderApi.update(ack.id, { acknowledgedBy: ackName, acknowledgedDate: new Date().toISOString().split('T')[0], complianceStatus: 'complied' }),
    onSuccess: () => { inv(); setAck(null); setAckName('') },
  })
  const statusM = useMutation({ mutationFn: ({ id, s }: any) => siteOrderApi.update(id, { complianceStatus: s }), onSuccess: inv })
  const delM = useMutation({ mutationFn: (id: string) => siteOrderApi.remove(id), onSuccess: inv })
  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Site Order Book</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 42.3 — EIC instructions with contractor acknowledgement</p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={14}/>} onClick={() => { setForm(BLANK); setShow(true) }}>New Order</Button>
      </div>

      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
        {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
        : (rows ?? []).length === 0 ? <div style={{ padding:'48px', textAlign:'center', color:C.text3, fontSize:13 }}><ClipboardText size={30} color={C.border}/><p>No site orders recorded.</p></div>
        : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead><tr style={{ background:C.navy }}>
                {['Order No.','Date','Issued by','Instruction','Status','Acknowledged','Actions'].map(h =>
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(rows ?? []).map((r: any) => {
                  const s = STATUS[r.complianceStatus] ?? STATUS.pending
                  return (
                    <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9', verticalAlign:'top' }}>
                      <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', color:C.blue, whiteSpace:'nowrap' }}>{r.orderNo ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{String(r.date).split('T')[0]}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{r.issuedBy}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:C.text1, maxWidth:320 }}>{r.instruction}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700, background:s.bg, color:s.color, textTransform:'uppercase' }}>{r.complianceStatus}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text3 }}>{r.acknowledgedBy ? `${r.acknowledgedBy} · ${String(r.acknowledgedDate).split('T')[0]}` : '—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          {!r.acknowledgedBy && <button onClick={() => { setAck(r); setAckName('') }} style={{ padding:'3px 9px', fontSize:11, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:6, cursor:'pointer' }}>Acknowledge</button>}
                          {r.complianceStatus !== 'complied' && r.acknowledgedBy && <button onClick={() => statusM.mutate({ id:r.id, s:'complied' })} style={{ padding:'3px 9px', fontSize:11, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:6, cursor:'pointer' }}>Complied</button>}
                          <button onClick={() => { if(confirm('Delete order?')) delM.mutate(r.id) }} style={{ padding:'3px 8px', fontSize:11, color:C.red, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:6, cursor:'pointer' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New order */}
      <Modal open={show} onClose={() => setShow(false)} title="New Site Order" width={560}
        footer={<><Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()} disabled={!form.issuedBy || !form.instruction}>Save</Button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <datalist id="so-issuers">{ISSUERS.map(m => <option key={m} value={m} />)}</datalist>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:12 }}>
            <Input label="Date" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Issued by (EIC / officer)</label>
              <input list="so-issuers" value={form.issuedBy} onChange={e => setF('issuedBy', e.target.value)} placeholder="XEN (UEED)"
                style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>
          </div>
          <Textarea label="Instruction / Order" rows={4} value={form.instruction} onChange={e => setF('instruction', e.target.value)} placeholder="Instruction recorded by the Engineer-in-Charge during site inspection…" />
          <Input label="Remarks" value={form.remarks} onChange={e => setF('remarks', e.target.value)} />
        </div>
      </Modal>

      {/* Acknowledge */}
      <Modal open={!!ack} onClose={() => setAck(null)} title="Acknowledge Receipt of Order" width={440}
        footer={<><Button variant="ghost" onClick={() => setAck(null)}>Cancel</Button>
          <Button variant="primary" loading={ackM.isPending} onClick={() => ackM.mutate()} disabled={!ackName}>Confirm</Button></>}>
        {ack && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ padding:'10px 14px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, color:C.text2 }}>
              <b>{ack.orderNo}</b> · {ack.issuedBy}<br />{ack.instruction}
            </div>
            <Input label="Acknowledged by (contractor rep)" value={ackName} onChange={e => setAckName(e.target.value)} placeholder="Name & designation" />
            <p style={{ fontSize:11, color:C.text3, margin:0 }}>Confirms receipt today, per Clause 42.3.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
