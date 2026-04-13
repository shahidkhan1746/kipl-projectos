#!/usr/bin/env node
/**
 * KIPL ProjectOS — Invoices Backend
 * Adds: invoice.entity.ts, invoice routes in accounting.controller.ts,
 *       invoice methods in accounting.service.ts, registers in accounting.module.ts
 */

const fs   = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ACC  = path.join(ROOT, 'backend', 'src', 'accounting')

let ok = 0
const log  = (m) => { console.log(`  ✅  ${m}`); ok++ }
const err  = (m) => { console.error(`  ❌  ${m}`); process.exit(1) }

// ─────────────────────────────────────────────────────────────────────────────
// 1. invoice.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌  1/4 — invoice.entity.ts\n')

fs.writeFileSync(path.join(ACC, 'invoice.entity.ts'), `
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  projectId: string

  @Column({ nullable: true })
  raNumber: string

  @Column({ type: 'date', nullable: true })
  billDate: string

  @Column({ type: 'date', nullable: true })
  periodFrom: string

  @Column({ type: 'date', nullable: true })
  periodTo: string

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossAmount: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2 })
  tdsPercent: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  tdsAmount: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5 })
  retentionPercent: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  retentionAmount: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  netPayable: number

  @Column({ default: 'draft' })
  status: string   // draft | submitted | approved | paid | rejected

  @Column({ type: 'text', nullable: true })
  remarks: string

  @Column({ nullable: true })
  createdBy: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
`.trimStart())
log('invoice.entity.ts created')

// ─────────────────────────────────────────────────────────────────────────────
// 2. Add invoice methods to accounting.service.ts
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌  2/4 — accounting.service.ts (add invoice methods)\n')

const svcPath = path.join(ACC, 'accounting.service.ts')
let svc = fs.readFileSync(svcPath, 'utf8')

if (svc.includes('listInvoices')) {
  console.log('  ℹ️   Invoice methods already present — skipping')
  ok++
} else {
  // Add Invoice import at top
  svc = svc.replace(
    `import{Injectable}from'@nestjs/common'`,
    `import{Injectable}from'@nestjs/common'\nimport{InjectRepository}from'@nestjs/typeorm'\nimport{Repository}from'typeorm'`
  )

  // If InjectRepository already imported, avoid duplicate
  svc = svc.replace(
    /import\{InjectRepository\}from'@nestjs\/typeorm'\nimport\{InjectRepository\}from'@nestjs\/typeorm'/g,
    `import{InjectRepository}from'@nestjs/typeorm'`
  )
  svc = svc.replace(
    /import\{Repository\}from'typeorm'\nimport\{Repository\}from'typeorm'/g,
    `import{Repository}from'typeorm'`
  )

  // Add Invoice entity import
  svc = svc.replace(
    `import{TdsEntry}from'./tds-entry.entity'`,
    `import{TdsEntry}from'./tds-entry.entity'\nimport{Invoice}from'./invoice.entity'`
  )

  // Inject Invoice repo into constructor
  // Find constructor and add injection
  svc = svc.replace(
    /constructor\(([^)]*)\)/,
    (match, args) => {
      if (args.includes('invoiceRepo')) return match
      const trimmed = args.trim()
      const newArg  = `@InjectRepository(Invoice) private invoiceRepo:Repository<Invoice>`
      return `constructor(${trimmed ? trimmed + ',\n    ' + newArg : newArg})`
    }
  )

  // Append invoice methods before last closing brace
  const invoiceMethods = `

  // ── Invoice (RA Bills) ────────────────────────────────────────────────────
  async listInvoices(q:{projectId?:string,status?:string,limit?:number}){
    const qb = this.invoiceRepo.createQueryBuilder('inv')
    if(q.projectId) qb.andWhere('inv.projectId = :pid',{pid:q.projectId})
    if(q.status)    qb.andWhere('inv.status = :s',{s:q.status})
    if(q.limit)     qb.take(q.limit)
    qb.orderBy('inv.createdAt','DESC')
    return qb.getMany()
  }

  async createInvoice(body:any){
    const inv = this.invoiceRepo.create(body)
    return this.invoiceRepo.save(inv)
  }

  async updateInvoice(id:string,body:any){
    await this.invoiceRepo.update(id,body)
    return this.invoiceRepo.findOne({where:{id}})
  }

  async deleteInvoice(id:string){
    return this.invoiceRepo.delete(id)
  }

  async getInvoice(id:string){
    return this.invoiceRepo.findOne({where:{id}})
  }
`

  // Insert before final closing brace of class
  const lastBrace = svc.lastIndexOf('}')
  svc = svc.slice(0, lastBrace) + invoiceMethods + '\n}'
  fs.writeFileSync(svcPath, svc, 'utf8')
  log('Invoice methods added to accounting.service.ts')
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Add invoice routes to accounting.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌  3/4 — accounting.controller.ts (add invoice routes)\n')

const ctrlPath = path.join(ACC, 'accounting.controller.ts')
let ctrl = fs.readFileSync(ctrlPath, 'utf8')

if (ctrl.includes('invoices')) {
  console.log('  ℹ️   Invoice routes already present — skipping')
  ok++
} else {
  // Add Delete to imports
  ctrl = ctrl.replace(
    `import{Controller,Get,Post,Patch,Param,Body,Query,UseGuards,Request,HttpCode,HttpStatus}from'@nestjs/common'`,
    `import{Controller,Get,Post,Patch,Delete,Param,Body,Query,UseGuards,Request,HttpCode,HttpStatus}from'@nestjs/common'`
  )

  const invoiceRoutes = `
  // ── Invoices (RA Bills) ───────────────────────────────────────────────────
  @Get('invoices')
  listInvoices(@Query()q:any){
    return this.svc.listInvoices({projectId:q.projectId,status:q.status,limit:q.limit?Number(q.limit):undefined})
  }

  @Post('invoices')@HttpCode(HttpStatus.CREATED)
  createInvoice(@Body()body:any,@Request()req:any){
    return this.svc.createInvoice({...body,createdBy:req.user?.id})
  }

  @Get('invoices/:id')
  getInvoice(@Param('id')id:string){return this.svc.getInvoice(id)}

  @Patch('invoices/:id')
  updateInvoice(@Param('id')id:string,@Body()body:any){return this.svc.updateInvoice(id,body)}

  @Delete('invoices/:id')
  deleteInvoice(@Param('id')id:string){return this.svc.deleteInvoice(id)}
`

  const lastBrace = ctrl.lastIndexOf('}')
  ctrl = ctrl.slice(0, lastBrace) + invoiceRoutes + '\n}'
  fs.writeFileSync(ctrlPath, ctrl, 'utf8')
  log('Invoice routes added to accounting.controller.ts')
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Register Invoice entity in accounting.module.ts
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌  4/4 — accounting.module.ts (register Invoice entity)\n')

const modPath = path.join(ACC, 'accounting.module.ts')
let mod = fs.readFileSync(modPath, 'utf8')

if (mod.includes('Invoice')) {
  console.log('  ℹ️   Invoice already registered in module — skipping')
  ok++
} else {
  mod = mod.replace(
    `import{TdsEntry}from'./tds-entry.entity'`,
    `import{TdsEntry}from'./tds-entry.entity'\nimport{Invoice}from'./invoice.entity'`
  )
  mod = mod.replace(
    `TypeOrmModule.forFeature([Vendor,Expense,Transaction,TdsEntry])`,
    `TypeOrmModule.forFeature([Vendor,Expense,Transaction,TdsEntry,Invoice])`
  )
  fs.writeFileSync(modPath, mod, 'utf8')
  log('Invoice entity registered in accounting.module.ts')
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(56))
console.log(`\n🏁  Done — ${ok}/4 steps completed\n`)
console.log('  Now restart the backend:')
console.log('  cd ~/Desktop/kipl-srinagar/backend && npm run start:dev\n')
console.log('  TypeORM will auto-create the invoices table on restart.')
console.log('  Then test: http://localhost:5173/accounting/invoices\n')
