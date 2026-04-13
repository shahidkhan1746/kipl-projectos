#!/usr/bin/env node
/**
 * KIPL ProjectOS — Real Project Data Seed
 * Source: Allotment Order CE/UEED/PS/01 OF 2025-26 + RA-1 BOQ
 * Run from: ~/Desktop/kipl-srinagar/backend/
 */

const { Client } = require('pg')
const crypto     = require('crypto')

const db = new Client({
  host: 'localhost', port: 5432,
  database: 'kipl_projectos',
  user: 'kipl_user', password: 'PePH6FaCgFYgwEkb4xDy',
})

// ── Real project data from Allotment Order ──────────────────────────────────
const PROJECT = {
  name:           'Sewage Scheme Dal Lake (Uncovered Areas)',
  fullName:       'Survey, Design & Execution of Sewerage Scheme for Dal Lake Uncovered Areas — Pollution Abatement of Dal Lake Uncovered Areas, Kashmir (J&K) on EPC Fixed-Cost Turnkey Basis including O&M for 5 Years after Successful Completion of 6-Month Free Trial Run',
  code:           'CE/UEED/PS/01/2025-26',
  allotmentNo:    'CE/UEED/PS/01 OF 2025-26',
  allotmentDate:  '2025-11-07',
  startDate:      '2025-11-07',    // Date of allotment order
  endDate:        '2028-05-07',    // 30 months from allotment
  contractValue:  27999000000,     // ₹279.99 Crores in paise... actually in rupees
  advertisedCost: 29756000000,     // ₹297.56 Crores
  omCost:         1457000000,      // ₹14.57 Crores O&M component
  location:       'Dal Lake Uncovered Areas, Nishat, Srinagar, J&K',
  client:         'UEED (Urban Environmental Engineering Department, J&K)',
  authority:      'LCMA / UEED',
  executingAgency:'UEED',
  contractor:     'M/S Khilari Infrastructure Pvt. Ltd.',
  contractorAddr: '101-104, Prabhat Centre Annex, Sector-1A, CBD Belapur, Navi Mumbai-400614, Maharashtra',
  completionMonths: 30,
  status:         'active',
  progressPct:    2.7,             // RA-1 submitted (survey + design vetting)
  description:    'EPC Fixed-Cost Turnkey project for sewage scheme covering uncovered areas of Dal Lake. Scope includes survey, design, sewerage network laying (210 km), STP/MPS/IPS construction, and 5-year O&M.',
}

// ── BOQ Items from RA-1 Bill ─────────────────────────────────────────────────
const BOQ_ITEMS = [
  {
    sno: 1,
    description: 'Laying of Sewer & Appurtenant Works — Sewerage Network',
    details: 'Survey, Design, Providing & Laying of Sewerage network including excavation by manual/mechanical means and disposal of surplus earth. Includes RCC NP3 Pipes of all dia incl. DI, HDPE; Manholes of different sizes & depths; Drop arrangements; Masonry chambers.',
    estimatedCost: 19674000000,   // 196.74 Cr
    quotedRate:    18512310996,   // 185.12 Cr
    estimatedQty:  210.05,        // km
    unit:          'km',
    category:      'civil',
    progressPct:   4.0,           // Survey done, design submitted
    workDone:      'Survey completed (189.1 km measured). Design submitted for vetting.',
  },
  {
    sno: 2,
    description: "STPs / MPSs / IPSs and Allied Works",
    details: 'Survey, Design, engineering, supply, construction, erection, hydraulic testing and commissioning of Sewage Treatment Plants (STP), Main Pumping Stations (MPS), Intermediate Pumping Stations (IPS) on turnkey basis including 30 MLD STP with screen channel, admin cum lab building, and Rising Main.',
    estimatedCost: 2040000000,    // 20.40 Cr
    quotedRate:    1919544294,    // 19.195 Cr
    estimatedQty:  30,
    unit:          'MLD',
    category:      'mechanical',
    progressPct:   2.5,           // Survey + design submitted for vetting
    workDone:      'Survey completed. Design submitted for vetting (30 MLD STP).',
  },
  {
    sno: 3,
    description: 'Operation & Maintenance (O&M) — 5 Years Post Trial Run',
    details: 'Operation and Maintenance of complete sewerage system including STPs, MPSs, IPSs, sewer network for 5 years after successful completion of 6-month free trial run.',
    estimatedCost: 1457000000,    // 14.57 Cr
    quotedRate:    1457000000,
    estimatedQty:  5,
    unit:          'years',
    category:      'om',
    progressPct:   0,
    workDone:      'Not started. Commences after trial run completion.',
  },
]

// ── WBS Milestones ────────────────────────────────────────────────────────────
const MILESTONES = [
  { title: 'Allotment Order Issued',           date: '2025-11-07', done: true,  category: 'admin' },
  { title: 'Site Handover / Mobilisation',     date: '2025-11-20', done: true,  category: 'civil' },
  { title: 'Survey Completion (Sewer Network)',date: '2025-12-31', done: true,  category: 'civil' },
  { title: 'Design Submission for Vetting',    date: '2026-01-31', done: true,  category: 'civil' },
  { title: 'Design Approval from UEED',        date: '2026-03-31', done: false, category: 'civil' },
  { title: 'RA-1 Bill Submission',             date: '2026-04-05', done: true,  category: 'finance' },
  { title: 'Sewer Network Laying — Phase 1',   date: '2026-09-30', done: false, category: 'civil' },
  { title: 'STP Construction — Foundation',   date: '2026-12-31', done: false, category: 'civil' },
  { title: 'Sewer Network Laying — Phase 2',   date: '2027-03-31', done: false, category: 'civil' },
  { title: 'STP Civil Works Completion',       date: '2027-06-30', done: false, category: 'mechanical' },
  { title: 'E&M Installation & Testing',       date: '2027-09-30', done: false, category: 'mechanical' },
  { title: 'Full Network Completion',          date: '2027-12-31', done: false, category: 'civil' },
  { title: '6-Month Trial Run Start',          date: '2028-01-07', done: false, category: 'commissioning' },
  { title: 'Trial Run Completion',             date: '2028-05-07', done: false, category: 'commissioning' },
  { title: 'O&M Handover to KIPL',            date: '2028-05-07', done: false, category: 'om' },
]

async function seed() {
  await db.connect()
  console.log('\n✅  Connected to kipl_projectos\n')

  // ── Check projects table structure ────────────────────────────────────────
  const { rows: cols } = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'projects' ORDER BY ordinal_position
  `)
  const colNames = cols.map(c => c.column_name)
  console.log('Projects table columns:', colNames.join(', '))

  // ── Upsert project ────────────────────────────────────────────────────────
  const { rows: existing } = await db.query(`SELECT id FROM projects LIMIT 1`)

  let projectId

  if (existing.length > 0) {
    projectId = existing[0].id
    console.log(`\nUpdating existing project: ${projectId}`)

    // Build dynamic update based on available columns
    const updates = []
    const vals    = []
    let idx       = 1

    const fieldMap = {
      name:          PROJECT.name,
      status:        PROJECT.status,
      location:      PROJECT.location,
      description:   PROJECT.description,
    }

    // Try optional columns
    if (colNames.includes('code'))            { fieldMap.code           = PROJECT.code }
    if (colNames.includes('allotment_no'))    { fieldMap.allotment_no   = PROJECT.allotmentNo }
    if (colNames.includes('contract_value'))  { fieldMap.contract_value = PROJECT.contractValue }
    if (colNames.includes('start_date'))      { fieldMap.start_date     = PROJECT.startDate }
    if (colNames.includes('end_date'))        { fieldMap.end_date       = PROJECT.endDate }
    if (colNames.includes('client'))          { fieldMap.client         = PROJECT.client }
    if (colNames.includes('progress_pct'))    { fieldMap.progress_pct   = PROJECT.progressPct }
    if (colNames.includes('contractor'))      { fieldMap.contractor     = PROJECT.contractor }
    if (colNames.includes('authority'))       { fieldMap.authority      = PROJECT.authority }
    if (colNames.includes('executing_agency')){ fieldMap.executing_agency = PROJECT.executingAgency }
    if (colNames.includes('full_name'))       { fieldMap.full_name      = PROJECT.fullName }
    if (colNames.includes('allotment_date'))  { fieldMap.allotment_date = PROJECT.allotmentDate }

    for (const [col, val] of Object.entries(fieldMap)) {
      updates.push(`${col} = $${idx++}`)
      vals.push(val)
    }
    vals.push(projectId)

    await db.query(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx}`,
      vals
    )
    console.log('  ✅  Project updated with real allotment data')

  } else {
    // Insert new project
    projectId = crypto.randomUUID()
    const insertCols = ['id', 'name', 'status', 'location', 'description']
    const insertVals = [projectId, PROJECT.name, PROJECT.status, PROJECT.location, PROJECT.description]

    if (colNames.includes('code'))           { insertCols.push('code');           insertVals.push(PROJECT.code) }
    if (colNames.includes('allotment_no'))   { insertCols.push('allotment_no');   insertVals.push(PROJECT.allotmentNo) }
    if (colNames.includes('contract_value')) { insertCols.push('contract_value'); insertVals.push(PROJECT.contractValue) }
    if (colNames.includes('start_date'))     { insertCols.push('start_date');     insertVals.push(PROJECT.startDate) }
    if (colNames.includes('end_date'))       { insertCols.push('end_date');       insertVals.push(PROJECT.endDate) }
    if (colNames.includes('client'))         { insertCols.push('client');         insertVals.push(PROJECT.client) }
    if (colNames.includes('progress_pct'))   { insertCols.push('progress_pct');   insertVals.push(PROJECT.progressPct) }

    const placeholders = insertVals.map((_, i) => `$${i + 1}`)
    await db.query(
      `INSERT INTO projects (${insertCols.join(',')}) VALUES (${placeholders.join(',')})`,
      insertVals
    )
    console.log('  ✅  New project created')
  }

  // ── Assign project to all users ───────────────────────────────────────────
  if (colNames.includes('manager_id') || colNames.includes('project_id')) {
    const { rows: users } = await db.query('SELECT id FROM users')
    for (const u of users) {
      try {
        await db.query('UPDATE users SET project_id = $1 WHERE id = $2', [projectId, u.id])
      } catch(e) { /* column may not exist */ }
    }
    console.log('  ✅  All users linked to project')
  }

  // ── Print project summary ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(68))
  console.log('  KIPL ProjectOS — Project Data Seeded')
  console.log('═'.repeat(68))
  console.log(`  Project      : ${PROJECT.name}`)
  console.log(`  Allotment No : ${PROJECT.allotmentNo}`)
  console.log(`  Date         : ${PROJECT.allotmentDate}`)
  console.log(`  Contract     : ₹279.99 Crores (incl. O&M ₹14.57 Cr)`)
  console.log(`  Start        : 07 Nov 2025`)
  console.log(`  Completion   : 07 May 2028 (30 months)`)
  console.log(`  Client       : UEED, J&K UT`)
  console.log(`  Location     : Dal Lake Uncovered Areas, Srinagar`)
  console.log(`  Progress     : ~2.7% (RA-1 submitted — Survey + Design stage)`)
  console.log('═'.repeat(68))

  console.log('\n📋 BOQ Summary:')
  console.log('  Item 1: Sewer Network Laying     — ₹185.12 Cr  (210 km, 4% done)')
  console.log('  Item 2: STP/MPS/IPS Works        — ₹19.20 Cr   (30 MLD, 2.5% done)')
  console.log('  Item 3: O&M (5 years post trial) — ₹14.57 Cr   (0% done)')
  console.log('  RA-1 Bill Submitted              — ₹7.146 Cr\n')

  console.log('📋 Next manual steps:')
  console.log('  1. Go to http://localhost:5173/settings/system to confirm project details')
  console.log('  2. Go to http://localhost:5173/epc to enter BOQ line items')
  console.log('  3. Go to http://localhost:5173/wbs to set up the milestone Gantt chart')
  console.log('  4. Go to http://localhost:5173/accounting/invoices to record RA-1 bill\n')

  await db.end()
}

seed().catch(e => {
  console.error('\n❌ Error:', e.message)
  db.end()
})
