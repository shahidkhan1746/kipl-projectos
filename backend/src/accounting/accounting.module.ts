import{Module}from'@nestjs/common'
import{TypeOrmModule}from'@nestjs/typeorm'
import{Vendor}from'./vendor.entity'
import{Expense}from'./expense.entity'
import{Transaction}from'./transaction.entity'
import{TdsEntry}from'./tds-entry.entity'
import{Invoice}from'./invoice.entity'
import{AccountingService}from'./accounting.service'
import{AccountingController}from'./accounting.controller'
@Module({imports:[TypeOrmModule.forFeature([Vendor,Expense,Transaction,TdsEntry,Invoice])],providers:[AccountingService],controllers:[AccountingController],exports:[AccountingService]})
export class AccountingModule{}