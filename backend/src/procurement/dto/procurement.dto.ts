import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RequisitionPriority,
  RequisitionStatus,
} from '../entities/material-requisition.entity';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PaymentRequisitionStatus } from '../entities/payment-requisition.entity';

// ─────────────────────────────────────────────────────────────
// 1. MATERIAL INDENT / REQUISITIONS
// ─────────────────────────────────────────────────────────────
export class CreateRequisitionItemDto {
  @IsString()
  @IsNotEmpty()
  itemDescription: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedAmount?: number;

  @IsString()
  @IsOptional()
  specifications?: string;
}

export class CreateRequisitionDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  siteLocation?: string;

  @IsString()
  @IsOptional()
  workComponent?: string;

  @IsString()
  @IsOptional()
  requiredByDate?: string;

  @IsEnum(RequisitionPriority)
  @IsOptional()
  priority?: RequisitionPriority;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsEnum(RequisitionStatus)
  @IsOptional()
  status?: RequisitionStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items: CreateRequisitionItemDto[];
}

export class UpdateRequisitionDraftDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  siteLocation?: string;

  @IsString()
  @IsOptional()
  workComponent?: string;

  @IsString()
  @IsOptional()
  requiredByDate?: string;

  @IsEnum(RequisitionPriority)
  @IsOptional()
  priority?: RequisitionPriority;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items?: CreateRequisitionItemDto[];
}

export class HoApprovalDto {
  @IsEnum(['procurement', 'accounts'])
  @IsNotEmpty()
  department: 'procurement' | 'accounts';

  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  action: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  recommendedVendor?: string;

  @IsString()
  @IsOptional()
  budgetHead?: string;
}

// ─────────────────────────────────────────────────────────────
// 2. PURCHASE ORDERS (PO)
// ─────────────────────────────────────────────────────────────
export class CreatePurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemDescription: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  unitRate: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  gstRate?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  requisitionId?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsString()
  @IsOptional()
  workComponent?: string;

  @IsString()
  @IsOptional()
  vendorContactPerson?: string;

  @IsString()
  @IsOptional()
  vendorPhone?: string;

  @IsString()
  @IsOptional()
  vendorEmail?: string;

  @IsString()
  @IsOptional()
  vendorGstin?: string;

  @IsString()
  @IsOptional()
  vendorAddress?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  orderDate?: string;

  @IsString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  deliveryTerms?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  freightCharges?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  otherCharges?: number;

  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}

export class UpdatePoStatusDto {
  @IsEnum(PurchaseOrderStatus)
  @IsNotEmpty()
  status: PurchaseOrderStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// 3. GOODS RECEIPT NOTES (GRN)
// ─────────────────────────────────────────────────────────────
export class CreateGrnItemDto {
  @IsString()
  @IsOptional()
  purchaseOrderItemId?: string;

  @IsString()
  @IsNotEmpty()
  itemDescription: string;

  @IsNumber()
  @Min(0)
  receivedQty: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateGrnDto {
  @IsString()
  @IsOptional()
  receivedDate?: string;

  @IsString()
  @IsOptional()
  receivedByName?: string;

  @IsString()
  @IsOptional()
  challanNumber?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsBoolean()
  @IsOptional()
  writeToMaterialRegister?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  items: CreateGrnItemDto[];
}

// ─────────────────────────────────────────────────────────────
// 4. KIPL PAYMENT REQUISITION (PROFORMA FORMAT)
// ─────────────────────────────────────────────────────────────
export class CreatePaymentRequisitionItemDto {
  @IsNumber()
  @IsOptional()
  srNo?: number;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  materialOrServices?: string;

  @IsBoolean()
  @IsOptional()
  isMsme?: boolean;

  @IsNumber()
  @Min(0)
  totalOrderCost: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  advancePaid?: number;

  @IsNumber()
  @Min(0)
  amountToPay: number;

  @IsNumber()
  @IsOptional()
  balanceAmount?: number;

  @IsString()
  @IsOptional()
  siteLocation?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  againstRef?: string;

  @IsString()
  @IsOptional()
  modeOfPayment?: string;
}

export class CreatePaymentRequisitionDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  prDate?: string;

  @IsString()
  @IsOptional()
  siteLocation?: string;

  @IsEnum(PaymentRequisitionStatus)
  @IsOptional()
  status?: PaymentRequisitionStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentRequisitionItemDto)
  items: CreatePaymentRequisitionItemDto[];
}
