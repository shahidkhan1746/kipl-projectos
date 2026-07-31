import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePdf, Download, Receipt, ClipboardText, CheckSquare, ChartBar } from '@phosphor-icons/react'
import { pdfApi } from '@/api/pdf.api'
import { hrApi } from '@/api/hr.api'
import { epcApi } from '@/api/epc.api'
import { qaApi } from '@/api/qa.api'
import { wbsApi } from '@/api/wbs.api'
import { diaryApi } from '@/api/diary.api'
import { liaisonApi } from '@/api/liaison.api'
import { settingsApi } from '@/api/settings.api'
import { useAuthStore } from '@/store/auth.store'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function ReportsPage() {
  const { activeProjectId } = useAuthStore()
  const [downloading, setDownloading] = useState<string | null>(null)

  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1)
  const [salaryYear,  setSalaryYear]  = useState(new Date().getFullYear())
  const [salaryEmpId, setSalaryEmpId] = useState('')

  const [mprMonth, setMprMonth] = useState(new Date().getMonth() + 1)
  const [mprYear,  setMprYear]  = useState(new Date().getFullYear())
  const [mprRaRef, setMprRaRef] = useState('')

  async function downloadMPR() {
    if (!activeProjectId) return
    setDownloading('mpr')
    try {
      const pid = activeProjectId
      const from = `${mprYear}-${String(mprMonth).padStart(2, '0')}-01`
      const to   = new Date(mprYear, mprMonth, 0).toISOString().split('T')[0]
      const [wbsDash, tasks, eot, diary, hr, billsRes, liaison, cv] = await Promise.all([
        wbsApi.dashboard(pid).then(r => r.data).catch(() => ({})),
        wbsApi.list(pid).then(r => r.data).catch(() => []),
        wbsApi.eotRegister(pid).then(r => r.data).catch(() => null),
        diaryApi.list({ projectId: pid, fromDate: from, toDate: to }).then(r => r.data).catch(() => []),
        hrApi.dashboard(pid).then(r => r.data).catch(() => ({})),
        epcApi.raBills(pid).then(r => r.data).catch(() => []),
        liaisonApi.dashboard(pid).then(r => r.data).catch(() => null),
        settingsApi.get('project.contract_value').then(r => r.data?.value).catch(() => null),
      ])
      const { generateMPR } = await import('./mprPdf')
      await generateMPR({ month: mprMonth, year: mprYear, raBillRef: mprRaRef || undefined,
        contractValue: cv, wbsDash, tasks, eot, diary, hr, raBills: billsRes, liaison })
    } catch (e: any) {
      alert('MPR generation failed: ' + (e?.message ?? 'unknown error'))
    } finally { setDownloading(null) }
  }

  const [eotRefNo, setEotRefNo]       = useState('')
  const [eotAppliedUpto, setEotUpto]  = useState('')
  const [eotPrevExt, setEotPrevExt]   = useState('')

  async function downloadEOT() {
    if (!activeProjectId) return
    setDownloading('eot')
    try {
      const pid = activeProjectId
      const [wbsDash, eot, diary, cv] = await Promise.all([
        wbsApi.dashboard(pid).then(r => r.data).catch(() => ({})),
        wbsApi.eotRegister(pid).then(r => r.data).catch(() => null),
        diaryApi.list({ projectId: pid, eotOnly: 'true' }).then(r => r.data).catch(() => []),
        settingsApi.get('project.contract_value').then(r => r.data?.value).catch(() => null),
      ])
      const { generateEOTApplication } = await import('./eotPdf')
      await generateEOTApplication({ refNo: eotRefNo || undefined, appliedUpto: eotAppliedUpto || undefined,
        previousExtensions: eotPrevExt || undefined, contractValue: cv, wbsDash, eot, diary })
    } catch (e: any) {
      alert('EOT application generation failed: ' + (e?.message ?? 'unknown error'))
    } finally { setDownloading(null) }
  }

  const { data: employees } = useQuery({
    queryKey: ['employees', activeProjectId],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, status:'active' }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: raBills } = useQuery({
    queryKey: ['ra-bills', activeProjectId],
    queryFn:  () => epcApi.raBills(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: inspections } = useQuery({
    queryKey: ['qa-insp', activeProjectId],
    queryFn:  () => qaApi.inspections({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  async function downloadSalarySlip() {
    if (!salaryEmpId) return
    setDownloading('salary')
    try {
      const [empRes, salaryRes] = await Promise.all([
        hrApi.employees({ projectId: activeProjectId }),
        hrApi.salaryList({ employeeId: salaryEmpId, month: salaryMonth, year: salaryYear }),
      ])
      const emp    = (empRes.data ?? []).find((e: any) => e.id === salaryEmpId)
      const record = (salaryRes.data ?? [])[0]
      if (!emp) { alert('Employee not found'); return }
      if (!record) { alert('No salary record found for this month. Generate salary first.'); return }
      await pdfApi.salarySlip({ employee: emp, record, month: salaryMonth, year: salaryYear, daysPresent: record.daysPresent ?? 26, totalDays: record.totalDays ?? 30 })
    } catch (e: any) {
      alert('Error: ' + (e?.message ?? 'Download failed'))
    } finally { setDownloading(null) }
  }

  async function downloadRaBill(bill: any) {
    setDownloading('ra-' + bill.id)
    try {
      await pdfApi.raBill({ bill })
    } finally { setDownloading(null) }
  }

  async function downloadInspection(insp: any) {
    setDownloading('insp-' + insp.id)
    try {
      await pdfApi.inspection({ inspection: insp })
    } finally { setDownloading(null) }
  }

  const years = [2025, 2026, 2027]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>PDF Reports</h1>
        <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Generate and download official documents</p>
      </div>

      {/* Monthly Progress Report (MPR) — Clause 23.3 */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.blue+'44', overflow:'hidden', boxShadow:'0 1px 6px rgba(37,99,235,0.08)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#eff6ff', display:'flex', alignItems:'center', gap:10 }}>
          <ChartBar size={18} color={C.blue} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>Monthly Progress Report (MPR)</h2>
          <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:C.blue, background:'#dbeafe', padding:'3px 8px', borderRadius:999 }}>Clause 23.3 — required with each RA bill</span>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Month</label>
              <select value={mprMonth} onChange={e => setMprMonth(parseInt(e.target.value))}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Year</label>
              <select value={mprYear} onChange={e => setMprYear(parseInt(e.target.value))}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>RA Bill Ref (optional)</label>
              <input value={mprRaRef} onChange={e => setMprRaRef(e.target.value)} placeholder="RA-03"
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', width:130 }} />
            </div>
            <button onClick={downloadMPR} disabled={downloading === 'mpr'}
              style={{ padding:'9px 20px', background:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              {downloading === 'mpr' ? <Spinner /> : <Download size={15}/>}
              Generate MPR
            </button>
          </div>
          <p style={{ fontSize:12, color:C.text3, margin:'12px 0 0', lineHeight:1.6 }}>
            Pulls physical progress (WBS), financials (RA bills), manpower &amp; weather (Site Diary + HR), and hindrances/EOT &amp; approvals (Liaison) into the EIC proforma.
            Set the contract value in the data-completeness prompt for the financial-progress %.
            Attach the two required photo sets separately.
          </p>
        </div>
      </div>

      {/* EOT Application — Clause 16 */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.amber+'55', overflow:'hidden', boxShadow:'0 1px 6px rgba(217,119,6,0.08)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#fffbeb', display:'flex', alignItems:'center', gap:10 }}>
          <FilePdf size={18} color={C.amber} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>Extension of Time Application</h2>
          <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:C.amber, background:'#fef3c7', padding:'3px 8px', borderRadius:999 }}>Clause 16 — 3-part hindrance proforma</span>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Application Ref (optional)</label>
              <input value={eotRefNo} onChange={e => setEotRefNo(e.target.value)} placeholder="KIPL/UEED/EOT/01"
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', width:180 }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Extension applied up to</label>
              <input type="date" value={eotAppliedUpto} onChange={e => setEotUpto(e.target.value)}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Previous extensions (optional)</label>
              <input value={eotPrevExt} onChange={e => setEotPrevExt(e.target.value)} placeholder="e.g. 1st EOT 45d vide letter…"
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
            </div>
            <button onClick={downloadEOT} disabled={downloading === 'eot'}
              style={{ padding:'9px 20px', background:C.amber, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              {downloading === 'eot' ? <Spinner /> : <Download size={15}/>}
              Generate EOT
            </button>
          </div>
          <p style={{ fontSize:12, color:C.text3, margin:'12px 0 0', lineHeight:1.6 }}>
            Auto-fills Part I (contractor's hindrance register) from the WBS EOT register — approval delays, site/task delays and weather stoppages, with net critical-path extension days. Parts II (Engineer-in-Charge) and III (grant) print as the blank UEED template.
          </p>
        </div>
      </div>

      {/* Salary Slips */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', alignItems:'center', gap:10 }}>
          <ClipboardText size={18} color={C.blue} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>Salary Slips</h2>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Employee</label>
              <select value={salaryEmpId} onChange={e => setSalaryEmpId(e.target.value)}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer', minWidth:220 }}>
                <option value="">Select employee...</option>
                {(employees ?? []).map((e: any) => (
                  <option key={e.id} value={e.id}>{e.empCode} — {e.firstName} {e.lastName ?? ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Month</label>
              <select value={salaryMonth} onChange={e => setSalaryMonth(parseInt(e.target.value))}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Year</label>
              <select value={salaryYear} onChange={e => setSalaryYear(parseInt(e.target.value))}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={downloadSalarySlip} disabled={!salaryEmpId || downloading === 'salary'}
              style={{ padding:'9px 20px', background:salaryEmpId?C.blue:'#e2e8f0', color:salaryEmpId?'#fff':'#94a3b8', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:salaryEmpId?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
              {downloading === 'salary' ? <Spinner /> : <Download size={15}/>}
              Download PDF
            </button>
          </div>
          <p style={{ fontSize:12, color:C.text3, margin:'12px 0 0' }}>
            Select an employee, month and year. Salary must be generated first from HR → Salary.
          </p>
        </div>
      </div>

      {/* RA Bills */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', alignItems:'center', gap:10 }}>
          <Receipt size={18} color={C.green} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>Running Account Bills</h2>
        </div>
        {(raBills ?? []).length === 0 ? (
          <div style={{ padding:'32px 22px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:C.text3, margin:0 }}>No RA bills yet — create them in EPC / BOQ</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                {['Bill No.','Date','Gross Amount','Net Payable','Status','Download'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(raBills ?? []).map((b: any, i: number) => (
                <tr key={b.id} style={{ borderBottom:i<(raBills??[]).length-1?'1px solid #f1f5f9':'none' }}>
                  <td style={{ padding:'12px 18px', fontSize:13, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{b.billNo}</td>
                  <td style={{ padding:'12px 18px', fontSize:12, color:C.text2 }}>{b.billDate}</td>
                  <td style={{ padding:'12px 18px', fontSize:12, color:C.text1 }}>₹{Number(b.grossAmount).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 18px', fontSize:13, fontWeight:700, color:C.green }}>₹{Number(b.netPayable).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 18px' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:'#f1f5f9', color:C.text2, textTransform:'uppercase' }}>{b.status}</span>
                  </td>
                  <td style={{ padding:'12px 18px' }}>
                    <button onClick={() => downloadRaBill(b)} disabled={downloading === 'ra-'+b.id}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#ecfdf5', color:'#047857', border:'1.5px solid #a7f3d0', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {downloading === 'ra-'+b.id ? <Spinner /> : <FilePdf size={14}/>}
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspection Reports */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', alignItems:'center', gap:10 }}>
          <CheckSquare size={18} color={C.amber} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>QA Inspection Reports</h2>
        </div>
        {(inspections ?? []).length === 0 ? (
          <div style={{ padding:'32px 22px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:C.text3, margin:0 }}>No inspections yet — record them in Quality (QA)</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                {['Date','Work Item','Location','Pass','Fail','Result','Download'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(inspections ?? []).slice(0, 20).map((insp: any, i: number) => {
                const rColor = insp.overallResult === 'passed' ? C.green : insp.overallResult === 'failed' ? C.red : C.amber
                return (
                  <tr key={insp.id} style={{ borderBottom:i<(inspections??[]).slice(0,20).length-1?'1px solid #f1f5f9':'none' }}>
                    <td style={{ padding:'11px 18px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{insp.date}</td>
                    <td style={{ padding:'11px 18px', fontSize:13, fontWeight:600, color:C.text1 }}>{insp.workItem}</td>
                    <td style={{ padding:'11px 18px', fontSize:12, color:C.text2 }}>{insp.location ?? '—'}</td>
                    <td style={{ padding:'11px 18px', fontSize:13, fontWeight:700, color:C.green }}>{insp.passCount}</td>
                    <td style={{ padding:'11px 18px', fontSize:13, fontWeight:700, color:insp.failCount>0?C.red:C.text3 }}>{insp.failCount}</td>
                    <td style={{ padding:'11px 18px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:rColor+'18', color:rColor }}>{insp.overallResult}</span>
                    </td>
                    <td style={{ padding:'11px 18px' }}>
                      <button onClick={() => downloadInspection(insp)} disabled={downloading === 'insp-'+insp.id}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#fffbeb', color:'#b45309', border:'1.5px solid #fde68a', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        {downloading === 'insp-'+insp.id ? <Spinner /> : <FilePdf size={14}/>}
                        PDF
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
