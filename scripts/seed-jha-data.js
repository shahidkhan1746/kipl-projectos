/**
 * Seeds JHA QA checklists and WBS O&M tasks into the database
 */
const API_BASE    = 'http://localhost:3000'
const PROJECT_ID  = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const LOGIN_EMAIL = 'admin@kipl.in'
const LOGIN_PASS  = 'password'

async function login() {
  const res  = await fetch(API_BASE + '/api/v1/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email:LOGIN_EMAIL, password:LOGIN_PASS }),
  })
  const data = await res.json()
  return data.accessToken ?? data.access_token ?? data.token
}

const JHA_CHECKLISTS = [
  {
    title: 'JHA P-I: UWTP Utilization Capacity',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha1a', question:'Actual inflow >75% of design capacity for assessment year (50 marks)', required:true, referenceSpec:'JHA Toolkit Para I' },
      { id:'jha1b', question:'Flow meters calibrated and records maintained', required:true },
      { id:'jha1c', question:'Logbooks with daily flow records for past 6 months available', required:true },
      { id:'jha1d', question:'DPR with design capacity uploaded to JHA portal', required:true },
    ],
  },
  {
    title: 'JHA P-II: UWTP Unit Operations (3-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha2a', question:'Coarse screen operational', required:true, referenceSpec:'JHA P-II: 2.5 marks' },
      { id:'jha2b', question:'Fine screen operational', required:true, referenceSpec:'JHA P-II: 2.5 marks' },
      { id:'jha2c', question:'Grit chamber operational', required:true, referenceSpec:'JHA P-II: 5 marks' },
      { id:'jha2d', question:'Primary clarifier operational', required:true, referenceSpec:'JHA P-II: 5 marks' },
      { id:'jha2e', question:'SBR (C-Tech) biological treatment fully operational', required:true, referenceSpec:'JHA P-II: 20 marks' },
      { id:'jha2f', question:'Tertiary treatment (PSF+ACF) operational', required:true, referenceSpec:'JHA P-II: 10 marks' },
      { id:'jha2g', question:'Disinfection (chlorination) operational', required:true, referenceSpec:'JHA P-II: 15 marks' },
      { id:'jha2h', question:'All electromechanical equipment working', required:true, referenceSpec:'JHA P-II: 17.5 marks' },
      { id:'jha2i', question:'3-4 min video of all unit operations recorded and uploaded', required:true },
    ],
  },
  {
    title: 'JHA P-III: Monitoring Mechanism — SCADA/OCEMS (4-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha3a', question:'SCADA system with Read and Write capability installed', required:true, referenceSpec:'JHA P-III: 10 marks' },
      { id:'jha3b', question:'SCADA controls all treatment stages', required:true, referenceSpec:'JHA P-III: 12.5 marks' },
      { id:'jha3c', question:'OCEMS integrated and operational', required:true, referenceSpec:'JHA P-III: 10 marks' },
      { id:'jha3d', question:'OCEMS monitors COD, TSS, TN, DO, pH', required:true, referenceSpec:'JHA P-III: 12.5 marks' },
      { id:'jha3e', question:'OCEMS data transmitted to CPCB/PCB central server', required:true, referenceSpec:'JHA P-III: 5 marks' },
      { id:'jha3f', question:'SCADA reports for last 3 months available', required:true },
    ],
  },
  {
    title: 'JHA P-IV: Discharge Standards Compliance (3-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha4a', question:'BOD of treated effluent meets PCB discharge norms', required:true, referenceSpec:'JHA P-IV: 10 marks' },
      { id:'jha4b', question:'COD of treated effluent meets discharge norms', required:true, referenceSpec:'JHA P-IV: 10 marks' },
      { id:'jha4c', question:'TSS meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4d', question:'Total Nitrogen (TN) meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4e', question:'Total Phosphorus (TP) meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4f', question:'Faecal Coliform (FC) meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4g', question:'Functional in-house laboratory with qualified staff', required:true, referenceSpec:'JHA P-IV: 20 marks' },
      { id:'jha4h', question:'Third-party NABL/ISO testing done monthly', required:true, referenceSpec:'JHA P-IV: 20 marks' },
    ],
  },
  {
    title: 'JHA P-V: Safety & Cleanliness (3-star Mandatory)',
    category: 'safety', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha5a', question:'Firefighting equipment, fire exits and assembly points functional', required:true, referenceSpec:'JHA P-V: 7.5 marks' },
      { id:'jha5b', question:'Unit labelling, floor markings and ATEX area marked', required:true, referenceSpec:'JHA P-V: 10 marks' },
      { id:'jha5c', question:'All personnel using quality PPE', required:true, referenceSpec:'JHA P-V: 10 marks' },
      { id:'jha5d', question:'Safety drills conducted and records maintained', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5e', question:'Gas detection systems functional', required:true, referenceSpec:'JHA P-V: 10 marks' },
      { id:'jha5f', question:'Periodic medical check-ups for all staff', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5g', question:'Medical and life insurance for all staff', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5h', question:'Functional washrooms for male and female workers', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5i', question:'Flood management measures deployed (HFL above all components)', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5j', question:'General cleanliness of UWTP maintained', required:true, referenceSpec:'JHA P-V: 5 marks' },
    ],
  },
  {
    title: 'JHA P-VI: Human Resources (3-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha6a', question:'Plant Manager deployed as per O&M contract / DPR', required:true, referenceSpec:'JHA P-VI: 20 marks' },
      { id:'jha6b', question:'Plant Manager and Operator qualifications meet DPR requirements', required:true, referenceSpec:'JHA P-VI: 15 marks' },
      { id:'jha6c', question:'Qualified Lab Analyst appointed', required:true, referenceSpec:'JHA P-VI: 5 marks' },
      { id:'jha6d', question:'Training conducted at least once every 3 months', required:true, referenceSpec:'JHA P-VI: 10 marks' },
    ],
  },
]

// WBS O&M tasks based on JHA requirements
const JHA_WBS_TASKS = [
  {
    wbsCode:'OM-01', title:'O&M Phase — JHA Compliance Planning', level:1, sortOrder:60,
    plannedStart:'2027-10-01', plannedEnd:'2028-09-27', plannedDuration:365,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'JHA self-assessment to be submitted within 3 months of commissioning',
  },
  {
    wbsCode:'OM-02', title:'JHA Portal Registration & UWTP Nomination',
    level:2, parentCode:'OM-01', sortOrder:61,
    plannedStart:'2027-10-01', plannedEnd:'2027-10-31', plannedDuration:30,
    progressPct:0, status:'not_started', responsible:'UEED / KIPL',
    remarks:'Register on AMRUT 2.0 portal. Nominate 38.5 MLD Ishber Nishat STP.',
  },
  {
    wbsCode:'OM-03', title:'Establish In-House Laboratory (JHA P-IV)',
    level:2, parentCode:'OM-01', sortOrder:62,
    plannedStart:'2027-08-01', plannedEnd:'2027-09-30', plannedDuration:61,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'NABL-compliant lab for BOD, COD, TSS, TN, TP, FC testing. Required for 3-star.',
  },
  {
    wbsCode:'OM-04', title:'SCADA + OCEMS Integration & Commissioning (JHA P-III)',
    level:2, parentCode:'OM-01', sortOrder:63,
    plannedStart:'2027-07-01', plannedEnd:'2027-09-30', plannedDuration:92,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'SCADA R&W + OCEMS for COD/TSS/TN/DO/pH. Data transmission to CPCB/PCB server.',
  },
  {
    wbsCode:'OM-05', title:'Safety Systems — PPE, Gas Detection, Fire Safety (JHA P-V)',
    level:2, parentCode:'OM-01', sortOrder:64,
    plannedStart:'2027-08-01', plannedEnd:'2027-10-31', plannedDuration:92,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'Fire exits, ATEX marking, gas detectors, PPE for all staff, insurance.',
  },
  {
    wbsCode:'OM-06', title:'HR Deployment — Plant Manager + Operators + Lab (JHA P-VI)',
    level:2, parentCode:'OM-01', sortOrder:65,
    plannedStart:'2027-09-01', plannedEnd:'2027-10-01', plannedDuration:30,
    progressPct:0, status:'not_started', responsible:'UEED / KIPL',
    remarks:'Qualified PM, operators, lab analyst as per O&M contract + quarterly training.',
  },
  {
    wbsCode:'OM-07', title:'Treated Water Reuse Plan — Horticulture/Construction (JHA P-VII)',
    level:2, parentCode:'OM-01', sortOrder:66,
    plannedStart:'2027-10-01', plannedEnd:'2028-03-27', plannedDuration:178,
    progressPct:0, status:'not_started', responsible:'UEED / LCMA',
    remarks:'Dal Lake context — treated water for horticulture along Dal Lake boulevard. MoU required.',
  },
  {
    wbsCode:'OM-08', title:'Solar Energy Installation (JHA P-VIII)',
    level:2, parentCode:'OM-01', sortOrder:67,
    plannedStart:'2027-07-01', plannedEnd:'2027-12-31', plannedDuration:184,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'Solar panels to offset UWTP energy. DG backup included in contract.',
  },
  {
    wbsCode:'OM-09', title:'JHA Self-Assessment Submission',
    level:2, parentCode:'OM-01', sortOrder:68,
    plannedStart:'2028-01-01', plannedEnd:'2028-03-27', plannedDuration:86,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'Target: 4-star rating. Incentive claim via AMRUT 2.0 portal.',
  },
]

async function main() {
  console.log('\n🔐 Logging in...')
  const token   = await login()
  const headers = { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }
  console.log('   ✓ Done\n')

  // ── Seed JHA QA Checklists ────────────────────────────────────────────────
  console.log('📋 Seeding JHA QA checklists...')
  let created = 0, failed = 0
  for (const cl of JHA_CHECKLISTS) {
    const res = await fetch(API_BASE + '/api/v1/qa/checklists', {
      method:'POST', headers, body: JSON.stringify({ ...cl, projectId: PROJECT_ID }),
    })
    if (res.ok) { console.log('   ✓ ' + cl.title.slice(0,60)); created++ }
    else        { console.log('   ❌ ' + cl.title.slice(0,60) + ' — ' + res.status); failed++ }
    await new Promise(r => setTimeout(r, 80))
  }

  // ── Seed JHA WBS O&M Tasks ────────────────────────────────────────────────
  console.log('\n🏗  Seeding JHA O&M WBS tasks...')
  const existingWbs = await fetch(API_BASE + '/api/v1/wbs?projectId=' + PROJECT_ID, { headers }).then(r => r.json())
  const existingMap = {}
  ;(Array.isArray(existingWbs) ? existingWbs : existingWbs.data ?? []).forEach(t => { existingMap[t.wbsCode] = t.id })
  const createdIds = { ...existingMap }

  for (const task of JHA_WBS_TASKS) {
    const { parentCode, ...taskData } = task
    const parentId = parentCode ? createdIds[parentCode] ?? null : null
    const payload  = { ...taskData, projectId:PROJECT_ID, parentId, eotApplied:false }
    const existing = existingMap[task.wbsCode]
    const url      = existing ? API_BASE + '/api/v1/wbs/' + existing : API_BASE + '/api/v1/wbs'
    const method   = existing ? 'PATCH' : 'POST'
    const res      = await fetch(url, { method, headers, body: JSON.stringify(payload) })
    if (res.ok) {
      const t = await res.json()
      createdIds[task.wbsCode] = t.id ?? existing
      console.log('   ✓ ' + task.wbsCode + ' — ' + task.title)
    } else { console.log('   ❌ ' + task.wbsCode + ' — ' + res.status); failed++ }
    await new Promise(r => setTimeout(r, 80))
  }

  console.log('\n' + '─'.repeat(60))
  console.log('✅  JHA data seeded: ' + created + ' QA checklists + ' + JHA_WBS_TASKS.length + ' WBS O&M tasks')
  if (failed > 0) console.log('❌  Failed: ' + failed)
  console.log('\nNavigate to /jha to see the star rating page')
  console.log('Navigate to /qa to see JHA checklists')
  console.log('Navigate to /wbs to see JHA O&M tasks (OM-01 through OM-09)')
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1) })
