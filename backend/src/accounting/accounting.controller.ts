import{Controller,Get,Post,Patch,Delete,Param,Body,Query,UseGuards,Request,HttpCode,HttpStatus}from'@nestjs/common'
import{AccountingService}from'./accounting.service'
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard'
import{RolesGuard}from'../auth/guards/roles.guard'
import{Roles}from'../auth/decorators/roles.decorator'
import{UserRole}from'../users/user.entity'

// Who may create / edit / approve / pay / delete financial records
const FIN=[UserRole.SUPER_ADMIN,UserRole.PROJECT_MANAGER,UserRole.ACCOUNTS]

@Controller('accounting')@UseGuards(JwtAuthGuard)
export class AccountingController{
  constructor(private readonly svc:AccountingService){}
  // ── Reads (any authenticated user) ──────────────────────────────────────
  @Get('dashboard') dashboard(@Query('projectId')pid:string){return this.svc.dashboard(pid)}
  @Get('vendors') vendors(@Query()q:any){return this.svc.listVendors({projectId:q.projectId,category:q.category,search:q.search})}
  @Get('vendors/:id/ledger') vendorLedger(@Param('id')id:string){return this.svc.vendorLedger(id)}
  @Get('vendors/:id') vendor(@Param('id')id:string){return this.svc.getVendor(id)}
  @Get('expenses') expenses(@Query()q:any){return this.svc.listExpenses({projectId:q.projectId,vendorId:q.vendorId,category:q.category,status:q.status,fromDate:q.fromDate,toDate:q.toDate})}
  @Get('transactions') transactions(@Query()q:any){return this.svc.listTransactions({projectId:q.projectId,vendorId:q.vendorId,fromDate:q.fromDate,toDate:q.toDate,type:q.type})}
  @Get('tds') tds(@Query()q:any){return this.svc.listTds({projectId:q.projectId,quarter:q.quarter,fy:q.fy,status:q.status})}

  // ── Mutations (super admin / project manager / accounts only) ───────────
  @Post('vendors')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) createVendor(@Body()body:any){return this.svc.createVendor(body)}
  @Post('expenses')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) createExpense(@Body()body:any){return this.svc.createExpense(body)}
  @Patch('expenses/:id')@UseGuards(RolesGuard)@Roles(...FIN) updateExpense(@Param('id')id:string,@Body()body:any){return this.svc.updateExpense(id,body)}
  @Delete('expenses/:id')@UseGuards(RolesGuard)@Roles(...FIN) deleteExpense(@Param('id')id:string){return this.svc.deleteExpense(id)}
  @Patch('expenses/:id/approve')@UseGuards(RolesGuard)@Roles(...FIN) approveExpense(@Param('id')id:string,@Request()req:any){return this.svc.approveExpense(id,req.user.id)}
  @Patch('expenses/:id/pay')@UseGuards(RolesGuard)@Roles(...FIN) payExpense(@Param('id')id:string,@Body()body:any){return this.svc.markExpensePaid(id,body)}
  @Post('transactions')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) addTxn(@Body()body:any){return this.svc.addTransaction(body)}
  @Patch('tds/:id/deposit')@UseGuards(RolesGuard)@Roles(...FIN) depositTds(@Param('id')id:string,@Body()body:any){return this.svc.depositTds(id,body)}

  // ── Invoices (RA Bills) ───────────────────────────────────────────────────
  @Get('invoices') listInvoices(@Query()q:any){return this.svc.listInvoices({projectId:q.projectId,status:q.status,limit:q.limit?Number(q.limit):undefined})}
  @Get('invoices/:id') getInvoice(@Param('id')id:string){return this.svc.getInvoice(id)}
  @Post('invoices')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) createInvoice(@Body()body:any,@Request()req:any){return this.svc.createInvoice({...body,createdBy:req.user?.id})}
  @Patch('invoices/:id')@UseGuards(RolesGuard)@Roles(...FIN) updateInvoice(@Param('id')id:string,@Body()body:any){return this.svc.updateInvoice(id,body)}
  @Delete('invoices/:id')@UseGuards(RolesGuard)@Roles(...FIN) deleteInvoice(@Param('id')id:string){return this.svc.deleteInvoice(id)}
}
