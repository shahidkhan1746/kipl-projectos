const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const EMPLOYEE_ID = 'd269cb39-5464-49e9-af60-e0b6fa743813' // Shahid Khan (KIPL-ADM-1339)
const USER_ID = 'b2e0a12f-7828-46db-95a2-685cb71c6350'
const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96' // Dal Lake Sewerage Scheme

const TIMESHEET_DATA = [
  // --- APRIL 2026: Initial Architecture & Monorepo Infrastructure ---
  {
    date: '2026-04-13',
    workDoneSummary: 'ProjectOS initial architecture setup, monorepo configuration, deployment pipelines, and auth foundation.',
    activities: [
      { time: '09:30', activity: 'Initialized ProjectOS monorepo structure, configured tsconfig, linting, and root build scripts.', category: 'Administrative Work', location: 'Head Office' },
      { time: '12:00', activity: 'Configured deployment pipelines, environment parameters, and container start memory boundaries.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:30', activity: 'Implemented authentication service, token lifecycle, and production dist bundling.', category: 'Administrative Work', location: 'Head Office' },
      { time: '18:15', activity: 'Verified production web deployment, SPA routing rewrites, and client API communication.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-04-14',
    workDoneSummary: 'Developed milestone-based RA Bill Wizard, PDF generation service, and Dal Lake sewerage component billing rules.',
    activities: [
      { time: '10:00', activity: 'Designed milestone-based RA Bill generation wizard supporting progressive contractor billing.', category: 'STP Work', location: 'Head Office' },
      { time: '13:30', activity: 'Built PDFKit document generator architecture for RA bills and interim payment certificates.', category: 'Report Preparation', location: 'Head Office' },
      { time: '16:00', activity: 'Configured 4 sewer sub-packages and 20% electro-mechanical billing cap to avoid duplicate allocations.', category: 'STP Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-04-15',
    workDoneSummary: 'Enhanced RA Bill Wizard with hybrid pricing logic (auto-fetch contract rates + manual quoted rate override).',
    activities: [
      { time: '11:00', activity: 'Architected hybrid rate calculation engine allowing contract BOQ rates with selective manual item overrides.', category: 'BOQ / Estimation', location: 'Head Office' },
      { time: '15:30', activity: 'Integrated client validation rules and error guards for subcontractor measurement bill entries.', category: 'STP Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-04-16',
    workDoneSummary: 'Completed RA Bill Wizard PDF generation and reconciled Dal Lake BOQ item allotment values.',
    activities: [
      { time: '10:30', activity: 'Finalized RA Bill export layout with itemized quantity breakdowns, previous claimed, and net payable.', category: 'Report Preparation', location: 'Head Office' },
      { time: '14:45', activity: 'Audited and adjusted contract BOQ allotment quantities and rate endpoints for tender alignment.', category: 'BOQ / Estimation', location: 'Head Office' }
    ]
  },
  {
    date: '2026-04-18',
    workDoneSummary: 'Standardized EPC financial stat cards, tender cost banners, BOQ reseeding, and RA bill status controls.',
    activities: [
      { time: '10:00', activity: 'Refactored EPC summary dashboard: relabeled stat cards to Quoted Works Cost and cumulative billing.', category: 'Administrative Work', location: 'Head Office' },
      { time: '13:15', activity: 'Implemented RA bill status state-machine (Draft, Submitted, Approved, Paid) with role confirmations.', category: 'Administrative Work', location: 'Head Office' },
      { time: '16:30', activity: 'Built compact action controls, BOQ reseed mechanism for tender allotment < ₹250 Cr.', category: 'BOQ / Estimation', location: 'Head Office' }
    ]
  },

  // --- MAY 2026: Critical Path Method (CPM) & Project Scheduling ---
  {
    date: '2026-05-07',
    workDoneSummary: 'Built CPM scheduling engine, PERT calculations, progress report PDF exports, and cycle-safe graph recursion.',
    activities: [
      { time: '10:00', activity: 'Designed WBS Critical Path Method (CPM) dependency network calculation algorithm with early/late start & slack.', category: 'STP Work', location: 'Head Office' },
      { time: '14:00', activity: 'Engineered cycle-safe graph traversal preventing recursive dependency locks on WBS predecessors.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:30', activity: 'Implemented multi-page progress report PDF export with automated pagination and executive charts.', category: 'Report Preparation', location: 'Head Office' }
    ]
  },

  // --- JULY 2026: Rebranding, Fleet Management, Liaison Tracking & WBS ---
  {
    date: '2026-07-27',
    workDoneSummary: 'Rebranded ERP to KIPL Srinagar, implemented Fleet & Plant module, money-in receipts, and role-based access control.',
    activities: [
      { time: '09:30', activity: 'Executed design overhaul: rebranded system to KIPL Srinagar with refreshed typography and color scheme.', category: 'Administrative Work', location: 'Head Office' },
      { time: '12:30', activity: 'Developed Fleet & Heavy Plant register tracking site tippers, excavators, and fuel logs.', category: 'Site Supervision', location: 'Srinagar Site Office' },
      { time: '15:45', activity: 'Added client Money-In receipt tracking to accounting module for RA bill payments and advances.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:45', activity: 'Strengthened Role-Based Access Control (RBAC) across financial mutations and document deletions.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-07-29',
    workDoneSummary: 'Built Liaison file tracking workflow, interactive CPM network/PERT charts, and accounting vendor CRUD.',
    activities: [
      { time: '09:30', activity: 'Developed Liaison file tracking workflow: departmental NOC submissions, status tracking, and file closures.', category: 'Liaison / Government Office', location: 'Head Office' },
      { time: '12:30', activity: 'Rendered interactive CPM topological graph and PERT S-curve using ECharts for tender milestone tracking.', category: 'STP Work', location: 'Head Office' },
      { time: '15:15', activity: 'Built vendor master directory with category filtering, bank account tracking, and GSTIN/PAN validations.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:00', activity: 'Standardized iconography app-wide using Phosphor icons, removing emoji artifacts across tables.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-07-30',
    workDoneSummary: 'Implemented WBS dependency network (FS/SS/FF/SF), Liaison EOT register, and Project Updates authoring console.',
    activities: [
      { time: '10:00', activity: 'Built multi-type WBS dependency network (Finish-to-Start, Start-to-Start, Finish-to-Finish with lag offsets).', category: 'STP Work', location: 'Head Office' },
      { time: '13:00', activity: 'Created Extension of Time (EOT) register linking department delay letters to critical path delays.', category: 'Liaison / Government Office', location: 'Head Office' },
      { time: '16:00', activity: 'Implemented author-controlled Project Updates system with live inline editing and multimedia support.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },

  // --- AUGUST 2026: Site Diaries, AI Assistant, Knowledge Vault & Mobile Responsive ---
  {
    date: '2026-08-01',
    workDoneSummary: 'Added site diary tender compliance registers (materials, cement/steel, site order book) and O&M preventive maintenance schedule.',
    activities: [
      { time: '09:30', activity: 'Enhanced Site Diary to satisfy tender Clause 23: integrated cement/steel daily consumption register.', category: 'Site Supervision', location: 'Srinagar Site Office' },
      { time: '12:00', activity: 'Built Site Order Book module for Superintending Engineer / Client site inspection observations.', category: 'Quality Check / QA', location: 'Srinagar Site Office' },
      { time: '15:00', activity: 'Designed Operations & Maintenance (O&M) preventive maintenance schedule for STP electromechanical plant.', category: 'STP Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-12',
    workDoneSummary: 'Integrated AI assistant features: meeting minutes generator, received-letter summarizer, and EOT narrative creator.',
    activities: [
      { time: '09:30', activity: 'Engineered AI prompt pipelines for automated synthesis of project meeting minutes and action items.', category: 'Meeting / Coordination', location: 'Head Office' },
      { time: '12:30', activity: 'Built incoming government letter summarizer with automated draft response generator for Liaison team.', category: 'Liaison / Government Office', location: 'Head Office' },
      { time: '15:30', activity: 'Implemented Clause 16 Extension of Time (EOT) narrative generator grounded in WBS milestone lags.', category: 'Report Preparation', location: 'Head Office' },
      { time: '17:30', activity: 'Added monthly attendance muster roll export to PDF and spreadsheet format.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-13',
    workDoneSummary: 'Developed AI Key management (BYOK), multi-provider failover, and frontend chunk error recovery.',
    activities: [
      { time: '10:00', activity: 'Implemented secure Bring-Your-Own-Key (BYOK) settings console for Google Gemini and OpenAI models.', category: 'Administrative Work', location: 'Head Office' },
      { time: '14:00', activity: 'Built frontend auto-recovery from stale production JS chunk mismatches following live deployments.', category: 'Administrative Work', location: 'Head Office' },
      { time: '16:45', activity: 'Tested AI model response validation and JSON schema adherence for project diagnostics.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-19',
    workDoneSummary: 'Engineered true Hybrid Search (Postgres FTS + Vector Embeddings) with Reciprocal Rank Fusion (RRF) for project archives.',
    activities: [
      { time: '09:30', activity: 'Constructed hybrid information retrieval architecture combining PostgreSQL pg_trgm FTS and vector embeddings.', category: 'Administrative Work', location: 'Head Office' },
      { time: '13:30', activity: 'Implemented Reciprocal Rank Fusion (RRF) algorithm to rank contract tender clauses and technical specs.', category: 'Administrative Work', location: 'Head Office' },
      { time: '16:30', activity: 'Verified retrieval precision against Dal Lake STP contract agreements and technical drawings.', category: 'Quality Check / QA', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-21',
    workDoneSummary: 'Refined system-wide UI layout, normalized modal action bars, spinner sizes, and responsive form alignments.',
    activities: [
      { time: '10:00', activity: 'Audit and normalization of modal footers and save/cancel button placements across all 15 modules.', category: 'Administrative Work', location: 'Head Office' },
      { time: '14:00', activity: 'Optimized table horizontal scrolling and responsive behavior on site tablets and laptops.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:00', activity: 'Resolved component layout regressions in Procurement and WBS timeline views.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-23',
    workDoneSummary: 'Hardened Knowledge Vault entity normalization and grounding verification against hallucinated site metrics.',
    activities: [
      { time: '10:30', activity: 'Implemented strict entity disambiguation rules in AI retrieval (preventing false matches between staff names).', category: 'Administrative Work', location: 'Head Office' },
      { time: '14:30', activity: 'Built citation grounding verification ensuring all generated reports cite specific document chunk IDs.', category: 'Report Preparation', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-24',
    workDoneSummary: 'Strengthened AI assistant pipeline resilience, streaming timeout recovery, and automated replay test suite.',
    activities: [
      { time: '10:00', activity: 'Extended frontend chat timeouts and added exponential backoff on cold-start API delays.', category: 'Administrative Work', location: 'Head Office' },
      { time: '14:30', activity: 'Created automated forensic test suite to verify contract question answering across site diaries.', category: 'Quality Check / QA', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-25',
    workDoneSummary: 'Enhanced Site Diary with automated AI summary synthesis and role-based staff access permissions.',
    activities: [
      { time: '11:00', activity: 'Integrated daily site diary progress summarizer providing executive daily overviews to senior management.', category: 'Site Supervision', location: 'Srinagar Site Office' },
      { time: '15:00', activity: 'Refined access permissions for junior engineers, allowing draft entries with senior engineer approval gates.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-26',
    workDoneSummary: 'Conducted comprehensive mobile responsive overhaul of site engineer forms and field inspection tools.',
    activities: [
      { time: '10:00', activity: 'Optimized touch targets, card layouts, and bottom navigation on mobile devices for field engineers.', category: 'Site Supervision', location: 'Srinagar Site Office' },
      { time: '14:30', activity: 'Streamlined quick-capture forms for daily labour attendance and material delivery challans.', category: 'Material Inspection', location: 'Srinagar Site Office' }
    ]
  },
  {
    date: '2026-08-28',
    workDoneSummary: 'Implemented cloud storage configuration security, sensitive key masking, and asset upload reliability.',
    activities: [
      { time: '10:30', activity: 'Hardened cloud storage integration (Cloudinary / S3) with automatic credentials masking in UI.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:00', activity: 'Tested multi-file attachment handling for lab test certificates and heavy plant inspection records.', category: 'Quality Check / QA', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-29',
    workDoneSummary: 'Standardized date handling and display formatting (DD/MM/YYYY) across all project records and tables.',
    activities: [
      { time: '10:00', activity: 'Unified date serialization across backend API responses to eliminate UTC-to-local timezone day offsets.', category: 'Administrative Work', location: 'Head Office' },
      { time: '14:30', activity: 'Standardized Indian standard date presentation (DD MMM YYYY) across accounting, diary, and HR.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-08-31',
    workDoneSummary: 'Generated monthly HR muster rolls with official Khilari letterhead branding and compliance sign-offs.',
    activities: [
      { time: '11:00', activity: 'Embedded high-resolution Khilari corporate branding on monthly labour and staff muster roll reports.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:30', activity: 'Audited August monthly staff attendance, leave deductions, and field deployment allocations.', category: 'Labour Management', location: 'Srinagar Site Office' }
    ]
  },

  // --- SEPTEMBER 2026: Tender Milestones, Master Data, Procurement & Accounting Overhaul ---
  {
    date: '2026-09-02',
    workDoneSummary: 'Optimized WBS Gantt and PERT charts to align strictly with Dal Lake STP contract Tender Clause 8.1.',
    activities: [
      { time: '10:00', activity: 'Aligned WBS activity hierarchy with tender milestone gates (Civil Basins, Sewer Network, IPS-1 to IPS-9).', category: 'STP Work', location: 'Head Office' },
      { time: '14:30', activity: 'Configured automated liquidated damages (LD) threshold warnings based on critical path slips.', category: 'BOQ / Estimation', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-03',
    workDoneSummary: 'Added dynamic WBS Remodeling engine supporting Start-to-Start (SS) constraints and variable lag days.',
    activities: [
      { time: '10:30', activity: 'Engineered live "Re-model (SS+lag)" scheduling solver allowing parallel pipelaying during trench shoring.', category: 'STP Work', location: 'Head Office' },
      { time: '15:00', activity: 'Validated non-destructive milestone adjustments for monsoon and winter low-temperature construction windows.', category: 'STP Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-04',
    workDoneSummary: 'Stabilized automated test suite, mobile attendance check-out edge cases, and temporal anchors.',
    activities: [
      { time: '10:00', activity: 'Fixed timezone-dependent test regressions in daily attendance and check-out calculators.', category: 'Quality Check / QA', location: 'Head Office' },
      { time: '14:30', activity: 'Audited integration test suite coverage across authentication, authorization, and financial math.', category: 'Quality Check / QA', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-07',
    workDoneSummary: 'Fixed mobile authentication crash vectors, cold-start handling, and token renewal resilience.',
    activities: [
      { time: '11:00', activity: 'Diagnosed and fixed edge-case crash during mobile token expiry renewal over slow 3G site connections.', category: 'Administrative Work', location: 'Srinagar Site Office' },
      { time: '15:30', activity: 'Enhanced login error modal with clear diagnostics and auto-retry capabilities for field staff.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-08',
    workDoneSummary: 'Optimized mobile numerical calculations, preventing Infinity sentinels in percentage progress bars.',
    activities: [
      { time: '10:30', activity: 'Sanitized mathematical boundary conditions (divide-by-zero on 0 budget items) in project progress gauges.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:00', activity: 'Streamlined mobile dashboard card rendering to improve framerate and memory consumption on phones.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-09',
    workDoneSummary: 'Implemented dual theme mobile dashboard rendering and optimized site inspection responsiveness.',
    activities: [
      { time: '10:00', activity: 'Refined mobile dashboard layout and high-contrast styling for outdoor high-sunlight site inspections.', category: 'Site Supervision', location: 'Srinagar Site Office' },
      { time: '14:30', activity: 'Tested field data entry across tablet devices for Dal Lake Intermediate Pumping Stations (IPS).', category: 'Site Supervision', location: 'Srinagar Site Office' }
    ]
  },
  {
    date: '2026-09-10',
    workDoneSummary: 'Executed comprehensive database hardening, employee user-ID linking, and Anantnag project initialization.',
    activities: [
      { time: '09:30', activity: 'Hardened database relations: linked employee identities to system login accounts.', category: 'Administrative Work', location: 'Head Office' },
      { time: '13:00', activity: 'Configured seed parameters and baseline contract structure for upcoming Anantnag project.', category: 'Administrative Work', location: 'Head Office' },
      { time: '16:00', activity: 'Implemented automated schema migration runner verifying database indexes on startup.', category: 'Quality Check / QA', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-11',
    workDoneSummary: 'Engineered project schedule benchmarking engine: actual work executed vs planned baseline S-curve.',
    activities: [
      { time: '10:00', activity: 'Constructed benchmarking calculator comparing physical progress against contract baseline schedule.', category: 'STP Work', location: 'Head Office' },
      { time: '14:30', activity: 'Generated monthly progress variance report for client review meeting with Chief Engineer.', category: 'Meeting / Coordination', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-12',
    workDoneSummary: 'Added live production health commit reporting, verified database TLS certificates, and validated session tokens.',
    activities: [
      { time: '10:00', activity: 'Built /health endpoint metadata reporting active commit hash, build timestamp, and migration status.', category: 'Quality Check / QA', location: 'Head Office' },
      { time: '14:00', activity: 'Verified end-to-end database TLS encryption with pooler connection resilience.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-14',
    workDoneSummary: 'Hardened Postgres TLS handshake settings and updated production database connection pools.',
    activities: [
      { time: '11:00', activity: 'Configured database TLS verification parameters to prevent SSL self-signed chain rejection on Render.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:00', activity: 'Optimized connection pool parameters to prevent pool starvation during multi-user reporting queries.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-15',
    workDoneSummary: 'Tuned authentication rate-limiting, eliminated false 429 lockouts, and smoothed cold-start login UX.',
    activities: [
      { time: '09:30', activity: 'Increased login throttle rate limits from 5 to 15 per minute to prevent false 429 locks for site engineers.', category: 'Administrative Work', location: 'Head Office' },
      { time: '12:30', activity: 'Engineered optimistic pre-warm ping on login screen to wake hibernated cloud backend.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:30', activity: 'Fixed public website hero video loading and added high-res WebP poster fallback.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-17',
    workDoneSummary: 'Added diagnostic report error boundaries and descriptive failure feedback on PDF report generation.',
    activities: [
      { time: '10:00', activity: 'Built error boundary system for PDF document generation reporting specific calculation or memory faults.', category: 'Quality Check / QA', location: 'Head Office' },
      { time: '14:30', activity: 'Validated daily site diary PDF generation across multiple months with image attachments.', category: 'Report Preparation', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-18',
    workDoneSummary: 'Integrated Clause 55 Material Register row editing, concrete strength prediction engine, and procurement indents.',
    activities: [
      { time: '09:30', activity: 'Inspected deep trench piling works and dewatering operations at Dal Lake sewer network site.', category: 'Site Supervision', location: 'Srinagar Site Office' },
      { time: '12:30', activity: 'Engineered inline row editing and Clause 55 material consumption report generation in Material Register.', category: 'Material Inspection', location: 'Head Office' },
      { time: '15:30', activity: 'Integrated machine-learning concrete compressive strength predictor for 7-day and 28-day cube tests.', category: 'Quality Check / QA', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-19',
    workDoneSummary: 'Built Master Data console, 13-column Payment Requisition system, GRN module, 3-way matching, and notifications center.',
    activities: [
      { time: '09:30', activity: 'Architected KIPL 13-column Payment Requisition system with GST, TDS, and retention deductions.', category: 'Administrative Work', location: 'Head Office' },
      { time: '12:30', activity: 'Developed Goods Received Note (GRN) module with 3-way matching against Purchase Orders and vendor invoices.', category: 'Material Inspection', location: 'Head Office' },
      { time: '15:30', activity: 'Built centralized Master Data & Dropdowns management console with real-time application-wide sync.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:30', activity: 'Implemented operational event notification center with unread counters and interactive drawer.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-20',
    workDoneSummary: 'Reconciled and seeded Alamdar Stone Crusher Bill 005 and Bill 1090 across material registers, GRNs, and POs.',
    activities: [
      { time: '10:00', activity: 'Reconciled Alamdar Stone Crusher Bill 005 and Bill 1090 delivery challans against site weighbridge slips.', category: 'Material Inspection', location: 'Srinagar Site Office' },
      { time: '14:00', activity: 'Seeded 18 tipper delivery trips of CTSB and bajari into Material Register with PO and GRN links.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:00', activity: 'Updated material catalog with standardized stone aggregate specifications (63mm downgrade, Khak Bajri).', category: 'Material Inspection', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-21',
    workDoneSummary: 'Seeded Alamdar GST Invoices 1101–1110 (₹42.22L), Bill 1101 (₹40.58L), fixed Render cold-start 429s, and startup migrations.',
    activities: [
      { time: '09:30', activity: 'Audited and seeded Alamdar official GST Invoices 1101–1110 (5,361 MT Bajari, ₹42.22L) in accounting ledger.', category: 'Administrative Work', location: 'Head Office' },
      { time: '12:30', activity: 'Seeded Alamdar Bill 1101 (1,28,825 cft CTSB, ₹40.58L) and auto-generated 17 linked site diaries.', category: 'Site Supervision', location: 'Head Office' },
      { time: '15:30', activity: 'Solved Render free-tier cold-start rate-limit locks (429) via adaptive background keepalive.', category: 'Administrative Work', location: 'Head Office' },
      { time: '17:45', activity: 'Configured automated schema migrations on application startup to ensure database-code synchronicity.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-22',
    workDoneSummary: 'Implemented ML roadmap: QA cube lab tests, fleet >2-sigma fuel anomaly detection, and adaptive device recognition.',
    activities: [
      { time: '10:00', activity: 'Built QA Cube Testing Lab module with automated 7-day & 28-day compressive strength tracking and curve charts.', category: 'Quality Check / QA', location: 'Head Office' },
      { time: '14:00', activity: 'Engineered fleet statistical fuel anomaly detector flagging equipment consumption exceeding 2 standard deviations.', category: 'Site Supervision', location: 'Head Office' },
      { time: '16:30', activity: 'Implemented adaptive device recognition and cold-start resilient session persistence in frontend.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-23',
    workDoneSummary: 'Built scannable ID card QR verification portal, high-res QR asset downloads, and custom palette branding.',
    activities: [
      { time: '10:00', activity: 'Architected public employee ID verification portal at /verify/id/:code with tamper-evident visual verification.', category: 'Administrative Work', location: 'Head Office' },
      { time: '13:30', activity: 'Built scannable QR download engine generating 600dpi SVG/PNG QR assets with embedded KIPL center logo.', category: 'Administrative Work', location: 'Head Office' },
      { time: '16:00', activity: 'Designed custom corporate color palettes (Navy, Emerald, Black) for field ID badge printing.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-24',
    workDoneSummary: 'Expanded cloud cold-start retry window to 90s, built persistent system error logs & diagnostic troubleshooting infrastructure.',
    activities: [
      { time: '09:30', activity: 'Diagnosed persistent blue/red cold-start login banner on production; expanded retry window to 90s.', category: 'Administrative Work', location: 'Head Office' },
      { time: '12:00', activity: 'Built persistent system error logging infrastructure with automated capture of API 500s and frontend crashes.', category: 'Quality Check / QA', location: 'Head Office' },
      { time: '15:30', activity: 'Conducted Tier-1 EPC benchmark audit of accounting module against SAP S/4HANA, Primavera, and Procore.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-25',
    workDoneSummary: 'Architected STP Turnkey 4-Date Engine, CBDT 23/2017 TDS deduction fix, subcontractor contra-deductions, and Site Imprest float.',
    activities: [
      { time: '09:30', activity: 'Engineered 4-Date Ledger Engine (Document Date, Received Date, Posting Date, Due Date) eliminating late-bill balance skew.', category: 'STP Work', location: 'Head Office' },
      { time: '12:30', activity: 'Fixed statutory TDS deduction base to exclude GST per CBDT Circular 23/2017, preventing ₹3,600 overwithholding per ₹10L.', category: 'Administrative Work', location: 'Head Office' },
      { time: '15:00', activity: 'Added subcontractor free-issue contra deductions (cement/diesel recoveries) and credit term calculations.', category: 'STP Work', location: 'Head Office' },
      { time: '17:30', activity: 'Developed Revolving Site Imprest / Cash Float engine with bank cash-out tracking and voucher settlements.', category: 'Administrative Work', location: 'Head Office' }
    ]
  },
  {
    date: '2026-09-26',
    workDoneSummary: 'Audited personal work history across git commits and production audit logs; reconciled and seeded timesheet ledger.',
    activities: [
      { time: '09:30', activity: 'Extracted and verified chronological work history across 50+ commits and 120+ database audit logs.', category: 'Administrative Work', location: 'Head Office' },
      { time: '11:30', activity: 'Standardized timesheet employee linkages and reconciled historical development and site administration records.', category: 'Labour Management', location: 'Head Office' }
    ]
  }
]

async function main() {
  const ssl = { rejectUnauthorized: false }
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl,
  })
  await client.connect()

  console.log(`Starting timesheet seeding for Shahid Khan (Emp ID: ${EMPLOYEE_ID})...`)
  console.log(`Total timesheet entries to process: ${TIMESHEET_DATA.length}`)

  let insertedCount = 0
  let updatedCount = 0

  for (const entry of TIMESHEET_DATA) {
    const existing = await client.query(
      `SELECT id FROM timesheets WHERE employee_id = $1 AND date = $2`,
      [EMPLOYEE_ID, entry.date]
    )

    if (existing.rows.length > 0) {
      // Update existing entry with rich activities and summary
      await client.query(
        `UPDATE timesheets 
         SET activities = $1, 
             work_done_summary = $2, 
             attendance_status = 'present',
             status = 'approved',
             approved_by = $3,
             approved_at = NOW(),
             project_id = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          JSON.stringify(entry.activities),
          entry.workDoneSummary,
          USER_ID,
          PROJECT_ID,
          existing.rows[0].id
        ]
      )
      updatedCount++
      console.log(`✓ Updated [${entry.date}]: ${entry.workDoneSummary.slice(0, 50)}...`)
    } else {
      // Insert new approved timesheet entry
      await client.query(
        `INSERT INTO timesheets 
         (employee_id, project_id, date, activities, attendance_status, work_done_summary, status, approved_by, approved_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'present', $5, 'approved', $6, NOW(), NOW(), NOW())`,
        [
          EMPLOYEE_ID,
          PROJECT_ID,
          entry.date,
          JSON.stringify(entry.activities),
          entry.workDoneSummary,
          USER_ID
        ]
      )
      insertedCount++
      console.log(`+ Inserted [${entry.date}]: ${entry.workDoneSummary.slice(0, 50)}...`)
    }
  }

  console.log(`\n=== SEEDING COMPLETE ===`)
  console.log(`Newly inserted: ${insertedCount}`)
  console.log(`Updated existing: ${updatedCount}`)
  console.log(`Total active timesheets: ${insertedCount + updatedCount}`)

  // Verify total count in DB
  const verifyRes = await client.query(
    `SELECT COUNT(*) FROM timesheets WHERE employee_id = $1`,
    [EMPLOYEE_ID]
  )
  console.log(`Verified timesheets for Shahid Khan in DB: ${verifyRes.rows[0].count}`)

  await client.end()
}

main().catch(err => {
  console.error('Seeding error:', err)
  process.exit(1)
})
