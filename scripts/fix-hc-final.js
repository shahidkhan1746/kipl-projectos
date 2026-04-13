#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

// 1. Fix health-check.js — tasks URL and email
const hc = path.resolve(__dirname, '..', 'scripts', 'health-check.js')
let src = fs.readFileSync(hc, 'utf8')

// Fix email
src = src.replace(/admin@kipl\.com/g, 'admin@kipl.in')

// Fix tasks paths - replace literal string
src = src.replace(
  "{ label: 'Tasks — List',                  path: `/tasks${P}` }",
  "{ label: 'Tasks — List',                  path: `/tasks-board${P}` }"
)
src = src.replace(
  "{ label: 'Tasks — Board',                 path: `/tasks${P}` }",
  "{ label: 'Tasks — Board',                 path: `/tasks-board/dashboard${P}` }"
)

fs.writeFileSync(hc, src)
console.log('✅  health-check.js fixed')

// 2. Show current tasks paths to verify
console.log('\nTasks lines now:')
src.split('\n').filter(l => l.includes('Tasks')).forEach(l => console.log(' ', l.trim()))
