import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaterialRequisition,
  RequisitionStatus,
  HoDepartmentApprovalStatus,
} from './entities/material-requisition.entity';
import { RequisitionItem } from './entities/requisition-item.entity';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import {
  CreateRequisitionDto,
  HoApprovalDto,
  CreatePurchaseOrderDto,
} from './dto/procurement.dto';
import { ProcurementPdfService } from './procurement-pdf.service';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(MaterialRequisition)
    private readonly reqRepo: Repository<MaterialRequisition>,
    @InjectRepository(RequisitionItem)
    private readonly reqItemRepo: Repository<RequisitionItem>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepo: Repository<PurchaseOrderItem>,
    private readonly pdfService: ProcurementPdfService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // SEQUENCE NUMBER GENERATORS
  // ─────────────────────────────────────────────────────────────
  private async generateReqNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.reqRepo.count();
    const seq = String(count + 1).padStart(4, '0');
    return `REQ-${year}-${seq}`;
  }

  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.poRepo.count();
    const seq = String(count + 1).padStart(4, '0');
    return `PO-KIPL-${year}-${seq}`;
  }

  // ─────────────────────────────────────────────────────────────
  // REQUISITIONS (SITE INDENTS)
  // ─────────────────────────────────────────────────────────────
  async createRequisition(user: any, dto: CreateRequisitionDto): Promise<MaterialRequisition> {
    const reqNumber = await this.generateReqNumber();

    const items: RequisitionItem[] = (dto.items || []).map((i) => {
      const qty = Number(i.quantity) || 1;
      const rate = Number(i.estimatedRate) || 0;
      const amount = i.estimatedAmount ? Number(i.estimatedAmount) : qty * rate;

      const item = new RequisitionItem();
      item.itemDescription = i.itemDescription;
      item.category = i.category || 'General Civil';
      item.quantity = qty;
      item.unit = i.unit || 'Nos';
      item.estimatedRate = rate;
      item.estimatedAmount = amount;
      item.specifications = i.specifications;
      return item;
    });

    const estimatedTotal = items.reduce((sum, item) => sum + Number(item.estimatedAmount || 0), 0);

    const req = this.reqRepo.create({
      projectId: dto.projectId,
      reqNumber,
      title: dto.title,
      siteLocation: dto.siteLocation || 'Dal Lake Site, Srinagar',
      requestedById: user?.id,
      requestedByName: user?.name || 'Site Engineer',
      requiredByDate: dto.requiredByDate,
      priority: dto.priority,
      justification: dto.justification,
      attachmentUrl: dto.attachmentUrl,
      status: RequisitionStatus.SUBMITTED_TO_HO,
      procurementStatus: HoDepartmentApprovalStatus.PENDING,
      accountsStatus: HoDepartmentApprovalStatus.PENDING,
      estimatedTotal,
      items,
    });

    return this.reqRepo.save(req);
  }

  async getRequisitions(projectId: string, status?: string): Promise<MaterialRequisition[]> {
    const qb = this.reqRepo
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.items', 'item')
      .leftJoinAndSelect('req.purchaseOrders', 'po')
      .where('req.projectId = :projectId', { projectId })
      .orderBy('req.createdAt', 'DESC');

    if (status && status !== 'all') {
      qb.andWhere('req.status = :status', { status });
    }

    return qb.getMany();
  }

  async getRequisitionById(id: string): Promise<MaterialRequisition> {
    const req = await this.reqRepo.findOne({
      where: { id },
      relations: ['items', 'purchaseOrders'],
    });
    if (!req) throw new NotFoundException(`Requisition ${id} not found`);
    return req;
  }

  // ─────────────────────────────────────────────────────────────
  // HEAD OFFICE DUAL-APPROVAL WORKFLOW (Procurement & Accounts)
  // ─────────────────────────────────────────────────────────────
  async approveHoRequisition(id: string, user: any, dto: HoApprovalDto): Promise<MaterialRequisition> {
    const req = await this.getRequisitionById(id);

    if (req.status === RequisitionStatus.CONVERTED_TO_PO) {
      throw new BadRequestException('Requisition has already been converted to a Purchase Order.');
    }

    const isApprove = dto.action === 'approved';
    const actionStatus = isApprove
      ? HoDepartmentApprovalStatus.APPROVED
      : HoDepartmentApprovalStatus.REJECTED;

    if (dto.department === 'procurement') {
      req.procurementStatus = actionStatus;
      req.procurementApprovedById = user?.id;
      req.procurementApprovedByName = user?.name || 'HO Procurement Officer';
      req.procurementApprovedAt = new Date();
      if (dto.remarks) req.procurementRemarks = dto.remarks;
      if (dto.recommendedVendor) req.recommendedVendor = dto.recommendedVendor;
    } else if (dto.department === 'accounts') {
      req.accountsStatus = actionStatus;
      req.accountsApprovedById = user?.id;
      req.accountsApprovedByName = user?.name || 'HO Accounts';
      req.accountsApprovedAt = new Date();
      if (dto.remarks) req.accountsRemarks = dto.remarks;
      if (dto.budgetHead) req.budgetHead = dto.budgetHead;
    }

    // Re-evaluate composite workflow state
    if (
      req.procurementStatus === HoDepartmentApprovalStatus.REJECTED ||
      req.accountsStatus === HoDepartmentApprovalStatus.REJECTED
    ) {
      req.status = RequisitionStatus.REJECTED;
    } else if (
      req.procurementStatus === HoDepartmentApprovalStatus.APPROVED &&
      req.accountsStatus === HoDepartmentApprovalStatus.APPROVED
    ) {
      req.status = RequisitionStatus.APPROVED;
    } else {
      req.status = RequisitionStatus.PARTIALLY_APPROVED;
    }

    return this.reqRepo.save(req);
  }

  // ─────────────────────────────────────────────────────────────
  // PURCHASE ORDER (PO) GENERATION & MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  async convertRequisitionToPo(
    requisitionId: string,
    user: any,
    overrides?: Partial<CreatePurchaseOrderDto>,
  ): Promise<PurchaseOrder> {
    const req = await this.getRequisitionById(requisitionId);

    if (req.status !== RequisitionStatus.APPROVED) {
      throw new BadRequestException(
        'Requisition must be fully approved by both HO Procurement and HO Accounts before generating a PO.',
      );
    }

    const poNumber = await this.generatePoNumber();

    const poItems: PurchaseOrderItem[] = req.items.map((i) => {
      const item = new PurchaseOrderItem();
      item.itemDescription = i.itemDescription;
      item.quantity = Number(i.quantity);
      item.unit = i.unit;
      item.unitRate = Number(i.estimatedRate);
      item.discountPercent = 0;
      item.gstRate = 18; // Standard GST default

      const taxable = item.quantity * item.unitRate;
      const gst = (taxable * item.gstRate) / 100;
      item.taxableAmount = taxable;
      item.gstAmount = gst;
      item.totalAmount = taxable + gst;
      item.receivedQty = 0;
      return item;
    });

    const subtotal = poItems.reduce((acc, it) => acc + Number(it.taxableAmount), 0);
    const tax = poItems.reduce((acc, it) => acc + Number(it.gstAmount), 0);
    const freight = Number(overrides?.freightCharges) || 0;
    const grandTotal = subtotal + tax + freight;

    const po = this.poRepo.create({
      projectId: req.projectId,
      poNumber,
      requisitionId: req.id,
      vendorName: overrides?.vendorName || req.recommendedVendor || 'Approved Vendor',
      vendorContactPerson: overrides?.vendorContactPerson,
      vendorPhone: overrides?.vendorPhone,
      vendorEmail: overrides?.vendorEmail,
      vendorGstin: overrides?.vendorGstin,
      vendorAddress: overrides?.vendorAddress,
      billingAddress:
        overrides?.billingAddress ||
        'Khilari Infrastructure Pvt. Ltd., 101-105 Prabhat Centre Annex, CBD Belapur, Navi Mumbai - 400614',
      shippingAddress:
        overrides?.shippingAddress ||
        `Dal Lake Sewerage Project (${req.siteLocation || 'Srinagar Site'}), J&K`,
      orderDate: overrides?.orderDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: overrides?.expectedDeliveryDate || req.requiredByDate,
      paymentTerms: overrides?.paymentTerms || '30 days after site receipt & joint inspection',
      deliveryTerms: overrides?.deliveryTerms || 'FOR Site Srinagar, inclusive of transit insurance',
      subtotalAmount: subtotal,
      taxAmount: tax,
      freightCharges: freight,
      otherCharges: 0,
      grandTotal,
      status: PurchaseOrderStatus.ISSUED,
      issuedById: user?.id,
      issuedByName: user?.name || 'Procurement Head Office',
      notes: overrides?.notes || `Generated from Approved Indent ${req.reqNumber}`,
      items: poItems,
    });

    const savedPo = await this.poRepo.save(po);

    // Update requisition to converted
    req.status = RequisitionStatus.CONVERTED_TO_PO;
    await this.reqRepo.save(req);

    return savedPo;
  }

  async createDirectPurchaseOrder(user: any, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const poNumber = await this.generatePoNumber();

    const items: PurchaseOrderItem[] = (dto.items || []).map((i) => {
      const qty = Number(i.quantity) || 1;
      const rate = Number(i.unitRate) || 0;
      const disc = Number(i.discountPercent) || 0;
      const gstRate = Number(i.gstRate ?? 18);

      const discountedRate = rate * (1 - disc / 100);
      const taxable = qty * discountedRate;
      const gst = (taxable * gstRate) / 100;

      const item = new PurchaseOrderItem();
      item.itemDescription = i.itemDescription;
      item.hsnCode = i.hsnCode;
      item.quantity = qty;
      item.unit = i.unit || 'Nos';
      item.unitRate = rate;
      item.discountPercent = disc;
      item.gstRate = gstRate;
      item.taxableAmount = taxable;
      item.gstAmount = gst;
      item.totalAmount = taxable + gst;
      item.receivedQty = 0;
      return item;
    });

    const subtotal = items.reduce((acc, it) => acc + Number(it.taxableAmount), 0);
    const tax = items.reduce((acc, it) => acc + Number(it.gstAmount), 0);
    const freight = Number(dto.freightCharges) || 0;
    const grandTotal = subtotal + tax + freight;

    const po = this.poRepo.create({
      projectId: dto.projectId,
      poNumber,
      requisitionId: dto.requisitionId,
      vendorName: dto.vendorName,
      vendorContactPerson: dto.vendorContactPerson,
      vendorPhone: dto.vendorPhone,
      vendorEmail: dto.vendorEmail,
      vendorGstin: dto.vendorGstin,
      vendorAddress: dto.vendorAddress,
      billingAddress:
        dto.billingAddress ||
        'Khilari Infrastructure Pvt. Ltd., 101-105 Prabhat Centre Annex, CBD Belapur, Navi Mumbai - 400614',
      shippingAddress:
        dto.shippingAddress || 'Dal Lake Sewerage Project Site, Srinagar, J&K',
      orderDate: dto.orderDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: dto.expectedDeliveryDate,
      paymentTerms: dto.paymentTerms || '30 days after site receipt & joint inspection',
      deliveryTerms: dto.deliveryTerms || 'FOR Site Srinagar, inclusive of transit insurance',
      subtotalAmount: subtotal,
      taxAmount: tax,
      freightCharges: freight,
      otherCharges: dto.otherCharges || 0,
      grandTotal,
      status: PurchaseOrderStatus.ISSUED,
      issuedById: user?.id,
      issuedByName: user?.name || 'Procurement Head Office',
      notes: dto.notes,
      items,
    });

    return this.poRepo.save(po);
  }

  async getPurchaseOrders(projectId: string, status?: string): Promise<PurchaseOrder[]> {
    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'item')
      .leftJoinAndSelect('po.requisition', 'req')
      .where('po.projectId = :projectId', { projectId })
      .orderBy('po.createdAt', 'DESC');

    if (status && status !== 'all') {
      qb.andWhere('po.status = :status', { status });
    }

    return qb.getMany();
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: ['items', 'requisition'],
    });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async updatePoStatus(id: string, status: PurchaseOrderStatus, notes?: string): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrderById(id);
    po.status = status;
    if (notes) po.notes = (po.notes ? po.notes + '\n' : '') + notes;
    return this.poRepo.save(po);
  }

  async generatePoPdf(id: string): Promise<Buffer> {
    const po = await this.getPurchaseOrderById(id);
    return this.pdfService.generatePurchaseOrderPdf(po);
  }
}
