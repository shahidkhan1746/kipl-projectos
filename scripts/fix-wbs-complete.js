/**
 * KIPL ProjectOS — WBS Complete Fix Script
 * Fixes all tasks based on verified PROJECT_FACTS.md
 * Sources: Scanned letters + Master Letter Register
 */

const API_BASE    = 'http://localhost:3000'
const PROJECT_ID  = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const LOGIN_EMAIL = 'admin@kipl.in'
const LOGIN_PASS  = 'password'

// ── Correct WBS based on verified facts ──────────────────────────────────────
// Contract: 27-Sep-2025 → 27-Mar-2028 (30 months)
// Source: LOI CE/UEED/PS/2287-91 + letter 0001-25

const CORRECT_WBS = [
  // ── PHASE 1: Site Readiness / Pre-Construction ────────────────────────────
  {
    wbsCode: 'P-01', title: 'Site Readiness / Pre-Construction',
    level: 1, sortOrder: 10,
    plannedStart: '2025-09-27', plannedEnd: '2026-03-31', plannedDuration: 185,
    progressPct: 72, status: 'in_progress',
    responsible: 'Gohar Shah', remarks: 'Multiple LCMA delays — EOT claimed',
  },
  {
    wbsCode: 'T-01', title: 'Initial Site Development',
    level: 2, parentCode: 'P-01', sortOrder: 11,
    plannedStart: '2025-10-10', plannedEnd: '2025-11-09', plannedDuration: 30,
    actualStart: '2025-12-20', actualEnd: '2025-12-31',
    progressPct: 85, status: 'in_progress',
    delayDays: 71, delayReason: 'Material carriage permission withheld by LCMA (10-Oct to 20-Dec-2025)',
    eotApplied: true, eotDays: 71,
    responsible: 'Gohar Shah',
    remarks: 'Site partially developed. VSC ground improvement approval pending — KIPL/UEED/DAL LAKE/48-26',
  },
  {
    wbsCode: 'T-02', title: 'Land Allotment & Demarcation (LCMA)',
    level: 2, parentCode: 'P-01', sortOrder: 12,
    plannedStart: '2025-09-27', plannedEnd: '2025-10-27', plannedDuration: 30,
    actualStart: '2025-10-29',
    progressPct: 65, status: 'in_progress',
    delayDays: 49, delayReason: 'LCMA land allotment order issued 07-Nov-2025 (CE/UEED/PS/2929-42) but formal site demarcation not completed',
    eotApplied: true, eotDays: 49,
    responsible: 'LCMA',
    remarks: 'Allotment order: CE/UEED/PS/2929-42 (07-Nov-2025). Demarcation status unconfirmed. Ref: KIPL/UEED/DAL LAKE/0028-25',
  },
  {
    wbsCode: 'T-03', title: 'Tree Cutting & Site Clearance Permission',
    level: 2, parentCode: 'P-01', sortOrder: 13,
    plannedStart: '2025-11-01', plannedEnd: '2025-11-22', plannedDuration: 21,
    actualStart: '2025-12-06', actualEnd: '2026-02-12',
    progressPct: 100, status: 'completed',
    delayDays: 82, delayReason: 'Tree cutting permission blocked by LCMA/Forest Dept — poplar and willow trees in Dal Lake ecological zone',
    eotApplied: true, eotDays: 82,
    responsible: 'LCMA / Forest Dept',
    remarks: 'Resolved 12-Feb-2026. Letters: SE-II/1063-67 (22-Nov), KIPL/0029-25, KIPL/0033-25',
  },
  {
    wbsCode: 'T-04', title: 'Soil Testing & Geotechnical Investigation',
    level: 2, parentCode: 'P-01', sortOrder: 14,
    plannedStart: '2025-10-18', plannedEnd: '2025-11-17', plannedDuration: 30,
    actualStart: '2025-12-06', actualEnd: '2026-01-27',
    progressPct: 100, status: 'completed',
    delayDays: 49, delayReason: 'Site access delayed due to LCMA permissions',
    eotApplied: false,
    responsible: 'Gohar Shah',
    remarks: 'Soil report (62 pages) submitted 27-Jan-2026. Ref: KIPL/UEED/DAL LAKE/0037-26',
  },
  {
    wbsCode: 'T-05', title: 'Agreement Execution with UEED',
    level: 2, parentCode: 'P-01', sortOrder: 15,
    plannedStart: '2025-09-27', plannedEnd: '2025-10-27', plannedDuration: 30,
    actualStart: '2025-09-27',
    progressPct: 10, status: 'delayed',
    delayDays: 165, delayReason: 'LOA issued but formal agreement not executed as of 23-Dec-2025. Ref: KIPL/UEED/Dal Lake/0032-25',
    eotApplied: true, eotDays: 165,
    responsible: 'UEED',
    remarks: 'Critical — agreement not signed blocks contractual protections. Ref: 0032-25 (23-Dec-2025)',
  },
  {
    wbsCode: 'T-06', title: 'VSC Ground Improvement (KELLER)',
    level: 2, parentCode: 'P-01', sortOrder: 16,
    plannedStart: '2026-01-01', plannedEnd: '2026-04-30', plannedDuration: 120,
    actualStart: '2026-03-13',
    progressPct: 5, status: 'delayed',
    delayDays: 0, delayReason: 'UEED approval for Vibro Stone Column methodology pending. Online meeting held 13-Mar-2026 with KELLER',
    eotApplied: false,
    responsible: 'UEED',
    remarks: 'Go-ahead letter requested 24-Mar-2026. Ref: KIPL/UEED/DAL LAKE/48-26. Vendor: M/S KELLER',
  },

  // ── PHASE 2: Design & Approvals ───────────────────────────────────────────
  {
    wbsCode: 'P-02', title: 'Design & Approvals',
    level: 1, sortOrder: 20,
    plannedStart: '2025-10-01', plannedEnd: '2026-06-30', plannedDuration: 272,
    progressPct: 35, status: 'in_progress',
    responsible: 'Gohar Shah',
    remarks: 'BEP R3 submitted 16-Mar-2026. Structural drawings submitted 23-Mar-2026. Awaiting UEED approval.',
  },
  {
    wbsCode: 'T-07', title: 'DPR Preparation & Network Survey',
    level: 2, parentCode: 'P-02', sortOrder: 21,
    plannedStart: '2025-10-01', plannedEnd: '2025-12-31', plannedDuration: 91,
    actualStart: '2025-10-03',
    progressPct: 80, status: 'in_progress',
    delayDays: 30, delayReason: 'Survey length dispute — contractual 210 KM vs actual 250 KM surveyed. Ref: KIPL/0034-25, 0035-26',
    eotApplied: false,
    responsible: 'Gohar Shah',
    remarks: 'Sewer network design submitted 06-Mar-2026 (email). Hard copy received 20-Mar-2026. Ref: 0043-26',
  },
  {
    wbsCode: 'T-08', title: 'Design Vetting (NIT Srinagar)',
    level: 2, parentCode: 'P-02', sortOrder: 22,
    plannedStart: '2025-10-11', plannedEnd: '2026-01-31', plannedDuration: 112,
    actualStart: '2025-10-11',
    progressPct: 20, status: 'in_progress',
    delayDays: 60, delayReason: 'Vetting requested 11-Oct-2025 but NIT approval pending',
    eotApplied: false,
    responsible: 'NIT Srinagar',
    remarks: 'Vetting request: KIPL/UEED/Dal Lake/0009-25 (11-Oct-2025)',
  },
  {
    wbsCode: 'T-09', title: 'BEP Submission & UEED Design Approval',
    level: 2, parentCode: 'P-02', sortOrder: 23,
    plannedStart: '2025-12-01', plannedEnd: '2026-03-31', plannedDuration: 120,
    actualStart: '2026-01-31',
    progressPct: 40, status: 'in_progress',
    delayDays: 61, delayReason: 'BEP R1 submitted 31-Jan-2026. UEED raised observations 06-Feb. R2: 25-Feb. R3: 16-Mar. Approval still pending.',
    eotApplied: true, eotDays: 61,
    responsible: 'UEED',
    remarks: 'R1: 0038-26 | Obs: SDD1/7299-7302 | R2: 0040-26 | R3: 0044-26 | Structural: 0046-26 | Tertiary: 0047-26',
  },
  {
    wbsCode: 'T-10', title: 'Consent to Establish (CTE) — Pollution Board',
    level: 2, parentCode: 'P-02', sortOrder: 24,
    plannedStart: '2025-10-29', plannedEnd: '2026-02-28', plannedDuration: 122,
    actualStart: '2025-10-29',
    progressPct: 15, status: 'in_progress',
    delayDays: 90, delayReason: 'CTE facilitation requested from CE UEED. Ref: KIPL/UEED/Dal Lake/0016-25-A (29-Oct-2025)',
    eotApplied: false,
    responsible: 'UEED / SPCB',
    remarks: 'Ref: KIPL/UEED/Dal Lake/0016-25-A (29-Oct-2025)',
  },

  // ── PHASE 3: STP Civil Works ───────────────────────────────────────────────
  {
    wbsCode: 'P-03', title: 'STP Civil Works — 38.5 MLD',
    level: 1, sortOrder: 30,
    plannedStart: '2026-04-01', plannedEnd: '2027-06-30', plannedDuration: 456,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: 'Cannot start until BEP approved and VSC go-ahead received from UEED',
  },
  {
    wbsCode: 'T-11', title: 'STP Civil Works — Foundation & VSC',
    level: 2, parentCode: 'P-03', sortOrder: 31,
    plannedStart: '2026-04-01', plannedEnd: '2026-09-30', plannedDuration: 183,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: 'Blocked by VSC approval. Site: Gupt Ganga, Ishber Nishat. Ref: KIPL/UEED/DAL LAKE/48-26',
  },
  {
    wbsCode: 'T-12', title: 'STP Civil Works — SBR Tank (C-Tech)',
    level: 2, parentCode: 'P-03', sortOrder: 32,
    plannedStart: '2026-07-01', plannedEnd: '2026-12-31', plannedDuration: 184,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: 'SBR C-Tech technology. RCC drawings submitted 23-Mar-2026. Ref: KIPL/UEED/DAL LAKE/0046-26',
  },
  {
    wbsCode: 'T-13', title: 'STP Civil Works — Admin, Blower, Chlorination Buildings',
    level: 2, parentCode: 'P-03', sortOrder: 33,
    plannedStart: '2026-08-01', plannedEnd: '2027-01-31', plannedDuration: 184,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
  },
  {
    wbsCode: 'T-14', title: 'Sewerage Network — Phase 1 (IPS 1-5)',
    level: 2, parentCode: 'P-03', sortOrder: 34,
    plannedStart: '2026-04-01', plannedEnd: '2026-12-31', plannedDuration: 274,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: '210 KM contractual sewer network. 9 IPS locations. Ref: 0030-25-A',
  },
  {
    wbsCode: 'T-15', title: 'Sewerage Network — Phase 2 (IPS 6-9 + Rising Main)',
    level: 2, parentCode: 'P-03', sortOrder: 35,
    plannedStart: '2026-10-01', plannedEnd: '2027-06-30', plannedDuration: 272,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: 'Rising main 14.54 KM (separate component). Ref: KIPL/UEED/DAL LAKE/0035-26',
  },

  // ── PHASE 4: E&M Works ────────────────────────────────────────────────────
  {
    wbsCode: 'P-04', title: 'Electro-Mechanical Works',
    level: 1, sortOrder: 40,
    plannedStart: '2026-10-01', plannedEnd: '2027-09-30', plannedDuration: 365,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
  },
  {
    wbsCode: 'T-16', title: 'E&M Installation — Pumps & Blowers',
    level: 2, parentCode: 'P-04', sortOrder: 41,
    plannedStart: '2026-10-01', plannedEnd: '2027-03-31', plannedDuration: 182,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
  },
  {
    wbsCode: 'T-17', title: 'Tertiary Treatment (PSF & ACF / FDF)',
    level: 2, parentCode: 'P-04', sortOrder: 42,
    plannedStart: '2027-01-01', plannedEnd: '2027-06-30', plannedDuration: 181,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: 'Tertiary BEP submitted 23-Mar-2026. PSF+ACF (30 MLD E/M + 38.5 MLD civil). Ref: 0047-26',
  },
  {
    wbsCode: 'T-18', title: 'SCADA & Instrumentation',
    level: 2, parentCode: 'P-04', sortOrder: 43,
    plannedStart: '2027-01-01', plannedEnd: '2027-09-30', plannedDuration: 272,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
  },

  // ── PHASE 5: Commissioning & O&M ─────────────────────────────────────────
  {
    wbsCode: 'P-05', title: 'Commissioning & O&M',
    level: 1, sortOrder: 50,
    plannedStart: '2027-10-01', plannedEnd: '2028-03-27', plannedDuration: 178,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
  },
  {
    wbsCode: 'T-19', title: 'Hydraulic Testing & Pre-Commissioning',
    level: 2, parentCode: 'P-05', sortOrder: 51,
    plannedStart: '2027-10-01', plannedEnd: '2027-12-31', plannedDuration: 91,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
  },
  {
    wbsCode: 'T-20', title: '6-Month Free Trial Run',
    level: 2, parentCode: 'P-05', sortOrder: 52,
    plannedStart: '2027-10-01', plannedEnd: '2028-03-27', plannedDuration: 178,
    progressPct: 0, status: 'not_started',
    responsible: 'Gohar Shah',
    remarks: 'Trial run of 6 months as per contract. Completion: 27-Mar-2028',
  },
]

// ── Correct Milestones ────────────────────────────────────────────────────────
const MILESTONES = [
  {
    wbsCode: 'M-01', title: 'M-01 — Site Ready',
    level: 2, parentCode: 'P-01', sortOrder: 17,
    plannedStart: '2025-11-15', plannedEnd: '2025-11-15', plannedDuration: 0,
    actualStart: '2025-12-31', actualEnd: '2025-12-31',
    progressPct: 100, status: 'delayed',
    isMilestone: true,
    delayDays: 46, delayReason: 'LCMA land allotment and material carriage delays',
    eotApplied: true, eotDays: 46,
    remarks: 'Delayed 46 days. Responsible: LCMA',
  },
  {
    wbsCode: 'M-02', title: 'M-02 — Design & BEP Approved by UEED',
    level: 2, parentCode: 'P-02', sortOrder: 25,
    plannedStart: '2026-01-31', plannedEnd: '2026-01-31', plannedDuration: 0,
    progressPct: 0, status: 'delayed',
    isMilestone: true,
    delayDays: 69, delayReason: 'BEP submitted 31-Jan-2026. R3 submitted 16-Mar-2026. Approval still pending as of 10-Apr-2026.',
    eotApplied: true, eotDays: 69,
    responsible: 'UEED',
    remarks: 'Critical path item. BEP R3 ref: 0044-26',
  },
  {
    wbsCode: 'M-03', title: 'M-03 — STP Civil Works Complete',
    level: 2, parentCode: 'P-03', sortOrder: 36,
    plannedStart: '2027-06-30', plannedEnd: '2027-06-30', plannedDuration: 0,
    progressPct: 0, status: 'not_started',
    isMilestone: true,
    remarks: 'Site: Gupt Ganga, Ishber Nishat. 38.5 MLD STP.',
  },
  {
    wbsCode: 'M-04', title: 'M-04 — Full Sewer Network Complete',
    level: 2, parentCode: 'P-03', sortOrder: 37,
    plannedStart: '2027-06-30', plannedEnd: '2027-06-30', plannedDuration: 0,
    progressPct: 0, status: 'not_started',
    isMilestone: true,
    remarks: '210 KM contractual gravity sewer + 14.54 KM rising main',
  },
  {
    wbsCode: 'M-05', title: 'M-05 — Trial Run Start',
    level: 2, parentCode: 'P-05', sortOrder: 53,
    plannedStart: '2027-09-27', plannedEnd: '2027-09-27', plannedDuration: 0,
    progressPct: 0, status: 'not_started',
    isMilestone: true,
  },
  {
    wbsCode: 'M-06', title: 'M-06 — Trial Run Complete / Handover',
    level: 2, parentCode: 'P-05', sortOrder: 54,
    plannedStart: '2028-03-27', plannedEnd: '2028-03-27', plannedDuration: 0,
    progressPct: 0, status: 'not_started',
    isMilestone: true,
    remarks: 'Contract completion date: 27-Mar-2028. Source: LOI CE/UEED/PS/2287-91',
  },
]

const ALL_TASKS = [...CORRECT_WBS, ...MILESTONES]

// ── Helpers ───────────────────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASS }),
  })
  const data = await res.json()
  const token = data.accessToken ?? data.access_token ?? data.token
  if (!token) throw new Error('No token: ' + JSON.stringify(data))
  return token
}

async function main() {
  console.log('\n🔐 Logging in...')
  const token = await login()
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  console.log('   ✓ Done\n')

  // ── Step 1: Get existing tasks to find IDs ──────────────────────────────
  console.log('🔍 Fetching existing WBS tasks...')
  const existing = await fetch(`${API_BASE}/api/v1/wbs?projectId=${PROJECT_ID}`, { headers })
    .then(r => r.json())
  const existingMap = {}
  ;(Array.isArray(existing) ? existing : existing.data ?? [])
    .forEach(t => { existingMap[t.wbsCode] = t.id })
  console.log(`   Found ${Object.keys(existingMap).length} existing tasks\n`)

  // ── Step 2: Build parentId map ──────────────────────────────────────────
  // We'll need to resolve parentCode → parentId after creating parents
  const createdIds = { ...existingMap }

  // ── Step 3: Process each task — update if exists, create if not ─────────
  let updated = 0, created = 0, failed = 0

  for (const task of ALL_TASKS) {
    const { parentCode, ...taskData } = task

    // Resolve parentId
    const parentId = parentCode ? createdIds[parentCode] ?? null : null

    const payload = {
      ...taskData,
      projectId: PROJECT_ID,
      parentId,
      progressPct: Number(taskData.progressPct ?? 0),
      delayDays:   Number(taskData.delayDays   ?? 0),
      eotDays:     Number(taskData.eotDays     ?? 0),
      paymentPct:  Number(taskData.paymentPct  ?? 0),
      isMilestone: taskData.isMilestone ?? false,
      eotApplied:  taskData.eotApplied  ?? false,
    }

    const existingId = existingMap[task.wbsCode]

    try {
      if (existingId) {
        // Update existing
        const res = await fetch(`${API_BASE}/api/v1/wbs/${existingId}`, {
          method: 'PATCH', headers, body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.text()
          console.log(`   ❌ UPDATE ${task.wbsCode} — ${res.status}: ${err.slice(0,80)}`)
          failed++
        } else {
          const updated_task = await res.json()
          createdIds[task.wbsCode] = updated_task.id ?? existingId
          console.log(`   ✏️  Updated : ${task.wbsCode.padEnd(6)} ${task.title.slice(0,50)}`)
          updated++
        }
      } else {
        // Create new
        const res = await fetch(`${API_BASE}/api/v1/wbs`, {
          method: 'POST', headers, body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.text()
          console.log(`   ❌ CREATE ${task.wbsCode} — ${res.status}: ${err.slice(0,80)}`)
          failed++
        } else {
          const new_task = await res.json()
          createdIds[task.wbsCode] = new_task.id
          console.log(`   ✅  Created : ${task.wbsCode.padEnd(6)} ${task.title.slice(0,50)}`)
          created++
        }
      }
    } catch(e) {
      console.log(`   ❌ ${task.wbsCode} — ${e.message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 60))
  }

  // ── Step 4: Fix project contract dates ─────────────────────────────────
  console.log('\n🗓  Fixing project contract dates...')
  try {
    const projRes = await fetch(`${API_BASE}/api/v1/projects/${PROJECT_ID}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        startDate:  '2025-09-27',
        endDate:    '2028-03-27',
        duration:   912, // days
      }),
    })
    if (projRes.ok) {
      console.log('   ✓ Contract dates fixed: 27-Sep-2025 → 27-Mar-2028')
    } else {
      console.log(`   ⚠️  Project date update: ${projRes.status} (may need manual fix in settings)`)
    }
  } catch(e) {
    console.log(`   ⚠️  Project date: ${e.message}`)
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✏️   Updated : ${updated}`)
  console.log(`✅  Created  : ${created}`)
  if (failed > 0) console.log(`❌  Failed   : ${failed}`)
  console.log('─'.repeat(60))
  console.log(`
📋 Summary of fixes applied:
   ✓ T-02 Land Allotment → 65% (not 100%) — demarcation incomplete
   ✓ P-01 Site Readiness → 72% (not 100%) — VSC pending
   ✓ T-05 Agreement Execution → ADDED (delayed, UEED responsible)
   ✓ T-06 VSC Ground Improvement → ADDED (pending UEED approval)
   ✓ T-09 BEP Approval → Updated with all 3 revisions history
   ✓ M-06 Trial Run Complete → 27-Mar-2028 (contract end date)
   ✓ All delay days + EOT evidence linked to letter references
   ✓ Contract dates: 27-Sep-2025 → 27-Mar-2028
`)
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1) })
