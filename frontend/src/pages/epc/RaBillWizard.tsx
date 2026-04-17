/**
 * RaBillWizard.tsx — v3 (All fixes applied)
 *
 * Fixes applied vs v2:
 * 1.  E&M: EM_E1=40%, EM_E2=25% (from signed payment schedule 14-01-2026)
 * 2.  Manual override form after milestone selection
 * 3.  Save quoted rate back to BOQ (auto-fills future bills)
 * 4.  Part A/B selector preserved and always visible when idle
 * 5.  Ratio = measuredQty/estQty — no min() cap
 * 6.  getBoq for sewer components uses COMBINED sewer_network total (matches RA-1)
 * 7.  Quoted Rate + Measured Qty shown in Crores/km with live calculation
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { epcApi } from '@/api/epc.api'
import { pdfApi } from '@/api/pdf.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FilePdf, CheckCircle, FloppyDisk, Warning } from '@phosphor-icons/react'

const C = {
  card: '#fff', border: '#e2e8f0',
  text1: '#0f172a', text2: '#475569', text3: '#94a3b8',
  blue: '#2563eb', green: '#059669', amber: '#d97706',
  red: '#dc2626', navy: '#1a2540', teal: '#0891b2',
}

// ── OFFICIAL PAYMENT SCHEDULES (CE/UEED/CJ/CC/4063-64 dated 14-01-2026) ──────

const SEWER_PIPE_MILESTONES = [
  { code: 'SP_SV', name: 'Survey and Vetting of Design (@5% of total)', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'SP_S2', name: 'Providing & Laying of Pipes + Backfilling + Temporary Surface Reinstatement', pct: 55, sub: [] },
  { code: 'SP_S3', name: 'Sectional Flow Testing', pct: 10, sub: [] },
  { code: 'SP_S4', name: 'Permanent Surface Reinstatement of Roads/Lanes', pct: 20, sub: [] },
  { code: 'SP_S5', name: 'Testing, Commissioning & Successful Trial Run of Complete Sewerage Network', pct: 5, sub: [] },
  { code: 'SP_S6', name: 'O&M for 5 Years', pct: 5, sub: [] },
]
const MANHOLE_MILESTONES = [
  { code: 'MH_SV', name: 'Survey and Vetting of Design (@5% of total)', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'MH_S2', name: 'Construction of RCC Manholes/Inspection Chambers + Backfilling', pct: 65, sub: [] },
  { code: 'MH_S3', name: 'Permanent Surface Reinstatement of Roads/Lanes', pct: 20, sub: [] },
  { code: 'MH_S4', name: 'Testing, Commissioning & Successful Trial Run', pct: 5, sub: [] },
  { code: 'MH_S5', name: 'O&M for 5 Years', pct: 5, sub: [] },
]
const DROP_MILESTONES = [
  { code: 'DR_SV', name: 'Survey and Vetting of Design (@5% of total)', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'DR_S2', name: 'Construction of Drop Arrangement in Manholes + Backfilling', pct: 65, sub: [] },
  { code: 'DR_S3', name: 'Permanent Surface Reinstatement of Roads/Lanes', pct: 20, sub: [] },
  { code: 'DR_S4', name: 'Testing, Commissioning & Successful Trial Run', pct: 5, sub: [] },
  { code: 'DR_S5', name: 'O&M for 5 Years', pct: 5, sub: [] },
]
const MASONRY_MILESTONES = [
  { code: 'MC_SV', name: 'Survey and Vetting of Design (@5% of total)', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'MC_S2', name: 'Construction of Masonry Chamber + Backfilling', pct: 30, sub: [] },
  { code: 'MC_S3', name: 'Providing & Laying of Sewer Pipes + Backfilling', pct: 35, sub: [] },
  { code: 'MC_S4', name: 'Permanent Surface Reinstatement of Roads/Lanes', pct: 20, sub: [] },
  { code: 'MC_S5', name: 'Testing, Commissioning & Successful Trial Run', pct: 5, sub: [] },
  { code: 'MC_S6', name: 'O&M for 5 Years', pct: 5, sub: [] },
]
const CIVIL_MILESTONES = [
  { code: 'CV_SV', name: 'Survey and Vetting of Design (@5% of total)', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'CV_C2', name: 'Building Work up to Plinth Level or 25% Completion', pct: 20, sub: [] },
  { code: 'CV_C3', name: '60% Completion of Building Work or Civil Structure', pct: 30, sub: [] },
  { code: 'CV_C4', name: 'Complete Finishing of Building Work & Civil Structure (as per approved drawings)', pct: 30, sub: [] },
  { code: 'CV_C5', name: "Testing & Commissioning of STP's/IPS's", pct: 5, sub: [] },
  { code: 'CV_C6', name: 'After Issuance of Completion Certificate by UEED', pct: 5, sub: [] },
  { code: 'CV_C7', name: 'O&M for 5 Years', pct: 5, sub: [] },
]
// ✅ FIX #1: E&M = 40/25/10/10/10/5 (from signed schedule 14-01-2026)
const EM_MILESTONES = [
  { code: 'EM_E1', name: 'Delivery of Electro-Mechanical Components at Site (after TPI at Factory — QAP approved)', pct: 40, sub: [] },
  { code: 'EM_E2', name: 'Installation, Erection & Testing of E&M Components at Site', pct: 25, sub: [] },
  { code: 'EM_E3', name: 'Commissioning of E&M Components at Site', pct: 10, sub: [] },
  { code: 'EM_E4', name: 'Successful Completion of Six Months Free Trial Run', pct: 10, sub: [] },
  { code: 'EM_E5', name: 'Successful Completion of Defect Liability Period', pct: 10, sub: [] },
  { code: 'EM_E6', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

const SEWER_COMPONENTS = [
  { key: 'rcc_pipes',         label: 'RCC NP3 Pipes of all dia incl. DI, HDPE',           subCat: 'RCC NP3 Pipes',     milestones: SEWER_PIPE_MILESTONES, unit: 'km' },
  { key: 'manholes',          label: 'Manholes of Different Sizes & Depths',                subCat: 'Manholes',          milestones: MANHOLE_MILESTONES,    unit: 'nos' },
  { key: 'drop_arrangements', label: 'Drop Arrangement of Different Dia',                   subCat: 'Drop Arrangements', milestones: DROP_MILESTONES,       unit: 'km' },
  { key: 'masonry_chambers',  label: 'Construction of Masonry Chamber of Different Sizes',  subCat: 'Masonry Chambers',  milestones: MASONRY_MILESTONES,    unit: 'nos' },
]
const TURNKEY_COMPONENTS = [
  { key: 'ips_civil',    label: 'IPS/MPS — Civil Works (all stations)',          milestones: CIVIL_MILESTONES, color: C.green },
  { key: 'stp_civil',   label: 'STP — Civil & Structural Works (30 MLD)',        milestones: CIVIL_MILESTONES, color: C.amber },
  { key: 'rising_main', label: 'Rising Mains (IPS 1-13 to MPS/STP)',             milestones: CIVIL_MILESTONES, color: C.teal },
  { key: 'ips_em',      label: 'IPS/MPS — Electro-Mechanical Components',        milestones: EM_MILESTONES,    color: '#7c3aed' },
  { key: 'stp_em',      label: 'STP — Electro-Mechanical & SCADA Components',    milestones: EM_MILESTONES,    color: C.red },
]

function fmtCr(n: number) { return '₹' + (n / 1e7).toFixed(2) + ' Cr' }

interface LineItem {
  id: string
  sno: number
  parentDescription: string
  componentLabel: string
  workDone: string
  estimatedCost: number
  quotedRates: number
  estimatedQtyKm: number
  measuredQtyKm: number
  paymentPct: number
  billToRelease: number
  workdoneAmount: number
  subRows?: { breakup: string; pct: number; amount: number }[]
  category: string
  milestoneCode: string
  milestoneName: string
}

interface Props {
  open: boolean
  onClose: () => void
  nextBillNo?: string
}

export default function RaBillWizard({ open, onClose, nextBillNo }: Props) {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [step, setStep] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [createdBill, setCreatedBill] = useState<any>(null)

  const [header, setHeader] = useState({
    billNo: nextBillNo ?? 'RA-1',
    allotmentNo: 'CE/UEED/PS/01 OF 2025-26',
    billDate: new Date().toISOString().split('T')[0],
    periodFrom: '', periodTo: '',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Component/milestone selection state
  const [addingMode, setAddingMode] = useState<'sewer' | 'turnkey' | null>(null)
  const [selComp, setSelComp]       = useState<string | null>(null)
  const [selMilestone, setSelMilestone] = useState('')

  // ✅ FIX #2: Override form state
  const [showOverride, setShowOverride] = useState(false)
  const [overrideQuoted, setOverrideQuoted]   = useState('')   // in Crores
  const [overrideMeasured, setOverrideMeasured] = useState('') // in display unit (km / nos)
  const [saveToBoq, setSaveToBoq] = useState(true)

  const [ded, setDed] = useState({ prevBilled: '0', gstPct: '0', tdsPct: '2', sdPct: '5', remarks: '' })

  const { data: boqItems } = useQuery({
    queryKey: ['boq-items', activeProjectId],
    queryFn: () => epcApi.boqItems(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId && open,
  })

  // Build totals per category
  const totals = useMemo(() => {
    const t: Record<string, any> = {}
    if (!boqItems) return t
    for (const item of boqItems) {
      const key = item.category
      if (!t[key]) t[key] = { est: 0, quoted: 0, estQty: 0, measQty: 0, unit: item.unit }
      t[key].est    += Number(item.estimatedAmount)
      t[key].quoted += Number(item.quotedAmount || item.estimatedAmount)
      t[key].estQty += Number(item.estimatedQty)
      t[key].measQty += Number(item.measuredQty)
    }
    return t
  }, [boqItems])

  // ✅ FIX #6: Sewer components always use combined sewer_network total (matches RA-1)
  function getBoq(compKey: string) {
    const isSewer = SEWER_COMPONENTS.some(c => c.key === compKey)
    if (isSewer) return totals['sewer_network']
    return totals[compKey]
  }

  const currentComp = selComp
    ? (SEWER_COMPONENTS.find(c => c.key === selComp) ?? TURNKEY_COMPONENTS.find(c => c.key === selComp))
    : null

  const currentMilestones = useMemo(() => {
    if (!selComp) return []
    return SEWER_COMPONENTS.find(c => c.key === selComp)?.milestones
      ?? TURNKEY_COMPONENTS.find(c => c.key === selComp)?.milestones ?? []
  }, [selComp])

  const isSewer = selComp ? SEWER_COMPONENTS.some(c => c.key === selComp) : false
  const displayUnit = isSewer ? 'km' : 'LS'

  // Open override form — pre-populate from BOQ
  function openOverrideForm() {
    const boq = getBoq(selComp!)
    const quotedCr = boq ? ((boq.quoted > 0 ? boq.quoted : boq.est) / 1e7).toFixed(5) : ''
    const measDisplay = boq
      ? isSewer
        ? (boq.measQty / 1000).toFixed(3)  // meters → km
        : boq.measQty.toFixed(0)
      : ''
    setOverrideQuoted(quotedCr)
    setOverrideMeasured(measDisplay)
    setShowOverride(true)
  }

  // ✅ FIX #5: Live override amount — NO min() cap on ratio
  const overrideAmount = useMemo(() => {
    if (!selComp || !selMilestone || !showOverride) return 0
    const boq = getBoq(selComp)
    if (!boq) return 0
    const ms = currentMilestones.find(m => m.code === selMilestone)
    if (!ms) return 0
    const quotedRaw = (parseFloat(overrideQuoted) || 0) * 1e7
    const measRaw   = isSewer
      ? (parseFloat(overrideMeasured) || 0) * 1000  // km → m
      : (parseFloat(overrideMeasured) || 0)
    // ✅ No min() cap — ratio can be > 1 (measured > estimated is valid)
    const ratio = isSewer && boq.estQty > 0 ? measRaw / boq.estQty : 1
    return quotedRaw * ratio * ms.pct / 100
  }, [selComp, selMilestone, overrideQuoted, overrideMeasured, showOverride, isSewer, currentMilestones, totals])

  // ✅ FIX #3: handleAdd uses override values and optionally saves to BOQ
  function handleAdd() {
    if (!selComp || !selMilestone) return
    const boq = getBoq(selComp)
    if (!boq) return
    const ms = currentMilestones.find(m => m.code === selMilestone)
    if (!ms) return

    const quotedRaw = (parseFloat(overrideQuoted) || 0) * 1e7
    const measRaw   = isSewer
      ? (parseFloat(overrideMeasured) || 0) * 1000
      : (parseFloat(overrideMeasured) || 0)
    const ratio     = isSewer && boq.estQty > 0 ? measRaw / boq.estQty : 1
    const amount    = quotedRaw * ratio * ms.pct / 100

    // Save quoted rate back to BOQ for future bills
    if (saveToBoq && quotedRaw > 0 && activeProjectId) {
      const sc = SEWER_COMPONENTS.find(c => c.key === selComp)
      const category    = sc ? 'sewer_network' : selComp
      const subCategory = sc?.subCat ?? ''
      epcApi.saveQuotedRate(activeProjectId, category, subCategory, quotedRaw)
        .then(() => qc.invalidateQueries({ queryKey: ['boq-items'] }))
        .catch(() => {}) // non-blocking
    }

    const sc = SEWER_COMPONENTS.find(c => c.key === selComp)
    const tc = TURNKEY_COMPONENTS.find(c => c.key === selComp)
    const parentDesc = sc
      ? 'Laying of Sewer & Appurtenant works (Part of Sewers as per AAA) — Survey, Design, Providing & Laying of Sewerage network'
      : "For STP's/MPS's/IPS's and other allied works (Turnkey items)"

    const subRows = ms.sub.map(s => ({
      breakup: `${s.name} (@${s.pct}% of total amount of this item)`,
      pct: s.pct,
      amount: quotedRaw * ratio * s.pct / 100,
    }))

    const measDisplayKm = isSewer ? parseFloat(overrideMeasured) : undefined
    const estDisplayKm  = isSewer ? boq.estQty / 1000 : undefined

    const item: LineItem = {
      id: Date.now() + Math.random() + '',
      sno: lineItems.length + 1,
      parentDescription: parentDesc,
      componentLabel: sc?.label ?? tc?.label ?? selComp,
      workDone: ms.name,
      estimatedCost: boq.est,
      quotedRates: quotedRaw,
      estimatedQtyKm: estDisplayKm ?? 0,
      measuredQtyKm: measDisplayKm ?? 0,
      paymentPct: ms.pct,
      billToRelease: ratio * ms.pct,
      workdoneAmount: amount,
      subRows: subRows.length > 0 ? subRows : undefined,
      category: selComp,
      milestoneCode: ms.code,
      milestoneName: ms.name,
    }

    setLineItems(p => [...p, item])
    // Reset
    setSelMilestone(''); setSelComp(null); setAddingMode(null)
    setShowOverride(false); setOverrideQuoted(''); setOverrideMeasured('')
  }

  const gross = lineItems.reduce((s, li) => s + li.workdoneAmount, 0)
  const prev  = parseFloat(ded.prevBilled) || 0
  const net   = gross - prev
  const gst   = net * (parseFloat(ded.gstPct) || 0) / 100
  const tds   = (net + gst) * (parseFloat(ded.tdsPct) || 2) / 100
  const sd    = net * (parseFloat(ded.sdPct) || 5) / 100
  const netPay = net + gst - tds - sd

  const createM = useMutation({
    mutationFn: () => epcApi.createRaBill({
      projectId: activeProjectId, ...header,
      lineItems: lineItems.map(li => ({
        category: li.category, milestoneCode: li.milestoneCode, milestoneName: li.milestoneName,
        description: li.componentLabel, parentDescription: li.parentDescription,
        workDone: li.workDone,
        estimatedCost: li.estimatedCost,
        quotedRates: li.quotedRates,
        estimatedQtyKm: li.estimatedQtyKm,
        measuredQtyKm: li.measuredQtyKm,
        paymentPct: li.paymentPct, billToRelease: li.billToRelease,
        workdoneAmount: li.workdoneAmount, subRows: li.subRows,
      })),
      grossAmount: gross, prevBilled: prev,
      gstPct: parseFloat(ded.gstPct) || 0,
      tdsPct: parseFloat(ded.tdsPct) || 2,
      securityDepositPct: parseFloat(ded.sdPct) || 5,
      gstAmount: gst, tdsAmount: tds, securityDepositAmount: sd,
      netThisBill: net, netPayable: netPay, remarks: ded.remarks,
    }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['ra-bills'] }); setCreatedBill(res.data); setStep(4) },
  })

  function reset() {
    setStep(1); setLineItems([]); setCreatedBill(null)
    setAddingMode(null); setSelComp(null); setSelMilestone('')
    setShowOverride(false); setOverrideQuoted(''); setOverrideMeasured('')
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }}
      title={`New Running Account Bill — Step ${step}/4`} width={860}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant='ghost' onClick={() => { reset(); onClose() }}>Cancel</Button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && step < 4 && <Button variant='secondary' onClick={() => setStep(s => s - 1)}>← Back</Button>}
            {step === 1 && <Button variant='primary' onClick={() => setStep(2)} disabled={!header.billNo}>Next →</Button>}
            {step === 2 && <Button variant='primary' onClick={() => setStep(3)} disabled={lineItems.length === 0}>Next: Deductions →</Button>}
            {step === 3 && <Button variant='primary' loading={createM.isPending} onClick={() => createM.mutate()} disabled={netPay <= 0}>Create Bill ✓</Button>}
            {step === 4 && <Button variant='primary' icon={<FilePdf size={15} />} loading={pdfLoading}
              onClick={async () => { setPdfLoading(true); try { await pdfApi.raBill({ bill: createdBill }) } finally { setPdfLoading(false) } }}>
              Download PDF
            </Button>}
          </div>
        </div>
      }>

      {/* ── STEP 1: Header ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
            <strong>Allotment CE/UEED/PS/01 OF 2025-26</strong> — Payment schedule per signed order dated 14-01-2026. TDS @2%, SD @5%.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label='Bill No.' value={header.billNo} onChange={e => setHeader(h => ({ ...h, billNo: e.target.value }))} />
            <Input label='Bill Date' type='date' value={header.billDate} onChange={e => setHeader(h => ({ ...h, billDate: e.target.value }))} />
          </div>
          <Input label='Allotment No.' value={header.allotmentNo} onChange={e => setHeader(h => ({ ...h, allotmentNo: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label='Period From' type='date' value={header.periodFrom} onChange={e => setHeader(h => ({ ...h, periodFrom: e.target.value }))} />
            <Input label='Period To' type='date' value={header.periodTo} onChange={e => setHeader(h => ({ ...h, periodTo: e.target.value }))} />
          </div>
        </div>
      )}

      {/* ── STEP 2: Line Items ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Existing line items */}
          {lineItems.length > 0 && (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: C.navy, padding: '8px 16px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>Line Items ({lineItems.length})</span>
                <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>{fmtCr(gross)}</span>
              </div>
              {lineItems.map((li, i) => (
                <div key={li.id} style={{ padding: '10px 16px', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', background: i % 2 === 0 ? '#f8f9fc' : '#fff' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{li.componentLabel}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{li.workDone} ({li.paymentPct}%)</div>
                    {li.subRows?.map((sr, si) => (
                      <div key={si} style={{ fontSize: 10, color: C.text3, marginLeft: 10 }}>└ {sr.breakup} → {fmtCr(sr.amount)}</div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{fmtCr(li.workdoneAmount)}</div>
                    <button onClick={() => setLineItems(p => p.filter(x => x.id !== li.id))}
                      style={{ fontSize: 10, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ✅ FIX #4: Part A/B selector — always shown when idle */}
          {!addingMode && !selComp && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => setAddingMode('sewer')} style={{ padding: 16, borderRadius: 10, border: '1.5px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>+ Part A — Sewer Network</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>RCC Pipes · Manholes · Drop Arrangements · Masonry Chambers</div>
              </button>
              <button onClick={() => setAddingMode('turnkey')} style={{ padding: 16, borderRadius: 10, border: '1.5px solid #d1fae5', background: '#ecfdf5', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>+ Part B — Turnkey Items</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>STP · IPS · MPS — Civil & Electro-Mechanical</div>
              </button>
            </div>
          )}

          {/* Sewer component list */}
          {addingMode === 'sewer' && !selComp && !showOverride && (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border, fontSize: 12, fontWeight: 700, color: C.text1 }}>Select Sewer Component (Part A)</div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SEWER_COMPONENTS.map(comp => {
                  // ✅ FIX #6: show combined sewer total for all components
                  const boq = totals['sewer_network']
                  return (
                    <button key={comp.key} onClick={() => setSelComp(comp.key)} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid ' + C.border, background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{comp.label}</span>
                      <span style={{ fontSize: 11, color: C.text3 }}>
                        Combined est: {boq ? fmtCr(boq.est) : '—'} · {boq ? (boq.measQty / 1000).toFixed(2) + ' km measured' : '—'}
                      </span>
                    </button>
                  )
                })}
                <Button variant='ghost' size='sm' onClick={() => setAddingMode(null)}>← Back</Button>
              </div>
            </div>
          )}

          {/* Turnkey component list */}
          {addingMode === 'turnkey' && !selComp && !showOverride && (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border, fontSize: 12, fontWeight: 700, color: C.text1 }}>Select Turnkey Component (Part B)</div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TURNKEY_COMPONENTS.map(comp => {
                  const boq = totals[comp.key]
                  return (
                    <button key={comp.key} onClick={() => setSelComp(comp.key)} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid ' + comp.color + '30', background: comp.color + '08', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: comp.color }}>{comp.label}</span>
                      <span style={{ fontSize: 11, color: C.text3 }}>Est: {boq ? fmtCr(boq.est) : 'Not seeded'}</span>
                    </button>
                  )
                })}
                <Button variant='ghost' size='sm' onClick={() => setAddingMode(null)}>← Back</Button>
              </div>
            </div>
          )}

          {/* Milestone list */}
          {selComp && !showOverride && (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border, fontSize: 12, fontWeight: 700, color: C.text1 }}>
                Select Payment Milestone — {currentComp?.label}
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {currentMilestones.map(m => {
                  const boq = getBoq(selComp)
                  const quoted = boq ? (boq.quoted > 0 ? boq.quoted : boq.est) : 0
                  const measRaw = isSewer ? boq?.measQty ?? 0 : boq?.measQty ?? 0
                  const ratio = isSewer && boq?.estQty > 0 ? measRaw / boq.estQty : 1
                  const calcAmt = quoted * ratio * m.pct / 100
                  const sel = selMilestone === m.code
                  return (
                    <button key={m.code} onClick={() => setSelMilestone(m.code)} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid', borderColor: sel ? C.blue : C.border, background: sel ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: sel ? C.blue : C.text1 }}>{m.name} <span style={{ fontWeight: 400, color: C.text3 }}>({m.pct}%)</span></div>
                        {m.sub.map(s => (
                          <div key={s.name} style={{ fontSize: 10, color: C.text3, marginTop: 2, marginLeft: 8 }}>└ {s.name} @{s.pct}%</div>
                        ))}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green, flexShrink: 0, marginLeft: 12 }}>{fmtCr(calcAmt)}</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1.5px solid ' + C.border, display: 'flex', gap: 10 }}>
                <Button variant='ghost' size='sm' onClick={() => { setSelComp(null); setSelMilestone('') }}>← Back</Button>
                <Button variant='primary' size='sm' disabled={!selMilestone} onClick={openOverrideForm}>Configure & Add →</Button>
              </div>
            </div>
          )}

          {/* ✅ FIX #2: Override form — manual Quoted Rate + Measured Qty */}
          {selComp && showOverride && (
            <div style={{ border: '2px solid ' + C.blue, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{currentComp?.label} — {currentMilestones.find(m => m.code === selMilestone)?.name}</span>
                <span style={{ fontSize: 12, color: '#93c5fd' }}>{currentMilestones.find(m => m.code === selMilestone)?.pct}%</span>
              </div>
              <div style={{ padding: 16 }}>
                {/* Read-only BOQ fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                      Estimated Cost (BOQ) <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>AUTO</span>
                    </label>
                    <div style={{ background: '#f8f9fc', border: '1px solid ' + C.border, borderRadius: 6, padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', color: C.text2 }}>
                      {fmtCr(getBoq(selComp)?.est ?? 0)}
                    </div>
                  </div>
                  {isSewer && (
                    <div>
                      <label style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                        Estimated Qty (BOQ) <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>AUTO</span>
                      </label>
                      <div style={{ background: '#f8f9fc', border: '1px solid ' + C.border, borderRadius: 6, padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', color: C.text2 }}>
                        {((getBoq(selComp)?.estQty ?? 0) / 1000).toFixed(3)} km
                      </div>
                    </div>
                  )}
                </div>

                {/* Editable fields */}
                <div style={{ display: 'grid', gridTemplateColumns: isSewer ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                      Quoted Rate (₹ Crores) — from LOA
                    </label>
                    <input type='number' step='0.00001' value={overrideQuoted}
                      onChange={e => setOverrideQuoted(e.target.value)}
                      placeholder='e.g. 185.12311'
                      style={{ width: '100%', background: '#fff', border: '1.5px solid ' + C.amber, borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'monospace', color: C.amber, outline: 'none' }} />
                    {getBoq(selComp) && overrideQuoted && (
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>
                        Discount: {((1 - parseFloat(overrideQuoted) * 1e7 / (getBoq(selComp)?.est ?? 1)) * 100).toFixed(3)}% below estimated
                      </div>
                    )}
                  </div>
                  {isSewer && (
                    <div>
                      <label style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                        Measured Qty (km) — from Survey / JMB
                      </label>
                      <input type='number' step='0.001' value={overrideMeasured}
                        onChange={e => setOverrideMeasured(e.target.value)}
                        placeholder='e.g. 189.100'
                        style={{ width: '100%', background: '#fff', border: '1.5px solid ' + C.blue, borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'monospace', color: C.blue, outline: 'none' }} />
                      {overrideMeasured && getBoq(selComp)?.estQty && (
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>
                          Ratio: {(parseFloat(overrideMeasured) * 1000 / (getBoq(selComp)?.estQty ?? 1)).toFixed(4)}×
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Live amount */}
                {overrideQuoted ? (
                  <div style={{ background: overrideAmount > 0 ? '#ecfdf5' : '#fff7ed', border: '1.5px solid ' + (overrideAmount > 0 ? '#a7f3d0' : '#fed7aa'), borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: C.text2 }}>
                        {isSewer
                          ? `₹${overrideQuoted} Cr × (${overrideMeasured || '0'} ÷ ${((getBoq(selComp)?.estQty ?? 0) / 1000).toFixed(3)}) × ${currentMilestones.find(m => m.code === selMilestone)?.pct}%`
                          : `₹${overrideQuoted} Cr × ${currentMilestones.find(m => m.code === selMilestone)?.pct}% (lumpsum)`}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{fmtCr(overrideAmount)}</div>
                    </div>
                    {currentMilestones.find(m => m.code === selMilestone)?.sub.map(s => (
                      <div key={s.name} style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
                        └ {s.name} @{s.pct}% = {fmtCr((parseFloat(overrideQuoted) || 0) * 1e7 * ((isSewer && getBoq(selComp)?.estQty ? (parseFloat(overrideMeasured) || 0) * 1000 / getBoq(selComp).estQty : 1)) * s.pct / 100)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Warning size={14} /> Enter Quoted Rate (from your LOA/Allotment letter) to calculate the amount.
                  </div>
                )}

                {/* Save to BOQ checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text2, cursor: 'pointer', marginBottom: 14 }}>
                  <input type='checkbox' checked={saveToBoq} onChange={e => setSaveToBoq(e.target.checked)} style={{ accent: C.green }} />
                  <FloppyDisk size={13} color={C.green} />
                  Save this quoted rate to BOQ (auto-fills future bills)
                </label>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant='ghost' size='sm' onClick={() => { setShowOverride(false); setSelMilestone('') }}>← Back</Button>
                  <Button variant='primary' size='sm' disabled={!overrideQuoted || overrideAmount <= 0} onClick={handleAdd}>Add to Bill ✓</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Deductions ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Input label='Previously Billed (₹)' type='number' value={ded.prevBilled} onChange={e => setDed(d => ({ ...d, prevBilled: e.target.value }))} />
            <Input label='GST %' type='number' value={ded.gstPct} onChange={e => setDed(d => ({ ...d, gstPct: e.target.value }))} />
            <Input label='TDS %' type='number' value={ded.tdsPct} onChange={e => setDed(d => ({ ...d, tdsPct: e.target.value }))} />
            <Input label='Security Deposit %' type='number' value={ded.sdPct} onChange={e => setDed(d => ({ ...d, sdPct: e.target.value }))} />
          </div>
          <Input label='Remarks' value={ded.remarks} onChange={e => setDed(d => ({ ...d, remarks: e.target.value }))} placeholder='Optional' />
          <div style={{ background: '#f8f9fc', border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: C.navy, padding: '8px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>Bill {header.billNo} · {header.billDate}</span>
            </div>
            {lineItems.map((li, i) => (
              <div key={li.id} style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: i % 2 === 0 ? '#f8f9fc' : '#fff', fontSize: 12 }}>
                <span style={{ color: C.text1 }}>{li.componentLabel} <span style={{ color: C.text3 }}>— {li.workDone}</span></span>
                <span style={{ fontWeight: 700, color: C.text1 }}>{fmtCr(li.workdoneAmount)}</span>
              </div>
            ))}
            {[
              ['Gross Amount',              fmtCr(gross), C.text1, false],
              ['Less: Previously Billed',   '- ' + fmtCr(prev), C.text2, false],
              ['Net This Bill',             fmtCr(net), C.blue, false],
              ['Add: GST (' + ded.gstPct + '%)', '+ ' + fmtCr(gst), C.amber, false],
              ['Less: TDS @ ' + ded.tdsPct + '%', '- ' + fmtCr(tds), C.red, false],
              ['Less: Security Deposit @ ' + ded.sdPct + '%', '- ' + fmtCr(sd), C.red, false],
            ].map(([l, v, c, bold]: any) => (
              <div key={l} style={{ padding: '7px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.text3 }}>{l}</span>
                <span style={{ color: c, fontWeight: bold ? 800 : 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ padding: '12px 16px', background: '#ecfdf5', borderTop: '1.5px solid #a7f3d0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text1 }}>NET AMOUNT PAYABLE</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.green }}>{fmtCr(netPay)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Success ── */}
      {step === 4 && createdBill && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0' }}>
          <CheckCircle size={56} color={C.green} weight='fill' />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text1, margin: '0 0 6px' }}>Bill {createdBill.billNo} Created!</h2>
            <p style={{ fontSize: 14, color: C.text2, margin: 0 }}>Net Payable: <strong style={{ color: C.green }}>{fmtCr(Number(createdBill.netPayable))}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant='primary' icon={<FilePdf size={16} />} loading={pdfLoading}
              onClick={async () => { setPdfLoading(true); try { await pdfApi.raBill({ bill: createdBill }) } finally { setPdfLoading(false) } }}>
              Download PDF
            </Button>
            <Button variant='secondary' onClick={() => { reset(); onClose() }}>Close</Button>
          </div>
          <p style={{ fontSize: 11, color: C.text3, textAlign: 'center', maxWidth: 400 }}>
            Saved as Draft. Submit for approval from the RA Bills tab.
          </p>
        </div>
      )}
    </Modal>
  )
}
