import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
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
  async updateVendor(id:string,data:any){await this.getVendor(id);await this.vendorRepo.update(id,data);return this.getVendor(id)}
  // Soft-delete: keep the row so historical expenses/ledger still resolve the name
  async deleteVendor(id:string){await this.getVendor(id);await this.vendorRepo.update(id,{isActive:false});return {ok:true}}
  // GST split — intra-state bills carry CGST+SGST (half each); inter-state carry IGST (full)
  private splitGst(gstAmt:number,gstType:string){
    return gstType==='inter'
      ? {cgstAmount:0,sgstAmount:0,igstAmount:gstAmt}
      : {cgstAmount:gstAmt/2,sgstAmount:gstAmt/2,igstAmount:0}
  }
  async vendorLedger(vendorId:string){
    const vendor=await this.getVendor(vendorId)
    const expenses=await this.expenseRepo.find({where:{vendorId},order:{date:'ASC'}})
    const totalBilled=expenses.reduce((s,e)=>s+Number(e.netPayable),0)
    const totalPaid=expenses.reduce((s,e)=>s+Number(e.paidAmount),0)
    const totalTds=expenses.reduce((s,e)=>s+Number(e.tdsAmount),0)
    return{vendor,expenses,totalBilled,totalPaid,totalTds,balance:totalBilled-totalPaid}
  }
  async createExpense(data:any,userId?:string){
    const gross=Number(data.grossAmount||0),gstPct=Number(data.gstPct||0),tdsPct=Number(data.tdsPct||0)
    const gstAmt=gross*gstPct/100,tdsAmt=(gross+gstAmt)*tdsPct/100,netPay=gross+gstAmt-tdsAmt
    const gstType=data.gstType==='inter'?'inter':'intra'
    const expense=await this.expenseRepo.save(this.expenseRepo.create({...data,grossAmount:gross,gstAmount:gstAmt,gstType,...this.splitGst(gstAmt,gstType),tdsAmount:tdsAmt,netPayable:netPay,createdBy:userId??data.createdBy}))
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
  async updateExpense(id:string,data:any){
    const existing=await this.expenseRepo.findOne({where:{id}});if(!existing)throw new NotFoundException('Expense not found')
    const gross=Number(data.grossAmount??existing.grossAmount),gstPct=Number(data.gstPct??existing.gstPct),tdsPct=Number(data.tdsPct??existing.tdsPct)
    const gstAmt=gross*gstPct/100,tdsAmt=(gross+gstAmt)*tdsPct/100,netPay=gross+gstAmt-tdsAmt
    const gstType=data.gstType??existing.gstType??'intra'
    await this.expenseRepo.update(id,{...data,grossAmount:gross,gstPct,tdsPct,gstAmount:gstAmt,gstType,...this.splitGst(gstAmt,gstType),tdsAmount:tdsAmt,netPayable:netPay})
    // Keep the linked TDS entry in sync with the edited amounts
    const tds=await this.tdsRepo.findOne({where:{refId:id,refType:'expense'}})
    if(tds){
      if(tdsAmt>0) await this.tdsRepo.update(tds.id,{grossAmount:gross+gstAmt,tdsRate:tdsPct,tdsAmount:tdsAmt,date:data.date??existing.date})
      else await this.tdsRepo.delete(tds.id)
    }
    return this.expenseRepo.findOne({where:{id}})
  }
  async deleteExpense(id:string){
    const existing=await this.expenseRepo.findOne({where:{id}});if(!existing)throw new NotFoundException('Expense not found')
    // Remove auto-created linked records so nothing is orphaned
    await this.tdsRepo.delete({refId:id,refType:'expense'})
    await this.txnRepo.delete({refId:id,refType:'expense'})
    await this.expenseRepo.delete(id)
    await this.recomputeBalances(existing.projectId)
    return {ok:true}
  }
  // Recompute the running ledger balance for a project (used after a delete edits history)
  async recomputeBalances(projectId:string){
    const txns=await this.txnRepo.find({where:{projectId},order:{date:'ASC',createdAt:'ASC'}})
    let bal=0
    for(const t of txns){bal+=Number(t.credit||0)-Number(t.debit||0);if(Number(t.balance)!==bal)await this.txnRepo.update(t.id,{balance:bal})}
  }
  async approveExpense(id:string,approvedBy:string){
    const e=await this.expenseRepo.findOne({where:{id}});if(!e)throw new NotFoundException('Expense not found')
    // Maker-checker: the person who created an expense cannot approve it
    if(e.createdBy && e.createdBy===approvedBy) throw new BadRequestException('You cannot approve an expense you created — another authorised user must approve it.')
    await this.expenseRepo.update(id,{status:ExpenseStatus.APPROVED,approvedBy})
    return this.expenseRepo.findOne({where:{id}})
  }
  async setItcClaimed(id:string,claimed:boolean){await this.expenseRepo.update(id,{itcClaimed:claimed});return this.expenseRepo.findOne({where:{id}})}
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
    const itcAvailable=expenses.reduce((s,e)=>s+Number(e.gstAmount),0)
    const itcClaimed=expenses.filter(e=>e.itcClaimed).reduce((s,e)=>s+Number(e.gstAmount),0)
    return{totalExpenses,totalPaid,totalPending,totalUnpaid:totalExpenses-totalPaid,totalTdsDeducted,totalTdsDeposited,tdsLiability:totalTdsDeducted-totalTdsDeposited,itcAvailable,itcClaimed,itcUnclaimed:itcAvailable-itcClaimed,byCategory,expenseCount:expenses.length,pendingCount:expenses.filter(e=>e.status===ExpenseStatus.PENDING).length}
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

  // Server-side RA-bill maths so figures are consistent no matter who posts them.
  private computeInvoice(b:any){
    const grossToDate=Number(b.grossToDate||0)
    const previousBillAmount=Number(b.previousBillAmount||0)
    // "This bill" = cumulative to date − previously billed (falls back to a flat grossAmount)
    const thisBill=grossToDate>0?Math.max(0,grossToDate-previousBillAmount):Number(b.grossAmount||0)
    const gstPercent=Number(b.gstPercent??18)
    const gstAmount=thisBill*gstPercent/100
    const tdsPercent=Number(b.tdsPercent??2)
    const tdsAmount=thisBill*tdsPercent/100
    const retentionPercent=Number(b.retentionPercent??5)
    const retentionAmount=thisBill*retentionPercent/100
    const mob=Number(b.mobilisationRecovery||0),sec=Number(b.securedAdvanceRecovery||0)
    const ld=Number(b.ldPenalty||0),other=Number(b.otherDeductions||0)
    const netPayable=thisBill+gstAmount-tdsAmount-retentionAmount-mob-sec-ld-other
    return{grossToDate,previousBillAmount,grossAmount:thisBill,gstPercent,gstAmount,tdsPercent,tdsAmount,
      retentionPercent,retentionAmount,mobilisationRecovery:mob,securedAdvanceRecovery:sec,ldPenalty:ld,otherDeductions:other,netPayable}
  }

  async createInvoice(body:any){
    return this.invoiceRepo.save(this.invoiceRepo.create({...body,...this.computeInvoice(body)}))
  }

  async updateInvoice(id:string,body:any){
    const existing=await this.invoiceRepo.findOne({where:{id}});if(!existing)throw new NotFoundException('Invoice not found')
    await this.invoiceRepo.update(id,{...body,...this.computeInvoice({...existing,...body})})
    const updated=await this.invoiceRepo.findOne({where:{id}})
    // First time it flips to "paid", record the money-in receipt in the ledger
    if(updated && updated.status==='paid' && existing.status!=='paid'){
      const amount=Number(updated.paidAmount||updated.netPayable)
      await this.addTransaction({projectId:updated.projectId,date:updated.paidDate??new Date().toISOString().slice(0,10),
        type:TxnType.RECEIPT,description:'RA Bill '+(updated.raNumber?('RA-'+updated.raNumber):'')+' received',
        refId:id,refType:'invoice',credit:amount,paymentMode:body.paymentMode})
      if(!Number(updated.paidAmount)) await this.invoiceRepo.update(id,{paidAmount:updated.netPayable})
    }
    return this.invoiceRepo.findOne({where:{id}})
  }

  async deleteInvoice(id:string){
    const inv=await this.invoiceRepo.findOne({where:{id}})
    await this.txnRepo.delete({refId:id,refType:'invoice'})
    await this.invoiceRepo.delete(id)
    if(inv) await this.recomputeBalances(inv.projectId)
    return {ok:true}
  }

  async getInvoice(id:string){
    return this.invoiceRepo.findOne({where:{id}})
  }

}