#!/usr/bin/env node
/**
 * KIPL ProjectOS — Password Reset Script
 * Resets ALL user passwords directly in PostgreSQL using bcrypt
 * Run from: ~/Desktop/kipl-srinagar/backend/
 */

const { Client } = require('pg')
const bcrypt     = require('bcrypt')

// New passwords — simple and role-specific
const ROLE_PASSWORDS = {
  super_admin:     'Kipl@SuperAdmin1',
  project_manager: 'Kipl@PM2025',
  liaison_officer: 'Kipl@Liaison1',
  hr_officer:      'Kipl@HR2025',
  engineer:        'Kipl@Eng2025',
  accounts:        'Kipl@Acc2025',
  qa_engineer:     'Kipl@QA2025',
  supervisor:      'Kipl@Sup2025',
}

const DEFAULT_FALLBACK = 'Kipl@1234'

async function main() {
  const client = new Client({
    host:     'localhost',
    port:     5432,
    database: 'kipl_projectos',
    user:     'kipl_user',
    password: 'PePH6FaCgFYgwEkb4xDy',
  })

  await client.connect()
  console.log('\n✅  Connected to kipl_projectos\n')

  // Get all users
  const { rows: users } = await client.query(
    'SELECT id, name, email, role FROM users ORDER BY role'
  )

  if (users.length === 0) {
    console.log('⚠️  No users found in database. Run the seeder first.\n')
    await client.end()
    return
  }

  console.log(`Found ${users.length} user(s). Resetting passwords...\n`)

  const results = []

  for (const user of users) {
    const plainPassword = ROLE_PASSWORDS[user.role] ?? DEFAULT_FALLBACK
    const hashed        = await bcrypt.hash(plainPassword, 10)

    await client.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashed, user.id]
    )

    results.push({
      Name:     user.name,
      Email:    user.email,
      Role:     user.role,
      Password: plainPassword,
    })

    console.log(`  ✅  ${user.role.padEnd(18)} ${user.email}`)
  }

  await client.end()

  // Print credentials table
  console.log('\n' + '═'.repeat(72))
  console.log('  KIPL ProjectOS — Login Credentials')
  console.log('═'.repeat(72))
  console.log(`  ${'Role'.padEnd(20)} ${'Email'.padEnd(30)} Password`)
  console.log('  ' + '─'.repeat(68))
  results.forEach(r => {
    console.log(`  ${r.Role.padEnd(20)} ${r.Email.padEnd(30)} ${r.Password}`)
  })
  console.log('═'.repeat(72))
  console.log('\n  🌐  Login at: http://localhost:5173/login\n')
}

main().catch(e => {
  console.error('\n❌  Error:', e.message)
  console.error('\nTroubleshooting:')
  console.error('  1. Make sure PostgreSQL is running')
  console.error('  2. Run from inside ~/Desktop/kipl-srinagar/backend/')
  console.error('  3. Make sure bcrypt is installed: npm install bcrypt\n')
  process.exit(1)
})
