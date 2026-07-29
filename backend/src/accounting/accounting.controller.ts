import{Controller,Get,Post,Patch,Delete,Param,Body,Query,UseGuards,Request,HttpCode,HttpStatus,UseInterceptors,UploadedFile}from'@nestjs/common'
import{FileInterceptor}from'@nestjs/platform-express'
import{AccountingService}from'./accounting.service'
import{StorageService}from'../storage/storage.service'
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard'
import{RolesGuard}from'../auth/guards/roles.guard'
import{Roles}from'../auth/decorators/roles.decorator'
import{UserRole}from'../users/user.entity'

// Who may create / edit / approve / pay / delete financial records
const FIN=[UserRole.SUPER_ADMIN,UserRole.PROJECT_MANAGER,UserRole.ACCOUNTS]

@Controller('accounting')@UseGuards(JwtAuthGuard)
export class AccountingController{
  constructor(private readonly svc:AccountingService,private readonly storage:StorageService){}
  // ── Reads (any authenticated user) ──────────────────────────────────────
  @Get('dashboard') dashboard(@Query('projectId')pid:string){return this.svc.dashboard(pid)}
  @Get('vendors') vendors(@Query()q:any){return this.svc.listVendors({projectId:q.projectId,category:q.category,search:q.search})}
  @Get('vendors/:id/ledger') vendorLedger(@Param('id')id:string){return this.svc.vendorLedger(id)}
  @Get('vendors/:id') vendor(@Param('id')id:string){return this.svc.getVendor(id)}
  @Get('expenses') expenses(@Query()q:any){return this.svc.listExpenses({projectId:q.projectId,vendorId:q.vendorId,category:q.category,status:q.status,fromDate:q.fromDate,toDate:q.toDate})}
  @Get('transactions') transactions(@Query()q:any){return this.svc.listTransactions({projectId:q.projectId,vendorId:q.vendorId,fromDate:q.fromDate,toDate:q.toDate,type:q.type})}
  @Get('tds') tds(@Query()q:any){return this.svc.listTds({projectId:q.projectId,quarter:q.quarter,fy:q.fy,status:q.status})}

  // ── Mutations (super admin / project manager / accounts only) ───────────
  @Post('upload')@UseGuards(RolesGuard)@Roles(...FIN)@UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile()file:any){return this.storage.upload(file,'expenses')}

  @Post('vendors')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) createVendor(@Body()body:any){return this.svc.createVendor(body)}
  @Patch('vendors/:id')@UseGuards(RolesGuard)@Roles(...FIN) updateVendor(@Param('id')id:string,@Body()body:any){return this.svc.updateVendor(id,body)}
  @Delete('vendors/:id')@UseGuards(RolesGuard)@Roles(...FIN) deleteVendor(@Param('id')id:string){return this.svc.deleteVendor(id)}

  @Post('expenses')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) createExpense(@Body()body:any,@Request()req:any){return this.svc.createExpense(body,req.user?.id)}
  @Patch('expenses/:id')@UseGuards(RolesGuard)@Roles(...FIN) updateExpense(@Param('id')id:string,@Body()body:any){return this.svc.updateExpense(id,body)}
  @Delete('expenses/:id')@UseGuards(RolesGuard)@Roles(...FIN) deleteExpense(@Param('id')id:string){return this.svc.deleteExpense(id)}
  @Patch('expenses/:id/approve')@UseGuards(RolesGuard)@Roles(...FIN) approveExpense(@Param('id')id:string,@Request()req:any){return this.svc.approveExpense(id,req.user.id)}
  @Patch('expenses/:id/pay')@UseGuards(RolesGuard)@Roles(...FIN) payExpense(@Param('id')id:string,@Body()body:any){return this.svc.markExpensePaid(id,body)}
  @Patch('expenses/:id/itc')@UseGuards(RolesGuard)@Roles(...FIN) setItc(@Param('id')id:string,@Body()body:any){return this.svc.setItcClaimed(id,!!body.claimed)}

  @Post('transactions')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) addTxn(@Body()body:any){return this.svc.addTransaction(body)}
  @Patch('tds/:id/deposit')@UseGuards(RolesGuard)@Roles(...FIN) depositTds(@Param('id')id:string,@Body()body:any){return this.svc.depositTds(id,body)}

  // ── Invoices (RA Bills) ───────────────────────────────────────────────────
  @Get('invoices') listInvoices(@Query()q:any){return this.svc.listInvoices({projectId:q.projectId,status:q.status,limit:q.limit?Number(q.limit):undefined})}
  @Get('invoices/:id') getInvoice(@Param('id')id:string){return this.svc.getInvoice(id)}
  @Post('invoices')@UseGuards(RolesGuard)@Roles(...FIN)@HttpCode(HttpStatus.CREATED) createInvoice(@Body()body:any,@Request()req:any){return this.svc.createInvoice({...body,createdBy:req.user?.id})}
  @Patch('invoices/:id')@UseGuards(RolesGuard)@Roles(...FIN) updateInvoice(@Param('id')id:string,@Body()body:any){return this.svc.updateInvoice(id,body)}
  @Delete('invoices/:id')@UseGuards(RolesGuard)@Roles(...FIN) deleteInvoice(@Param('id')id:string){return this.svc.deleteInvoice(id)}
}
