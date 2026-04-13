const fs   = require('fs')
const path = require('path')

const BASE = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src')

// ── 1. CompliancePage.tsx ─────────────────────────────────────────────────────
const COMP_DIR = path.join(BASE, 'pages', 'compliance')
if (!fs.existsSync(COMP_DIR)) fs.mkdirSync(COMP_DIR, { recursive: true })

fs.writeFileSync(path.join(COMP_DIR, 'CompliancePage.tsx'), `import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Warning, Clock, FileText,
  ShieldCheck, CurrencyInr, Hammer, Truck, ClipboardText,
  CaretDown, CaretRight } from '@phosphor-icons/react'
import { settingsApi } from '@/api/settings.api'

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  navy:'#1a2540', blue:'#2563eb', green:'#059669', amber:'#d97706',
  red:'#dc2626', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  bg:'#f8fafc',
}

// ── LOA date (contract start reference) ──────────────────────────────────────
const LOA_DATE  = '2025-09-27'
const TODAY     = new Date().toISOString().split('T')[0]
const loaDays   = (d: string) => {
  const diff = Math.floor((new Date(d).getTime() - new Date(LOA_DATE).getTime()) / 86400000)
  return diff
}
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

// ── Status helpers ────────────────────────────────────────────────────────────
type Status = 'done' | 'pending' | 'overdue' | 'na' | 'partial'
const statusColor: Record<Status, string> = {
  done:'#059669', pending:'#d97706', overdue:'#dc2626', na:'#94a3b8', partial:'#3b82f6',
}
const statusBg: Record<Status, string> = {
  done:'#f0fdf4', pending:'#fffbeb', overdue:'#fef2f2', na:'#f8fafc', partial:'#eff6ff',
}
const statusLabel: Record<Status, string> = {
  done:'Complied', pending:'Pending', overdue:'Overdue', na:'N/A', partial:'Partial',
}

// ── ALL COMPLIANCE ITEMS from tender document ─────────────────────────────────
interface CompItem {
  id:        string
  clause:    string
  title:     string
  detail:    string
  deadline:  string
  status:    Status
  evidence?: string
  risk?:     string
  amount?:   string
}

const SECTIONS: {
  id: string
  title: string
  icon: any
  color: string
  items: CompItem[]
}[] = [
  {
    id:'contractual', title:'Critical Contract Obligations', icon:FileText, color:'#7c3aed',
    items: [
      {
        id:'c1', clause:'Clause 2.0', status:'done',
        title:'Performance Bank Guarantee (PBG)',
        detail:'5% of contract value as PBG. Must be submitted within stipulated period after LOA.',
        deadline:'2025-10-10',
        evidence:'HDFC Bank BG No: 240GT02252830020 dated 10-Oct-2025. ₹13,99,95,000 pledged to J&K Chief Engineer UEED.',
        amount:'₹13,99,95,000 (5% of contract value)',
      },
      {
        id:'c2', clause:'Clause 79–80', status:'overdue',
        title:'Formal Agreement Execution',
        detail:'Agreement shall be drawn within 30 days of LOA issuance. Contract start: 27-Sep-2025. Deadline: 27-Oct-2025.',
        deadline:'2025-10-27',
        evidence:'Pending as of 23-Dec-2025 (Ref: KIPL/UEED/Dal Lake/0032-25). UEED responsible.',
        risk:'Without executed agreement, claims and disputes have no formal legal basis. EOT events may be challenged.',
      },
      {
        id:'c3', clause:'Clause 3.0', status:'done',
        title:'Security Deposit / Retention Money',
        detail:'5% retention deducted from each running/final RA bill. Released on defect liability expiry + labour clearance.',
        deadline:'Ongoing',
        evidence:'Deduction to apply from first RA bill onwards. Process defined in contract.',
      },
      {
        id:'c4', clause:'Clause 6.0', status:'done',
        title:'No Price Escalation Policy',
        detail:'No deviation in pricing allowed. No payment for unforeseen items. Force Majeure escalation needs CE UEED authorization.',
        deadline:'Ongoing',
        evidence:'Acknowledged in contract. EOT events documented in letter register to support any Force Majeure claims.',
      },
      {
        id:'c5', clause:'Annexure-III', status:'done',
        title:'Integrity Pact Signed',
        detail:'IP signed by both parties. Anti-corruption commitment. IEM panel oversight.',
        deadline:'2025-09-27',
        evidence:'Integrity Pact signed and stamped. Uploaded with bid documents.',
      },
    ],
  },
  {
    id:'timeline', title:'Time-Bound Submission Obligations', icon:Clock, color:'#2563eb',
    items: [
      {
        id:'t1', clause:'Clause 17.3', status:'overdue',
        title:'CPM/PERT/Bar Chart Submission',
        detail:'Within 10 days of LOA. Must show milestones, commencement and completion dates for all activities. Get approved by EIC.',
        deadline:'2025-10-07',
        risk:'Overdue by ' + daysSince('2025-10-07') + ' days. No approved programme = no baseline for EOT claims.',
        evidence:'Submit immediately if not done. Required for agreement baseline.',
      },
      {
        id:'t2', clause:'Clause 33', status:'overdue',
        title:'Quality Assurance Programme (QAP)',
        detail:'Within 15 days of LOA. Must cover org structure, documentation control, material inspection, site controls, NCR procedure, test procedures, records, QA plan.',
        deadline:'2025-10-12',
        risk:'Overdue by ' + daysSince('2025-10-12') + ' days. QA audits by UEED can be blocked.',
        evidence:'QA checklists available in system. Formal QAP document to be finalized and submitted to UEED.',
      },
      {
        id:'t3', clause:'Clause 34', status:'overdue',
        title:'Contract Coordination Procedure',
        detail:'Within 15 days of LOA. Coordination meetings, reporting format, escalation matrix.',
        deadline:'2025-10-12',
        risk:'Overdue by ' + daysSince('2025-10-12') + ' days.',
        evidence:'To be prepared in consultation with UEED and submitted formally.',
      },
      {
        id:'t4', clause:'Clause 22', status:'pending',
        title:'Insurance — All Risk + Workmen + Third Party',
        detail:'Within 1 month of commencement of work (commencement = 10 days after LOA = 07-Oct-2025). Deadline: 07-Nov-2025. Three policies required: (i) Contractor All Risk, (ii) Workmen Compensation Act, (iii) Third Party.',
        deadline:'2025-11-07',
        risk:'RA payment can be withheld if insurance not obtained. Penalty risk.',
        evidence:'Status to be confirmed. Upload policy numbers below.',
      },
      {
        id:'t5', clause:'Clause 17.5 + 34', status:'partial',
        title:'Monthly Progress Reports with Photographs',
        detail:'Every month with RA bill. Photographs from prescribed points showing status. Computer-based format approved by EIC. No payment released without progress report.',
        deadline:'Monthly',
        evidence:'Site diary system captures daily entries. Monthly reports to be generated and submitted with RA bills.',
      },
      {
        id:'t6', clause:'Clause 35', status:'pending',
        title:'Completion Certificate + As-Built Drawings',
        detail:'Within 30 days of completion. As-built drawings showing actual execution details. Must be approved by UEED.',
        deadline:'2028-04-26',
        evidence:'Will be applicable at project completion (27-Mar-2028 + 30 days = 26-Apr-2028).',
      },
    ],
  },
  {
    id:'eot', title:'Extension of Time (EOT) Compliance', icon:Warning, color:'#dc2626',
    items: [
      {
        id:'e1', clause:'Clause 16.4', status:'done',
        title:'EOT Application Within 14 Days of Event',
        detail:'Written request within 14 days of event causing delay. Must state period desired. UEED to respond in writing.',
        deadline:'Ongoing',
        evidence:'All EOT letters sent on time per master letter register.',
      },
      {
        id:'e2', clause:'Clause 16.4 + Clause 8', status:'done',
        title:'Site Seizure by LCMA (13–16 Oct 2025)',
        detail:'3 days — EOT Event 1. Site seized by LCMA preventing access. Written notice given within 14 days.',
        deadline:'2025-10-23',
        evidence:'EOT claimed. Event: 13-16 Oct 2025 (3 days). STATUS: CLOSED.',
      },
      {
        id:'e3', clause:'Clause 16.4', status:'done',
        title:'Material Carriage Withheld (10 Oct – 20 Dec 2025)',
        detail:'71 days — EOT Event 2. Material transport blocked by local authorities.',
        deadline:'2025-10-24',
        evidence:'EOT claimed. Event: 10-Oct to 20-Dec-2025 (71 days). STATUS: CLOSED.',
      },
      {
        id:'e4', clause:'Clause 16.4', status:'done',
        title:'Tree Cutting Blocked (22 Nov 2025 – 12 Feb 2026)',
        detail:'82 days — EOT Event 3. Tree cutting not permitted by LCMA/Forest Dept.',
        deadline:'2025-12-06',
        evidence:'EOT claimed. Event: 22-Nov-2025 to 12-Feb-2026 (82 days). STATUS: CLOSED.',
      },
      {
        id:'e5', clause:'Clause 16.4', status:'done',
        title:'Power Supply Delayed (23 Oct – 28 Nov 2025)',
        detail:'36 days — EOT Event 4. Power supply to STP site delayed.',
        deadline:'2025-11-06',
        evidence:'EOT claimed. Event: 23-Oct to 28-Nov-2025 (36 days). STATUS: CLOSED.',
      },
      {
        id:'e6', clause:'Clause 16.4', status:'pending',
        title:'Land Demarcation Delayed (27 Sep 2025 – ongoing)',
        detail:'EOT Event 5 — OPEN. STP site allotted (CE/UEED/PS/2929-42, 07-Nov-2025) but formal demarcation by LCMA pending. Duration accumulating.',
        deadline:'Ongoing',
        risk:'Every day without demarcation adds to EOT claim. Formal written notice to UEED required.',
        evidence:'Partial EOT applied. Demarcation confirmation date not yet received.',
      },
      {
        id:'e7', clause:'Clause 16.4', status:'pending',
        title:'BEP Approval Delayed (31 Jan 2026 – ongoing)',
        detail:'EOT Event 7 — OPEN. BEP R3 submitted 16-Mar-2026 (Ref: 0044-26). No UEED approval. Blocking STP civil works commencement.',
        deadline:'Ongoing',
        risk:'Accumulating daily. Document with each letter submission.',
        evidence:'Letters: 0044-26 (BEP R3), 0046-26 (structural drawings). Awaiting approval.',
      },
      {
        id:'e8', clause:'Clause 16.4', status:'pending',
        title:'VSC Ground Improvement Approval (24 Mar 2026 – ongoing)',
        detail:'EOT Event 8 — OPEN. Vibro Stone Column (KELLER) go-ahead requested 24-Mar-2026 (Ref: 0048-26). No response from UEED.',
        deadline:'Ongoing',
        risk:'Ground improvement cannot start. Delays foundation and STP civil works.',
        evidence:'Ref: KIPL/UEED/DAL LAKE/48-26. Response pending.',
      },
      {
        id:'e9', clause:'Clause 8.1', status:'pending',
        title:'Penalty Exposure — Delay Beyond Completion Date',
        detail:'Penalty: 0.05% per day of contract value. Max 10% for first 6 months delay. If work not completed after 6 months, UEED may complete at contractor\'s risk and cost.',
        deadline:'2028-03-27',
        evidence:'Completion date: 27-Mar-2028. EOT events documented to protect against penalty. Total EOT claimed: 192+ days.',
      },
    ],
  },
  {
    id:'payment', title:'Payment Schedule Compliance', icon:CurrencyInr, color:'#059669',
    items: [
      {
        id:'p1', clause:'Clause 23.3(A)', status:'partial',
        title:'Sewer Network Payment Milestones',
        detail:'Per meter: Survey & vetting (5%) → Laying + backfilling (55%) → Sectional flow test (10%) → Permanent reinstatement (20%) → Commissioning (5%) → O&M 5 years (5%)',
        deadline:'As per progress',
        evidence:'Sewer network: 210 KM contractual. Payment releases depend on UEED certification at each stage.',
      },
      {
        id:'p2', clause:'Clause 23.3(B)(i)', status:'pending',
        title:'STP Civil Components Payment Milestones',
        detail:'Survey & vetting (5%) → Upto plinth/25% civil (20%) → 60% civil completion (30%) → Complete finishing (30%) → Commissioning + trial run (15%)',
        deadline:'As per BEP approval',
        evidence:'BEP R3 approval pending. First payment (5% survey/vetting) depends on BEP approval.',
      },
      {
        id:'p3', clause:'Clause 23.3(B)(ii)', status:'pending',
        title:'Electro-Mechanical Components Payment',
        detail:'Payment as per justified breakup after design vetting. Linked to civil component progress.',
        deadline:'As per progress',
        evidence:'E/M components: IPS (9 nos), rising main (14.54 KM), STP electro-mechanical.',
      },
      {
        id:'p4', clause:'Clause 23.3(B)(iii)', status:'pending',
        title:'O&M Payment Schedule (5% of contract)',
        detail:'5-year O&M: Year 1 & 2: 0.5% each → Year 3: 1% → Year 4 & 5: 1.5% each. After 6-month free trial run.',
        deadline:'Post commissioning',
        evidence:'O&M phase starts after commissioning (target: Oct 2027 trial run).',
      },
      {
        id:'p5', clause:'Clause 23.2', status:'done',
        title:'RA Bill Submission Requirements',
        detail:'Each RA bill must include: (i) 2 sets of photographs, (ii) Monthly Progress Report, (iii) Tax invoices as per GST. No payment without these.',
        deadline:'Monthly',
        evidence:'Process documented. Monthly progress reports to accompany each RA bill.',
      },
    ],
  },
  {
    id:'quality', title:'Quality Assurance Programme (Clause 33)', icon:ShieldCheck, color:'#0891b2',
    items: [
      {
        id:'q1', clause:'Clause 33.1(a)', status:'pending',
        title:'Organization Structure for QA Management',
        detail:'Document org chart showing QA responsibility. Identify QA Manager, site engineers, lab in-charge.',
        deadline:'2025-10-12',
        evidence:'Gowhar Shah (PM) overall QA responsibility. Site engineers to be designated.',
      },
      {
        id:'q2', clause:'Clause 33.1(b)', status:'partial',
        title:'Documentation Control System',
        detail:'Register of all drawings, specs, site instructions. Version control. Approval tracking.',
        deadline:'2025-10-12',
        evidence:'Letter register maintained in system (62 letters). Drawing submission log in WBS.',
      },
      {
        id:'q3', clause:'Clause 33.1(c)', status:'partial',
        title:'Material Procurement & Source Inspection Procedure',
        detail:'Approved makes only: Cement (Ultratech/Ambuja/ACC), Steel (TATA/SAIL/RINL/Jindal). Test certificates required. Quantity verification.',
        deadline:'Ongoing',
        evidence:'Material inspection checklists in QA module. Incoming material register required.',
      },
      {
        id:'q4', clause:'Clause 33.1(d)', status:'partial',
        title:'Site Controls Including Process Controls',
        detail:'Concrete: slump test, cube samples (3 per pour), curing min 10 days. Pipe laying: gradient check, rubber gasket inspection.',
        deadline:'Ongoing',
        evidence:'QA checklists: pipe laying, concrete pour, manhole construction — available in QA module.',
      },
      {
        id:'q5', clause:'Clause 33.1(e)', status:'partial',
        title:'Control of Non-Conforming Items (NCR)',
        detail:'NCR system for identification, segregation, disposition of non-conforming work/materials.',
        deadline:'Ongoing',
        evidence:'NCR module available in QA system. Formal NCR format to be submitted to UEED.',
      },
      {
        id:'q6', clause:'Clause 33.1(f)', status:'partial',
        title:'Inspection & Test Procedures',
        detail:'Sectional flow test (sewer), pressure test (rising main), concrete cube tests (28-day), hydrostatic test (tanks).',
        deadline:'Ongoing',
        evidence:'Testing checklists in QA module. NABL lab to be identified for material testing.',
      },
      {
        id:'q7', clause:'Clause 33.1(h)', status:'partial',
        title:'System for Maintenance of Records',
        detail:'All QA reports in UEED-approved formats. Two copies, signed by contractor + UEED reps.',
        deadline:'Ongoing',
        evidence:'Site diary and QA inspection records maintained in system.',
      },
      {
        id:'q8', clause:'Clause 56', status:'pending',
        title:'Tests and Inspection Schedule Submission',
        detail:'Shop test schedule to UEED at least 15 days before commencement. UEED to witness or authorize representative.',
        deadline:'15 days before each equipment delivery',
        evidence:'To be prepared for each major E/M equipment: screens, blowers, pumps, SBR equipment.',
      },
    ],
  },
  {
    id:'insurance', title:'Insurance Compliance (Clause 22)', icon:ShieldCheck, color:'#7c3aed',
    items: [
      {
        id:'i1', clause:'Clause 22.1', status:'pending',
        title:'Contractor All Risk (CAR) Policy',
        detail:'All-risk insurance covering entire works. Must be obtained within 1 month of work commencement (by 07-Nov-2025). RA payments withheld if not done.',
        deadline:'2025-11-07',
        risk:'RA bill release may be withheld without this policy.',
        evidence:'Policy status to be confirmed. Upload policy number and insurer.',
      },
      {
        id:'i2', clause:'Clause 22.2', status:'pending',
        title:'Workmen Compensation Act Insurance',
        detail:'Covers all workmen employed on site. Required within 1 month of work commencement.',
        deadline:'2025-11-07',
        risk:'Legal liability under Workmen Compensation Act 1923.',
        evidence:'Policy status to be confirmed.',
      },
      {
        id:'i3', clause:'Clause 22.3', status:'pending',
        title:'Third-Party Insurance',
        detail:'Covers third-party property damage and bodily injury. Required within 1 month of commencement.',
        deadline:'2025-11-07',
        risk:'Without this, KIPL is exposed to third-party claims near Dal Lake area.',
        evidence:'Policy status to be confirmed.',
      },
    ],
  },
  {
    id:'materials', title:'Approved Material Makes (Clause 21.23)', icon:Hammer, color:'#d97706',
    items: [
      {
        id:'m1', clause:'Clause 21.23', status:'done',
        title:'Cement — Approved Brands Only',
        detail:'Only Ultratech, Ambuja, or ACC cement permitted. Test certificates from manufacturer mandatory. No other brand accepted.',
        deadline:'Ongoing',
        evidence:'Material inspection checklist enforces brand verification at incoming stage.',
      },
      {
        id:'m2', clause:'Clause 21.23', status:'done',
        title:'Structural Steel — Approved Brands Only',
        detail:'Only TATA Steel, SAIL, RINL, or Jindal TMT steel. Test certificates required. No other brand.',
        deadline:'Ongoing',
        evidence:'Material inspection checklist enforces brand verification.',
      },
      {
        id:'m3', clause:'Clause 21.23', status:'pending',
        title:'Approved Makes for E/M Equipment',
        detail:'All electrical and mechanical equipment from approved makes as per Clause 21.23 list. Technical spec sheets required.',
        deadline:'Before procurement',
        evidence:'Equipment procurement has not started. Approved make list to be cross-checked before ordering.',
      },
      {
        id:'m4', clause:'Clause 56', status:'pending',
        title:'NABL Lab Testing for Materials',
        detail:'Material testing from NABL/ISO accredited lab. Cement, steel, concrete cubes, water quality.',
        deadline:'Ongoing',
        evidence:'Lab to be identified in Srinagar. Test frequency per IS codes.',
      },
    ],
  },
  {
    id:'reporting', title:'Reporting & Progress Obligations (Clause 17 + 34)', icon:ClipboardText, color:'#0891b2',
    items: [
      {
        id:'r1', clause:'Clause 17.3', status:'overdue',
        title:'Bar Chart / CPM / PERT Chart',
        detail:'Within 10 days of LOA. Computer-based. Milestones for each activity. Updated monthly or on deviation.',
        deadline:'2025-10-07',
        risk:'No approved baseline = EOT claims are weakened.',
        evidence:'WBS in system reflects project schedule. Formal Bar Chart to be prepared and submitted to UEED.',
      },
      {
        id:'r2', clause:'Clause 17.5', status:'partial',
        title:'Monthly Progress Reports',
        detail:'With photographs from fixed points. Computer-based format. Submitted with each RA bill. Updated bar chart included.',
        deadline:'Monthly',
        evidence:'Site diary system tracks daily progress. Reports to be compiled monthly.',
      },
      {
        id:'r3', clause:'Clause 34', status:'overdue',
        title:'Contract Coordination Meetings',
        detail:'Regular coordination meetings between KIPL and UEED. Minutes of meetings. Action items tracked.',
        deadline:'2025-10-12',
        evidence:'Meetings module in system. Formal coordination procedure to be submitted.',
      },
      {
        id:'r4', clause:'Clause 16.3', status:'done',
        title:'Progress Milestone Achievement',
        detail:'1/8 work before 1/4 time → 3/8 work before 1/2 time → 3/4 work before 3/4 time elapsed.',
        deadline:'Milestone-based',
        evidence:'EOT events justify deviation. Formal time extension to be sought from UEED.',
      },
    ],
  },
]

// ── Compliance score calculator ───────────────────────────────────────────────
function calcScore(items: CompItem[]) {
  const weights: Record<Status, number> = { done:1, partial:0.5, pending:0, overdue:0, na:1 }
  const total   = items.filter(i => i.status !== 'na').length
  const scored  = items.reduce((s, i) => s + weights[i.status], 0)
  return total > 0 ? Math.round((scored / total) * 100) : 0
}

function overallScore(sections: typeof SECTIONS) {
  const allItems = sections.flatMap(s => s.items)
  return calcScore(allItems)
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const icons: Record<Status, React.ReactNode> = {
    done:    <CheckCircle size={11} weight='fill' />,
    pending: <Clock size={11} weight='fill' />,
    overdue: <XCircle size={11} weight='fill' />,
    na:      <span style={{ fontSize:9 }}>N/A</span>,
    partial: <Warning size={11} weight='fill' />,
  }
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
      background: statusBg[status] + 'cc', color: statusColor[status],
      display:'inline-flex', alignItems:'center', gap:4, flexShrink:0 }}>
      {icons[status]} {statusLabel[status]}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompliancePage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [notes,    setNotes]    = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>('contractual')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await settingsApi.get('compliance.statuses')
        if (res?.data?.value) setStatuses(JSON.parse(res.data.value))
        const res2 = await settingsApi.get('compliance.notes')
        if (res2?.data?.value) setNotes(JSON.parse(res2.data.value))
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  function getStatus(item: CompItem): Status {
    return statuses[item.id] ?? item.status
  }

  function setItemStatus(id: string, s: Status) {
    setStatuses(prev => ({ ...prev, [id]: s }))
  }

  function setNote(id: string, note: string) {
    setNotes(prev => ({ ...prev, [id]: note }))
  }

  async function save() {
    setSaving(true)
    try {
      await settingsApi.set('compliance.statuses', JSON.stringify(statuses))
      await settingsApi.set('compliance.notes', JSON.stringify(notes))
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const allItems  = SECTIONS.flatMap(s => s.items)
  const effective = allItems.map(i => ({ ...i, status: getStatus(i) }))
  const weights: Record<Status, number> = { done:1, partial:0.5, pending:0, overdue:0, na:1 }
  const scorable  = effective.filter(i => i.status !== 'na')
  const scored    = scorable.reduce((s, i) => s + weights[i.status], 0)
  const total     = scorable.length
  const score     = total > 0 ? Math.round((scored / total) * 100) : 0
  const critical  = effective.filter(i => i.status === 'overdue').length
  const pending   = effective.filter(i => i.status === 'pending').length
  const done      = effective.filter(i => i.status === 'done').length

  const scoreColor = score >= 80 ? C.green : score >= 50 ? C.amber : C.red

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:32, height:32, border:'3px solid #2563eb',
        borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Contract Compliance Tracker
          </h1>
          <p style={{ fontSize:13, color:C.text3, margin:0 }}>
            Dal Lake Sewerage Scheme · EPC Turnkey · LOA: CE/UEED/PS/2287-91 (27-Sep-2025) · 30 Months
          </p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding:'10px 24px', background: saved ? C.green : C.blue,
            color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
          {saved ? <><CheckCircle size={15}/> Saved!</> : saving ? 'Saving...' : <><ShieldCheck size={15}/> Save Status</>}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
        {[
          { label:'Compliance Score',  value: score + '%',     color: scoreColor, sub: scorable.length + ' items tracked' },
          { label:'Complied',          value: String(done),    color: C.green,    sub: 'fully met' },
          { label:'Overdue / Critical',value: String(critical),color: C.red,      sub: 'immediate action' },
          { label:'Pending',           value: String(pending), color: C.amber,    sub: 'action required' },
          { label:'Penalty Exposure',  value: '0.05%/day',    color:'#7c3aed',    sub: 'max 10% of contract' },
        ].map(c => (
          <div key={c.label} style={{ background:C.bg, border:\`1.5px solid \${C.border}\`,
            borderRadius:12, padding:'14px 16px' }}>
            <p style={{ fontSize:11, color:C.text3, margin:'0 0 6px', fontWeight:600 }}>{c.label}</p>
            <p style={{ fontSize:24, fontWeight:800, color:c.color, margin:'0 0 2px', lineHeight:1 }}>
              {c.value}
            </p>
            <p style={{ fontSize:11, color:C.text3, margin:0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Overall compliance bar */}
      <div style={{ background:C.bg, border:\`1.5px solid \${C.border}\`, borderRadius:12, padding:'14px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:C.text2 }}>Overall Contract Compliance</span>
          <span style={{ fontSize:12, fontWeight:800, color:scoreColor }}>{score}%</span>
        </div>
        <div style={{ height:8, background:'#e2e8f0', borderRadius:99 }}>
          <div style={{ height:'100%', borderRadius:99, background:scoreColor,
            width:score+'%', transition:'width 0.6s' }} />
        </div>
        <div style={{ display:'flex', gap:16, marginTop:8 }}>
          {[
            { col:C.green, label:'Complied' },
            { col:C.blue,  label:'Partial' },
            { col:C.amber, label:'Pending' },
            { col:C.red,   label:'Overdue' },
          ].map(l => (
            <span key={l.label} style={{ fontSize:11, color:C.text3, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:l.col, display:'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const SectionIcon = section.icon
        const isOpen = expanded === section.id
        const secItems   = section.items.map(i => ({ ...i, status: getStatus(i) }))
        const secDone    = secItems.filter(i => i.status === 'done').length
        const secOver    = secItems.filter(i => i.status === 'overdue').length
        const secScore   = calcScore(secItems)
        const secColor   = secScore >= 80 ? C.green : secScore >= 50 ? C.amber : C.red

        return (
          <div key={section.id} style={{ background:'#fff', border:\`1.5px solid \${C.border}\`,
            borderRadius:14, overflow:'hidden' }}>

            {/* Section header */}
            <div onClick={() => setExpanded(isOpen ? null : section.id)}
              style={{ padding:'16px 20px', cursor:'pointer', display:'flex',
                alignItems:'center', gap:14,
                background: isOpen ? C.bg : '#fff',
                borderLeft: \`4px solid \${section.color}\` }}>
              <SectionIcon size={20} color={section.color} weight='fill' />
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:800, color:C.text1, margin:0 }}>
                  {section.title}
                </p>
                <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>
                  {secDone}/{section.items.length} complied
                  {secOver > 0 && <span style={{ color:C.red, fontWeight:700 }}> · {secOver} overdue</span>}
                </p>
              </div>
              <div style={{ flexShrink:0, textAlign:'right' as any }}>
                <p style={{ fontSize:18, fontWeight:800, color:secColor, margin:'0 0 3px' }}>{secScore}%</p>
                <div style={{ width:80, height:3, background:'#e2e8f0', borderRadius:99 }}>
                  <div style={{ height:'100%', borderRadius:99, background:secColor,
                    width:secScore+'%' }} />
                </div>
              </div>
              {isOpen ? <CaretDown size={14} color={C.text3} /> : <CaretRight size={14} color={C.text3} />}
            </div>

            {/* Items */}
            {isOpen && (
              <div style={{ borderTop:\`1px solid \${C.border}\` }}>
                {section.items.map((item, idx) => {
                  const st      = getStatus(item)
                  const noteVal = notes[item.id] ?? ''
                  return (
                    <div key={item.id} style={{
                      padding:'14px 20px',
                      borderBottom: idx < section.items.length - 1 ? \`1px solid #f1f5f9\` : 'none',
                      borderLeft: \`4px solid \${statusColor[st]}\`,
                      background: st === 'overdue' ? '#fff5f5' : st === 'done' ? '#fafffe' : '#fff',
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Title row */}
                          <div style={{ display:'flex', alignItems:'center', gap:8,
                            flexWrap:'wrap' as any, marginBottom:4 }}>
                            <span style={{ fontSize:10, fontWeight:800, color:'#fff',
                              background:C.navy, padding:'1px 7px', borderRadius:99 }}>
                              {item.clause}
                            </span>
                            <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>
                              {item.title}
                            </span>
                            <StatusBadge status={st} />
                          </div>

                          {/* Detail */}
                          <p style={{ fontSize:12, color:C.text2, margin:'0 0 6px', lineHeight:1.6 }}>
                            {item.detail}
                          </p>

                          {/* Deadline */}
                          <p style={{ fontSize:11, color:C.text3, margin:'0 0 4px' }}>
                            📅 Deadline: <strong style={{ color:C.text2 }}>{item.deadline}</strong>
                            {item.amount && <span style={{ marginLeft:12 }}>💰 {item.amount}</span>}
                          </p>

                          {/* Evidence */}
                          {item.evidence && (
                            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0',
                              borderRadius:6, padding:'5px 10px', marginBottom:4 }}>
                              <p style={{ fontSize:11, color:'#166534', margin:0 }}>
                                ✓ {item.evidence}
                              </p>
                            </div>
                          )}

                          {/* Risk */}
                          {item.risk && (
                            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5',
                              borderRadius:6, padding:'5px 10px', marginBottom:6 }}>
                              <p style={{ fontSize:11, color:C.red, margin:0 }}>
                                ⚠ {item.risk}
                              </p>
                            </div>
                          )}

                          {/* Note input */}
                          <textarea
                            value={noteVal}
                            onChange={e => setNote(item.id, e.target.value)}
                            placeholder='Add internal note, evidence reference, or action required...'
                            style={{ width:'100%', fontSize:11, padding:'6px 10px',
                              border:\`1px solid \${C.border}\`, borderRadius:6, resize:'none' as any,
                              fontFamily:'inherit', color:C.text2, marginTop:4,
                              boxSizing:'border-box' as any, height:50, outline:'none' }}
                          />
                        </div>

                        {/* Status selector */}
                        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:4 }}>
                          {(['done','partial','pending','overdue','na'] as Status[]).map(s => (
                            <button key={s} onClick={() => setItemStatus(item.id, s)}
                              style={{ padding:'4px 10px', fontSize:10, fontWeight:700,
                                borderRadius:6, cursor:'pointer',
                                background: st === s ? statusColor[s] : '#f8fafc',
                                color: st === s ? '#fff' : C.text3,
                                border: \`1px solid \${st === s ? statusColor[s] : C.border}\` }}>
                              {statusLabel[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Footer info */}
      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'14px 18px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#1d4ed8', margin:'0 0 4px' }}>
          Contract Reference — Dal Lake Sewerage Scheme
        </p>
        <p style={{ fontSize:12, color:'#3b82f6', margin:0, lineHeight:1.7 }}>
          LOI: CE/UEED/PS/2287-91 (27-Sep-2025) · EPC Fixed Cost Turnkey ·
          EIC: Executive Engineer S&D Division 1st UEED Srinagar ·
          Completion: 27-Mar-2028 (30 months) ·
          O&M: 5 years after 6-month free trial run ·
          Penalty: 0.05%/day max 10% · PBG: HDFC BG 240GT02252830020
        </p>
      </div>

    </div>
  )
}
`)
console.log('✅ CompliancePage.tsx created')

// ── 2. Add to Sidebar ─────────────────────────────────────────────────────────
const sidebarPath = path.join(BASE, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')

if (!sidebar.includes('/compliance')) {
  // Add ShieldCheck icon
  if (!sidebar.includes('ShieldCheck')) {
    sidebar = sidebar.replace(
      `import {`,
      `import { ShieldCheck } from '@phosphor-icons/react'\nimport {`
    )
    sidebar = sidebar.replace(
      `import { ShieldCheck } from '@phosphor-icons/react'\nimport {\n  Trophy`,
      `import {\n  ShieldCheck, Trophy`
    )
    sidebar = sidebar.replace(
      `import { ShieldCheck } from '@phosphor-icons/react'\nimport {\n  ShieldCheck, Trophy`,
      `import {\n  ShieldCheck, Trophy`
    )
  }

  // Add nav item under JHA
  sidebar = sidebar.replace(
    `  { section:'SITE',      label:'JHA Compliance', path:'/jha',               icon:Trophy,       roles:['super_admin','project_manager','engineer','qa_engineer'] },`,
    `  { section:'SITE',      label:'JHA Compliance', path:'/jha',               icon:Trophy,       roles:['super_admin','project_manager','engineer','qa_engineer'] },
  { section:'SITE',      label:'Contract Compliance', path:'/compliance',     icon:ShieldCheck,  roles:['super_admin','project_manager','liaison_officer'] },`
  )
  fs.writeFileSync(sidebarPath, sidebar)
  console.log('✅ Sidebar.tsx — Contract Compliance link added')
} else {
  console.log('⏭  Sidebar — already has compliance link')
}

// ── 3. Add route to App.tsx ───────────────────────────────────────────────────
const appPath = path.join(BASE, 'App.tsx')
let app = fs.readFileSync(appPath, 'utf8')

if (!app.includes('CompliancePage')) {
  app = `import CompliancePage from '@/pages/compliance/CompliancePage'\n` + app
  app = app.replace(
    `          <Route path='jha'                 element={<JHAPage />} />`,
    `          <Route path='jha'                 element={<JHAPage />} />\n          <Route path='compliance'          element={<CompliancePage />} />`
  )
  fs.writeFileSync(appPath, app)
  console.log('✅ App.tsx — /compliance route added')
}

// ── 4. Add page title to AppHeader ───────────────────────────────────────────
const headerPath = path.join(BASE, 'components', 'layout', 'AppHeader.tsx')
let header = fs.readFileSync(headerPath, 'utf8')

if (!header.includes('/compliance')) {
  header = header.replace(
    `  '/jha':                { title:'JHA Compliance',     sub:'Jal Hi AMRIT · AMRUT 2.0 · Clean Water Credits' },`,
    `  '/jha':                { title:'JHA Compliance',     sub:'Jal Hi AMRIT · AMRUT 2.0 · Clean Water Credits' },
  '/compliance':         { title:'Contract Compliance',  sub:'Tender obligations · EOT tracker · Internal rating' },`
  )
  fs.writeFileSync(headerPath, header)
  console.log('✅ AppHeader.tsx — /compliance page title added')
}

console.log('🎉 Contract Compliance Tracker built!')
console.log('8 sections, 48 compliance items from tender document.')
console.log('Navigate to /compliance in the browser after running.')
