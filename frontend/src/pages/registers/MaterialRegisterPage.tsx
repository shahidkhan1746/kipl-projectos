import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Cube } from '@phosphor-icons/react'
import { materialRegisterApi } from '@/api/registers.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

const C = { card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540' }
const MATERIALS = ['OPC Cement 43 Grade','OPC Cement 53 Grade','PPC Cement','TMT Steel Fe500','TMT Steel Fe500D','Structural Steel']
const BLANK: any = { date: new Date().toISOString().split('T')[0], material:'', unit:'', receivedQty:'', consumedQty:'', contractorRep:'', ueedRep:'', remarks:'' }

export default function MaterialRegisterPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState<any>(BLANK)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['mat-reg', activeProjectId], queryFn: () => materialRegisterApi.list(activeProjectId!).then(r => r.data), enabled: !!activeProjectId,
  })
  const { data: summary } = useQuery({
    queryKey: ['mat-reg-sum', activeProjectId], queryFn: () => materialRegisterApi.summary(activeProjectId!).then(r => r.data), enabled: !!activeProjectId,
  })
  const createM = useMutation({
    mutationFn: () => materialRegisterApi.create({ projectId: activeProjectId, date: form.date, material: form.material, unit: form.unit || undefined,
      receivedQty: parseFloat(form.receivedQty) || 0, consumedQty: parseFloat(form.consumedQty) || 0,
      contractorRep: form.contractorRep || undefined, ueedRep: form.ueedRep || undefined, remarks: form.remarks || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mat-reg'] }); qc.invalidateQueries({ queryKey: ['mat-reg-sum'] }); setShow(false); setForm(BLANK) },
    onError: (e: any) => alert('Could not save: ' + (e?.response?.data?.message ?? e?.message)),
  })
  const delM = useMutation({ mutationFn: (id: string) => materialRegisterApi.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['mat-reg'] }); qc.invalidateQueries({ queryKey: ['mat-reg-sum'] }) } })
  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const num = (n: any) => (Number(n) || 0).toLocaleString('en-IN')

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Cement &amp; Steel Register</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 55 — received · consumed · balance in hand · jointly signed</p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={14}/>} onClick={() => { setForm(BLANK); setShow(true) }}>Add Entry</Button>
      </div>

      {summary && Object.keys(summary).length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
          {Object.entries(summary).map(([mat, s]: [string, any]) => (
            <div key={mat} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text1, marginBottom:8 }}>{mat}</div>
              <div style={{ display:'flex', gap:14, fontSize:12 }}>
                <span style={{ color:C.text3 }}>Recd <b style={{ color:C.text1 }}>{num(s.received)}</b></span>
                <span style={{ color:C.text3 }}>Used <b style={{ color:C.text1 }}>{num(s.consumed)}</b></span>
                <span style={{ color:C.text3 }}>Bal <b style={{ color: s.balance < 0 ? C.red : C.green }}>{num(s.balance)}</b> {s.unit ?? ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
        {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
        : (rows ?? []).length === 0 ? <div style={{ padding:'48px', textAlign:'center', color:C.text3, fontSize:13 }}><Cube size={30} color={C.border}/><p>No entries yet.</p></div>
        : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:820 }}>
              <thead><tr style={{ background:C.navy }}>
                {['Date','Material','Received','Consumed','Balance','Unit','Contractor','UEED','',].map((h,i) =>
                  <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(rows ?? []).map((r: any, i: number) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'9px 12px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{String(r.date).split('T')[0]}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, color:C.text1 }}>{r.material}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:C.green }}>{num(r.receivedQty)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:C.amber }}>{num(r.consumedQty)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color: r.balance < 0 ? C.red : C.text1 }}>{num(r.balance)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:C.text3 }}>{r.unit ?? '—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text3 }}>{r.contractorRep ?? '—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text3 }}>{r.ueedRep ?? '—'}</td>
                    <td style={{ padding:'9px 12px' }}><button onClick={() => { if(confirm('Delete entry?')) delM.mutate(r.id) }} style={{ padding:'3px 8px', fontSize:11, color:C.red, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:6, cursor:'pointer' }}>Del</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={show} onClose={() => setShow(false)} title="Add Register Entry" width={560}
        footer={<><Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()} disabled={!form.material}>Save</Button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <datalist id="mr-materials">{MATERIALS.map(m => <option key={m} value={m} />)}</datalist>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Date" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Material</label>
              <input list="mr-materials" value={form.material} onChange={e => setF('material', e.target.value)} placeholder="Cement / Steel"
                style={{ width:'100%', padding:'10px 13px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Received" type="number" value={form.receivedQty} onChange={e => setF('receivedQty', e.target.value)} />
            <Input label="Consumed" type="number" value={form.consumedQty} onChange={e => setF('consumedQty', e.target.value)} />
            <Input label="Unit" value={form.unit} onChange={e => setF('unit', e.target.value)} placeholder="Bags / MT" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Contractor rep (signed)" value={form.contractorRep} onChange={e => setF('contractorRep', e.target.value)} />
            <Input label="UEED rep (signed)" value={form.ueedRep} onChange={e => setF('ueedRep', e.target.value)} />
          </div>
          <Input label="Remarks" value={form.remarks} onChange={e => setF('remarks', e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
