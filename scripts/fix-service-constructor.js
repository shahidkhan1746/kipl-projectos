#!/usr/bin/env node
/**
 * Fix mangled constructor in accounting.service.ts
 * Also adds missing Invoice import
 */

const fs   = require('fs')
const path = require('path')

const svcPath = path.join(
  path.resolve(__dirname, '..'),
  'backend', 'src', 'accounting', 'accounting.service.ts'
)

let src = fs.readFileSync(svcPath, 'utf8')

// ── 1. Fix the broken constructor ────────────────────────────────────────────
const badConstructor = `  constructor(@InjectRepository(Vendor,
    @InjectRepository(Invoice) private invoiceRepo:Repository<Invoice>)      private vendorRepo:  Repository<Vendor>,
    @InjectRepository(Expense)     private expenseRepo: Repository<Expense>,
    @InjectRepository(Transaction) private txnRepo:     Repository<Transaction>,
    @InjectRepository(TdsEntry)    private tdsRepo:     Repository<TdsEntry>,
  ) {}`

const goodConstructor = `  constructor(
    @InjectRepository(Invoice)      private invoiceRepo:  Repository<Invoice>,
    @InjectRepository(Vendor)       private vendorRepo:   Repository<Vendor>,
    @InjectRepository(Expense)      private expenseRepo:  Repository<Expense>,
    @InjectRepository(Transaction)  private txnRepo:      Repository<Transaction>,
    @InjectRepository(TdsEntry)     private tdsRepo:      Repository<TdsEntry>,
  ) {}`

if (src.includes(badConstructor)) {
  src = src.replace(badConstructor, goodConstructor)
  console.log('  ✅  Constructor fixed')
} else {
  // Try a regex approach for any variation
  src = src.replace(
    /constructor\(@InjectRepository\(Vendor,[\s\S]*?\) \{\}/,
    goodConstructor
  )
  console.log('  ✅  Constructor fixed (regex fallback)')
}

// ── 2. Add Invoice import if missing ─────────────────────────────────────────
if (!src.includes(`import{Invoice}`) && !src.includes(`import { Invoice }`)) {
  src = src.replace(
    `import { TdsEntry, TdsSection, TdsStatus } from './tds-entry.entity'`,
    `import { TdsEntry, TdsSection, TdsStatus } from './tds-entry.entity'\nimport { Invoice } from './invoice.entity'`
  )
  console.log('  ✅  Invoice import added')
} else {
  console.log('  ℹ️   Invoice import already present')
}

fs.writeFileSync(svcPath, src, 'utf8')
console.log('\n  Done. Backend should compile now.\n')
