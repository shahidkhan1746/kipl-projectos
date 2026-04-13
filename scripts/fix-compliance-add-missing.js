const fs   = require('fs')
const path = require('path')

const filePath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'compliance', 'CompliancePage.tsx'
)

let src = fs.readFileSync(filePath, 'utf8')

// GUARD: verify all 8 existing sections intact
const required = ['contractual','timeline','eot','payment','quality','insurance','materials','reporting']
const missing = required.filter(id => !src.includes("id:'" + id + "'"))
if (missing.length > 0) { console.error('ABORT — missing sections:', missing); process.exit(1) }
console.log('All 8 existing sections verified intact')

// GUARD: skip if already added
if (src.includes("id:'manpower'")) { console.log('Already patched — skipping'); process.exit(0) }

// 1. Add icon imports
if (!src.includes('Buildings, Gear, UserCircle')) {
  src = src.replace(
    "CaretDown, CaretRight } from '@phosphor-icons/react'",
    "Buildings, Gear, UserCircle,\n  CaretDown, CaretRight } from '@phosphor-icons/react'"
  )
  console.log('Icon imports updated')
}

// 2. Insert sections — find the anchor (end of reporting section)
const ANCHOR = "    ],\n  },\n]\n\n// \u2500\u2500 Compliance score"
if (!src.includes(ANCHOR)) {
  console.error('ABORT — anchor not found')
  process.exit(1)
}

const NEW_SECTIONS = `    ],
  },

  {
    id:'manpower', title:'Mandatory Manpower Deployment (Annex — Manpower)', icon:UserCircle, color:'#0891b2',
    items: [
      { id:'mp1', clause:'Clause 67 + Annex', status:'pending',
        title:'Project Manager — 1 No. (B.Tech Civil, 20 yrs sewerage)',
        detail:'Must be on KIPL payroll. Resume approved by UEED. Non-deployment deduction: Rs 1,00,000 per month.',
        deadline:'From commencement',
        evidence:'Gowhar Shah designated. Formal UEED resume approval pending.',
        risk:'Rs 1,00,000/month deducted from RA bill if not deployed.' },
      { id:'mp2', clause:'Clause 67 + Annex', status:'pending',
        title:'Deputy Project Managers — 3 Nos. (2 Civil + 1 Mech, 15 yrs)',
        detail:'2x B.Tech Civil + 1x B.Tech Mechanical, 15 years sewerage/STP experience. Non-deployment: Rs 1,00,000/month each.',
        deadline:'From commencement',
        risk:'Rs 1,00,000/month per DPM deducted if not deployed.' },
      { id:'mp3', clause:'Clause 67 + Annex', status:'pending',
        title:'Site Engineers Civil — 10 Nos. (B.Tech/Diploma, 5-7 yrs)',
        detail:'B.Tech Civil with 5 yrs OR Diploma with 7 yrs sewerage experience. Non-deployment: Rs 40,000/month each.',
        deadline:'From commencement',
        risk:'Rs 40,000/month per engineer deducted if not deployed.' },
      { id:'mp4', clause:'Clause 67 + Annex', status:'pending',
        title:'Site Engineers Mechanical — 5 Nos. + Electrical — 2 Nos.',
        detail:'5x Mechanical and 2x Electrical engineers for IPS and STP works. Non-deployment: Rs 40,000/month each.',
        deadline:'When STP/IPS works start' },
      { id:'mp5', clause:'Clause 67 + Annex', status:'pending',
        title:'Supervisors — 15 Nos. (Diploma/ITI, 5-7 yrs)',
        detail:'Diploma with 5 yrs OR ITI with 7 yrs sewerage experience. Non-deployment: Rs 25,000/month each.',
        deadline:'From commencement',
        risk:'Rs 25,000/month per supervisor deducted from bills.' },
      { id:'mp6', clause:'Clause 67 + Annex', status:'pending',
        title:'Electricians and Welders — 2-3 Nos. (ITI, 5 yrs)',
        detail:'ITI certified electricians and welders for site works.',
        deadline:'As required' },
      { id:'mp7', clause:'Clause 67.4', status:'done',
        title:'No Staff Replacement Without Prior Written UEED Approval',
        detail:'Any replacement of approved staff needs prior UEED written approval. Replacement must be equivalent or superior. EIC decision is final.',
        deadline:'Ongoing',
        evidence:'Acknowledged in contract terms.' },
    ],
  },
  {
    id:'equipment', title:'Mandatory Equipment Deployment (Annex — Equipment)', icon:Hammer, color:'#ea580c',
    items: [
      { id:'eq1', clause:'Annex — Equipment', status:'pending',
        title:'Excavators (20-30T) — 6 Nos. + Backhoe Loaders — 3 Nos.',
        detail:'Owned or officially leased. Documentary evidence with bid. For trench excavation and smaller digs.',
        deadline:'From commencement' },
      { id:'eq2', clause:'Annex — Equipment', status:'pending',
        title:'Dump Trucks (10-12T) — 10 Nos. + Compactors — 4 Nos.',
        detail:'Dump trucks for transporting soil and materials. Compactors for backfilling.',
        deadline:'From commencement' },
      { id:'eq3', clause:'Annex — Equipment', status:'pending',
        title:'Cranes (10-15T) — 3 Nos. + Concrete Mixers — 4 Nos.',
        detail:'Cranes for handling heavy pipes. Concrete mixers for manhole base and civil works.',
        deadline:'From commencement' },
      { id:'eq4', clause:'Annex — Equipment', status:'pending',
        title:'Dewatering Pumps — 6 Nos. + Welding Machines — 5 Nos.',
        detail:'Dewatering pumps for high water table. Welding machines with gensets as required.',
        deadline:'As required' },
      { id:'eq5', clause:'Annex — Equipment', status:'pending',
        title:'Survey Instruments — 7 Sets (Auto-Level / Total Station)',
        detail:'For alignment and level checks across 210 KM sewer network.',
        deadline:'From commencement' },
      { id:'eq6', clause:'Annex — Equipment', status:'pending',
        title:'Shuttering/Shoring — 10 Sets / 800 sqm + Batch Mixer 10cum/hr',
        detail:'Shuttering for loose soil conditions. Batch mixer for all civil works.',
        deadline:'As required' },
      { id:'eq7', clause:'Clause 62 + STP Specs', status:'pending',
        title:'Pick-Up Vehicle (more than 2 Ton) for Sludge Disposal',
        detail:'Vehicle above 2 ton for disposal of treated/waste sludge. Required during trial run and full O&M period.',
        deadline:'Before trial run',
        risk:'Sludge disposal is KIPL scope for trial run + 5-year O&M.' },
    ],
  },
  {
    id:'facilities', title:'Site Facilities, Office and Labour Welfare', icon:Buildings, color:'#7c3aed',
    items: [
      { id:'sf1', clause:'Clause 70.2', status:'pending',
        title:'Site Office — Phone, Fax, Internet, Photocopier, Computer, Printer + Operator',
        detail:'KIPL to open site office at own cost. Must have telephone, fax, internet, photocopier, computer, printer, operator, electricity and drinking water. Office space for UEED and consultant also required.',
        deadline:'Within 10 days of LOA',
        risk:'Required before any work commences.' },
      { id:'sf2', clause:'Clause 70.2', status:'pending',
        title:'One Full-Time SUV to UEED — with Driver, Fuel and Maintenance',
        detail:'KIPL must provide 1 SUV to UEED full time for project supervision. Includes driver, fuel and all maintenance. Must be maintained until contract completion + 6 months if delayed.',
        deadline:'Within 10 days of LOA',
        risk:'UEED can arrange at KIPL risk and cost if not provided. High exposure.',
        evidence:'Status not confirmed. URGENT.' },
      { id:'sf3', clause:'Clause 70.3', status:'partial',
        title:'Photography / Videography Arrangement',
        detail:'KIPL to arrange photography and videography for any activity at any time. Required for monthly progress reports and RA bills.',
        deadline:'Ongoing',
        evidence:'Site diary captures daily entries. Dedicated arrangement to be formalized.' },
      { id:'sf4', clause:'Clause 70.3', status:'pending',
        title:'MS Project Software for Progress Reports',
        detail:'Software like MS Project for preparing progress reports and bar charts. EIC to approve the software.',
        deadline:'Within 15 days of LOA',
        evidence:'ProjectOS WBS can serve this. Formal submission to UEED also needed.' },
      { id:'sf5', clause:'Clause 70.4', status:'pending',
        title:'Ground Breaking Ceremony / Inaugural Function',
        detail:'All arrangements and cost for ground breaking ceremony at KIPL expense. Any UEED expenditure incurred will be recovered from KIPL.',
        deadline:'At commencement',
        evidence:'Confirm if ceremony was conducted and cost settled.' },
      { id:'sf6', clause:'STP Specs Section 4.0', status:'pending',
        title:'STP Office Furniture (Included in STP Rates)',
        detail:'Conference table 3m x 1.5m with 8 chairs, 4 work tables, 10 office chairs, computer table, 4 steel cupboards, 2 filing cabinets, venetian blinds, telephone + broadband.',
        deadline:'At STP completion',
        evidence:'Included in STP BOQ rates. To be provided at handover.' },
      { id:'sf7', clause:'STP Specs Section 4.0', status:'pending',
        title:'STP Equipment — PC, A3 Printer, Scale Model, ACs, TV Sets',
        detail:'1x Desktop PC (HP/HCL/Lenovo/IBM), 1x A3 Laser Printer (HP/Canon), broadband internet, 1x dimensional scale model of plant with flow display and lighting, adequate ACs, TV sets for online meetings.',
        deadline:'At STP completion' },
      { id:'sf8', clause:'Clause 46.1', status:'pending',
        title:'Labour Camp — Land at Own Cost + Local Authority Clearance',
        detail:'Land for temporary office, storage and labour huts at KIPL cost. Local authority clearance required. Must be sanitary. Demolish all structures on completion before security deposit release.',
        deadline:'From commencement' },
      { id:'sf9', clause:'Section 9 — Labour Regs', status:'pending',
        title:'Canteen — When 100+ Contract Labourers for 6+ Months',
        detail:'Canteen with dining hall (30 persons capacity), kitchen, storeroom, pantry, washing places. Floor impervious, lime-washed annually. Sanitary conditions maintained.',
        deadline:'When threshold met' },
      { id:'sf10', clause:'Section 8 — Labour Regs', status:'na',
        title:'Creches — When 20+ Women Workers Employed',
        detail:'2 rooms: playroom with toys, bedroom with cots/bedding. Ayah appointed. Adequate lighting and ventilation.',
        deadline:'When threshold met',
        evidence:'N/A unless women workers exceed 20 on site.' },
      { id:'sf11', clause:'Section 7 — Labour Regs', status:'pending',
        title:'Rest Sheds — 4 Sheds (2 Male, 2 Female)',
        detail:'4 sheds for workers rest. Min height 3m. 0.6 sqm per head. Kept clean.',
        deadline:'From commencement' },
      { id:'sf12', clause:'Clause 47', status:'partial',
        title:'Watch, Ward and Lighting of Work Place',
        detail:'KIPL to provide barriers, obstructions, lights and watchmen for safety during work at own cost.',
        deadline:'Ongoing' },
      { id:'sf13', clause:'Clause 45', status:'pending',
        title:'Water and Electricity — Own Arrangement + Standby',
        detail:'KIPL to arrange water and electricity for construction at own cost including charges. Standby arrangement mandatory for uninterrupted supply.',
        deadline:'From commencement' },
    ],
  },
  {
    id:'labour_laws', title:'Labour Laws and Statutory Compliance (Clause 71)', icon:ClipboardText, color:'#dc2626',
    items: [
      { id:'ll1', clause:'Clause 71.2', status:'pending',
        title:'Contract Labour Act License (R&A Act 1970)',
        detail:'Valid license under Contract Labour Act 1970 required before work commencement. Must stay valid including defect liability period.',
        deadline:'Before commencement',
        risk:'Penal provisions apply. No labour without valid license.',
        evidence:'License status to be confirmed and uploaded.' },
      { id:'ll2', clause:'Clause 71.2', status:'done',
        title:'Child Labour Prohibition — No Labour Below Age 18',
        detail:'No labour below 18 years on site. Child Labour Act 1986.',
        deadline:'Ongoing',
        evidence:'Standard compliance. Age verification at hiring.' },
      { id:'ll3', clause:'Clause 71.2', status:'pending',
        title:'BOCWA 1996 + Welfare Cess 1% of Construction Cost',
        detail:'Building and Construction Workers Act 1996 compliance. Welfare Cess Act 1996: 1% of cost of construction.',
        deadline:'From commencement',
        evidence:'Cess registration and payment to be confirmed.' },
      { id:'ll4', clause:'Clause 71.3', status:'pending',
        title:'Minimum Wages — Fair Wages to All Labour Including Sub-Contractors',
        detail:'Wages not less than Minimum Wages Act rates. Applies to sub-contractor labour too. Weekly Sunday holiday. Overtime at double rate for more than 9 hrs/day or 48 hrs/week.',
        deadline:'Ongoing',
        evidence:'Wage registers to be maintained. EIC representative to witness disbursement.' },
      { id:'ll5', clause:'Labour Regs 4.0', status:'pending',
        title:'Wage Payment Before 7th Day After Wage Period',
        detail:'For under 1000 workers: pay before 7th day after wage period. At work premises. Date notified in advance. On termination: pay within 2 working days.',
        deadline:'Monthly' },
      { id:'ll6', clause:'Clause 72', status:'pending',
        title:'Labour Cess — 1% of Cost of Construction',
        detail:'1% cess payable under Building Workers Welfare Cess Act. UEED may deduct from bills if not paid by KIPL.',
        deadline:'With each RA bill',
        risk:'UEED may deduct from RA bills.' },
      { id:'ll7', clause:'Clause 71.5', status:'pending',
        title:'All Labour Statutory Acts Compliance',
        detail:'Payment of Wages Act 1936, Minimum Wages Act 1948, Employees Liability Act 1938, Workmen Compensation Act 1923, Industrial Disputes Act 1947, Maternity Benefits Act 1961.',
        deadline:'Ongoing' },
      { id:'ll8', clause:'Section 10 — Labour Regs', status:'pending',
        title:'Anti-Malarial Precautions at Own Expense',
        detail:'Comply with all anti-malarial instructions from EIC at own expense. Fill borrow pits that may breed mosquitoes. Dal Lake context — malaria risk significant.',
        deadline:'Ongoing' },
    ],
  },
  {
    id:'om_scope', title:'Operation and Maintenance Scope Obligations', icon:Gear, color:'#059669',
    items: [
      { id:'om1', clause:'STP Specs — O&M Scope', status:'pending',
        title:'24/7 Plant Operation — Breakdown Rectification Within 48 Hours',
        detail:'Plant must operate round the clock. Mechanical or electrical breakdown to be rectified within 48 hours. Penalty: Rs 15,000 per day beyond 48 hours.',
        deadline:'During O&M period',
        risk:'Rs 15,000/day penalty for each day breakdown is not rectified.',
        amount:'Rs 15,000/day penalty' },
      { id:'om2', clause:'STP Specs — O&M Scope', status:'pending',
        title:'Preventive Maintenance — All Electromechanical Equipment',
        detail:'Periodic lubrication, replacement of fast-moving parts and worn-out parts of all E/M equipment.',
        deadline:'During O&M period',
        evidence:'O&M manual to detail PM schedule for all equipment.' },
      { id:'om3', clause:'Clause 59', status:'pending',
        title:'All Spares and Chemicals During Trial Run and Defect Liability Period',
        detail:'All spares and chemicals during trial run and defect liability at KIPL expense. Includes POL for DG sets.',
        deadline:'During trial run + DLP' },
      { id:'om4', clause:'Clause 64', status:'pending',
        title:'Generator Set During Trial Run — All Running Charges at KIPL',
        detail:'KIPL to install and operate generator set of adequate capacity during trial run. All running charges included.',
        deadline:'During trial run' },
      { id:'om5', clause:'Clause 50', status:'pending',
        title:'Cost Sharing: Electricity by UEED, DG Fuel and Consumables by KIPL',
        detail:'Electricity charges during defect liability and O&M: UEED. All consumables including POL for DG sets: KIPL during DLP and O&M.',
        deadline:'During DLP + O&M',
        evidence:'Cost sharing arrangement confirmed in contract.' },
      { id:'om6', clause:'Clause 63', status:'pending',
        title:'Sludge Disposal — Trial Run + Full 5-Year O&M at KIPL Scope',
        detail:'Disposal of sludge at suitable place is KIPL scope during trial run and entire 5-year O&M. After 5 years handed over to UEED.',
        deadline:'During trial run + O&M',
        evidence:'Sludge disposal site to be identified. Pick-up vehicle more than 2 ton to be provided.' },
      { id:'om7', clause:'Clause 52', status:'pending',
        title:'Joint Inventory Before Handover to UEED',
        detail:'Inventory of all civil, mechanical, electrical and instrumentation installations prepared jointly before handover. System in complete and good working condition.',
        deadline:'At end of O&M period',
        evidence:'Applicable at end of 5-year O&M (approx 2033).' },
      { id:'om8', clause:'Clause 57', status:'pending',
        title:'SCADA System Including DG Sets of Required Capacity',
        detail:'SCADA system as per BOQ/tender specifications. Includes DG sets of required capacity.',
        deadline:'At commissioning',
        evidence:'SCADA design in BEP R3. Awaiting UEED approval.' },
      { id:'om9', clause:'Clause 58', status:'pending',
        title:'Administrative Block cum Laboratory — 100 sqm G+1',
        detail:'Administrative block with laboratory of 100 sqm covered area, G+1 mode, complete with electrical, water supply and sanitary requirements.',
        deadline:'At STP completion',
        evidence:'Lab design in BEP R3. Awaiting approval.' },
      { id:'om10', clause:'Clause 51', status:'partial',
        title:'Formation Level Above HFL (High Flood Level) 9/2014',
        detail:'All STP structures above HFL as per 2014 survey. Design to incorporate bypass arrangements for exigencies.',
        deadline:'Design stage',
        evidence:'Noted in BEP. VSC ground improvement addresses foundation. HFL confirmation needed from LCMA.' },
    ],
  },
]

// ─── Compliance score`

src = src.replace(ANCHOR, NEW_SECTIONS)

fs.writeFileSync(filePath, src)

// Verify
const result = fs.readFileSync(filePath, 'utf8')
const allIds = ['contractual','timeline','eot','payment','quality','insurance',
                'materials','reporting','manpower','equipment','facilities',
                'labour_laws','om_scope']
const missing2 = allIds.filter(id => !result.includes("id:'" + id + "'"))
if (missing2.length > 0) {
  console.error('Verification FAILED — missing:', missing2)
} else {
  console.log('All 13 sections verified. Done.')
}
