import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OpsSyncService } from './ops-sync.service'
import { Invoice } from '../accounting/invoice.entity'
import { Transaction } from '../accounting/transaction.entity'
import { Task } from '../tasks/task.entity'
import { FleetLog } from '../fleet/fleet-log.entity'
import { MaterialRegister } from '../material-register/material-register.entity'
import { WbsTask } from '../wbs/wbs-task.entity'
import { SiteDiary } from '../diary/diary.entity'
import { Employee } from '../hr/employee.entity'
import { OmLog } from '../om/om-log.entity'
import { OmEvent } from '../om/om-event.entity'
import { RaBill } from '../epc/ra-bill.entity'
import { Ncr } from '../qa/ncr.entity'
import { AccountingModule } from '../accounting/accounting.module'
import { HrModule } from '../hr/hr.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice, Transaction, Task, FleetLog, MaterialRegister, WbsTask, SiteDiary, Employee,
      OmLog, OmEvent, RaBill, Ncr,
    ]),
    AccountingModule,
    HrModule,
  ],
  providers: [OpsSyncService],
  exports: [OpsSyncService],
})
export class OpsSyncModule {}
