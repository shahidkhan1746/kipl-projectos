import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RequisitionPriority,
  RequisitionStatus,
} from '../entities/material-requisition.entity';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

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
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items: CreateRequisitionItemDto[];
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
  @IsNotEmpty()
  vendorName: string;

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
