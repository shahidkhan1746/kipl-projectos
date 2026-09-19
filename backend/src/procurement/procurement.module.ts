import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { RequisitionItem } from './entities/requisition-item.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PaymentRequisition } from './entities/payment-requisition.entity';
import { PaymentRequisitionItem } from './entities/payment-requisition-item.entity';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { GoodsReceiptNoteItem } from './entities/goods-receipt-note-item.entity';
import { Vendor } from '../accounting/vendor.entity';
import { Expense } from '../accounting/expense.entity';
import { ProcurementService } from './procurement.service';
import { ProcurementPdfService } from './procurement-pdf.service';
import { PaymentRequisitionPdfService } from './payment-requisition-pdf.service';
import { ProcurementController } from './procurement.controller';
import { StorageModule } from '../storage/storage.module';
import { MaterialRegisterModule } from '../material-register/material-register.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialRequisition,
      RequisitionItem,
      PurchaseOrder,
      PurchaseOrderItem,
      PaymentRequisition,
      PaymentRequisitionItem,
      GoodsReceiptNote,
      GoodsReceiptNoteItem,
      Vendor,
      Expense,
    ]),
    StorageModule,
    MaterialRegisterModule,
  ],
  controllers: [ProcurementController],
  providers: [
    ProcurementService,
    ProcurementPdfService,
    PaymentRequisitionPdfService,
  ],
  exports: [
    ProcurementService,
    ProcurementPdfService,
    PaymentRequisitionPdfService,
  ],
})
export class ProcurementModule {}
