import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
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
  PaymentRequisition,
  PaymentRequisitionStatus,
} from './entities/payment-requisition.entity';
import { PaymentRequisitionItem } from './entities/payment-requisition-item.entity';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { GoodsReceiptNoteItem } from './entities/goods-receipt-note-item.entity';
import { Vendor } from '../accounting/vendor.entity';
import { Expense } from '../accounting/expense.entity';
import {
  CreateRequisitionDto,
  UpdateRequisitionDraftDto,
  HoApprovalDto,
  CreatePurchaseOrderDto,
  CreatePaymentRequisitionDto,
  CreateGrnDto,
} from './dto/procurement.dto';
import { ProcurementPdfService } from './procurement-pdf.service';
import { PaymentRequisitionPdfService } from './payment-requisition-pdf.service';
import { MaterialRegisterService } from '../material-register/material-register.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationCategory } from '../notifications/notification.entity';
import { UserRole } from '../users/user.entity';

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
    @InjectRepository(PaymentRequisition)
    private readonly prRepo: Repository<PaymentRequisition>,
    @InjectRepository(PaymentRequisitionItem)
    private readonly prItemRepo: Repository<PaymentRequisitionItem>,
    @InjectRepository(GoodsReceiptNote)
    private readonly grnRepo: Repository<GoodsReceiptNote>,
    @InjectRepository(GoodsReceiptNoteItem)
    private readonly grnItemRepo: Repository<GoodsReceiptNoteItem>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    private readonly pdfService: ProcurementPdfService,
    private readonly prPdfService: PaymentRequisitionPdfService,
    private readonly matRegisterService: MaterialRegisterService,
    @Optional() private readonly notifSvc?: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // COLLISION-FREE SEQUENCE NUMBER GENERATORS (Using MAX query)
  // ─────────────────────────────────────────────────────────────
  private async generateReqNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;
    const latest = await this.reqRepo
      .createQueryBuilder('r')
      .where('r.reqNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.reqNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (latest?.reqNumber) {
      const parts = latest.reqNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-KIPL-${year}-`;
    const latest = await this.poRepo
      .createQueryBuilder('p')
      .where('p.poNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('p.poNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (latest?.poNumber) {
      const parts = latest.poNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async generatePrNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PR-${year}-`;
    const latest = await this.prRepo
      .createQueryBuilder('pr')
      .where('pr.prNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('pr.prNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (latest?.prNumber) {
      const parts = latest.prNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async generateGrnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;
    const latest = await this.grnRepo
      .createQueryBuilder('g')
      .where('g.grnNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('g.grnNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (latest?.grnNumber) {
      const parts = latest.grnNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MATERIAL REQUISITIONS (SITE INDENTS)
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
    const initialStatus = dto.status === RequisitionStatus.DRAFT
      ? RequisitionStatus.DRAFT
      : RequisitionStatus.SUBMITTED_TO_HO;

    const req = this.reqRepo.create({
      projectId: dto.projectId,
      reqNumber,
      title: dto.title,
      siteLocation: dto.siteLocation || 'Dal Lake Site, Srinagar',
      workComponent: dto.workComponent,
      requestedById: user?.id,
      requestedByName: user?.name || 'Site Engineer',
      requiredByDate: dto.requiredByDate,
      priority: dto.priority,
      justification: dto.justification,
      attachmentUrl: dto.attachmentUrl,
      status: initialStatus,
      procurementStatus: HoDepartmentApprovalStatus.PENDING,
      accountsStatus: HoDepartmentApprovalStatus.PENDING,
      estimatedTotal,
      items,
    });

    const saved = await this.reqRepo.save(req);

    if (saved.status === RequisitionStatus.SUBMITTED_TO_HO) {
      this.notifSvc?.notifyRoles(
        [UserRole.PROJECT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS, UserRole.ACCOUNTANT],
        {
          projectId: saved.projectId,
          category: NotificationCategory.INFO,
          type: 'requisition_submitted',
          title: `New Material Indent: ${saved.reqNumber}`,
          message: `${user?.name || 'Site Engineer'} submitted indent ${saved.reqNumber} for ${saved.title || 'materials'} (₹${Number(saved.estimatedTotal || 0).toLocaleString('en-IN')}).`,
          link: `/procurement?tab=indents&id=${saved.id}`,
          metadata: { reqId: saved.id, reqNumber: saved.reqNumber },
        },
        user?.id,
      );
    }

    return saved;
  }

  async updateDraftRequisition(
    id: string,
    user: any,
    dto: UpdateRequisitionDraftDto,
  ): Promise<MaterialRequisition> {
    const req = await this.getRequisitionById(id);

    if (req.status !== RequisitionStatus.DRAFT) {
      throw new BadRequestException('Only draft requisitions can be directly modified.');
    }

    if (dto.title) req.title = dto.title;
    if (dto.siteLocation) req.siteLocation = dto.siteLocation;
    if (dto.workComponent) req.workComponent = dto.workComponent;
    if (dto.requiredByDate) req.requiredByDate = dto.requiredByDate;
    if (dto.priority) req.priority = dto.priority;
    if (dto.justification) req.justification = dto.justification;
    if (dto.attachmentUrl !== undefined) req.attachmentUrl = dto.attachmentUrl;

    if (dto.items && dto.items.length > 0) {
      // Remove old items
      await this.reqItemRepo.delete({ requisitionId: id });

      const newItems: RequisitionItem[] = dto.items.map((i) => {
        const qty = Number(i.quantity) || 1;
        const rate = Number(i.estimatedRate) || 0;
        const amount = i.estimatedAmount ? Number(i.estimatedAmount) : qty * rate;

        const item = new RequisitionItem();
        item.requisitionId = id;
        item.itemDescription = i.itemDescription;
        item.category = i.category || 'General Civil';
        item.quantity = qty;
        item.unit = i.unit || 'Nos';
        item.estimatedRate = rate;
        item.estimatedAmount = amount;
        item.specifications = i.specifications;
        return item;
      });

      req.items = newItems;
      req.estimatedTotal = newItems.reduce((sum, it) => sum + Number(it.estimatedAmount || 0), 0);
    }

    return this.reqRepo.save(req);
  }

  async submitRequisition(id: string, user: any): Promise<MaterialRequisition> {
    const req = await this.getRequisitionById(id);
    if (req.status !== RequisitionStatus.DRAFT) {
      throw new BadRequestException('Requisition is already submitted or processed.');
    }
    req.status = RequisitionStatus.SUBMITTED_TO_HO;
    const saved = await this.reqRepo.save(req);

    this.notifSvc?.notifyRoles(
      [UserRole.PROJECT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS, UserRole.ACCOUNTANT],
      {
        projectId: saved.projectId,
        category: NotificationCategory.INFO,
        type: 'requisition_submitted',
        title: `Material Indent Submitted: ${saved.reqNumber}`,
        message: `${user?.name || 'Site Engineer'} submitted indent ${saved.reqNumber} for HO dual-approval.`,
        link: `/procurement?tab=indents&id=${saved.id}`,
        metadata: { reqId: saved.id, reqNumber: saved.reqNumber },
      },
      user?.id,
    );

    return saved;
  }

  async cancelRequisition(id: string, user: any, reason?: string): Promise<MaterialRequisition> {
    const req = await this.getRequisitionById(id);
    if (req.status === RequisitionStatus.CONVERTED_TO_PO) {
      throw new BadRequestException('Cannot cancel a requisition that has already been converted to a PO.');
    }
    req.status = RequisitionStatus.CANCELLED;
    if (reason) req.justification = (req.justification ? req.justification + '\n' : '') + `[Cancelled]: ${reason}`;
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
  // HEAD OFFICE DUAL-APPROVAL WORKFLOW (Strict Role & Actor Checks)
  // ─────────────────────────────────────────────────────────────
  async approveHoRequisition(id: string, user: any, dto: HoApprovalDto): Promise<MaterialRequisition> {
    const req = await this.getRequisitionById(id);

    // 1. Guard against self-approval (Requester cannot approve their own indent)
    if (req.requestedById && req.requestedById === user?.id) {
      throw new BadRequestException('The requester cannot approve their own requisition.');
    }

    // 2. Guard against approving terminal or converted states
    if (req.status === RequisitionStatus.CONVERTED_TO_PO) {
      throw new BadRequestException('Requisition has already been converted to a Purchase Order.');
    }
    if (req.status === RequisitionStatus.REJECTED) {
      throw new BadRequestException('This requisition has been rejected and cannot be approved without revision.');
    }
    if (req.status === RequisitionStatus.CANCELLED) {
      throw new BadRequestException('Cannot approve a cancelled requisition.');
    }

    const isApprove = dto.action === 'approved';
    const actionStatus = isApprove
      ? HoDepartmentApprovalStatus.APPROVED
      : HoDepartmentApprovalStatus.REJECTED;

    // 3. Enforce distinct actors for dual-approval stamps
    if (dto.department === 'procurement') {
      if (req.accountsApprovedById && req.accountsApprovedById === user?.id) {
        throw new BadRequestException('HO Procurement approval must be stamped by a different individual than HO Accounts.');
      }
      req.procurementStatus = actionStatus;
      req.procurementApprovedById = user?.id;
      req.procurementApprovedByName = user?.name || 'HO Procurement Officer';
      req.procurementApprovedAt = new Date();
      if (dto.remarks) req.procurementRemarks = dto.remarks;
      if (dto.recommendedVendor) req.recommendedVendor = dto.recommendedVendor;
    } else if (dto.department === 'accounts') {
      if (req.procurementApprovedById && req.procurementApprovedById === user?.id) {
        throw new BadRequestException('HO Accounts approval must be stamped by a different individual than HO Procurement.');
      }
      req.accountsStatus = actionStatus;
      req.accountsApprovedById = user?.id;
      req.accountsApprovedByName = user?.name || 'HO Accounts';
      req.accountsApprovedAt = new Date();
      if (dto.remarks) req.accountsRemarks = dto.remarks;
      if (dto.budgetHead) req.budgetHead = dto.budgetHead;
    }

    // 4. Re-evaluate composite workflow state
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

    const saved = await this.reqRepo.save(req);

    // Operational Notifications
    if (saved.status === RequisitionStatus.APPROVED && req.requestedById) {
      this.notifSvc?.notifyUser(req.requestedById, {
        projectId: req.projectId,
        category: NotificationCategory.SUCCESS,
        type: 'requisition_approved',
        title: `Material Indent Dual-Approved: ${req.reqNumber}`,
        message: `Your indent ${req.reqNumber} (${req.title || 'Materials'}) has been approved by HO Procurement and HO Accounts. Ready for PO conversion.`,
        link: `/procurement?tab=indents&id=${req.id}`,
        metadata: { reqId: req.id, reqNumber: req.reqNumber },
      });
    } else if (saved.status === RequisitionStatus.REJECTED && req.requestedById) {
      this.notifSvc?.notifyUser(req.requestedById, {
        projectId: req.projectId,
        category: NotificationCategory.CRITICAL,
        type: 'requisition_rejected',
        title: `Material Indent Rejected: ${req.reqNumber}`,
        message: `Indent ${req.reqNumber} was rejected by ${dto.department === 'procurement' ? 'Procurement' : 'Accounts'}${dto.remarks ? `: "${dto.remarks}"` : '.'}`,
        link: `/procurement?tab=indents&id=${req.id}`,
        metadata: { reqId: req.id, reqNumber: req.reqNumber, remarks: dto.remarks },
      });
    } else if (dto.department === 'procurement' && isApprove && saved.status === RequisitionStatus.PARTIALLY_APPROVED) {
      this.notifSvc?.notifyRoles(
        [UserRole.ACCOUNTS, UserRole.ACCOUNTANT],
        {
          projectId: req.projectId,
          category: NotificationCategory.INFO,
          type: 'requisition_procurement_cleared',
          title: `Indent Cleared by Procurement: ${req.reqNumber}`,
          message: `${user?.name || 'HO Procurement'} approved indent ${req.reqNumber}. Awaiting HO Accounts financial clearance.`,
          link: `/procurement?tab=indents&id=${req.id}`,
          metadata: { reqId: req.id, reqNumber: req.reqNumber },
        },
        user?.id,
      );
    }

    return saved;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PURCHASE ORDERS (PO)
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

    // If vendorId is supplied or recommended vendor matches a Vendor entity, link it
    let vendorId = overrides?.vendorId;
    let vendorName = overrides?.vendorName || req.recommendedVendor || 'Approved Vendor';
    let vendorGstin = overrides?.vendorGstin;
    let vendorAddress = overrides?.vendorAddress;
    let vendorContactPerson = overrides?.vendorContactPerson;
    let vendorPhone = overrides?.vendorPhone;
    let vendorEmail = overrides?.vendorEmail;

    if (vendorId) {
      const v = await this.vendorRepo.findOne({ where: { id: vendorId } });
      if (v) {
        vendorName = v.name;
        vendorGstin = vendorGstin || v.gstin;
        vendorAddress = vendorAddress || v.address;
        vendorPhone = vendorPhone || v.phone;
        vendorEmail = vendorEmail || v.email;
      }
    }

    const poItems: PurchaseOrderItem[] = req.items.map((i) => {
      const item = new PurchaseOrderItem();
      item.itemDescription = i.itemDescription;
      item.quantity = Number(i.quantity);
      item.unit = i.unit;
      item.unitRate = Number(i.estimatedRate);
      item.discountPercent = 0;
      item.gstRate = 18;

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
    const other = Number(overrides?.otherCharges) || 0;
    const grandTotal = subtotal + tax + freight + other;

    const po = this.poRepo.create({
      projectId: req.projectId,
      poNumber,
      requisitionId: req.id,
      vendorId,
      vendorName,
      workComponent: overrides?.workComponent || req.workComponent,
      vendorContactPerson,
      vendorPhone,
      vendorEmail,
      vendorGstin,
      vendorAddress,
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
      otherCharges: other,
      grandTotal,
      status: overrides?.status || PurchaseOrderStatus.ISSUED,
      issuedById: user?.id,
      issuedByName: user?.name || 'Procurement Head Office',
      notes: overrides?.notes || `Generated from Approved Indent ${req.reqNumber}`,
      items: poItems,
    });

    const savedPo = await this.poRepo.save(po);

    req.status = RequisitionStatus.CONVERTED_TO_PO;
    await this.reqRepo.save(req);

    return savedPo;
  }

  async createDirectPurchaseOrder(user: any, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const poNumber = await this.generatePoNumber();

    let vendorId = dto.vendorId;
    let vendorName = dto.vendorName;
    let vendorGstin = dto.vendorGstin;
    let vendorAddress = dto.vendorAddress;
    let vendorContactPerson = dto.vendorContactPerson;
    let vendorPhone = dto.vendorPhone;
    let vendorEmail = dto.vendorEmail;

    if (vendorId) {
      const v = await this.vendorRepo.findOne({ where: { id: vendorId } });
      if (v) {
        vendorName = v.name;
        vendorGstin = vendorGstin || v.gstin;
        vendorAddress = vendorAddress || v.address;
        vendorPhone = vendorPhone || v.phone;
        vendorEmail = vendorEmail || v.email;
      }
    }

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
    const other = Number(dto.otherCharges) || 0;
    const grandTotal = subtotal + tax + freight + other;

    const po = this.poRepo.create({
      projectId: dto.projectId,
      poNumber,
      requisitionId: dto.requisitionId,
      vendorId,
      vendorName,
      workComponent: dto.workComponent,
      vendorContactPerson,
      vendorPhone,
      vendorEmail,
      vendorGstin,
      vendorAddress,
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
      otherCharges: other,
      grandTotal,
      status: dto.status || PurchaseOrderStatus.ISSUED,
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
      .leftJoinAndSelect('po.goodsReceiptNotes', 'grn')
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
      relations: ['items', 'requisition', 'goodsReceiptNotes', 'goodsReceiptNotes.items'],
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

  async issuePo(id: string, user: any): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrderById(id);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be transitioned to Issued.');
    }
    po.status = PurchaseOrderStatus.ISSUED;
    po.issuedById = user?.id;
    po.issuedByName = user?.name || 'Procurement Head Office';
    return this.poRepo.save(po);
  }

  async generatePoPdf(id: string): Promise<Buffer> {
    const po = await this.getPurchaseOrderById(id);
    return this.pdfService.generatePurchaseOrderPdf(po);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GOODS RECEIPT NOTES (GRN) & MATERIAL REGISTER BRIDGE
  // ─────────────────────────────────────────────────────────────
  async createGoodsReceiptNote(poId: string, user: any, dto: CreateGrnDto): Promise<GoodsReceiptNote> {
    const po = await this.getPurchaseOrderById(poId);
    const grnNumber = await this.generateGrnNumber();
    const receivedDate = dto.receivedDate || new Date().toISOString().split('T')[0];

    const grnItems: GoodsReceiptNoteItem[] = (dto.items || []).map((i) => {
      const item = new GoodsReceiptNoteItem();
      item.purchaseOrderItemId = i.purchaseOrderItemId;
      item.itemDescription = i.itemDescription;
      item.receivedQty = Number(i.receivedQty) || 0;
      item.unit = i.unit || 'Nos';
      item.remarks = i.remarks || '';
      return item;
    });

    const grn = this.grnRepo.create({
      projectId: po.projectId,
      grnNumber,
      purchaseOrderId: po.id,
      receivedDate,
      challanNumber: dto.challanNumber,
      invoiceNumber: dto.invoiceNumber,
      vehicleNumber: dto.vehicleNumber,
      receivedById: user?.id,
      receivedByName: user?.name || 'Site Incharge',
      remarks: dto.remarks,
      writeToMaterialRegister: dto.writeToMaterialRegister ?? true,
      items: grnItems,
    });

    const savedGrn = await this.grnRepo.save(grn);

    // Update cumulative receivedQty on PO items
    for (const gi of grnItems) {
      if (gi.purchaseOrderItemId) {
        const poItem = po.items.find((pi) => pi.id === gi.purchaseOrderItemId);
        if (poItem) {
          poItem.receivedQty = +(Number(poItem.receivedQty || 0) + Number(gi.receivedQty)).toFixed(3);
          await this.poItemRepo.save(poItem);
        }
      }
    }

    // Recompute PO status
    const updatedPo = await this.getPurchaseOrderById(poId);
    const allCompleted = updatedPo.items.every((pi) => Number(pi.receivedQty) >= Number(pi.quantity));
    const anyReceived = updatedPo.items.some((pi) => Number(pi.receivedQty) > 0);

    if (allCompleted) {
      updatedPo.status = PurchaseOrderStatus.COMPLETED;
    } else if (anyReceived) {
      updatedPo.status = PurchaseOrderStatus.PARTIALLY_DELIVERED;
    }
    await this.poRepo.save(updatedPo);

    // Automatic write into Clause 55 Material Register
    if (dto.writeToMaterialRegister !== false) {
      for (const gi of grnItems) {
        if (gi.receivedQty > 0) {
          await this.matRegisterService.create({
            projectId: po.projectId,
            date: receivedDate,
            material: gi.itemDescription,
            unit: gi.unit,
            receivedQty: gi.receivedQty,
            consumedQty: 0,
            contractorRep: dto.receivedByName || user?.name || 'Site Incharge',
            remarks: `GRN ${grnNumber} against ${po.poNumber} (Challan: ${dto.challanNumber || 'N/A'}${dto.vehicleNumber ? `, Veh: ${dto.vehicleNumber}` : ''})`,
          });
        }
      }
    }

    this.notifSvc?.notifyRoles(
      [UserRole.PROJECT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTS, UserRole.ACCOUNTANT],
      {
        projectId: po.projectId,
        category: NotificationCategory.SUCCESS,
        type: 'grn_created',
        title: `Goods Receipt Note: ${grnNumber}`,
        message: `${user?.name || 'Site Incharge'} recorded GRN ${grnNumber} against PO ${po.poNumber}. Clause 55 site material register updated.`,
        link: `/procurement?tab=grn&id=${savedGrn.id}`,
        metadata: { grnId: savedGrn.id, poId: po.id, poNumber: po.poNumber },
      },
      user?.id,
    );

    return savedGrn;
  }

  async getGoodsReceiptNotes(projectId: string, poId?: string): Promise<GoodsReceiptNote[]> {
    const qb = this.grnRepo
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.items', 'item')
      .leftJoinAndSelect('grn.purchaseOrder', 'po')
      .where('grn.projectId = :projectId', { projectId })
      .orderBy('grn.createdAt', 'DESC');

    if (poId) {
      qb.andWhere('grn.purchaseOrderId = :poId', { poId });
    }

    return qb.getMany();
  }

  // ─────────────────────────────────────────────────────────────
  // 4. KIPL PAYMENT REQUISITIONS (EXCEL PROFORMA FORMAT)
  // ─────────────────────────────────────────────────────────────
  async createPaymentRequisition(user: any, dto: CreatePaymentRequisitionDto): Promise<PaymentRequisition> {
    const prNumber = await this.generatePrNumber();
    const prDate = dto.prDate || new Date().toISOString().split('T')[0];

    let srCounter = 1;
    const items: PaymentRequisitionItem[] = (dto.items || []).map((i) => {
      const item = new PaymentRequisitionItem();
      item.srNo = i.srNo || srCounter++;
      item.vendorId = i.vendorId;
      item.vendorName = i.vendorName;
      item.description = i.description;
      item.materialOrServices = i.materialOrServices || 'Material';
      item.isMsme = Boolean(i.isMsme);
      item.totalOrderCost = Number(i.totalOrderCost) || 0;
      item.advancePaid = Number(i.advancePaid) || 0;
      item.amountToPay = Number(i.amountToPay) || 0;
      item.balanceAmount =
        i.balanceAmount !== undefined
          ? Number(i.balanceAmount)
          : Math.max(0, item.totalOrderCost - item.advancePaid - item.amountToPay);
      item.siteLocation = i.siteLocation || dto.siteLocation || '38.5 MLD STP Nishat Sgr.';
      item.remark = i.remark || 'Against Tax Invoice';
      item.againstRef = i.againstRef || '';
      item.modeOfPayment = i.modeOfPayment || 'RTGS';
      return item;
    });

    const totalOrderCost = items.reduce((sum, it) => sum + Number(it.totalOrderCost), 0);
    const totalAdvancePaid = items.reduce((sum, it) => sum + Number(it.advancePaid), 0);
    const totalAmountToPay = items.reduce((sum, it) => sum + Number(it.amountToPay), 0);
    const totalBalance = items.reduce((sum, it) => sum + Number(it.balanceAmount), 0);

    const initialStatus = dto.status === PaymentRequisitionStatus.DRAFT
      ? PaymentRequisitionStatus.DRAFT
      : PaymentRequisitionStatus.SUBMITTED_TO_HO;

    const pr = this.prRepo.create({
      projectId: dto.projectId,
      prNumber,
      title: dto.title,
      prDate,
      siteLocation: dto.siteLocation || '38.5 MLD STP Nishat Sgr.',
      requestedById: user?.id,
      requestedByName: user?.name || 'Site Accountant / Engineer',
      status: initialStatus,
      totalOrderCost,
      totalAdvancePaid,
      totalAmountToPay,
      totalBalance,
      procurementStatus: HoDepartmentApprovalStatus.PENDING,
      accountsStatus: HoDepartmentApprovalStatus.PENDING,
      notes: dto.notes,
      attachmentUrl: dto.attachmentUrl,
      items,
    });

    const saved = await this.prRepo.save(pr);

    if (saved.status === PaymentRequisitionStatus.SUBMITTED_TO_HO) {
      this.notifSvc?.notifyRoles(
        [UserRole.ACCOUNTS, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        {
          projectId: saved.projectId,
          category: NotificationCategory.INFO,
          type: 'payment_requisition_submitted',
          title: `Payment Requisition Submitted: ${saved.prNumber}`,
          message: `${user?.name || 'Site Accountant'} submitted Payment Requisition ${saved.prNumber} for ₹${Number(saved.totalAmountToPay || 0).toLocaleString('en-IN')} (${saved.siteLocation}).`,
          link: `/procurement?tab=payment-requisitions&id=${saved.id}`,
          metadata: { prId: saved.id, prNumber: saved.prNumber },
        },
        user?.id,
      );
    }

    return saved;
  }

  async getPaymentRequisitions(projectId: string, status?: string): Promise<PaymentRequisition[]> {
    const qb = this.prRepo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.items', 'item')
      .where('pr.projectId = :projectId', { projectId })
      .orderBy('pr.createdAt', 'DESC');

    if (status && status !== 'all') {
      qb.andWhere('pr.status = :status', { status });
    }

    return qb.getMany();
  }

  async getPaymentRequisitionById(id: string): Promise<PaymentRequisition> {
    const pr = await this.prRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!pr) throw new NotFoundException(`Payment Requisition ${id} not found`);
    return pr;
  }

  async approveHoPaymentRequisition(id: string, user: any, dto: HoApprovalDto): Promise<PaymentRequisition> {
    const pr = await this.getPaymentRequisitionById(id);

    // 1. Requester cannot approve their own PR
    if (pr.requestedById && pr.requestedById === user?.id) {
      throw new BadRequestException('The requester cannot approve their own payment requisition.');
    }

    // 2. Cannot approve rejected/cancelled PR
    if (pr.status === PaymentRequisitionStatus.REJECTED || pr.status === PaymentRequisitionStatus.CANCELLED) {
      throw new BadRequestException(`Cannot approve a payment requisition that is currently ${pr.status}.`);
    }

    const isApprove = dto.action === 'approved';
    const actionStatus = isApprove
      ? HoDepartmentApprovalStatus.APPROVED
      : HoDepartmentApprovalStatus.REJECTED;

    // 3. Different actors check
    if (dto.department === 'procurement') {
      if (pr.accountsApprovedById && pr.accountsApprovedById === user?.id) {
        throw new BadRequestException('HO Procurement approval must be stamped by a different individual than HO Accounts.');
      }
      pr.procurementStatus = actionStatus;
      pr.procurementApprovedById = user?.id;
      pr.procurementApprovedByName = user?.name || 'HO Procurement Officer';
      pr.procurementApprovedAt = new Date();
      if (dto.remarks) pr.procurementRemarks = dto.remarks;
    } else if (dto.department === 'accounts') {
      if (pr.procurementApprovedById && pr.procurementApprovedById === user?.id) {
        throw new BadRequestException('HO Accounts approval must be stamped by a different individual than HO Procurement.');
      }
      pr.accountsStatus = actionStatus;
      pr.accountsApprovedById = user?.id;
      pr.accountsApprovedByName = user?.name || 'HO Accounts / Finance Controller';
      pr.accountsApprovedAt = new Date();
      if (dto.remarks) pr.accountsRemarks = dto.remarks;
    }

    // 4. Update status
    if (
      pr.procurementStatus === HoDepartmentApprovalStatus.REJECTED ||
      pr.accountsStatus === HoDepartmentApprovalStatus.REJECTED
    ) {
      pr.status = PaymentRequisitionStatus.REJECTED;
    } else if (
      pr.procurementStatus === HoDepartmentApprovalStatus.APPROVED &&
      pr.accountsStatus === HoDepartmentApprovalStatus.APPROVED
    ) {
      pr.status = PaymentRequisitionStatus.APPROVED;
    } else {
      pr.status = PaymentRequisitionStatus.PARTIALLY_APPROVED;
    }

    const saved = await this.prRepo.save(pr);

    if (saved.status === PaymentRequisitionStatus.APPROVED && pr.requestedById) {
      this.notifSvc?.notifyUser(pr.requestedById, {
        projectId: pr.projectId,
        category: NotificationCategory.SUCCESS,
        type: 'payment_requisition_approved',
        title: `Payment Requisition Dual-Approved: ${pr.prNumber}`,
        message: `Payment Requisition ${pr.prNumber} for ₹${Number(pr.totalAmountToPay || 0).toLocaleString('en-IN')} is fully approved for disbursement.`,
        link: `/procurement?tab=payment-requisitions&id=${pr.id}`,
        metadata: { prId: pr.id, prNumber: pr.prNumber },
      });
    } else if (saved.status === PaymentRequisitionStatus.REJECTED && pr.requestedById) {
      this.notifSvc?.notifyUser(pr.requestedById, {
        projectId: pr.projectId,
        category: NotificationCategory.CRITICAL,
        type: 'payment_requisition_rejected',
        title: `Payment Requisition Rejected: ${pr.prNumber}`,
        message: `Payment Requisition ${pr.prNumber} was rejected by ${dto.department === 'procurement' ? 'Procurement' : 'Accounts'}${dto.remarks ? `: "${dto.remarks}"` : '.'}`,
        link: `/procurement?tab=payment-requisitions&id=${pr.id}`,
        metadata: { prId: pr.id, prNumber: pr.prNumber, remarks: dto.remarks },
      });
    } else if (dto.department === 'procurement' && isApprove && saved.status === PaymentRequisitionStatus.PARTIALLY_APPROVED) {
      this.notifSvc?.notifyRoles(
        [UserRole.ACCOUNTS, UserRole.ACCOUNTANT],
        {
          projectId: pr.projectId,
          category: NotificationCategory.INFO,
          type: 'payment_requisition_procurement_cleared',
          title: `Payment Requisition Cleared by Procurement: ${pr.prNumber}`,
          message: `${user?.name || 'HO Procurement'} approved payment requisition ${pr.prNumber}. Awaiting HO Accounts disbursement release.`,
          link: `/procurement?tab=payment-requisitions&id=${pr.id}`,
          metadata: { prId: pr.id, prNumber: pr.prNumber },
        },
        user?.id,
      );
    }

    return saved;
  }

  async cancelPaymentRequisition(id: string, user: any, reason?: string): Promise<PaymentRequisition> {
    const pr = await this.getPaymentRequisitionById(id);
    if (pr.status === PaymentRequisitionStatus.PAID) {
      throw new BadRequestException('Cannot cancel an already paid payment requisition.');
    }
    pr.status = PaymentRequisitionStatus.CANCELLED;
    if (reason) pr.notes = (pr.notes ? pr.notes + '\n' : '') + `[Cancelled]: ${reason}`;
    return this.prRepo.save(pr);
  }

  async generatePaymentRequisitionPdf(id: string): Promise<Buffer> {
    const pr = await this.getPaymentRequisitionById(id);
    return this.prPdfService.generatePdf(pr);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. 3-WAY MATCHING RECONCILIATION ENGINE
  // ─────────────────────────────────────────────────────────────
  async getThreeWayMatchReport(projectId: string, poId?: string): Promise<any[]> {
    const pos = await this.getPurchaseOrders(projectId, 'all');
    const filtered = poId ? pos.filter((p) => p.id === poId) : pos;

    const reports: any[] = [];

    for (const po of filtered) {
      const grns = await this.getGoodsReceiptNotes(projectId, po.id);
      const prItems = await this.prItemRepo
        .createQueryBuilder('pri')
        .where('pri.againstRef = :poNumber', { poNumber: po.poNumber })
        .getMany();

      const itemMatches = (po.items || []).map((pi) => {
        const orderedQty = Number(pi.quantity) || 0;
        const receivedQty = Number(pi.receivedQty) || 0;
        const orderedRate = Number(pi.unitRate) || 0;
        const totalOrderedAmount = Number(pi.totalAmount) || 0;

        // Cumulative billed in Payment Requisitions referencing this PO
        const matchedPrItems = prItems.filter(
          (pri) => pri.description.toLowerCase().includes(pi.itemDescription.toLowerCase()) || prItems.length === 1,
        );
        const billedAmount = matchedPrItems.reduce((sum, pri) => sum + Number(pri.amountToPay || 0), 0);

        let status = 'FULLY_MATCHED';
        if (receivedQty === 0) {
          status = 'PENDING_GRN';
        } else if (receivedQty < orderedQty) {
          status = 'PARTIALLY_DELIVERED';
        } else if (billedAmount === 0) {
          status = 'PENDING_PAYMENT_REQUISITION';
        } else if (billedAmount > totalOrderedAmount) {
          status = 'EXCESS_BILLING';
        }

        return {
          itemId: pi.id,
          description: pi.itemDescription,
          unit: pi.unit,
          orderedQty,
          receivedQty,
          orderedRate,
          totalOrderedAmount,
          billedAmount,
          qtyVariance: +(orderedQty - receivedQty).toFixed(3),
          status,
        };
      });

      reports.push({
        poId: po.id,
        poNumber: po.poNumber,
        vendorName: po.vendorName,
        orderDate: po.orderDate,
        grandTotal: Number(po.grandTotal) || 0,
        poStatus: po.status,
        grnCount: grns.length,
        items: itemMatches,
      });
    }

    return reports;
  }
}
