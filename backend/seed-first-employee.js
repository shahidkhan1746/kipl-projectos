#!/usr/bin/env node
/**
 * Seed Gowhar Shah as first employee — KIPL-DL-SXR-001
 * Run from: ~/Desktop/kipl-srinagar/backend/
 */

const { Client } = require('pg')
const crypto = require('crypto')

const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'

const db = new Client({
  host:'localhost', port:5432,
  database:'kipl_projectos',
  user:'kipl_user', password:'PePH6FaCgFYgwEkb4xDy',
})

async function run() {
  await db.connect()

  // Check if already exists
  const { rows: existing } = await db.query(
    `SELECT id FROM employees WHERE emp_code = 'KIPL-DL-SXR-001' LIMIT 1`
  )

  if (existing.length > 0) {
    console.log('ℹ️  KIPL-DL-SXR-001 already exists')
    await db.end()
    return
  }

  // Check columns
  const { rows: cols } = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position`
  )
  const colNames = cols.map(c => c.column_name)
  console.log('Columns:', colNames.join(', '))

  // Build insert
  const data = {
    id:               crypto.randomUUID(),
    project_id:       PROJECT_ID,
    emp_code:         'KIPL-DL-SXR-001',
    first_name:       'Gowhar',
    last_name:        'Shah',
    designation:      'Project Manager',
    department:       'Civil',
    employment_type:  'permanent',
    status:           'active',
    date_of_joining:  '2025-09-27',
    created_at:       new Date(),
    updated_at:       new Date(),
  }

  // Only include columns that exist
  const insertCols = Object.keys(data).filter(k => colNames.includes(k))
  const insertVals = insertCols.map(k => (data as any)[k])
  const placeholders = insertVals.map((_, i) => `$${i+1}`).join(', ')

  await db.query(
    `INSERT INTO employees (${insertCols.join(', ')}) VALUES (${placeholders})`,
    insertVals
  )

  console.log('\n✅  Gowhar Shah added as KIPL-DL-SXR-001')
  console.log('   Project Manager · Civil · Joined 27-Sep-2025')
  console.log('\n   Next employees will be KIPL-DL-SXR-002, 003...\n')

  await db.end()
}

run().catch(async e => {
  console.error('❌', e.message)
  await db.end()
})
