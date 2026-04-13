/**
 * KIPL ProjectOS — Master Letter Register Seed Script
 * Seeds all 62 letters from the correspondence register
 * Includes delay attribution tagging for EOT evidence
 */

const PROJECT_ID  = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const API_BASE    = 'http://localhost:3000'
const LOGIN_EMAIL = 'admin@kipl.in'
const LOGIN_PASS  = 'password'

// ── All 62 letters extracted from Master Letter Register ─────────────────────
const LETTERS = [
  // ── Sep 2025 — Project Start ──────────────────────────────────────────────
  {
    refNo: 'KIPL/Srinagar Dal Lake/2025-26/004',
    date: '2025-09-20', from: 'Khilari Infrastructure (HO)', to: 'CE (UEED)',
    subject: 'Submission of Hard copy of Technical Bid',
    type: 'outgoing', category: 'contract', status: 'sent',
  },
  {
    refNo: 'CE/UEED/PS/2287-91',
    date: '2025-09-27', from: 'CE (UEED)', to: 'Khilari Infrastructure',
    subject: 'Letter of Intent (LOI) — Dal Lake Sewerage Scheme',
    type: 'incoming', category: 'contract', status: 'received',
    remarks: 'Project commencement date. Contract start.',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0001-25',
    date: '2025-09-30', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Rectification of Performance Bank Guarantee (PBG)',
    type: 'outgoing', category: 'contract', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0002-25',
    date: '2025-10-03', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Information of Site Clearance & Request for Total Baseline Measurement (TBM)',
    type: 'outgoing', category: 'site', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0003-25',
    date: '2025-09-30', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Request for Land Possession and Demarcation of Proposed STP Site',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'UEED',
    remarks: 'Land possession pending — critical delay trigger',
  },

  // ── Oct 2025 — Permissions Battle Begins ─────────────────────────────────
  {
    refNo: 'CE/UEED/PS/2912-16',
    date: '2025-10-04', from: 'CE (UEED)', to: 'VC (LCMA); SSP Traffic',
    subject: 'Seeking permission to mobilise poclain / excavator',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0006-25',
    date: '2025-10-10', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Seeking Material Carriage Permission',
    type: 'outgoing', category: 'permission', status: 'pending',
    responseDate: '2025-12-20',
    delayAttribution: 'LCMA',
    remarks: 'Response received only on 20-Dec-2025 — 71 days delay in material carriage permission',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0007-25',
    date: '2025-10-10', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Request for Temporary Power Supply Connection',
    type: 'outgoing', category: 'permission', status: 'pending',
    delayAttribution: 'PDD',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0008-25',
    date: '2025-10-10', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Request for Water Supply Connection at Site',
    type: 'outgoing', category: 'permission', status: 'sent',
  },
  {
    refNo: 'SE-II/794-96',
    date: '2025-10-11', from: 'SE (UEED)', to: 'VC (LCMA)',
    subject: 'Seeking Material Carriage Permission (forwarded from KIPL)',
    type: 'incoming', category: 'permission', status: 'received',
    linkedRef: 'KIPL/UEED/Dal Lake/0006-25',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0009-25',
    date: '2025-10-11', from: 'Khilari Infrastructure', to: 'Head of Civil (NIT)',
    subject: 'Vetting of Design Documents',
    type: 'outgoing', category: 'design', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0010-25',
    date: '2025-10-13', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Submission of Hard Copy of Performance Bank Guarantee (PBG)',
    type: 'outgoing', category: 'contract', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0011-25',
    date: '2025-10-13', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Mobilization of Porta Cabin (Site Office)',
    type: 'outgoing', category: 'site', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0012-25',
    date: '2025-10-14', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Site Seized by LCMA Enforcement — Lack of Endorsed LOI by LCMA',
    type: 'outgoing', category: 'eot', status: 'sent',
    delayAttribution: 'LCMA',
    remarks: 'CRITICAL — Site seized by LCMA enforcement on 13-Oct-2025. Work halted. EOT evidence.',
    isEOT: true,
  },
  {
    refNo: 'SE-II/832-36',
    date: '2025-10-15', from: 'SE (UEED)', to: 'VC (LCMA)',
    subject: 'Mobilization of Porta Cabin — Seeking Clearance',
    type: 'incoming', category: 'permission', status: 'received',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'TCS/GB/N1-Perm-II/2025/8571-80',
    date: '2025-10-15', from: 'SSP Traffic', to: 'Stakeholders',
    subject: 'Permission Granted for Mobilization of Porta Cabin',
    type: 'incoming', category: 'permission', status: 'received',
    remarks: 'First permission received from SSP Traffic',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0013-25',
    date: '2025-10-23', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Approval of Agency for Concrete Design Mix',
    type: 'outgoing', category: 'technical', status: 'sent',
  },
  {
    refNo: 'KIPL/DSP-Enf/Dal Lake/0014-25',
    date: '2025-10-25', from: 'Khilari Infrastructure', to: 'DSP LCMA Enforcement',
    subject: 'Request for Temporary Placement of Porta Cabin for Site Office',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0015-25',
    date: '2025-10-23', from: 'Khilari Infrastructure', to: 'AEE (PDD)',
    subject: 'Seeking Temporary Power Supply Connection (20 KW)',
    type: 'outgoing', category: 'permission', status: 'resolved',
    responseDate: '2025-11-28',
    remarks: 'Resolved by 28th Nov 2025 — 36 days delay',
    delayAttribution: 'PDD',
  },
  {
    refNo: 'CE/UEED/ACCTTS/2781-86',
    date: '2025-10-27', from: 'CE (UEED)', to: 'Branch Manager (HDFC)',
    subject: 'Verification of Performance Bank Guarantee',
    type: 'incoming', category: 'contract', status: 'received',
  },
  {
    refNo: 'SDSD/II/202-03',
    date: '2025-10-27', from: 'AEE (UEED)', to: 'AEE (LCMA)',
    subject: 'Clarification and Follow-up on Material Carriage Permission',
    type: 'incoming', category: 'permission', status: 'received',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'HDFC/THA/BG/CONFIRMATION/2025-26/1146',
    date: '2025-10-28', from: 'HDFC Bank', to: 'CE (UEED)',
    subject: 'Confirmation of Performance Bank Guarantee',
    type: 'incoming', category: 'contract', status: 'received',
    responseDate: '2025-10-31',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0015-25-A',
    date: '2025-10-29', from: 'Khilari Infrastructure', to: 'VC (LCMA)',
    subject: 'Seeking Additional Site Access and Material Carriage Permission',
    type: 'outgoing', category: 'permission', status: 'pending',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0016-25',
    date: '2025-10-27', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Request for Site Details Required for BEP and Layout Preparation',
    type: 'outgoing', category: 'design', status: 'sent',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0016-25-A',
    date: '2025-10-29', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Facilitation in Obtaining Consent to Establish (CTE)',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'SE-II/910-13',
    date: '2025-10-30', from: 'SE (UEED)', to: 'VC (LCMA)',
    subject: 'Submission of Prerequisites for Material Carriage as Requested by LCMA',
    type: 'incoming', category: 'permission', status: 'received',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0020-25',
    date: '2025-10-30', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Submission of Supporting Documents, Quantification Details and Additional Approach for Local Intervention',
    type: 'outgoing', category: 'technical', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0022-25',
    date: '2025-10-31', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Submission of PBG Confirmation',
    type: 'outgoing', category: 'contract', status: 'sent',
  },

  // ── Nov 2025 ──────────────────────────────────────────────────────────────
  {
    refNo: 'SDD1/ES/5072-75',
    date: '2025-11-04', from: 'EXEN (UEED)', to: 'EXEN (LCMA)',
    subject: 'Submission of Site Plan & BOQ as Requested for Seeking Material Carriage Permission',
    type: 'incoming', category: 'permission', status: 'received',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0026-25',
    date: '2025-11-04', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Permission to Mobilise Machinery on Site',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0027-25',
    date: '2025-11-11', from: 'Khilari Infrastructure', to: 'AEE (PDD)',
    subject: 'Seeking Temporary Power Supply Connection (3 KW)',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'PDD',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0028-25',
    date: '2025-11-12', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'LCMA Meeting with VC (LCMA) for Expedited Land Allotment / Demarcation',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'LCMA',
    remarks: 'Escalation to CE for land demarcation delay',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0029-25',
    date: '2025-11-19', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Permission for Tree Cutting and Site Development Activities',
    type: 'outgoing', category: 'permission', status: 'sent',
    delayAttribution: 'LCMA',
    isEOT: true,
  },
  {
    refNo: 'SE-II/1063-67',
    date: '2025-11-22', from: 'SE (UEED)', to: 'VC (LCMA)',
    subject: 'Seeking Permission for Tree Cutting, Material Carriage and Revenue Papers',
    type: 'incoming', category: 'permission', status: 'received',
    delayAttribution: 'LCMA',
    remarks: 'Tree cutting blocked from Nov 22 — resolved only Feb 12, 2026 (82 days)',
    isEOT: true,
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0030-25',
    date: '2025-11-27', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of Process Flow & Indicative Hydraulic Flow for Approval',
    type: 'outgoing', category: 'design', status: 'sent',
  },

  // ── Dec 2025 ──────────────────────────────────────────────────────────────
  {
    refNo: 'KIPL/UEED/Dal Lake/0030-25-A',
    date: '2025-12-03', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Freezing of Survey Length — Request for Confirmation',
    type: 'outgoing', category: 'design', status: 'sent',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'SE-II/1179-82',
    date: '2025-12-16', from: 'CE (UEED)', to: 'SSP Traffic',
    subject: 'Seeking Permission for Carriage of Material',
    type: 'incoming', category: 'permission', status: 'received',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'SSPTCS/GB/NI-Perm-II/2025/9472-81',
    date: '2025-12-20', from: 'SSP Traffic', to: 'SE (UEED)',
    subject: 'Limited Time Permission Granted for Material Carriage',
    type: 'incoming', category: 'permission', status: 'received',
    remarks: 'Material carriage permission finally granted — 71 days after first request on 10-Oct',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0031-25',
    date: '2025-12-23', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Seeking One-Time Permission for Carriage of Materials',
    type: 'outgoing', category: 'permission', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0032-25',
    date: '2025-12-23', from: 'Khilari Infrastructure', to: 'SE (UEED)',
    subject: 'Request for Execution of Agreement',
    type: 'outgoing', category: 'contract', status: 'sent',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0033-25',
    date: '2025-12-23', from: 'Khilari Infrastructure', to: 'CE (UEED)',
    subject: 'Intimation Regarding Delay in Tree Cutting Activities',
    type: 'outgoing', category: 'eot', status: 'sent',
    delayAttribution: 'LCMA',
    isEOT: true,
    remarks: 'Formal intimation of delay for EOT claim purposes',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0034-25',
    date: '2025-12-29', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Request to Freeze Survey Length',
    type: 'outgoing', category: 'design', status: 'sent',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0034-25-A',
    date: '2025-12-29', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of Detailed Sewer Network Survey and Request for Confirmation of Design Length',
    type: 'outgoing', category: 'design', status: 'sent',
    delayAttribution: 'UEED',
  },

  // ── Jan 2026 ──────────────────────────────────────────────────────────────
  {
    refNo: 'SDD1/6841-44',
    date: '2026-01-15', from: 'EXEN (UEED)', to: 'PM Khilari',
    subject: 'Clarification Regarding Inclusion of Rising Main and Sewer Manholes in Survey Network',
    type: 'incoming', category: 'design', status: 'received',
    delayAttribution: 'UEED',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0035-26',
    date: '2026-01-19', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Clarification: Inclusion of Rising Main and Sewer Manholes in Survey Network',
    type: 'outgoing', category: 'design', status: 'sent',
    linkedRef: 'SDD1/6841-44',
    responseDate: '2026-01-20',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/WI/36-26',
    date: '2026-01-19', from: 'Khilari Infrastructure / Work Inspection', to: 'EXEN (UEED)',
    subject: 'Request for Allotment of Temporary Dumping Site at LCMA Dumping Yard',
    type: 'outgoing', category: 'site', status: 'sent',
    delayAttribution: 'LCMA',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0037-26',
    date: '2026-01-27', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of Geotechnical Investigation Report (Soil Report)',
    type: 'outgoing', category: 'technical', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0038-26',
    date: '2026-01-31', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of Basic Engineering Package (BEP) R1',
    type: 'outgoing', category: 'design', status: 'sent',
    responseDate: '2026-02-02',
    remarks: 'BEP first submission',
  },

  // ── Feb 2026 ──────────────────────────────────────────────────────────────
  {
    refNo: 'SDD1/7299-7302',
    date: '2026-02-06', from: 'EXEN (UEED)', to: 'Khilari Infrastructure',
    subject: 'Detailed Observations and Mandatory Modifications Required in BEP',
    type: 'incoming', category: 'design', status: 'received',
    delayAttribution: 'UEED',
    remarks: 'BEP rejected — mandatory modifications required',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0039-26',
    date: '2026-02-10', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Reply to Detailed Observations and Mandatory Modifications in BEP',
    type: 'outgoing', category: 'design', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0039-26-B',
    date: '2026-02-25', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Proposal for Adoption of FDF (Fixed Dose Ferric) Technology',
    type: 'outgoing', category: 'design', status: 'sent',
    responseDate: '2026-02-26',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0040-26',
    date: '2026-02-25', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Revised Submission of Basic Engineering Package (BEP) R2',
    type: 'outgoing', category: 'design', status: 'sent',
    responseDate: '2026-02-26',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0041-26',
    date: '2026-02-25', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of BEP Based on C-Tech (Conventional Technology)',
    type: 'outgoing', category: 'design', status: 'sent',
    responseDate: '2026-02-26',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0042-26',
    date: '2026-02-25', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of BEP for Intermediate Pumping Stations (IPS)',
    type: 'outgoing', category: 'design', status: 'sent',
    responseDate: '2026-02-26',
  },

  // ── Mar 2026 ──────────────────────────────────────────────────────────────
  {
    refNo: 'KIPL/UEED/Dal Lake/0043-26',
    date: '2026-03-06', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of Sewer Network Design',
    type: 'outgoing', category: 'design', status: 'sent',
    remarks: 'Submitted by email only — hard copy pending',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0044-26',
    date: '2026-03-07', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Clarification on STP Capacity and Treatment Parameters',
    type: 'outgoing', category: 'design', status: 'sent',
  },
  {
    refNo: 'KIPL/UEED/Dal Lake/0044-26-R3',
    date: '2026-03-16', from: 'Khilari Infrastructure', to: 'EXEN (UEED)',
    subject: 'Submission of Basic Engineering Package (BEP) R3 — Final Revised',
    type: 'outgoing', category: 'design', status: 'sent',
    responseDate: '2026-02-18',
    remarks: 'BEP R3 — latest revision',
  },
]

// ── Delay attribution data ────────────────────────────────────────────────────
const DELAYS = [
  {
    issue: 'Site Seized by LCMA Enforcement',
    startDate: '2025-10-13', resolvedDate: '2025-10-16',
    responsible: 'LCMA', impactDays: 3, status: 'closed',
    letterRef: 'KIPL/UEED/Dal Lake/0012-25',
    activity: 'Site Development',
  },
  {
    issue: 'Material Carriage Permission Withheld by LCMA',
    startDate: '2025-10-10', resolvedDate: '2025-12-20',
    responsible: 'LCMA', impactDays: 71, status: 'closed',
    letterRef: 'KIPL/UEED/Dal Lake/0006-25',
    activity: 'Material Supply & Construction',
  },
  {
    issue: 'Tree Cutting & Site Clearance Permission Denied by LCMA/Forest Dept',
    startDate: '2025-11-22', resolvedDate: '2026-02-12',
    responsible: 'LCMA/FOREST', impactDays: 82, status: 'closed',
    letterRef: 'SE-II/1063-67',
    activity: 'Site Development & Excavation',
  },
  {
    issue: 'Land Allotment / Demarcation of STP Site by LCMA',
    startDate: '2025-09-30', resolvedDate: null,
    responsible: 'LCMA', impactDays: null, status: 'open',
    letterRef: 'KIPL/UEED/Dal Lake/0003-25',
    activity: 'STP Construction',
  },
  {
    issue: 'Temporary Power Supply Connection (PDD)',
    startDate: '2025-10-23', resolvedDate: '2025-11-28',
    responsible: 'PDD', impactDays: 36, status: 'closed',
    letterRef: 'KIPL/UEED/Dal Lake/0015-25',
    activity: 'Site Operations',
  },
  {
    issue: 'BEP Design Approval Pending (UEED)',
    startDate: '2026-01-31', resolvedDate: null,
    responsible: 'UEED', impactDays: null, status: 'open',
    letterRef: 'KIPL/UEED/Dal Lake/0038-26',
    activity: 'Engineering Design & Execution',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
async function login() {
  const res  = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASS }),
  })
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`)
  const data  = await res.json()
  const token = data.accessToken ?? data.access_token ?? data.token
  if (!token) throw new Error('No token in: ' + JSON.stringify(data))
  return token
}

async function tryCreate(url, body, headers) {
  const res = await fetch(url, {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  const text = await res.text()
  if (res.status === 409 || res.status === 400) return { skip: true, reason: text.slice(0, 80) }
  if (!res.ok) return { error: true, reason: `${res.status}: ${text.slice(0, 80)}` }
  try { return { ok: true, data: JSON.parse(text) } }
  catch { return { ok: true, data: text } }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔐 Logging in...')
  const token   = await login()
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  console.log('   ✓ Done\n')

  // ── Try to discover the letters API ──────────────────────────────────────
  const testEndpoints = [
    '/api/v1/letters',
    '/api/v1/liaison/letters',
    '/api/v1/correspondence',
    '/api/v1/liaison',
  ]
  let lettersEndpoint = null
  console.log('🔍 Discovering letters API endpoint...')
  for (const ep of testEndpoints) {
    const r = await fetch(`${API_BASE}${ep}?projectId=${PROJECT_ID}`, { headers })
    if (r.status !== 404) {
      lettersEndpoint = ep
      console.log(`   ✓ Found: ${ep} (status ${r.status})\n`)
      break
    }
  }

  if (!lettersEndpoint) {
    console.log('   ⚠️  Letters API not found at standard endpoints.')
    console.log('   Dumping letter data as JSON for manual import...\n')

    const fs = require('fs')
    const outPath = require('path').join(
      process.env.HOME || process.env.USERPROFILE,
      'Desktop', 'kipl-srinagar', 'scripts', 'letter-seed-data.json'
    )
    fs.writeFileSync(outPath, JSON.stringify({ letters: LETTERS, delays: DELAYS }, null, 2))
    console.log(`📁 Letter data saved to: ${outPath}`)
    console.log('\n📊 Summary of letters ready to seed:')
    console.log(`   Total letters  : ${LETTERS.length}`)
    console.log(`   Outgoing (KIPL): ${LETTERS.filter(l => l.type === 'outgoing').length}`)
    console.log(`   Incoming       : ${LETTERS.filter(l => l.type === 'incoming').length}`)
    console.log(`   EOT-related    : ${LETTERS.filter(l => l.isEOT).length}`)
    console.log(`   Permissions    : ${LETTERS.filter(l => l.category === 'permission').length}`)
    console.log(`   Design/BEP     : ${LETTERS.filter(l => l.category === 'design').length}`)
    console.log(`   Contract       : ${LETTERS.filter(l => l.category === 'contract').length}`)
    console.log('\n📋 Delay Attribution Summary:')
    DELAYS.forEach(d => {
      const days = d.impactDays ? `${d.impactDays} days` : 'ONGOING'
      console.log(`   [${d.responsible.padEnd(12)}] ${d.issue.slice(0,50).padEnd(50)} — ${days} — ${d.status.toUpperCase()}`)
    })

    const totalAttributed = DELAYS.filter(d => d.impactDays).reduce((s, d) => s + d.impactDays, 0)
    console.log(`\n⏱  Total attributed delay (closed issues): ${totalAttributed} days`)
    console.log('   Primary responsible party: LCMA (land, trees, material carriage)')
    console.log('   Secondary: UEED (BEP approval, design freeze)')
    console.log('   Tertiary:  PDD (power supply)\n')
    return
  }

  // ── Seed letters ─────────────────────────────────────────────────────────
  console.log(`📬 Seeding ${LETTERS.length} letters to ${lettersEndpoint}...\n`)
  let created = 0, skipped = 0, failed = 0

  for (const letter of LETTERS) {
    const payload = { ...letter, projectId: PROJECT_ID }
    const result  = await tryCreate(`${API_BASE}${lettersEndpoint}`, payload, headers)

    if (result.skip)  { console.log(`   ⏭  ${letter.refNo} — skipped`); skipped++; continue }
    if (result.error) { console.log(`   ❌ ${letter.refNo} — ${result.reason}`); failed++; continue }

    const icon = letter.isEOT ? '🔴' : letter.type === 'incoming' ? '📥' : '📤'
    console.log(`   ${icon} ${letter.refNo} — ${letter.subject.slice(0, 55)}`)
    created++

    await new Promise(r => setTimeout(r, 50))
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅  Created : ${created}`)
  console.log(`⏭   Skipped : ${skipped}`)
  if (failed > 0) console.log(`❌  Failed  : ${failed}`)
  console.log('─'.repeat(60))
  console.log('🎉 Letter register seeded!\n')
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1) })
