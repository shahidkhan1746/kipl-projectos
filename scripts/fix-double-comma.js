#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const f = path.resolve(__dirname, '..', 'frontend', 'src', 'api', 'accounting.api.ts')
let src = fs.readFileSync(f, 'utf8')

// Remove any double commas
src = src.replace(/,\s*,/g, ',')

fs.writeFileSync(f, src, 'utf8')
console.log('✅  Fixed double comma in accounting.api.ts')
