import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Vendor } from './vendor.entity'
import { Expense, ExpenseStatus } from './expense.entity'
import { Transaction, TxnType } from './transaction.entity'
import { TdsEntry, TdsSection, TdsStatus } from './tds-entry.entity'
import { Invoice } from './invoice.entity'
function getFY(d:string){const dt=new Date(d),y=dt.getFullYear(),m=dt.getMonth()+1;return m>=4?y+'-'+String(y+1).slice(2):(y-1)+'-'+String(y).slice(2)}
function getQ(d:string){const m=new Date(d).getMonth()+1;return m>=4&&m<=6?'Q1':m>=7&&m<=9?'Q2':m>=10?'Q3':'Q4'}
@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(Invoice)      private invoiceRepo:  Repository<Invoice>,
    @InjectRepository(Vendor)       private vendorRepo:   Repository<Vendor>,
    @InjectRepository(Expense)      private expenseRepo:  Repository<Expense>,
    @InjectRepository(Transaction)  private txnRepo:      Repository<Transaction>,
    @InjectRepository(TdsEntry)     private tdsRepo:      Repository<TdsEntry>,
  ) {}
  async createVendor(d:Partial<Vendor>){return this.vendorRepo.save(this.vendorRepo.create(d))}
  async listVendors(p:{projectId?:string;category?:string;search?:string}){
    const qb=this.vendorRepo.createQueryBuilder('v').where('v.isActive=true').orderBy('v.name','ASC')
    if(p.category) qb.andWhere('v.category=:cat',{cat:p.category})
    if(p.projectId) qb.andWhere('(v.projectId=:pid OR v.projectId IS NULL)',{pid:p.projectId})
    if(p.search) qb.andWhere('(v.name ILIKE :s OR v.gstin ILIKE :s)',{s:'%'+p.search+'%'})
    return qb.getMany()
  }
  async getVendor(id:string){const v=await this.vendorRepo.findOne({where:{id}});if(!v)throw new NotFoundException('Vendor not found');return v}
  async vendorLedger(vendorId:string){
    const vendor=await this.getVendor(vendorId)
    const expenses=await this.expenseRepo.find({where:{vendorId},order:{date:'ASC'}})
    const totalBilled=expenses.reduce((s,e)=>s+Number(e.netPayable),0)
    const totalPaid=expenses.reduce((s,e)=>s+Number(e.paidAmount),0)
    const totalTds=expenses.reduce((s,e)=>s+Number(e.tdsAmount),0)
    return{vendor,expenses,totalBilled,totalPaid,totalTds,balance:totalBilled-totalPaid}
  }
  async createExpense(data:any){
    const gross=Number(data.grossAmount||0),gstPct=Number(data.gstPct||0),tdsPct=Number(data.tdsPct||0)
    const gstAmt=gross*gstPct/100,tdsAmt=(gross+gstAmt)*tdsPct/100,netPay=gross+gstAmt-tdsAmt
    const expense=await this.expenseRepo.save(this.expenseRepo.create({...data,grossAmount:gross,gstAmount:gstAmt,tdsAmount:tdsAmt,netPayable:netPay}))
    if(tdsAmt>0&&data.vendorId){
      const vendor=await this.vendorRepo.findOne({where:{id:data.vendorId}})
      await this.tdsRepo.save(this.tdsRepo.create({projectId:data.projectId,vendorId:data.vendorId,refId:(expense as any).id,refType:'expense',date:data.date,payeeName:vendor?.name??'Unknown',payeePan:vendor?.pan,section:data.tdsSection??TdsSection.S194C,grossAmount:gross+gstAmt,tdsRate:tdsPct,tdsAmount:tdsAmt,quarter:getQ(data.date),financialYear:getFY(data.date),status:TdsStatus.DEDUCTED}))
    }
    return expense
  }
  async listExpenses(p:{projectId?:string;vendorId?:string;category?:string;status?:string;fromDate?:string;toDate?:string}){
    const qb=this.expenseRepo.createQueryBuilder('e').orderBy('e.date','DESC')
    if(p.projectId) qb.andWhere('e.projectId=:pid',{pid:p.projectId})
    if(p.vendorId)  qb.andWhere('e.vendorId=:vid',{vid:p.vendorId})
    if(p.category)  qb.andWhere('e.category=:cat',{cat:p.category})
    if(p.status)    qb.andWhere('e.status=:s',{s:p.status})
    if(p.fromDate)  qb.andWhere('e.date>=:from',{from:p.fromDate})
    if(p.toDate)    qb.andWhere('e.date<=:to',{to:p.toDate})
    return qb.getMany()
  }
  async approveExpense(id:string,approvedBy:string){await this.expenseRepo.update(id,{status:ExpenseStatus.APPROVED,approvedBy});return this.expenseRepo.findOne({where:{id}})}
  async markExpensePaid(id:string,data:any){
    const expense=await this.expenseRepo.findOne({where:{id}});if(!expense)throw new NotFoundException('Not found')
    await this.expenseRepo.update(id,{...data,status:ExpenseStatus.PAID})
    await this.addTransaction({projectId:expense.projectId,date:data.paymentDate,type:TxnType.PAYMENT,description:'Payment: '+expense.description,refId:id,refType:'expense',vendorId:expense.vendorId??undefined,debit:data.paidAmount,paymentMode:data.paymentMode,bankRef:data.paymentRef})
    return this.expenseRepo.findOne({where:{id}})
  }
  async addTransaction(data:any){
    const last=await this.txnRepo.createQueryBuilder('t').where('t.projectId=:pid',{pid:data.projectId}).orderBy('t.createdAt','DESC').getOne()
    const balance=(last?Number(last.balance):0)+Number(data.credit||0)-Number(data.debit||0)
    return this.txnRepo.save(this.txnRepo.create({...data,balance}))
  }
  async listTransactions(p:{projectId?:string;vendorId?:string;fromDate?:string;toDate?:string;type?:string}){
    const qb=this.txnRepo.createQueryBuilder('t').orderBy('t.date','DESC')
    if(p.projectId) qb.andWhere('t.projectId=:pid',{pid:p.projectId})
    if(p.vendorId)  qb.andWhere('t.vendorId=:vid',{vid:p.vendorId})
    if(p.type)      qb.andWhere('t.type=:type',{type:p.type})
    if(p.fromDate)  qb.andWhere('t.date>=:from',{from:p.fromDate})
    if(p.toDate)    qb.andWhere('t.date<=:to',{to:p.toDate})
    return qb.getMany()
  }
  async listTds(p:{projectId?:string;quarter?:string;fy?:string;status?:string}){
    const qb=this.tdsRepo.createQueryBuilder('t').orderBy('t.date','DESC')
    if(p.projectId) qb.andWhere('t.projectId=:pid',{pid:p.projectId})
    if(p.quarter)   qb.andWhere('t.quarter=:q',{q:p.quarter})
    if(p.fy)        qb.andWhere('t.financialYear=:fy',{fy:p.fy})
    if(p.status)    qb.andWhere('t.status=:s',{s:p.status})
    return qb.getMany()
  }
  async depositTds(id:string,data:any){await this.tdsRepo.update(id,{...data,status:TdsStatus.DEPOSITED});return this.tdsRepo.findOne({where:{id}})}
  async dashboard(projectId:string){
    const expenses=await this.listExpenses({projectId})
    const tdsEntries=await this.listTds({projectId})
    const totalExpenses=expenses.reduce((s,e)=>s+Number(e.grossAmount),0)
    const totalPaid=expenses.reduce((s,e)=>s+Number(e.paidAmount),0)
    const totalPending=expenses.filter(e=>e.status===ExpenseStatus.PENDING).reduce((s,e)=>s+Number(e.netPayable),0)
    const totalTdsDeducted=tdsEntries.reduce((s,t)=>s+Number(t.tdsAmount),0)
    const totalTdsDeposited=tdsEntries.filter(t=>t.status===TdsStatus.DEPOSITED).reduce((s,t)=>s+Number(t.tdsAmount),0)
    const byCategory:Record<string,number>={}
    expenses.forEach(e=>{byCategory[e.category]=(byCategory[e.category]||0)+Number(e.grossAmount)})
    return{totalExpenses,totalPaid,totalPending,totalUnpaid:totalExpenses-totalPaid,totalTdsDeducted,totalTdsDeposited,tdsLiability:totalTdsDeducted-totalTdsDeposited,byCategory,expenseCount:expenses.length,pendingCount:expenses.filter(e=>e.status===ExpenseStatus.PENDING).length}
  }


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

}