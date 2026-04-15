/**
 * RaBillWizard.tsx — v3 HYBRID
 * Changes from v2:
 * 1. E&M corrected: 40% delivery, 25% installation (official signed schedule 14-01-2026)
 * 2. After selecting milestone → shows override form:
 *    - Estimated Cost (auto-fetched, read-only)
 *    - Quoted Rates (auto-fetched if saved, else manual entry — saved back to BOQ)
 *    - Estimated Qty (auto-fetched, read-only)
 *    - Measured Qty (auto-fetched from BOQ, editable)
 *    - Amount calculates live: Quoted × (Measured/Estimated) × Milestone%
 * 3. Quoted rates entered once saved to BOQ for future bills auto-fill
 *
 * Place at: frontend/src/pages/epc/RaBillWizard.tsx
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { epcApi } from '@/api/epc.api'
import { pdfApi } from '@/api/pdf.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FilePdf, CheckCircle, PencilSimple, LockSimple } from '@phosphor-icons/react'

const C = {
  card: '#fff', border: '#e2e8f0',
  text1: '#0f172a', text2: '#475569', text3: '#94a3b8',
  blue: '#2563eb', green: '#059669', amber: '#d97706',
  red: '#dc2626', navy: '#1a2540',
}

// ── OFFICIAL PAYMENT SCHEDULE (Signed 14-01-2026, CE/UEED/CJ/CC/4063-64) ──

const SEWER_PIPE_MILESTONES = [
  { code: 'SP_SV', name: 'Survey and Vetting of Design', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'SP_S2', name: 'Providing & Laying of Pipes + Backfilling + Temporary Surface Reinstatement & disposal within 8Kms as per BoQ', pct: 55, sub: [] },
  { code: 'SP_S3', name: 'Sectional Flow Testing', pct: 10, sub: [] },
  { code: 'SP_S4', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal of surplus materials within 8Kms', pct: 20, sub: [] },
  { code: 'SP_S5', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5, sub: [] },
  { code: 'SP_S6', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

const MANHOLE_MILESTONES = [
  { code: 'MH_SV', name: 'Survey and Vetting of Design', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'MH_S2', name: 'Construction of RCC Manholes/Inspection Chambers + Backfilling + Temporary Surface Reinstatement & disposal within 8Kms as per BoQ', pct: 65, sub: [] },
  { code: 'MH_S3', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal of surplus materials within 8Kms', pct: 20, sub: [] },
  { code: 'MH_S4', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5, sub: [] },
  { code: 'MH_S5', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

const DROP_MILESTONES = [
  { code: 'DR_SV', name: 'Survey and Vetting of Design', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'DR_S2', name: 'Construction of Drop Arrangement in Manholes/Inspection Chambers + Backfilling + Surface Reinstatement & disposal within 8Kms as per BoQ', pct: 65, sub: [] },
  { code: 'DR_S3', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20, sub: [] },
  { code: 'DR_S4', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5, sub: [] },
  { code: 'DR_S5', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

const MASONRY_MILESTONES = [
  { code: 'MC_SV', name: 'Survey and Vetting of Design', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'MC_S2', name: 'Construction of Masonry Chamber + Backfilling + Surface Reinstatement & disposal within 8Kms as per BoQ', pct: 30, sub: [] },
  { code: 'MC_S3', name: 'Providing & Laying of Sewer Pipes + Backfilling + Surface Reinstatement & disposal within 8Kms as per BoQ', pct: 35, sub: [] },
  { code: 'MC_S4', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20, sub: [] },
  { code: 'MC_S5', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5, sub: [] },
  { code: 'MC_S6', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

const CIVIL_MILESTONES = [
  { code: 'CV_SV', name: 'Survey & Vetting of Design', pct: 5, sub: [{ name: 'Survey', pct: 3 }, { name: 'Vetting of Design', pct: 2 }] },
  { code: 'CV_C2', name: 'Building Work up to Plinth Level or 25% Completion of Civil Structure Work', pct: 20, sub: [] },
  { code: 'CV_C3', name: '60% Completion of Building Work or Civil Structure Work', pct: 30, sub: [] },
  { code: 'CV_C4', name: 'Complete Finishing of Building Work and Civil Structure Works as per Approved Drawings & Specifications', pct: 30, sub: [] },
  { code: 'CV_C5', name: "Testing & Commissioning of STP's/IPS's", pct: 5, sub: [] },
  { code: 'CV_C6', name: 'After Issuance of Completion Certificate by UEED', pct: 5, sub: [] },
  { code: 'CV_C7', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

// ✅ CORRECTED per official signed payment schedule 14-01-2026
const EM_MILESTONES = [
  { code: 'EM_E1', name: 'Delivery of Electro-Mechanical Components at Site after TPI', pct: 40, sub: [] },
  { code: 'EM_E2', name: 'Installation, Erection & Testing of Electro-Mechanical Components at Site', pct: 25, sub: [] },
  { code: 'EM_E3', name: 'Commissioning of Electro-Mechanical Components at Site', pct: 10, sub: [] },
  { code: 'EM_E4', name: 'Successful Completion of Six Months Free Trial Run', pct: 10, sub: [] },
  { code: 'EM_E5', name: 'Successful Completion of Defect Liability Period', pct: 10, sub: [] },
  { code: 'EM_E6', name: 'O&M for 5 Years', pct: 5, sub: [] },
]

const SEWER_COMPONENTS = [
  { key: 'rcc_pipes',         label: 'RCC NP3 Pipes of all dia incl. DI, HDPE',           subCat: 'RCC NP3 Pipes',     milestones: SEWER_PIPE_MILESTONES, unit: 'M' },
  { key: 'manholes',          label: 'Manholes of Different Sizes & Depths',                subCat: 'Manholes',          milestones: MANHOLE_MILESTONES,    unit: 'Nos' },
  { key: 'drop_arrangements', label: 'Drop Arrangement of Different Dia',                  subCat: 'Drop Arrangements', milestones: DROP_MILESTONES,       unit: 'M' },
  { key: 'masonry_chambers',  label: 'Construction of Masonry Chamber of Different Sizes', subCat: 'Masonry Chambers',  milestones: MASONRY_MILESTONES,    unit: 'Nos' },
]

const TURNKEY_COMPONENTS = [
  { key: 'ips_civil',    label: 'IPS — Civil Works (Pump House, Screen Channel, Sump)', milestones: CIVIL_MILESTONES, color: '#059669', boqCat: 'ips_civil' },
  { key: 'stp_civil',   label: 'STP/MPS — Civil & Structural Works',                    milestones: CIVIL_MILESTONES, color: '#d97706', boqCat: 'stp_civil' },
  { key: 'rising_main', label: 'Rising Mains & Allied Works',                           milestones: CIVIL_MILESTONES, color: '#0891b2', boqCat: 'rising_main' },
  { key: 'ips_em',      label: 'IPS — Electro-Mechanical Components',                   milestones: EM_MILESTONES,    color: '#7c3aed', boqCat: 'ips_em' },
  { key: 'stp_em',      label: 'STP/MPS — Electro-Mechanical & SCADA Components',       milestones: EM_MILESTONES,    color: '#dc2626', boqCat: 'stp_em' },
]

function fmtCr(n: number) { return '₹' + (n / 1e7).toFixed(2) + ' Cr' }
function fmtCrFull(n: number) { return (n / 1e7).toFixed(5) }

interface LineItem {
  id: string
  sno: number
  parentDescription: string
  componentLabel: string
  workDone: string
  estimatedCost: number
  quotedRates: number
  estimatedQtyDisplay: number
  measuredQtyDisplay: number
  pctSchedule: number
  workdonePct: number
  workdoneAmount: number
  subRows?: { breakup: string; pct: number; amount: number }[]
  category: string
  subCat: string
  milestoneCode: string
  milestoneName: string
  paymentPct: number
  billToRelease: number
  estimatedQtyKm: number
  measuredQtyKm: number
}

interface OverrideForm {
  compKey: string
  milestoneCode: string
  estimatedCost: number
  estimatedQty: number   // in display units (km or nos)
  unit: string
  quotedRatesCr: string  // user enters in Crores e.g. "185.12311"
  measuredQty: string    // in display units
  quotedRateFromBoq: boolean
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
  const [addingMode, setAddingMode] = useState<'sewer' | 'turnkey' | null>(null)
  const [selComp, setSelComp] = useState<string | null>(null)
  const [overrideForm, setOverrideForm] = useState<OverrideForm | null>(null)
  const [ded, setDed] = useState({ prevBilled: '0', gstPct: '0', tdsPct: '2', sdPct: '5', remarks: '' })

  const { data: boqItems } = useQuery({
    queryKey: ['boq-items', activeProjectId],
    queryFn: () => epcApi.boqItems(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId && open,
  })

  const totals = useMemo(() => {
    const t: Record<string, any> = {}
    if (!boqItems) return t
    for (const item of boqItems) {
      const sk = item.category + '::' + (item.subCategory ?? '')
      if (!t[sk]) t[sk] = { est: 0, quoted: 0, estQty: 0, measQty: 0, unit: item.unit }
      t[sk].est += Number(item.estimatedAmount)
      t[sk].quoted += Number(item.quotedAmount || 0)
      t[sk].estQty += Number(item.estimatedQty)
      t[sk].measQty += Number(item.measuredQty)
      if (!t[item.category]) t[item.category] = { est: 0, quoted: 0, estQty: 0, measQty: 0, unit: item.unit }
      t[item.category].est += Number(item.estimatedAmount)
      t[item.category].quoted += Number(item.quotedAmount || 0)
      t[item.category].estQty += Number(item.estimatedQty)
      t[item.category].measQty += Number(item.measuredQty)
    }
    return t
  }, [boqItems])

  function getBoq(compKey: string) {
    const sc = SEWER_COMPONENTS.find(c => c.key === compKey)
    if (sc) return totals['sewer_network::' + sc.subCat] ?? totals['sewer_network']
    return totals[compKey]
  }

  const currentMilestones = useMemo(() => {
    if (!overrideForm) return []
    return SEWER_COMPONENTS.find(c => c.key === overrideForm.compKey)?.milestones
      ?? TURNKEY_COMPONENTS.find(c => c.key === overrideForm.compKey)?.milestones ?? []
  }, [overrideForm])

  function handleMilestoneSelect(compKey: string, milestoneCode: string) {
    const boq = getBoq(compKey)
    const sc = SEWER_COMPONENTS.find(c => c.key === compKey)
    const unit = sc?.unit ?? boq?.unit ?? 'LS'
    const displayDiv = unit === 'M' ? 1000 : 1
    const savedQuoted = boq?.quoted ?? 0
    const savedMeasured = boq?.measQty ?? 0

    setOverrideForm({
      compKey,
      milestoneCode,
      estimatedCost: boq?.est ?? 0,
      estimatedQty: (boq?.estQty ?? 0) / displayDiv,
      unit,
      quotedRatesCr: savedQuoted > 0 ? fmtCrFull(savedQuoted) : '',
      measuredQty: savedMeasured > 0 ? (savedMeasured / displayDiv).toFixed(3) : '',
      quotedRateFromBoq: savedQuoted > 0,
    })
  }

  const saveQuotedRateM = useMutation({
    mutationFn: ({ category, subCategory, quotedAmount }: any) =>
      epcApi.saveQuotedRate(activeProjectId!, category, subCategory, quotedAmount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq-items'] }),
  })

  // Live calculation
  const overrideCalc = useMemo(() => {
    if (!overrideForm) return null
    const ms = currentMilestones.find(m => m.code === overrideForm.milestoneCode)
    if (!ms) return null
    const quotedCr = parseFloat(overrideForm.quotedRatesCr)
    if (isNaN(quotedCr) || quotedCr <= 0) return null
    const quotedRupees = quotedCr * 1e7
    const sc = SEWER_COMPONENTS.find(c => c.key === overrideForm.compKey)
    const unit = sc?.unit ?? overrideForm.unit
    const displayDiv = unit === 'M' ? 1000 : 1
    const isLinear = unit !== 'LS'
    const estQtyRaw = overrideForm.estimatedQty * displayDiv
    const measQtyRaw = (parseFloat(overrideForm.measuredQty) || 0) * displayDiv
    const ratio = isLinear && estQtyRaw > 0 ? Math.min(measQtyRaw / estQtyRaw, 1) : 1
    const totalAmount = quotedRupees * ratio * ms.pct / 100
    const subAmounts = ms.sub.map(s => ({ name: s.name, pct: s.pct, amount: quotedRupees * ratio * s.pct / 100 }))
    return { totalAmount, subAmounts, ratio, ms, quotedRupees }
  }, [overrideForm, currentMilestones])

  function handleAddFromForm() {
    if (!overrideForm || !overrideCalc) return
    const sc = SEWER_COMPONENTS.find(c => c.key === overrideForm.compKey)
    const tc = TURNKEY_COMPONENTS.find(c => c.key === overrideForm.compKey)
    const unit = sc?.unit ?? overrideForm.unit
    const subCat = sc?.subCat ?? ''
    const catKey = sc ? 'sewer_network' : (tc?.boqCat ?? overrideForm.compKey)
    const measQtyDisplay = parseFloat(overrideForm.measuredQty) || 0

    const subRows = overrideCalc.subAmounts.map(s => ({
      breakup: `${s.name} (@${s.pct}% of total amount of this item)`,
      pct: s.pct,
      amount: s.amount,
    }))

    const item: LineItem = {
      id: Date.now() + Math.random() + '',
      sno: lineItems.length + 1,
      parentDescription: sc
        ? 'Laying of Sewer & Appurtenant works (Survey, Design, Providing & Laying of Sewerage network including excavation by manual/mechanical means and disposal of surplus earth from the site of work)'
        : "For STP's/MPS's/IPS's and other allied works (Turnkey items)",
      componentLabel: sc?.label ?? tc?.label ?? overrideForm.compKey,
      workDone: overrideCalc.ms.name,
      estimatedCost: overrideForm.estimatedCost,
      quotedRates: overrideCalc.quotedRupees,
      estimatedQtyDisplay: overrideForm.estimatedQty,
      measuredQtyDisplay: measQtyDisplay,
      pctSchedule: overrideCalc.ms.pct,
      workdonePct: overrideCalc.ratio * overrideCalc.ms.pct,
      workdoneAmount: overrideCalc.totalAmount,
      subRows: subRows.length > 0 ? subRows : undefined,
      category: catKey,
      subCat,
      milestoneCode: overrideCalc.ms.code,
      milestoneName: overrideCalc.ms.name,
      paymentPct: overrideCalc.ms.pct,
      billToRelease: overrideCalc.ratio * overrideCalc.ms.pct,
      estimatedQtyKm: overrideForm.estimatedQty,
      measuredQtyKm: measQtyDisplay,
    }

    setLineItems(p => [...p, item])

    if (!overrideForm.quotedRateFromBoq) {
      saveQuotedRateM.mutate({ category: catKey, subCategory: subCat, quotedAmount: overrideCalc.quotedRupees })
    }

    setOverrideForm(null)
    setSelComp(null)
    setAddingMode(null)
  }

  const gross = lineItems.reduce((s, li) => s + li.workdoneAmount, 0)
  const prev = parseFloat(ded.prevBilled) || 0
  const net = gross - prev
  const gst = net * (parseFloat(ded.gstPct) || 0) / 100
  const tds = (net + gst) * (parseFloat(ded.tdsPct) || 2) / 100
  const sd = net * (parseFloat(ded.sdPct) || 5) / 100
  const netPay = net + gst - tds - sd

  const createM = useMutation({
    mutationFn: () => epcApi.createRaBill({
      projectId: activeProjectId, ...header,
      lineItems: lineItems.map(li => ({
        category: li.category, subCat: li.subCat,
        milestoneCode: li.milestoneCode, milestoneName: li.milestoneName,
        description: li.componentLabel, parentDescription: li.parentDescription,
        workDone: li.workDone,
        estimatedCost: li.estimatedCost, quotedRates: li.quotedRates,
        estimatedQtyKm: li.estimatedQtyKm, measuredQtyKm: li.measuredQtyKm,
        paymentPct: li.paymentPct, billToRelease: li.billToRelease,
        workdoneAmount: li.workdoneAmount, subRows: li.subRows,
      })),
      grossAmount: gross, prevBilled: prev,
      gstPct: parseFloat(ded.gstPct) || 0, tdsPct: parseFloat(ded.tdsPct) || 2,
      securityDepositPct: parseFloat(ded.sdPct) || 5,
      gstAmount: gst, tdsAmount: tds, securityDepositAmount: sd,
      netThisBill: net, netPayable: netPay, remarks: ded.remarks,
    }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['ra-bills'] }); setCreatedBill(res.data); setStep(4) },
  })

  function reset() { setStep(1); setLineItems([]); setCreatedBill(null); setAddingMode(null); setSelComp(null); setOverrideForm(null) }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }}
      title={`New Running Account Bill — Step ${step}/4`} width={820}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant='ghost' onClick={() => { reset(); onClose() }}>Cancel</Button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && step < 4 && !overrideForm && <Button variant='secondary' onClick={() => setStep(s => s - 1)}>← Back</Button>}
            {step === 1 && <Button variant='primary' onClick={() => setStep(2)} disabled={!header.billNo}>Next →</Button>}
            {step === 2 && !overrideForm && <Button variant='primary' onClick={() => setStep(3)} disabled={lineItems.length === 0}>Next: Deductions →</Button>}
            {step === 3 && <Button variant='primary' loading={createM.isPending} onClick={() => createM.mutate()} disabled={netPay <= 0}>Create Bill ✓</Button>}
            {step === 4 && <Button variant='primary' icon={<FilePdf size={15} />} loading={pdfLoading} onClick={async () => { setPdfLoading(true); try { await pdfApi.raBill({ bill: createdBill }) } finally { setPdfLoading(false) } }}>Download PDF</Button>}
          </div>
        </div>
      }>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
            <strong>Package:</strong> Survey, Design and Execution of Sewerage Scheme for Dal Lake Uncovered Areas — EPC Fixed-Cost Turnkey Basis incl. O&M for 5 Years after Successful Completion of 6-Month Free Trial Run.
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

      {/* STEP 2 */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Existing items */}
          {lineItems.length > 0 && !overrideForm && (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: C.navy, padding: '8px 16px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>Line Items ({lineItems.length})</span>
                <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 700 }}>{fmtCr(gross)}</span>
              </div>
              {lineItems.map((li, i) => (
                <div key={li.id} style={{ padding: '10px 16px', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', background: i % 2 === 0 ? '#f8f9fc' : '#fff' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{li.componentLabel}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>
                      {li.workDone} ({li.pctSchedule}%) · Quoted: {fmtCr(li.quotedRates)} · Meas: {li.measuredQtyDisplay.toFixed(2)}
                    </div>
                    {li.subRows?.map((sr, si) => (
                      <div key={si} style={{ fontSize: 10, color: C.text3, marginLeft: 10 }}>└ {sr.breakup} → {fmtCr(sr.amount)}</div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{fmtCr(li.workdoneAmount)}</div>
                    <button onClick={() => setLineItems(p => p.filter(x => x.id !== li.id))}
                      style={{ fontSize: 10, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── OVERRIDE FORM ── */}
          {overrideForm && (
            <div style={{ border: '1.5px solid ' + C.blue, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: C.navy, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {SEWER_COMPONENTS.find(c => c.key === overrideForm.compKey)?.label ?? TURNKEY_COMPONENTS.find(c => c.key === overrideForm.compKey)?.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {currentMilestones.find(m => m.code === overrideForm.milestoneCode)?.name} · {currentMilestones.find(m => m.code === overrideForm.milestoneCode)?.pct}%
                  </div>
                </div>
                <button onClick={() => setOverrideForm(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
                  ✕
                </button>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Read-only: auto-fetched from BOQ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Estimated Cost', value: fmtCr(overrideForm.estimatedCost) },
                    { label: 'Estimated Qty', value: overrideForm.estimatedQty.toFixed(2) + ' ' + (overrideForm.unit === 'M' ? 'km' : overrideForm.unit) },
                  ].map(f => (
                    <div key={f.label} style={{ padding: '10px 12px', background: '#f8f9fc', borderRadius: 8, border: '1px solid ' + C.border }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <LockSimple size={10} color={C.text3} />
                        <span style={{ fontSize: 10, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label} (BOQ)</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>{f.value}</div>
                    </div>
                  ))}
                </div>

                {/* Editable fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <PencilSimple size={11} color={C.blue} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text2 }}>
                        Quoted Rates (Crores)
                        {overrideForm.quotedRateFromBoq && <span style={{ color: C.green, marginLeft: 6, fontSize: 10 }}>✓ auto-filled</span>}
                      </span>
                    </div>
                    <Input type='number' value={overrideForm.quotedRatesCr}
                      onChange={e => setOverrideForm(f => f ? { ...f, quotedRatesCr: e.target.value, quotedRateFromBoq: false } : f)}
                      placeholder='e.g. 185.12311' />
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>From LOA. Saved to BOQ for future bills.</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <PencilSimple size={11} color={C.blue} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text2 }}>
                        Measured Qty ({overrideForm.unit === 'M' ? 'km' : overrideForm.unit})
                      </span>
                    </div>
                    <Input type='number' value={overrideForm.measuredQty}
                      onChange={e => setOverrideForm(f => f ? { ...f, measuredQty: e.target.value } : f)}
                      placeholder={overrideForm.unit === 'M' ? 'e.g. 210.05' : 'e.g. 909'} />
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>From field measurement / JMB.</div>
                  </div>
                </div>

                {/* Live calculation */}
                {overrideCalc ? (
                  <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#047857', fontWeight: 600, marginBottom: 8 }}>
                      Formula: {fmtCr(overrideCalc.quotedRupees)} × {(overrideCalc.ratio * 100).toFixed(1)}% measured × {overrideCalc.ms.pct}% milestone
                    </div>
                    {overrideCalc.subAmounts.map(s => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: '#047857' }}>{s.name} (@{s.pct}% of total amount of this item)</span>
                        <span style={{ fontWeight: 700, color: '#047857' }}>{fmtCr(s.amount)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #a7f3d0', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>Amount this line item</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: C.green }}>{fmtCr(overrideCalc.totalAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                    ⚠️ Enter Quoted Rates (from your LOA/Allotment letter) to calculate the amount.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant='ghost' onClick={() => setOverrideForm(null)}>← Back</Button>
                  <Button variant='primary'
                    disabled={!overrideCalc || parseFloat(overrideForm.measuredQty) <= 0}
                    onClick={handleAddFromForm}>
                    Add to Bill ✓
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Selection panels — hidden when override form is open */}
          {!overrideForm && (
            <>
              {!addingMode && (
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

              {addingMode === 'sewer' && !selComp && (
                <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border, fontSize: 12, fontWeight: 700, color: C.text1 }}>Select Sewer Component</div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SEWER_COMPONENTS.map(comp => {
                      const boq = getBoq(comp.key)
                      return (
                        <button key={comp.key} onClick={() => setSelComp(comp.key)}
                          style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid ' + C.border, background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{comp.label}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: C.text3 }}>Est: {boq ? fmtCr(boq.est) : '—'}</div>
                            {boq?.quoted > 0 && <div style={{ fontSize: 10, color: C.green }}>Quoted rate saved ✓</div>}
                          </div>
                        </button>
                      )
                    })}
                    <Button variant='ghost' size='sm' onClick={() => setAddingMode(null)}>← Back</Button>
                  </div>
                </div>
              )}

              {addingMode === 'turnkey' && !selComp && (
                <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border, fontSize: 12, fontWeight: 700, color: C.text1 }}>Select Turnkey Component</div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {TURNKEY_COMPONENTS.map(comp => {
                      const boq = totals[comp.key]
                      return (
                        <button key={comp.key} onClick={() => setSelComp(comp.key)}
                          style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid ' + comp.color + '30', background: comp.color + '08', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: comp.color }}>{comp.label}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: C.text3 }}>Est: {boq ? fmtCr(boq.est) : '—'}</div>
                            {boq?.quoted > 0 && <div style={{ fontSize: 10, color: C.green }}>Quoted rate saved ✓</div>}
                          </div>
                        </button>
                      )
                    })}
                    <Button variant='ghost' size='sm' onClick={() => setAddingMode(null)}>← Back</Button>
                  </div>
                </div>
              )}

              {selComp && (
                <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border, fontSize: 12, fontWeight: 700, color: C.text1 }}>
                    Select Payment Milestone — {SEWER_COMPONENTS.find(c => c.key === selComp)?.label ?? TURNKEY_COMPONENTS.find(c => c.key === selComp)?.label}
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 290, overflowY: 'auto' }}>
                    {(SEWER_COMPONENTS.find(c => c.key === selComp)?.milestones ?? TURNKEY_COMPONENTS.find(c => c.key === selComp)?.milestones ?? []).map(m => (
                      <button key={m.code} onClick={() => handleMilestoneSelect(selComp, m.code)}
                        style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid ' + C.border, background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{m.name}</span>
                          <span style={{ fontSize: 10, color: C.text3, marginLeft: 8 }}>({m.pct}%)</span>
                          {m.sub.length > 0 && m.sub.map(s => (
                            <div key={s.name} style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>└ {s.name} @{s.pct}%</div>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: C.blue, flexShrink: 0, marginLeft: 12 }}>Select →</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: '1.5px solid ' + C.border }}>
                    <Button variant='ghost' size='sm' onClick={() => setSelComp(null)}>← Back</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STEP 3 */}
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
              <div key={li.id} style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#f8f9fc' : '#fff', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: C.text1 }}>{li.componentLabel} <span style={{ color: C.text3, fontWeight: 400 }}>— {li.workDone}</span></span>
                  <span style={{ fontWeight: 700, color: C.text1 }}>{fmtCr(li.workdoneAmount)}</span>
                </div>
                {li.subRows?.map((sr, si) => (
                  <div key={si} style={{ fontSize: 10, color: C.text3, marginLeft: 10 }}>└ {sr.breakup} → {fmtCr(sr.amount)}</div>
                ))}
              </div>
            ))}
            {[
              ['Gross Amount', fmtCr(gross), C.text1],
              ['Less: Previously Billed', '- ' + fmtCr(prev), C.text2],
              ['Net This Bill', fmtCr(net), C.blue],
              ['Add: GST (' + ded.gstPct + '%)', '+ ' + fmtCr(gst), C.amber],
              ['Less: TDS @ ' + ded.tdsPct + '%', '- ' + fmtCr(tds), C.red],
              ['Less: Security Deposit @ ' + ded.sdPct + '%', '- ' + fmtCr(sd), C.red],
            ].map(([l, v, col]: any) => (
              <div key={l} style={{ padding: '7px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.text3 }}>{l}</span>
                <span style={{ color: col, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ padding: '12px 16px', background: '#ecfdf5', borderTop: '1.5px solid #a7f3d0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text1 }}>NET AMOUNT PAYABLE</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.green }}>{fmtCr(netPay)}</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 */}
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
            Saved as Draft. Submit for approval from the RA Bills tab. Quoted rates saved to BOQ for future bills.
          </p>
        </div>
      )}
    </Modal>
  )
}
