import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { RequisitionItem } from './entities/requisition-item.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { ProcurementService } from './procurement.service';
import { ProcurementPdfService } from './procurement-pdf.service';
import { ProcurementController } from './procurement.controller';

import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialRequisition,
      RequisitionItem,
      PurchaseOrder,
      PurchaseOrderItem,
    ]),
    StorageModule,
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService, ProcurementPdfService],
  exports: [ProcurementService, ProcurementPdfService],
})
export class ProcurementModule {}
