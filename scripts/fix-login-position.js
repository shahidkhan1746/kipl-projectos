#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

const LOGIN_START = `\n\n                  {/* Login credentials */}`
const LOGIN_END   = `\n\n              </div>\n              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>\n                <Input label='First Name`

const startIdx = src.indexOf(LOGIN_START)
const endIdx   = src.indexOf(LOGIN_END)

if (startIdx === -1 || endIdx === -1) {
  console.log('Markers not found — LOGIN_START:', startIdx, 'LOGIN_END:', endIdx)
  process.exit(1)
}

const loginBlock = src.slice(startIdx, endIdx)
src = src.slice(0, startIdx) + src.slice(endIdx)

const INSERT_AFTER = `                <Input label='PAN No' value={form.panNo} onChange={e=>setF('panNo',e.target.value)} placeholder='ABCDE1234F' />\n              </div>`
const insertPos = src.indexOf(INSERT_AFTER)

if (insertPos === -1) {
  console.log('PAN insertion point not found')
  process.exit(1)
}

const adjustedBlock = loginBlock.replace(`gridColumn:'1/-1', `, '').replace(`gridColumn:'1/-1',`, '')
src = src.slice(0, insertPos + INSERT_AFTER.length) + '\n' + adjustedBlock + src.slice(insertPos + INSERT_AFTER.length)

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  Login section moved to bottom of Personal Info tab')
