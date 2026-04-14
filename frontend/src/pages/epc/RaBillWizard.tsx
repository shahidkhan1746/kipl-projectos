/**
 * RaBillWizard.tsx
 * Milestone-based RA Bill creation wizard for KIPL ProjectOS
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
import { Spinner } from '@/components/ui/Spinner'
import { Receipt, Plus, Trash, FilePdf, CheckCircle } from '@phosphor-icons/react'

const C = {
  card: '#fff', border: '#e2e8f0', bg: '#f0f2f5',
  text1: '#0f172a', text2: '#475569', text3: '#94a3b8',
  blue: '#2563eb', green: '#059669', amber: '#d97706',
  red: '#dc2626', navy: '#1a2540',
}

// ── Payment schedule from tender Clause 23.3 ────────────────
const MILESTONES: Record<string, { code: string; name: string; pct: number }[]> = {
  sewer_network: [
    { code: 'S1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'S1a', name: '  └ Survey (@3% of item)', pct: 3 },
    { code: 'S1b', name: '  └ Vetting of Design (@2% of item)', pct: 2 },
    { code: 'S2', name: 'Providing & Laying Pipes + Backfilling + Temp Reinstatement', pct: 55 },
    { code: 'S3', name: 'Sectional Flow Testing', pct: 10 },
    { code: 'S4', name: 'Permanent Road Reinstatement', pct: 20 },
    { code: 'S5', name: 'Testing, Commissioning & Trial Run', pct: 5 },
    { code: 'S6', name: 'O&M for 5 Years', pct: 5 },
  ],
  civil: [
    { code: 'C1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'C1a', name: '  └ Survey (@3% of item)', pct: 3 },
    { code: 'C1b', name: '  └ Vetting of Design (@2% of item)', pct: 2 },
    { code: 'C2', name: 'Building to Plinth / 25% Civil Completion', pct: 20 },
    { code: 'C3', name: '60% Completion of Civil Structure', pct: 30 },
    { code: 'C4', name: 'Complete Finishing as per Approved Drawings', pct: 30 },
    { code: 'C5', name: 'Testing & Commissioning of STP/IPS', pct: 5 },
    { code: 'C6', name: 'After Issuance of Completion Certificate by UEED', pct: 5 },
    { code: 'C7', name: 'O&M for 5 Years', pct: 5 },
  ],
  em: [
    { code: 'E1', name: 'Delivery of E&M Components at Site (after TPI, QAP approved)', pct: 45 },
    { code: 'E2', name: 'Installation, Erection & Testing at Site', pct: 20 },
    { code: 'E3', name: 'Commissioning of E&M Components at Site', pct: 10 },
    { code: 'E4', name: 'Successful Completion of 6-Month Free Trial Run', pct: 10 },
    { code: 'E5', name: 'Successful Completion of Defect Liability Period', pct: 10 },
    { code: 'E6', name: 'O&M for 5 Years', pct: 5 },
  ],
}

// Map BOQ category → milestone schedule type
const CAT_TO_MILESTONE: Record<string, keyof typeof MILESTONES> = {
  sewer_network: 'sewer_network',
  road_work: 'sewer_network',
  ips_civil: 'civil',
  stp_civil: 'civil',
  rising_main: 'civil',
  ips_em: 'em',
  stp_em: 'em',
}

const CAT_LABELS: Record<string, string> = {
  sewer_network: 'Sewer Network',
  ips_civil: 'IPS — Civil',
  ips_em: 'IPS — E&M',
  stp_civil: 'STP — Civil',
  stp_em: 'STP — E&M',
  rising_main: 'Rising Mains',
  road_work: 'Road Works',
  other: 'Other',
}

const CAT_COLORS: Record<string, string> = {
  sewer_network: '#2563eb',
  ips_civil: '#059669',
  ips_em: '#7c3aed',
  stp_civil: '#d97706',
  stp_em: '#dc2626',
  rising_main: '#0891b2',
  road_work: '#64748b',
  other: '#94a3b8',
}

// Display names for the RA Bill table
const CAT_DESCRIPTION: Record<string, string> = {
  sewer_network: 'Laying of Sewer & Appurtenant works (Survey, Design, Providing & Laying of Sewerage network)',
  ips_civil: 'For IPS — Civil Works (Turnkey items)',
  ips_em: 'For IPS — Electro-Mechanical Works (Turnkey items)',
  stp_civil: 'For STP/MPS — Civil Works (Turnkey items)',
  stp_em: 'For STP/MPS — Electro-Mechanical Works (Turnkey items)',
  rising_main: 'Rising Mains (Turnkey items)',
  road_work: 'Road Reinstatement Works',
  other: 'Other Works',
}

function fmtCr(n: number) { return (n / 1e7).toFixed(5) }
function fmtCrDisplay(n: number) { return '₹' + (n / 1e7).toFixed(2) + ' Cr' }
function fmtLac(n: number) { return '₹' + (n / 1e5).toFixed(2) + ' L' }

interface LineItem {
  id: string
  category: string
  description: string
  milestoneCode: string
  milestoneName: string
  estimatedCost: number   // total estimated amount for this category
  quotedRates: number     // total quoted/measured amount
  estimatedQtyKm: number  // estimated qty in KM (for linear items)
  measuredQtyKm: number   // measured qty in KM
  paymentPct: number      // milestone % from schedule
  billToRelease: number   // actual % to release (paymentPct × measured/estimated for linear)
  workdoneAmount: number  // calculated amount in ₹
  remarks: string
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

  // Header state
  const [header, setHeader] = useState({
    billNo: nextBillNo ?? 'RA-1',
    allotmentNo: 'CE/UEED/PS/01 OF 2025-26',
    billDate: new Date().toISOString().split('T')[0],
    periodFrom: '',
    periodTo: '',
  })

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [addingCat, setAddingCat] = useState<string | null>(null)
  const [pendingMilestone, setPendingMilestone] = useState('')

  // Deductions state
  const [deductions, setDeductions] = useState({
    prevBilled: '0',
    gstPct: '0',
    tdsPct: '2',
    securityDepositPct: '5',
    remarks: '',
  })

  // Fetch BOQ data
  const { data: boqItems } = useQuery({
    queryKey: ['boq-items', activeProjectId],
    queryFn: () => epcApi.boqItems(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId && open,
  })

  // Group BOQ items by category with totals
  const categoryTotals = useMemo(() => {
    if (!boqItems) return {}
    const groups: Record<string, {
      estimatedAmount: number
      quotedAmount: number
      estimatedQty: number
      measuredQty: number
      unit: string
      items: any[]
    }> = {}
    for (const item of boqItems) {
      if (!groups[item.category]) {
        groups[item.category] = {
          estimatedAmount: 0, quotedAmount: 0,
          estimatedQty: 0, measuredQty: 0,
          unit: item.unit, items: [],
        }
      }
      groups[item.category].estimatedAmount += Number(item.estimatedAmount)
      groups[item.category].quotedAmount += Number(item.quotedAmount || item.estimatedAmount)
      groups[item.category].estimatedQty += Number(item.estimatedQty)
      groups[item.category].measuredQty += Number(item.measuredQty)
      groups[item.category].items.push(item)
    }
    return groups
  }, [boqItems])

  // Calculate gross amount from line items
  const grossAmount = lineItems.reduce((s, li) => s + li.workdoneAmount, 0)
  const prevBilled = parseFloat(deductions.prevBilled) || 0
  const netThisBill = grossAmount - prevBilled
  const gstAmt = netThisBill * (parseFloat(deductions.gstPct) || 0) / 100
  const tdsAmt = (netThisBill + gstAmt) * (parseFloat(deductions.tdsPct) || 2) / 100
  const sdAmt = netThisBill * (parseFloat(deductions.securityDepositPct) || 5) / 100
  const netPayable = netThisBill + gstAmt - tdsAmt - sdAmt

  // Add line item
  function handleAddLineItem(category: string) {
    if (!pendingMilestone) return
    const grp = categoryTotals[category]
    if (!grp) return

    const scheduleType = CAT_TO_MILESTONE[category] ?? 'civil'
    const milestones = MILESTONES[scheduleType]
    const milestone = milestones.find(m => m.code === pendingMilestone)
    if (!milestone) return

    // For linear items (M unit), pro-rate by measured/estimated qty
    // For LS items, pay full milestone % when claimed
    const isLinear = grp.unit === 'M' || grp.unit === 'Nos' || grp.unit === 'Cum'
    const measuredRatio = isLinear && grp.estimatedQty > 0
      ? Math.min(grp.measuredQty / grp.estimatedQty, 1)
      : 1

    const paymentPct = milestone.pct
    // Quoted rates (use estimated if quoted not set)
    const quotedAmount = grp.quotedAmount > 0 ? grp.quotedAmount : grp.estimatedAmount
    const workdoneAmount = quotedAmount * measuredRatio * paymentPct / 100
    const billToRelease = measuredRatio * paymentPct

    // Convert qty to km for display if unit is M
    const estKm = grp.unit === 'M' ? grp.estimatedQty / 1000 : grp.estimatedQty
    const measKm = grp.unit === 'M' ? grp.measuredQty / 1000 : grp.measuredQty

    const newItem: LineItem = {
      id: Date.now().toString(),
      category,
      description: CAT_DESCRIPTION[category] ?? CAT_LABELS[category],
      milestoneCode: milestone.code,
      milestoneName: milestone.name.trim(),
      estimatedCost: grp.estimatedAmount,
      quotedRates: quotedAmount,
      estimatedQtyKm: estKm,
      measuredQtyKm: measKm,
      paymentPct,
      billToRelease,
      workdoneAmount,
      remarks: '',
    }

    setLineItems(prev => [...prev, newItem])
    setAddingCat(null)
    setPendingMilestone('')
  }

  function removeLineItem(id: string) {
    setLineItems(prev => prev.filter(li => li.id !== id))
  }

  // Create RA Bill
  const createM = useMutation({
    mutationFn: () => epcApi.createRaBill({
      projectId: activeProjectId,
      billNo: header.billNo,
      allotmentNo: header.allotmentNo,
      billDate: header.billDate,
      periodFrom: header.periodFrom,
      periodTo: header.periodTo,
      lineItems: lineItems.map(li => ({
        category: li.category,
        description: li.description,
        milestoneCode: li.milestoneCode,
        milestoneName: li.milestoneName,
        estimatedCost: li.estimatedCost,
        quotedRates: li.quotedRates,
        estimatedQtyKm: li.estimatedQtyKm,
        measuredQtyKm: li.measuredQtyKm,
        paymentPct: li.paymentPct,
        billToRelease: li.billToRelease,
        workdoneAmount: li.workdoneAmount,
      })),
      grossAmount,
      prevBilled,
      gstPct: parseFloat(deductions.gstPct) || 0,
      tdsPct: parseFloat(deductions.tdsPct) || 2,
      securityDepositPct: parseFloat(deductions.securityDepositPct) || 5,
      gstAmount: gstAmt,
      tdsAmount: tdsAmt,
      securityDepositAmount: sdAmt,
      netThisBill,
      netPayable,
      remarks: deductions.remarks,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ra-bills'] })
      setCreatedBill(res.data)
      setStep(4)
    },
  })

  async function handleDownloadPdf() {
    if (!createdBill) return
    setPdfLoading(true)
    try {
      await pdfApi.raBill({ bill: createdBill })
    } finally {
      setPdfLoading(false)
    }
  }

  function handleClose() {
    setStep(1)
    setLineItems([])
    setCreatedBill(null)
    setAddingCat(null)
    setPendingMilestone('')
    onClose()
  }

  const steps = ['Bill Header', 'Line Items', 'Deductions & Preview', 'Done']

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`New Running Account Bill — Step ${step}/4: ${steps[step - 1]}`}
      width={800}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant='ghost' onClick={handleClose}>Cancel</Button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && step < 4 && (
              <Button variant='secondary' onClick={() => setStep(s => s - 1)}>← Back</Button>
            )}
            {step === 1 && (
              <Button variant='primary' onClick={() => setStep(2)}
                disabled={!header.billNo || !header.billDate}>
                Next: Add Line Items →
              </Button>
            )}
            {step === 2 && (
              <Button variant='primary' onClick={() => setStep(3)}
                disabled={lineItems.length === 0}>
                Next: Deductions & Preview →
              </Button>
            )}
            {step === 3 && (
              <Button variant='primary' loading={createM.isPending}
                onClick={() => createM.mutate()}
                disabled={netPayable <= 0}>
                Create Bill ✓
              </Button>
            )}
            {step === 4 && (
              <Button variant='primary' icon={<FilePdf size={15} />}
                loading={pdfLoading} onClick={handleDownloadPdf}>
                Download PDF
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
              background: step > i + 1 ? C.green : step === i + 1 ? C.blue : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              color: step >= i + 1 ? '#fff' : C.text3,
            }}>{step > i + 1 ? '✓' : i + 1}</div>
            <div style={{ fontSize: 10, color: step === i + 1 ? C.blue : C.text3, fontWeight: step === i + 1 ? 700 : 400 }}>{s}</div>
            {i < steps.length - 1 && (
              <div style={{ position: 'relative', top: -20, height: 2, background: step > i + 1 ? C.green : '#e2e8f0', margin: '0 14px' }} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: BILL HEADER ─────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
            <strong>Package:</strong> Survey, Design & Execution of Sewerage Scheme for Dal Lake Uncovered Areas — EPC Fixed-Cost Turnkey Basis
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label='Bill No.' value={header.billNo}
              onChange={e => setHeader(h => ({ ...h, billNo: e.target.value }))} />
            <Input label='Bill Date' type='date' value={header.billDate}
              onChange={e => setHeader(h => ({ ...h, billDate: e.target.value }))} />
          </div>
          <Input label='Allotment No.' value={header.allotmentNo}
            onChange={e => setHeader(h => ({ ...h, allotmentNo: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label='Period From' type='date' value={header.periodFrom}
              onChange={e => setHeader(h => ({ ...h, periodFrom: e.target.value }))} />
            <Input label='Period To' type='date' value={header.periodTo}
              onChange={e => setHeader(h => ({ ...h, periodTo: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 14px', background: '#f8f9fc', borderRadius: 8, border: '1px solid ' + C.border }}>
            <div><span style={{ fontSize: 11, color: C.text3 }}>Client: </span><span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>J&K UEED Srinagar</span></div>
            <div><span style={{ fontSize: 11, color: C.text3 }}>Contractor: </span><span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>M/S Khilari Infrastructure Pvt. Ltd.</span></div>
          </div>
        </div>
      )}

      {/* ── STEP 2: LINE ITEMS ──────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
            Add line items by selecting a BOQ category and payment milestone. Amounts are auto-calculated from the tender payment schedule.
          </p>

          {/* Existing line items */}
          {lineItems.length > 0 && (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: C.navy, padding: '10px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Line Items Added</span>
              </div>
              {lineItems.map((li, i) => (
                <div key={li.id} style={{
                  padding: '12px 16px', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: i % 2 === 0 ? '#f8f9fc' : '#fff'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 999,
                        background: (CAT_COLORS[li.category] ?? '#64748b') + '15',
                        color: CAT_COLORS[li.category] ?? '#64748b',
                        border: '1px solid ' + (CAT_COLORS[li.category] ?? '#64748b') + '30',
                        fontWeight: 700,
                      }}>{CAT_LABELS[li.category]}</span>
                      <span style={{ fontSize: 11, color: C.text2 }}>{li.milestoneName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 11, color: C.text3 }}>
                      <span>Quoted: {fmtCr(li.quotedRates)} Cr</span>
                      <span>Measured: {li.measuredQtyKm.toFixed(3)} {li.estimatedQtyKm > 100 ? 'km' : 'nos/ls'}</span>
                      <span>Milestone: {li.paymentPct}%</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{fmtCrDisplay(li.workdoneAmount)}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{li.billToRelease.toFixed(2)}% of quoted</div>
                  </div>
                  <button onClick={() => removeLineItem(li.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, padding: 4 }}>
                    <Trash size={14} />
                  </button>
                </div>
              ))}
              <div style={{ padding: '10px 16px', background: '#ecfdf5', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>Gross Amount</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.green }}>{fmtCrDisplay(grossAmount)}</span>
              </div>
            </div>
          )}

          {/* Add new line item */}
          <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>Add Line Item</span>
            </div>

            {/* Category selection */}
            {!addingCat ? (
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 12, color: C.text3, margin: '0 0 12px' }}>Select BOQ category:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {Object.entries(categoryTotals).map(([cat, grp]) => {
                    const alreadyAdded = lineItems.filter(li => li.category === cat).length
                    const color = CAT_COLORS[cat] ?? '#64748b'
                    return (
                      <button key={cat} onClick={() => { setAddingCat(cat); setPendingMilestone('') }}
                        style={{
                          padding: '12px 14px', borderRadius: 8, border: '1.5px solid ' + color + '40',
                          background: color + '08', cursor: 'pointer', textAlign: 'left',
                        }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{CAT_LABELS[cat]}</div>
                        <div style={{ fontSize: 10, color: C.text3 }}>
                          Estimated: {fmtCr(grp.estimatedAmount)} Cr
                          {grp.measuredQty > 0 && <span style={{ color: C.green }}> · Measured: {grp.unit === 'M' ? (grp.measuredQty / 1000).toFixed(2) + ' km' : grp.measuredQty.toLocaleString('en-IN')}</span>}
                        </div>
                        {alreadyAdded > 0 && <div style={{ fontSize: 10, color: C.amber, marginTop: 2 }}>{alreadyAdded} milestone(s) added</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 999,
                    background: (CAT_COLORS[addingCat] ?? '#64748b') + '15',
                    color: CAT_COLORS[addingCat] ?? '#64748b',
                    border: '1px solid ' + (CAT_COLORS[addingCat] ?? '#64748b') + '30',
                    fontWeight: 700,
                  }}>{CAT_LABELS[addingCat]}</span>
                  <span style={{ fontSize: 12, color: C.text3 }}>Select milestone being claimed:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflowY: 'auto' }}>
                  {(MILESTONES[CAT_TO_MILESTONE[addingCat] ?? 'civil'] ?? []).map(m => {
                    const grp = categoryTotals[addingCat]
                    if (!grp) return null
                    const isLinear = grp.unit === 'M' || grp.unit === 'Nos' || grp.unit === 'Cum'
                    const measuredRatio = isLinear && grp.estimatedQty > 0
                      ? Math.min(grp.measuredQty / grp.estimatedQty, 1) : 1
                    const quotedAmt = grp.quotedAmount > 0 ? grp.quotedAmount : grp.estimatedAmount
                    const calcAmt = quotedAmt * measuredRatio * m.pct / 100
                    const isIndented = m.name.startsWith('  └')
                    return (
                      <button key={m.code}
                        onClick={() => setPendingMilestone(m.code)}
                        style={{
                          padding: isIndented ? '8px 14px 8px 28px' : '10px 14px',
                          borderRadius: 8, border: '1.5px solid',
                          borderColor: pendingMilestone === m.code ? C.blue : C.border,
                          background: pendingMilestone === m.code ? '#eff6ff' : '#fff',
                          cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: pendingMilestone === m.code ? C.blue : C.text1 }}>
                            {m.name.trim()}
                          </span>
                          <span style={{ fontSize: 10, color: C.text3, marginLeft: 8 }}>({m.pct}%)</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.green, flexShrink: 0, marginLeft: 12 }}>
                          {fmtCrDisplay(calcAmt)}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <Button variant='ghost' size='sm' onClick={() => { setAddingCat(null); setPendingMilestone('') }}>← Back</Button>
                  <Button variant='primary' size='sm' disabled={!pendingMilestone}
                    onClick={() => handleAddLineItem(addingCat)}>
                    Add to Bill
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: DEDUCTIONS & PREVIEW ────────────────────── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Deduction inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Input label='Previously Billed (₹)' type='number' value={deductions.prevBilled}
              onChange={e => setDeductions(d => ({ ...d, prevBilled: e.target.value }))} />
            <Input label='GST %' type='number' value={deductions.gstPct}
              onChange={e => setDeductions(d => ({ ...d, gstPct: e.target.value }))} />
            <Input label='TDS %' type='number' value={deductions.tdsPct}
              onChange={e => setDeductions(d => ({ ...d, tdsPct: e.target.value }))} />
            <Input label='Security Deposit %' type='number' value={deductions.securityDepositPct}
              onChange={e => setDeductions(d => ({ ...d, securityDepositPct: e.target.value }))} />
          </div>
          <Input label='Remarks' value={deductions.remarks}
            onChange={e => setDeductions(d => ({ ...d, remarks: e.target.value }))}
            placeholder='Optional remarks for this bill' />

          {/* Line items summary */}
          <div style={{ border: '1.5px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: C.navy, padding: '10px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill Summary</span>
            </div>
            {lineItems.map((li, i) => (
              <div key={li.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: i % 2 === 0 ? '#f8f9fc' : '#fff' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: CAT_COLORS[li.category] ?? C.text2 }}>{CAT_LABELS[li.category]}</span>
                  <span style={{ fontSize: 11, color: C.text3, marginLeft: 8 }}>— {li.milestoneName}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>{fmtCrDisplay(li.workdoneAmount)}</span>
              </div>
            ))}
          </div>

          {/* Bill calculation */}
          <div style={{ background: '#f8f9fc', border: '1.5px solid ' + C.border, borderRadius: 10, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, margin: '0 0 12px' }}>Final Bill Calculation</p>
            {[
              ['Gross Amount (Executed Work)', fmtCrDisplay(grossAmount), C.text1, false],
              ['Less: Previously Billed', '- ' + fmtCrDisplay(prevBilled), C.text2, false],
              ['Net Amount This Bill', fmtCrDisplay(netThisBill), C.blue, false],
              ['Add: GST (' + deductions.gstPct + '%)', '+ ' + fmtCrDisplay(gstAmt), C.amber, false],
              ['Less: TDS @ ' + deductions.tdsPct + '%', '- ' + fmtCrDisplay(tdsAmt), C.red, false],
              ['Less: Security Deposit @ ' + deductions.securityDepositPct + '%', '- ' + fmtCrDisplay(sdAmt), C.red, false],
            ].map(([l, v, c, bold]: any) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: C.text3 }}>{l}</span>
                <span style={{ color: c, fontWeight: bold ? 800 : 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '1.5px solid ' + C.border, marginTop: 10, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text1 }}>NET AMOUNT PAYABLE</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.green }}>{fmtCrDisplay(netPayable)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: DONE ───────────────────────────────────── */}
      {step === 4 && createdBill && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0' }}>
          <CheckCircle size={56} color={C.green} weight='fill' />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text1, margin: '0 0 6px' }}>
              Bill {createdBill.billNo} Created!
            </h2>
            <p style={{ fontSize: 14, color: C.text2, margin: 0 }}>
              Net Payable: <strong style={{ color: C.green }}>{fmtCrDisplay(Number(createdBill.netPayable))}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant='primary' icon={<FilePdf size={16} />} loading={pdfLoading} onClick={handleDownloadPdf}>
              Download PDF
            </Button>
            <Button variant='secondary' onClick={handleClose}>Close</Button>
          </div>
          <p style={{ fontSize: 11, color: C.text3, textAlign: 'center', maxWidth: 400 }}>
            The bill has been saved as Draft. You can submit it for approval from the RA Bills tab.
          </p>
        </div>
      )}
    </Modal>
  )
}
