#!/usr/bin/env node
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const db = new Client({
  host:'localhost', port:5432,
  database:'kipl_projectos',
  user:'kipl_user', password:'PePH6FaCgFYgwEkb4xDy'
})

async function run() {
  await db.connect()

  // Restore all inactive users
  await db.query(`UPDATE users SET is_active = true WHERE is_active = false OR is_active IS NULL`)
  console.log('✅  All users reactivated')

  // Show all users
  const { rows } = await db.query(`SELECT name, email, role, is_active FROM users ORDER BY name`)
  console.log('\nAll users:')
  rows.forEach(r => console.log(` ${r.is_active ? '✅' : '❌'} ${r.name.padEnd(20)} ${r.email.padEnd(25)} ${r.role}`))

  await db.end()

  // Fix users.service.ts to return ALL users for management
  const svcPath = path.resolve(__dirname, '..', 'backend', 'src', 'users', 'users.service.ts')
  let svc = fs.readFileSync(svcPath, 'utf8')
  svc = svc.replace(
    `findAll() {\n    return this.repo.find({ where: { isActive: true }, order: { name: 'ASC' } })`,
    `findAll(includeInactive = false) {\n    return this.repo.find({ where: includeInactive ? undefined : { isActive: true }, order: { name: 'ASC' } })`
  )
  // Also handle if already modified
  svc = svc.replace(
    `findAll(includeInactive = false) {\n    return this.repo.find({ where: includeInactive ? {} : { isActive: true }, order: { name: 'ASC' } })`,
    `findAll(includeInactive = false) {\n    return this.repo.find({ where: includeInactive ? undefined : { isActive: true }, order: { name: 'ASC' } })`
  )
  fs.writeFileSync(svcPath, svc, 'utf8')
  console.log('\n✅  users.service.ts — findAll now accepts includeInactive param')

  // Fix controller to pass true
  const ctrlPath = path.resolve(__dirname, '..', 'backend', 'src', 'users', 'users.controller.ts')
  let ctrl = fs.readFileSync(ctrlPath, 'utf8')
  ctrl = ctrl.replace(
    `findAll() { return this.usersService.findAll() }`,
    `findAll() { return this.usersService.findAll(true) }`
  )
  fs.writeFileSync(ctrlPath, ctrl, 'utf8')
  console.log('✅  users.controller.ts — returns all users including inactive')
  console.log('\n🏁  Done — refresh browser to see all users\n')
}

run().catch(async e => { console.error('❌', e.message); await db.end() })
