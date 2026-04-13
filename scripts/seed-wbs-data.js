#!/usr/bin/env node
const { Client } = require('pg')
const crypto = require('crypto')

const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const db = new Client({ host:'localhost', port:5432, database:'kipl_projectos', user:'kipl_user', password:'PePH6FaCgFYgwEkb4xDy' })

async function getColumns() {
  const { rows } = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='wbs_tasks' ORDER BY ordinal_position`)
  return rows.map(r => r.column_name)
}

async function seed() {
  await db.connect()
  console.log('\n✅  Connected\n')
  const cols = await getColumns()
  console.log('Columns:', cols.join(', '), '\n')

  await db.query(`DELETE FROM wbs_tasks WHERE project_id=$1`, [PROJECT_ID])
  console.log('🗑️  Cleared existing WBS tasks\n')

  const has = n => cols.includes(n)
  const taskCode     = has('task_code') ? 'task_code' : has('code') ? 'code' : null
  const isMilestone  = has('is_milestone') ? 'is_milestone' : null
  const plannedStart = has('planned_start') ? 'planned_start' : null
  const plannedEnd   = has('planned_end') ? 'planned_end' : null
  const actualStart  = has('actual_start') ? 'actual_start' : null
  const actualEnd    = has('actual_end') ? 'actual_end' : null
  const delayDays    = has('delay_days') ? 'delay_days' : has('eot_days') ? 'eot_days' : null
  const delayReason  = has('delay_reason') ? 'delay_reason' : null
  const delayCat     = has('delay_category') ? 'delay_category' : null
  const progressPct  = has('progress_pct') ? 'progress_pct' : null
  const sortOrder    = has('sort_order') ? 'sort_order' : null
  const category     = has('category') ? 'category' : null
  const responsible  = has('responsible_stakeholder') ? 'responsible_stakeholder' : null

  async function ins(t) {
    const c = ['id','project_id','title','status','created_at','updated_at']
    const v = [crypto.randomUUID(), PROJECT_ID, t.title, t.status, new Date(), new Date()]
    const add = (col, val) => { if(col && val !== undefined && val !== null){ c.push(col); v.push(val) } }
    add(taskCode, t.code)
    add('description', t.desc||null)
    add(isMilestone, t.ms??false)
    add(plannedStart, t.ps||null)
    add(plannedEnd, t.pe||null)
    add(actualStart, t.as||null)
    add(actualEnd, t.ae||null)
    add(delayDays, t.delay||null)
    add(delayReason, t.reason||null)
    add(delayCat, t.cat||null)
    add(progressPct, t.pct??0)
    add(sortOrder, t.sort||0)
    add(category, t.category||null)
    add(responsible, t.resp||null)
    const ph = v.map((_,i)=>`$${i+1}`).join(',')
    await db.query(`INSERT INTO wbs_tasks (${c.join(',')}) VALUES (${ph})`, v)
    process.stdout.write('.')
  }

  const WP = [
    {code:'P-01',title:'Site Readiness / Pre-Construction',desc:'Land, permissions, access',ps:'2025-09-27',pe:'2026-03-31',pct:100,status:'completed',sort:1,category:'civil'},
    {code:'P-02',title:'Design & Approvals',desc:'DPR, vetting, UEED approval',ps:'2025-10-01',pe:'2026-06-30',pct:40,status:'in_progress',sort:2,category:'design'},
    {code:'P-03',title:'STP Civil Works',desc:'RCC structures, 38.5 MLD STP',ps:'2026-04-01',pe:'2027-06-30',pct:0,status:'not_started',sort:3,category:'civil'},
    {code:'P-04',title:'E&M Works',desc:'Pumps, SCADA, 30 MLD',ps:'2026-10-01',pe:'2027-09-30',pct:0,status:'not_started',sort:4,category:'mechanical'},
    {code:'P-05',title:'Commissioning & O&M',desc:'Trial run 6 months + O&M 5 years',ps:'2027-10-01',pe:'2028-03-27',pct:0,status:'not_started',sort:5,category:'commissioning'},
  ]
  const TASKS = [
    {code:'T-01',title:'Initial Site Development',ps:'2025-10-10',pe:'2025-11-09',as:'2025-12-20',ae:'2025-12-31',delay:52,reason:'Site not handed over by LCMA',cat:'Land',pct:100,status:'completed',sort:10,resp:'LCMA',category:'civil'},
    {code:'T-02',title:'Land Allotment',ps:'2025-10-29',pe:'2025-11-28',as:'2025-10-29',ae:'2025-12-17',delay:19,reason:'Land under auction by LCMA',cat:'Land',pct:100,status:'completed',sort:11,resp:'LCMA',category:'civil'},
    {code:'T-03',title:'Tree Cutting Permission',ps:'2025-11-22',pe:'2025-12-02',as:'2025-12-06',ae:null,delay:39,reason:'Forest clearance pending',cat:'Statutory',pct:60,status:'in_progress',sort:12,resp:'LCMA',category:'civil'},
    {code:'T-04',title:'Soil Testing & Investigation',ps:'2025-10-18',pe:'2025-10-28',as:'2025-12-06',ae:'2025-12-10',delay:43,reason:'Access not available due to land issue',cat:'Land',pct:100,status:'completed',sort:13,resp:'LCMA',category:'civil'},
    {code:'T-05',title:'DPR Preparation & Survey',ps:'2025-10-01',pe:'2026-01-31',as:'2025-11-07',ae:null,delay:0,pct:40,status:'in_progress',sort:20,resp:'KIPL',category:'design'},
    {code:'T-06',title:'Design Vetting (IIT/NIT Srinagar)',ps:'2026-01-01',pe:'2026-04-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:21,resp:'IIT/NIT',category:'design'},
    {code:'T-07',title:'UEED Design Approval',ps:'2026-04-01',pe:'2026-06-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:22,resp:'UEED',category:'design'},
    {code:'T-08',title:'STP Civil Works — Foundation & RCC',ps:'2026-04-01',pe:'2026-12-31',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:30,resp:'KIPL',category:'civil'},
    {code:'T-09',title:'Sewerage Network — Phase 1 (105 km)',ps:'2026-04-01',pe:'2026-12-31',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:31,resp:'KIPL',category:'civil'},
    {code:'T-10',title:'IPS/MPS Civil Construction',ps:'2026-06-01',pe:'2026-12-31',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:32,resp:'KIPL',category:'civil'},
    {code:'T-11',title:'Sewerage Network — Phase 2 (105 km)',ps:'2027-01-01',pe:'2027-06-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:33,resp:'KIPL',category:'civil'},
    {code:'T-12',title:'E&M Installation — Pumps & Motors',ps:'2026-10-01',pe:'2027-06-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:40,resp:'KIPL',category:'mechanical'},
    {code:'T-13',title:'SCADA & Instrumentation',ps:'2027-01-01',pe:'2027-09-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:41,resp:'KIPL',category:'mechanical'},
    {code:'T-14',title:'Rising Main & Outfall Structure',ps:'2026-10-01',pe:'2027-06-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:42,resp:'KIPL',category:'mechanical'},
    {code:'T-15',title:'Hydraulic Testing & Pre-commissioning',ps:'2027-07-01',pe:'2027-09-30',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:50,resp:'KIPL',category:'commissioning'},
    {code:'T-16',title:'6-Month Free Trial Run',ps:'2027-10-01',pe:'2028-03-27',as:null,ae:null,delay:0,pct:0,status:'not_started',sort:51,resp:'KIPL/UEED',category:'commissioning'},
  ]
  const MS = [
    {code:'M-01',title:'Site Ready',ms:true,ps:'2025-11-15',pe:'2025-11-15',ae:'2025-12-31',delay:46,reason:'Land allotment delayed by LCMA',pct:100,status:'completed',sort:100},
    {code:'M-02',title:'Design Approved by UEED',ms:true,ps:'2026-06-30',pe:'2026-06-30',ae:null,delay:0,pct:0,status:'not_started',sort:101},
    {code:'M-03',title:'STP Civil Works Complete',ms:true,ps:'2027-03-31',pe:'2027-03-31',ae:null,delay:0,pct:0,status:'not_started',sort:102},
    {code:'M-04',title:'Full Network Complete',ms:true,ps:'2027-06-30',pe:'2027-06-30',ae:null,delay:0,pct:0,status:'not_started',sort:103},
    {code:'M-05',title:'Trial Run Start',ms:true,ps:'2027-10-01',pe:'2027-10-01',ae:null,delay:0,pct:0,status:'not_started',sort:104},
    {code:'M-06',title:'Trial Run Complete / Handover',ms:true,ps:'2028-03-27',pe:'2028-03-27',ae:null,delay:0,pct:0,status:'not_started',sort:105},
  ]

  console.log('Inserting work packages...')
  for(const t of WP) await ins(t)
  console.log('\nInserting tasks...')
  for(const t of TASKS) await ins(t)
  console.log('\nInserting milestones...')
  for(const t of MS) await ins(t)

  const {rows} = await db.query(`SELECT COUNT(*) FROM wbs_tasks WHERE project_id=$1`,[PROJECT_ID])
  console.log(`\n\n✅  Seeded ${rows[0].count} WBS items (5 packages + 16 tasks + 6 milestones)\n`)
  await db.end()
}

seed().catch(async e => { console.error('\n❌', e.message); await db.end() })
