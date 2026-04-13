import{Controller,Get,Post,Patch,Delete,Param,Body,Query,UseGuards,Request,HttpCode,HttpStatus}from'@nestjs/common'
import{AccountingService}from'./accounting.service'
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard'
@Controller('accounting')@UseGuards(JwtAuthGuard)
export class AccountingController{
  constructor(private readonly svc:AccountingService){}
  @Get('dashboard') dashboard(@Query('projectId')pid:string){return this.svc.dashboard(pid)}
  @Get('vendors') vendors(@Query()q:any){return this.svc.listVendors({projectId:q.projectId,category:q.category,search:q.search})}
  @Post('vendors')@HttpCode(HttpStatus.CREATED) createVendor(@Body()body:any){return this.svc.createVendor(body)}
  @Get('vendors/:id/ledger') vendorLedger(@Param('id')id:string){return this.svc.vendorLedger(id)}
  @Get('vendors/:id') vendor(@Param('id')id:string){return this.svc.getVendor(id)}
  @Get('expenses') expenses(@Query()q:any){return this.svc.listExpenses({projectId:q.projectId,vendorId:q.vendorId,category:q.category,status:q.status,fromDate:q.fromDate,toDate:q.toDate})}
  @Post('expenses')@HttpCode(HttpStatus.CREATED) createExpense(@Body()body:any){return this.svc.createExpense(body)}
  @Patch('expenses/:id/approve') approveExpense(@Param('id')id:string,@Request()req:any){return this.svc.approveExpense(id,req.user.id)}
  @Patch('expenses/:id/pay') payExpense(@Param('id')id:string,@Body()body:any){return this.svc.markExpensePaid(id,body)}
  @Get('transactions') transactions(@Query()q:any){return this.svc.listTransactions({projectId:q.projectId,vendorId:q.vendorId,fromDate:q.fromDate,toDate:q.toDate,type:q.type})}
  @Post('transactions')@HttpCode(HttpStatus.CREATED) addTxn(@Body()body:any){return this.svc.addTransaction(body)}
  @Get('tds') tds(@Query()q:any){return this.svc.listTds({projectId:q.projectId,quarter:q.quarter,fy:q.fy,status:q.status})}
  @Patch('tds/:id/deposit') depositTds(@Param('id')id:string,@Body()body:any){return this.svc.depositTds(id,body)}

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

}