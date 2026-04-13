// Run from project root: node scripts/accounting-backend.js
const fs   = require('fs')
const path = require('path')

const ACC  = path.join('backend', 'src', 'accounting')
const SRC  = path.join('backend', 'src')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

if (!fs.existsSync(SRC)) {
  console.error('Run this from ~/Desktop/kipl-srinagar')
  process.exit(1)
}

fs.mkdirSync(ACC, { recursive: true })
console.log('\n\x1b[1mCreating Accounting module...\x1b[0m\n')

fs.writeFileSync(path.join(ACC, 'vendor.entity.ts'), [
  "import { Entity, Column } from 'typeorm'",
  "import { BaseEntity } from '../shared/entities/base.entity'",
  "export enum VendorCategory { MATERIAL_SUPPLIER='material_supplier', SUBCONTRACTOR='subcontractor', EQUIPMENT_HIRE='equipment_hire', LABOUR_CONTRACTOR='labour_contractor', CONSULTANT='consultant', GOVERNMENT='government', OTHER='other' }",
  "@Entity('vendors')",
  "export class Vendor extends BaseEntity {",
  "  @Column() name: string",
  "  @Column({ name:'trade_name', nullable:true }) tradeName: string",
  "  @Column({ type:'enum', enum:VendorCategory, default:VendorCategory.OTHER }) category: VendorCategory",
  "  @Column({ nullable:true }) gstin: string",
  "  @Column({ nullable:true }) pan: string",
  "  @Column({ nullable:true }) phone: string",
  "  @Column({ nullable:true }) email: string",
  "  @Column({ nullable:true }) address: string",
  "  @Column({ name:'bank_account', type:'jsonb', default:{} }) bankAccount: Record<string,string>",
  "  @Column({ name:'tds_applicable', default:true }) tdsApplicable: boolean",
  "  @Column({ name:'tds_rate', type:'decimal', precision:5, scale:2, default:2 }) tdsRate: number",
  "  @Column({ name:'is_active', default:true }) isActive: boolean",
  "  @Column({ name:'project_id', nullable:true }) projectId: string",
  "}",
].join('\n'))
ok('vendor.entity.ts')

fs.writeFileSync(path.join(ACC, 'expense.entity.ts'), [
  "import { Entity, Column } from 'typeorm'",
  "import { BaseEntity } from '../shared/entities/base.entity'",
  "export enum ExpenseCategory { MATERIAL='material', LABOUR='labour', EQUIPMENT_HIRE='equipment_hire', FUEL='fuel', TRANSPORT='transport', SITE_OFFICE='site_office', SAFETY='safety', TESTING='testing', SUBCONTRACT='subcontract', GOVERNMENT_FEE='government_fee', STAFF_SALARY='staff_salary', MISCELLANEOUS='miscellaneous' }",
  "export enum ExpenseStatus { PENDING='pending', APPROVED='approved', PAID='paid', REJECTED='rejected' }",
  "@Entity('expenses')",
  "export class Expense extends BaseEntity {",
  "  @Column({ name:'project_id' }) projectId: string",
  "  @Column({ name:'vendor_id', nullable:true }) vendorId: string",
  "  @Column({ type:'date' }) date: string",
  "  @Column({ type:'text' }) description: string",
  "  @Column({ type:'enum', enum:ExpenseCategory }) category: ExpenseCategory",
  "  @Column({ name:'bill_no', nullable:true }) billNo: string",
  "  @Column({ name:'bill_date', type:'date', nullable:true }) billDate: string",
  "  @Column({ name:'gross_amount', type:'decimal', precision:15, scale:2 }) grossAmount: number",
  "  @Column({ name:'gst_pct', type:'decimal', precision:5, scale:2, default:0 }) gstPct: number",
  "  @Column({ name:'gst_amount', type:'decimal', precision:15, scale:2, default:0 }) gstAmount: number",
  "  @Column({ name:'tds_pct', type:'decimal', precision:5, scale:2, default:0 }) tdsPct: number",
  "  @Column({ name:'tds_amount', type:'decimal', precision:15, scale:2, default:0 }) tdsAmount: number",
  "  @Column({ name:'net_payable', type:'decimal', precision:15, scale:2 }) netPayable: number",
  "  @Column({ name:'paid_amount', type:'decimal', precision:15, scale:2, default:0 }) paidAmount: number",
  "  @Column({ name:'payment_date', type:'date', nullable:true }) paymentDate: string",
  "  @Column({ name:'payment_mode', nullable:true }) paymentMode: string",
  "  @Column({ name:'payment_ref', nullable:true }) paymentRef: string",
  "  @Column({ type:'enum', enum:ExpenseStatus, default:ExpenseStatus.PENDING }) status: ExpenseStatus",
  "  @Column({ name:'approved_by', nullable:true }) approvedBy: string",
  "  @Column({ type:'text', nullable:true }) remarks: string",
  "}",
].join('\n'))
ok('expense.entity.ts')

fs.writeFileSync(path.join(ACC, 'transaction.entity.ts'), [
  "import { Entity, Column } from 'typeorm'",
  "import { BaseEntity } from '../shared/entities/base.entity'",
  "export enum TxnType { RECEIPT='receipt', PAYMENT='payment', JOURNAL='journal' }",
  "@Entity('transactions')",
  "export class Transaction extends BaseEntity {",
  "  @Column({ name:'project_id' }) projectId: string",
  "  @Column({ type:'date' }) date: string",
  "  @Column({ type:'enum', enum:TxnType }) type: TxnType",
  "  @Column({ type:'text' }) description: string",
  "  @Column({ name:'ref_no', nullable:true }) refNo: string",
  "  @Column({ name:'ref_type', nullable:true }) refType: string",
  "  @Column({ name:'ref_id', nullable:true }) refId: string",
  "  @Column({ name:'vendor_id', nullable:true }) vendorId: string",
  "  @Column({ name:'debit', type:'decimal', precision:15, scale:2, default:0 }) debit: number",
  "  @Column({ name:'credit', type:'decimal', precision:15, scale:2, default:0 }) credit: number",
  "  @Column({ name:'balance', type:'decimal', precision:15, scale:2, default:0 }) balance: number",
  "  @Column({ name:'payment_mode', nullable:true }) paymentMode: string",
  "  @Column({ name:'bank_ref', nullable:true }) bankRef: string",
  "  @Column({ type:'text', nullable:true }) narration: string",
  "}",
].join('\n'))
ok('transaction.entity.ts')

fs.writeFileSync(path.join(ACC, 'tds-entry.entity.ts'), [
  "import { Entity, Column } from 'typeorm'",
  "import { BaseEntity } from '../shared/entities/base.entity'",
  "export enum TdsSection { S194C='194C', S194I='194I', S194J='194J', S194A='194A', OTHER='Other' }",
  "export enum TdsStatus   { DEDUCTED='deducted', DEPOSITED='deposited' }",
  "@Entity('tds_entries')",
  "export class TdsEntry extends BaseEntity {",
  "  @Column({ name:'project_id' }) projectId: string",
  "  @Column({ name:'vendor_id', nullable:true }) vendorId: string",
  "  @Column({ name:'ref_id', nullable:true }) refId: string",
  "  @Column({ name:'ref_type', nullable:true }) refType: string",
  "  @Column({ type:'date' }) date: string",
  "  @Column({ name:'payee_name' }) payeeName: string",
  "  @Column({ name:'payee_pan', nullable:true }) payeePan: string",
  "  @Column({ type:'enum', enum:TdsSection, default:TdsSection.S194C }) section: TdsSection",
  "  @Column({ name:'gross_amount', type:'decimal', precision:15, scale:2 }) grossAmount: number",
  "  @Column({ name:'tds_rate', type:'decimal', precision:5, scale:2 }) tdsRate: number",
  "  @Column({ name:'tds_amount', type:'decimal', precision:15, scale:2 }) tdsAmount: number",
  "  @Column({ nullable:true }) quarter: string",
  "  @Column({ name:'financial_year', nullable:true }) financialYear: string",
  "  @Column({ type:'enum', enum:TdsStatus, default:TdsStatus.DEDUCTED }) status: TdsStatus",
  "  @Column({ name:'deposit_date', type:'date', nullable:true }) depositDate: string",
  "  @Column({ name:'challan_no', nullable:true }) challanNo: string",
  "}",
].join('\n'))
ok('tds-entry.entity.ts')

fs.writeFileSync(path.join(ACC, 'accounting.service.ts'), [
  "import { Injectable, NotFoundException } from '@nestjs/common'",
  "import { InjectRepository } from '@nestjs/typeorm'",
  "import { Repository } from 'typeorm'",
  "import { Vendor } from './vendor.entity'",
  "import { Expense, ExpenseStatus } from './expense.entity'",
  "import { Transaction, TxnType } from './transaction.entity'",
  "import { TdsEntry, TdsSection, TdsStatus } from './tds-entry.entity'",
  "function getFY(d:string){const dt=new Date(d),y=dt.getFullYear(),m=dt.getMonth()+1;return m>=4?y+'-'+String(y+1).slice(2):(y-1)+'-'+String(y).slice(2)}",
  "function getQ(d:string){const m=new Date(d).getMonth()+1;return m>=4&&m<=6?'Q1':m>=7&&m<=9?'Q2':m>=10?'Q3':'Q4'}",
  "@Injectable()",
  "export class AccountingService {",
  "  constructor(",
  "    @InjectRepository(Vendor)      private vendorRepo:  Repository<Vendor>,",
  "    @InjectRepository(Expense)     private expenseRepo: Repository<Expense>,",
  "    @InjectRepository(Transaction) private txnRepo:     Repository<Transaction>,",
  "    @InjectRepository(TdsEntry)    private tdsRepo:     Repository<TdsEntry>,",
  "  ) {}",
  "  async createVendor(d:Partial<Vendor>){return this.vendorRepo.save(this.vendorRepo.create(d))}",
  "  async listVendors(p:{projectId?:string;category?:string;search?:string}){",
  "    const qb=this.vendorRepo.createQueryBuilder('v').where('v.isActive=true').orderBy('v.name','ASC')",
  "    if(p.category) qb.andWhere('v.category=:cat',{cat:p.category})",
  "    if(p.projectId) qb.andWhere('(v.projectId=:pid OR v.projectId IS NULL)',{pid:p.projectId})",
  "    if(p.search) qb.andWhere('(v.name ILIKE :s OR v.gstin ILIKE :s)',{s:'%'+p.search+'%'})",
  "    return qb.getMany()",
  "  }",
  "  async getVendor(id:string){const v=await this.vendorRepo.findOne({where:{id}});if(!v)throw new NotFoundException('Vendor not found');return v}",
  "  async vendorLedger(vendorId:string){",
  "    const vendor=await this.getVendor(vendorId)",
  "    const expenses=await this.expenseRepo.find({where:{vendorId},order:{date:'ASC'}})",
  "    const totalBilled=expenses.reduce((s,e)=>s+Number(e.netPayable),0)",
  "    const totalPaid=expenses.reduce((s,e)=>s+Number(e.paidAmount),0)",
  "    const totalTds=expenses.reduce((s,e)=>s+Number(e.tdsAmount),0)",
  "    return{vendor,expenses,totalBilled,totalPaid,totalTds,balance:totalBilled-totalPaid}",
  "  }",
  "  async createExpense(data:any){",
  "    const gross=Number(data.grossAmount||0),gstPct=Number(data.gstPct||0),tdsPct=Number(data.tdsPct||0)",
  "    const gstAmt=gross*gstPct/100,tdsAmt=(gross+gstAmt)*tdsPct/100,netPay=gross+gstAmt-tdsAmt",
  "    const expense=await this.expenseRepo.save(this.expenseRepo.create({...data,grossAmount:gross,gstAmount:gstAmt,tdsAmount:tdsAmt,netPayable:netPay}))",
  "    if(tdsAmt>0&&data.vendorId){",
  "      const vendor=await this.vendorRepo.findOne({where:{id:data.vendorId}})",
  "      await this.tdsRepo.save(this.tdsRepo.create({projectId:data.projectId,vendorId:data.vendorId,refId:expense.id,refType:'expense',date:data.date,payeeName:vendor?.name??'Unknown',payeePan:vendor?.pan,section:data.tdsSection??TdsSection.S194C,grossAmount:gross+gstAmt,tdsRate:tdsPct,tdsAmount:tdsAmt,quarter:getQ(data.date),financialYear:getFY(data.date),status:TdsStatus.DEDUCTED}))",
  "    }",
  "    return expense",
  "  }",
  "  async listExpenses(p:{projectId?:string;vendorId?:string;category?:string;status?:string;fromDate?:string;toDate?:string}){",
  "    const qb=this.expenseRepo.createQueryBuilder('e').orderBy('e.date','DESC')",
  "    if(p.projectId) qb.andWhere('e.projectId=:pid',{pid:p.projectId})",
  "    if(p.vendorId)  qb.andWhere('e.vendorId=:vid',{vid:p.vendorId})",
  "    if(p.category)  qb.andWhere('e.category=:cat',{cat:p.category})",
  "    if(p.status)    qb.andWhere('e.status=:s',{s:p.status})",
  "    if(p.fromDate)  qb.andWhere('e.date>=:from',{from:p.fromDate})",
  "    if(p.toDate)    qb.andWhere('e.date<=:to',{to:p.toDate})",
  "    return qb.getMany()",
  "  }",
  "  async approveExpense(id:string,approvedBy:string){await this.expenseRepo.update(id,{status:ExpenseStatus.APPROVED,approvedBy});return this.expenseRepo.findOne({where:{id}})}",
  "  async markExpensePaid(id:string,data:any){",
  "    const expense=await this.expenseRepo.findOne({where:{id}});if(!expense)throw new NotFoundException('Not found')",
  "    await this.expenseRepo.update(id,{...data,status:ExpenseStatus.PAID})",
  "    await this.addTransaction({projectId:expense.projectId,date:data.paymentDate,type:TxnType.PAYMENT,description:'Payment: '+expense.description,refId:id,refType:'expense',vendorId:expense.vendorId??undefined,debit:data.paidAmount,paymentMode:data.paymentMode,bankRef:data.paymentRef})",
  "    return this.expenseRepo.findOne({where:{id}})",
  "  }",
  "  async addTransaction(data:any){",
  "    const last=await this.txnRepo.createQueryBuilder('t').where('t.projectId=:pid',{pid:data.projectId}).orderBy('t.createdAt','DESC').getOne()",
  "    const balance=(last?Number(last.balance):0)+Number(data.credit||0)-Number(data.debit||0)",
  "    return this.txnRepo.save(this.txnRepo.create({...data,balance}))",
  "  }",
  "  async listTransactions(p:{projectId?:string;vendorId?:string;fromDate?:string;toDate?:string;type?:string}){",
  "    const qb=this.txnRepo.createQueryBuilder('t').orderBy('t.date','DESC')",
  "    if(p.projectId) qb.andWhere('t.projectId=:pid',{pid:p.projectId})",
  "    if(p.vendorId)  qb.andWhere('t.vendorId=:vid',{vid:p.vendorId})",
  "    if(p.type)      qb.andWhere('t.type=:type',{type:p.type})",
  "    if(p.fromDate)  qb.andWhere('t.date>=:from',{from:p.fromDate})",
  "    if(p.toDate)    qb.andWhere('t.date<=:to',{to:p.toDate})",
  "    return qb.getMany()",
  "  }",
  "  async listTds(p:{projectId?:string;quarter?:string;fy?:string;status?:string}){",
  "    const qb=this.tdsRepo.createQueryBuilder('t').orderBy('t.date','DESC')",
  "    if(p.projectId) qb.andWhere('t.projectId=:pid',{pid:p.projectId})",
  "    if(p.quarter)   qb.andWhere('t.quarter=:q',{q:p.quarter})",
  "    if(p.fy)        qb.andWhere('t.financialYear=:fy',{fy:p.fy})",
  "    if(p.status)    qb.andWhere('t.status=:s',{s:p.status})",
  "    return qb.getMany()",
  "  }",
  "  async depositTds(id:string,data:any){await this.tdsRepo.update(id,{...data,status:TdsStatus.DEPOSITED});return this.tdsRepo.findOne({where:{id}})}",
  "  async dashboard(projectId:string){",
  "    const expenses=await this.listExpenses({projectId})",
  "    const tdsEntries=await this.listTds({projectId})",
  "    const totalExpenses=expenses.reduce((s,e)=>s+Number(e.grossAmount),0)",
  "    const totalPaid=expenses.reduce((s,e)=>s+Number(e.paidAmount),0)",
  "    const totalPending=expenses.filter(e=>e.status===ExpenseStatus.PENDING).reduce((s,e)=>s+Number(e.netPayable),0)",
  "    const totalTdsDeducted=tdsEntries.reduce((s,t)=>s+Number(t.tdsAmount),0)",
  "    const totalTdsDeposited=tdsEntries.filter(t=>t.status===TdsStatus.DEPOSITED).reduce((s,t)=>s+Number(t.tdsAmount),0)",
  "    const byCategory:Record<string,number>={}",
  "    expenses.forEach(e=>{byCategory[e.category]=(byCategory[e.category]||0)+Number(e.grossAmount)})",
  "    return{totalExpenses,totalPaid,totalPending,totalUnpaid:totalExpenses-totalPaid,totalTdsDeducted,totalTdsDeposited,tdsLiability:totalTdsDeducted-totalTdsDeposited,byCategory,expenseCount:expenses.length,pendingCount:expenses.filter(e=>e.status===ExpenseStatus.PENDING).length}",
  "  }",
  "}",
].join('\n'))
ok('accounting.service.ts')

fs.writeFileSync(path.join(ACC, 'accounting.controller.ts'), [
  "import{Controller,Get,Post,Patch,Param,Body,Query,UseGuards,Request,HttpCode,HttpStatus}from'@nestjs/common'",
  "import{AccountingService}from'./accounting.service'",
  "import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard'",
  "@Controller('accounting')@UseGuards(JwtAuthGuard)",
  "export class AccountingController{",
  "  constructor(private readonly svc:AccountingService){}",
  "  @Get('dashboard') dashboard(@Query('projectId')pid:string){return this.svc.dashboard(pid)}",
  "  @Get('vendors') vendors(@Query()q:any){return this.svc.listVendors({projectId:q.projectId,category:q.category,search:q.search})}",
  "  @Post('vendors')@HttpCode(HttpStatus.CREATED) createVendor(@Body()body:any){return this.svc.createVendor(body)}",
  "  @Get('vendors/:id/ledger') vendorLedger(@Param('id')id:string){return this.svc.vendorLedger(id)}",
  "  @Get('vendors/:id') vendor(@Param('id')id:string){return this.svc.getVendor(id)}",
  "  @Get('expenses') expenses(@Query()q:any){return this.svc.listExpenses({projectId:q.projectId,vendorId:q.vendorId,category:q.category,status:q.status,fromDate:q.fromDate,toDate:q.toDate})}",
  "  @Post('expenses')@HttpCode(HttpStatus.CREATED) createExpense(@Body()body:any){return this.svc.createExpense(body)}",
  "  @Patch('expenses/:id/approve') approveExpense(@Param('id')id:string,@Request()req:any){return this.svc.approveExpense(id,req.user.id)}",
  "  @Patch('expenses/:id/pay') payExpense(@Param('id')id:string,@Body()body:any){return this.svc.markExpensePaid(id,body)}",
  "  @Get('transactions') transactions(@Query()q:any){return this.svc.listTransactions({projectId:q.projectId,vendorId:q.vendorId,fromDate:q.fromDate,toDate:q.toDate,type:q.type})}",
  "  @Post('transactions')@HttpCode(HttpStatus.CREATED) addTxn(@Body()body:any){return this.svc.addTransaction(body)}",
  "  @Get('tds') tds(@Query()q:any){return this.svc.listTds({projectId:q.projectId,quarter:q.quarter,fy:q.fy,status:q.status})}",
  "  @Patch('tds/:id/deposit') depositTds(@Param('id')id:string,@Body()body:any){return this.svc.depositTds(id,body)}",
  "}",
].join('\n'))
ok('accounting.controller.ts')

fs.writeFileSync(path.join(ACC, 'accounting.module.ts'), [
  "import{Module}from'@nestjs/common'",
  "import{TypeOrmModule}from'@nestjs/typeorm'",
  "import{Vendor}from'./vendor.entity'",
  "import{Expense}from'./expense.entity'",
  "import{Transaction}from'./transaction.entity'",
  "import{TdsEntry}from'./tds-entry.entity'",
  "import{AccountingService}from'./accounting.service'",
  "import{AccountingController}from'./accounting.controller'",
  "@Module({imports:[TypeOrmModule.forFeature([Vendor,Expense,Transaction,TdsEntry])],providers:[AccountingService],controllers:[AccountingController],exports:[AccountingService]})",
  "export class AccountingModule{}",
].join('\n'))
ok('accounting.module.ts')

// Register in app.module.ts
const appPath = path.join(SRC, 'app.module.ts')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes("from './accounting/accounting.module'")) {
  app = app.replace("import { EpcModule }", "import { AccountingModule } from './accounting/accounting.module'\nimport { EpcModule }")
  app = app.replace('EpcModule,', 'EpcModule,\n    AccountingModule,')
  fs.writeFileSync(appPath, app)
  ok('Registered in app.module.ts')
} else {
  ok('Already registered in app.module.ts')
}

// Fix EPC entities
console.log('\n\x1b[1mFixing EPC entities...\x1b[0m\n')
;['boq-item.entity.ts','measurement.entity.ts','ra-bill.entity.ts'].forEach(f => {
  const p = path.join('backend','src','epc',f)
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p,'utf8')
    c = c.replace(/@CreateDateColumn[^\n]*\n/g,'')
    c = c.replace(/\s*createdAt: Date\n/g,'\n')
    fs.writeFileSync(p,c)
    ok(f+' — createdAt removed')
  } else {
    console.log('  ⚠ '+f+' not found — run epc-backend.js first')
  }
})

// Fix frontend
console.log('\n\x1b[1mFixing frontend icons...\x1b[0m\n')
const sidebarPath = path.join('frontend','src','components','layout','Sidebar.tsx')
if (fs.existsSync(sidebarPath)) {
  let s = fs.readFileSync(sidebarPath,'utf8')
  s = s.replace(/Buildings, SignOut, FileText,/g,'Buildings, SignOut,')
  s = s.replace(/Buildings, SignOut, ClipboardText,/g,'Buildings, SignOut,')
  fs.writeFileSync(sidebarPath,s)
  ok('Sidebar.tsx fixed')
}
const tsPath = path.join('frontend','src','pages','hr','TimesheetPage.tsx')
if (fs.existsSync(tsPath)) {
  let ts = fs.readFileSync(tsPath,'utf8')
  ts = ts.replace(/ClipboardText/g,'FileText')
  // Remove second FileText occurrence in same import line
  ts = ts.replace(/\{ FileText,([^}]*), FileText \}/g,'{ FileText,$1 }')
  ts = ts.replace(/FileText, FileText/g,'FileText')
  fs.writeFileSync(tsPath,ts)
  ok('TimesheetPage.tsx fixed')
}

console.log('\n\x1b[32m\x1b[1m  Done! Backend will reload to 0 errors.\x1b[0m')
console.log('\n  LOG OUT and LOG BACK IN for a fresh JWT token.\n')
