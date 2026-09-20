import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import {
  MaterialRequisition,
  RequisitionStatus,
  HoDepartmentApprovalStatus,
  RequisitionPriority,
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
import { ProcurementPdfService } from './procurement-pdf.service';
import { PaymentRequisitionPdfService } from './payment-requisition-pdf.service';
import { MaterialRegisterService } from '../material-register/material-register.service';
import { DataSource } from 'typeorm';
import { Vendor } from '../accounting/vendor.entity';
import { Expense } from '../accounting/expense.entity';

describe('ProcurementService', () => {
  let repoByEntityName: Record<string, any>;
  let fakeManager: any;
  let fallbackRepo: any;
  let fakeDataSource: any;
  let service: ProcurementService;
  let reqRepo: any;
  let reqItemRepo: any;
  let poRepo: any;
  let poItemRepo: any;
  let prRepo: any;
  let prItemRepo: any;
  let grnRepo: any;
  let grnItemRepo: any;
  let pdfService: any;
  let prPdfService: any;
  let matRegService: any;

  const mockUser = {
    id: 'user-123',
    name: 'Er. Shahid Site Engineer',
    email: 'shahid@kipl.com',
  };

  const mockProcurementOfficer = {
    id: 'user-456',
    name: 'HO Procurement Lead',
    email: 'procurement@kipl.com',
  };

  const mockAccountsOfficer = {
    id: 'user-789',
    name: 'HO Accounts Manager',
    email: 'accounts@kipl.com',
  };

  const mockReq: Partial<MaterialRequisition> = {
    id: 'req-001',
    projectId: 'proj-srinagar',
    reqNumber: 'REQ-2026-0001',
    title: 'Reinforcement Steel Fe500D for Intake Well',
    siteLocation: 'Brane Pumping Station',
    requestedById: 'user-123',
    requestedByName: 'Er. Shahid Site Engineer',
    priority: RequisitionPriority.HIGH,
    status: RequisitionStatus.SUBMITTED_TO_HO,
    procurementStatus: HoDepartmentApprovalStatus.PENDING,
    accountsStatus: HoDepartmentApprovalStatus.PENDING,
    estimatedTotal: 150000,
    items: [
      {
        id: 'item-1',
        requisitionId: 'req-001',
        itemDescription: 'TMT 16mm Fe500D',
        category: 'Steel',
        quantity: 2.5,
        unit: 'MT',
        estimatedRate: 60000,
        estimatedAmount: 150000,
        specifications: 'Grade Fe500D as per IS 1786',
      } as RequisitionItem,
    ],
    purchaseOrders: [],
  };

  beforeEach(async () => {
    let reqState = { ...mockReq };
    reqRepo = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'req-new' })),
      save: jest.fn().mockImplementation((entity) => {
        reqState = { ...reqState, ...entity };
        return Promise.resolve(reqState);
      }),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'req-001') return Promise.resolve(reqState);
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockReq]),
        getOne: jest.fn().mockResolvedValue({ reqNumber: 'REQ-2026-0001' }),
        getRawOne: jest.fn().mockResolvedValue({ maxNumber: 'REQ-2026-0001' }),
      }),
    };

    reqItemRepo = {
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    const mockPoInstance: Partial<PurchaseOrder> = {
      id: 'po-001',
      poNumber: 'PO-KIPL-2026-0001',
      vendorName: 'J&K Steel Traders',
      subtotalAmount: 150000,
      taxAmount: 27000,
      grandTotal: 177000,
      status: PurchaseOrderStatus.ISSUED,
      items: [
        {
          id: 'poi-1',
          itemDescription: 'TMT 16mm Fe500D',
          quantity: 2.5,
          unitRate: 60000,
          totalAmount: 150000,
          receivedQty: 0,
        } as PurchaseOrderItem,
      ],
    };

    poRepo = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'po-new' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockPoInstance, ...entity })),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'po-001') return Promise.resolve(mockPoInstance);
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPoInstance]),
        getOne: jest.fn().mockResolvedValue(mockPoInstance),
        getRawOne: jest.fn().mockResolvedValue({ maxNumber: 'PO-KIPL-2026-0001' }),
      }),
    };

    poItemRepo = {
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    let prState: any = null;
    prRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((dto) => {
        prState = { ...dto, id: 'pr-001', items: dto.items || [] };
        return prState;
      }),
      save: jest.fn().mockImplementation((entity) => {
        prState = { ...prState, ...entity };
        return Promise.resolve(prState);
      }),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'pr-001' && prState) return Promise.resolve(prState);
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getRawOne: jest.fn().mockResolvedValue({ maxNumber: null }),
      }),
    };

    prItemRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    grnRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'grn-001' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockImplementation(({ where }) => Promise.resolve(null)),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getRawOne: jest.fn().mockResolvedValue({ maxNumber: null }),
      }),
    };

    grnItemRepo = {
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    pdfService = {
      generatePurchaseOrderPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock po pdf')),
    };

    prPdfService = {
      generatePaymentRequisitionPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pr pdf')),
    };

    matRegService = {
      create: jest.fn().mockResolvedValue({ success: true }),
      recordBatch: jest.fn().mockResolvedValue({ success: true }),
    };

    const vendorRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };

    const expenseRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };

    repoByEntityName = {
      MaterialRequisition: reqRepo, RequisitionItem: reqItemRepo,
      PurchaseOrder: poRepo, PurchaseOrderItem: poItemRepo,
      PaymentRequisition: prRepo, PaymentRequisitionItem: prItemRepo,
      GoodsReceiptNote: grnRepo, GoodsReceiptNoteItem: grnItemRepo,
      Vendor: vendorRepo, Expense: expenseRepo,
    };
    fallbackRepo = {
      save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((e: any) => e),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    fakeManager = {
      getRepository: (entity: any) => repoByEntityName[entity?.name] ?? fallbackRepo,
    };
    fakeDataSource = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(fakeManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getRepositoryToken(MaterialRequisition), useValue: reqRepo },
        { provide: getRepositoryToken(RequisitionItem), useValue: reqItemRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: poItemRepo },
        { provide: getRepositoryToken(PaymentRequisition), useValue: prRepo },
        { provide: getRepositoryToken(PaymentRequisitionItem), useValue: prItemRepo },
        { provide: getRepositoryToken(GoodsReceiptNote), useValue: grnRepo },
        { provide: getRepositoryToken(GoodsReceiptNoteItem), useValue: grnItemRepo },
        { provide: getRepositoryToken(Vendor), useValue: vendorRepo },
        { provide: getRepositoryToken(Expense), useValue: expenseRepo },
        { provide: ProcurementPdfService, useValue: pdfService },
        { provide: PaymentRequisitionPdfService, useValue: prPdfService },
        { provide: MaterialRegisterService, useValue: matRegService },
        // The GRN bridge runs its writes in one transaction. The fake hands the
        // callback a manager whose getRepository returns the same mocks the
        // service already uses, so the tests exercise the real code path
        // rather than a second one written to avoid the transaction.
        { provide: DataSource, useValue: fakeDataSource },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
  });

  describe('createRequisition', () => {
    it('should create an indent with auto-generated REQ number, items, and SUBMITTED_TO_HO status', async () => {
      const result = await service.createRequisition(mockUser, {
        projectId: 'proj-srinagar',
        title: 'High Pressure Jetting Hose',
        items: [
          {
            itemDescription: 'Jetting Hose 1" 250 Bar',
            quantity: 2,
            unit: 'Nos',
            estimatedRate: 45000,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(RequisitionStatus.SUBMITTED_TO_HO);
      expect(reqRepo.create).toHaveBeenCalled();
      expect(reqRepo.save).toHaveBeenCalled();
    });
  });

  describe('Dual-Actor HO Approvals on Material Requisitions', () => {
    it('should reject approval if site requester attempts to approve their own indent', async () => {
      await expect(
        service.approveHoRequisition('req-001', mockUser, {
          department: 'procurement',
          action: 'approved',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow HO Procurement to approve and set procurementStatus', async () => {
      const updated = await service.approveHoRequisition(
        'req-001',
        mockProcurementOfficer,
        {
          department: 'procurement',
          action: 'approved',
          recommendedVendor: 'Kashmir Pipes & Fittings',
          remarks: 'Rates vetted against market schedule',
        },
      );

      expect(updated.procurementStatus).toBe(HoDepartmentApprovalStatus.APPROVED);
      expect(updated.procurementApprovedById).toBe(mockProcurementOfficer.id);
      expect(updated.status).toBe(RequisitionStatus.PARTIALLY_APPROVED);
    });

    it('should forbid the same individual from approving as both Procurement and Accounts', async () => {
      await service.approveHoRequisition('req-001', mockProcurementOfficer, {
        department: 'procurement',
        action: 'approved',
      });

      await expect(
        service.approveHoRequisition('req-001', mockProcurementOfficer, {
          department: 'accounts',
          action: 'approved',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Official KIPL Payment Requisitions (13-Column Format)', () => {
    it('should create a payment requisition with correct sums and balance calculation', async () => {
      const pr = await service.createPaymentRequisition(mockUser, {
        projectId: 'proj-srinagar',
        title: 'Payment Requisition - Stone Aggregates & Bajri',
        prDate: '2026-09-19',
        siteLocation: '38.5 MLD STP Nishat Sgr.',
        items: [
          {
            vendorName: 'Alamdar Stone Crusher',
            description: 'Purchase of Stone Aggregate',
            materialOrServices: 'Material',
            isMsme: true,
            totalOrderCost: 609525,
            advancePaid: 0,
            amountToPay: 609525,
            siteLocation: '38.5 MLD STP Nishat Sgr.',
            remark: 'Against Tax Invoice',
            againstRef: '1098',
            modeOfPayment: 'RTGS',
          },
          {
            vendorName: 'Nisar Ahmad Joo',
            description: 'Purchase of Khak Bajri',
            materialOrServices: 'Material',
            isMsme: true,
            totalOrderCost: 80063,
            advancePaid: 0,
            amountToPay: 80063,
            siteLocation: '38.5 MLD STP Nishat Sgr.',
            remark: 'Against Non-GST Invoice',
            againstRef: '6',
            modeOfPayment: 'RTGS',
          },
        ],
      });

      expect(pr).toBeDefined();
      expect(pr.totalOrderCost).toBe(689588); // 609525 + 80063
      expect(pr.totalAmountToPay).toBe(689588);
      expect(pr.totalBalance).toBe(0);
      expect(pr.status).toBe(PaymentRequisitionStatus.SUBMITTED_TO_HO);
    });

    it('should enforce dual-actor approval on payment requisitions and reject self-approval', async () => {
      // Create initial PR
      await service.createPaymentRequisition(mockUser, {
        projectId: 'proj-srinagar',
        title: 'Payment Requisition - Submersible Pumps',
        items: [
          {
            vendorName: 'Kirloskar Brothers Ltd',
            description: 'Non Clog Pumps',
            totalOrderCost: 500000,
            amountToPay: 500000,
          },
        ],
      });

      // 1. Site requester cannot approve
      await expect(
        service.approveHoPaymentRequisition('pr-001', mockUser, {
          department: 'procurement',
          action: 'approved',
        }),
      ).rejects.toThrow(BadRequestException);

      // 2. HO Procurement approves
      const approvedProc = await service.approveHoPaymentRequisition(
        'pr-001',
        mockProcurementOfficer,
        {
          department: 'procurement',
          action: 'approved',
          remarks: 'Verified against PO terms',
        },
      );
      expect(approvedProc.procurementStatus).toBe(HoDepartmentApprovalStatus.APPROVED);

      // 3. Same person cannot approve accounts
      await expect(
        service.approveHoPaymentRequisition('pr-001', mockProcurementOfficer, {
          department: 'accounts',
          action: 'approved',
        }),
      ).rejects.toThrow(BadRequestException);

      // 4. HO Accounts approves -> status becomes fully APPROVED
      const approvedAll = await service.approveHoPaymentRequisition(
        'pr-001',
        mockAccountsOfficer,
        {
          department: 'accounts',
          action: 'approved',
          remarks: 'Funds available, cleared for payment',
        },
      );
      expect(approvedAll.accountsStatus).toBe(HoDepartmentApprovalStatus.APPROVED);
      expect(approvedAll.status).toBe(PaymentRequisitionStatus.APPROVED);
    });
  });

  describe('Goods Receipt Notes (GRN) & Stock Sync', () => {
    it('should record site delivery and sync to Clause 55 material register', async () => {
      const grn = await service.createGoodsReceiptNote('po-001', mockUser, {
        challanNumber: 'CH-2026-888',
        vehicleNumber: 'JK01-AB-1234',
        receivedDate: '2026-09-19',
        writeToMaterialRegister: true,
        items: [
          {
            itemDescription: 'TMT 16mm Fe500D',
            receivedQty: 2.5,
            unit: 'MT',
            remarks: 'Sound condition',
          },
        ],
      });

      expect(grn).toBeDefined();
      expect(grn.challanNumber).toBe('CH-2026-888');
      expect(matRegService.create).toHaveBeenCalled();
    });

    /**
     * A receipt, the quantities it moves on the purchase order, and the stock
     * it creates are one fact. Written separately, a failure partway left a
     * saved GRN whose stock was half-written and nothing to say so.
     */
    it('writes the receipt, the PO quantities and the stock in one transaction', async () => {
      await service.createGoodsReceiptNote('po-001', mockUser, {
        challanNumber: 'CH-TX-1',
        receivedDate: '2026-09-19',
        writeToMaterialRegister: true,
        items: [{ itemDescription: 'TMT 16mm Fe500D', receivedQty: 1, unit: 'MT' }],
      });
      expect(fakeDataSource.transaction).toHaveBeenCalled();
      // Enlisted in it, rather than writing outside on its own connection.
      const [, manager] = matRegService.create.mock.calls.at(-1);
      expect(manager).toBe(fakeManager);
    });

    // The link used to be a sentence in `remarks`, which nothing can join on:
    // a GRN submitted twice wrote its stock twice with no way to tell the
    // duplicate from a second genuine delivery.
    it('stamps each register row with the receipt it came from', async () => {
      await service.createGoodsReceiptNote('po-001', mockUser, {
        challanNumber: 'CH-LINK-1',
        receivedDate: '2026-09-19',
        writeToMaterialRegister: true,
        items: [{ itemDescription: 'TMT 16mm Fe500D', receivedQty: 1, unit: 'MT' }],
      });
      const [row] = matRegService.create.mock.calls.at(-1);
      expect(row.grnId).toBe('grn-001');
    });

    it('writes no stock when the caller opts out', async () => {
      matRegService.create.mockClear();
      await service.createGoodsReceiptNote('po-001', mockUser, {
        challanNumber: 'CH-NOSTOCK',
        receivedDate: '2026-09-19',
        writeToMaterialRegister: false,
        items: [{ itemDescription: 'TMT 16mm Fe500D', receivedQty: 1, unit: 'MT' }],
      });
      expect(matRegService.create).not.toHaveBeenCalled();
    });
  });

  /**
   * The module had create and read and nothing else, while a purchase order's
   * cumulative received quantity only ever incremented — so a delivery keyed as
   * 10,000 instead of 1,000 marked the order complete forever, inflated the
   * value the three-way match reconciles against, and left stock in the
   * Clause 55 register that no longer matched the site.
   */
  describe('Reversing a goods receipt', () => {
    const reversibleGrn = () => ({
      id: 'grn-001',
      grnNumber: 'GRN-2026-0001',
      purchaseOrderId: 'po-001',
      reversedAt: null,
      items: [{ purchaseOrderItemId: 'poi-1', receivedQty: 2.5, itemDescription: 'TMT 16mm Fe500D' }],
    });

    beforeEach(() => {
      grnRepo.findOne = jest.fn().mockResolvedValue(reversibleGrn());
    });

    it('refuses without a reason, because the record has to say why', async () => {
      await expect(service.reverseGoodsReceiptNote('grn-001', mockUser, '   '))
        .rejects.toThrow(/reason is required/i);
    });

    it('refuses to reverse the same receipt twice', async () => {
      grnRepo.findOne = jest.fn().mockResolvedValue({ ...reversibleGrn(), reversedAt: new Date() });
      await expect(service.reverseGoodsReceiptNote('grn-001', mockUser, 'keyed twice'))
        .rejects.toThrow(/already been reversed/i);
    });

    it('refuses to reverse a receipt that does not exist', async () => {
      grnRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.reverseGoodsReceiptNote('nope', mockUser, 'keyed twice'))
        .rejects.toThrow(/not found/i);
    });

    it('takes the quantity back off the purchase order line', async () => {
      const po = await service.getPurchaseOrderById('po-001');
      po.items[0].receivedQty = 2.5;
      await service.reverseGoodsReceiptNote('grn-001', mockUser, 'quantity keyed wrongly');
      expect(po.items[0].receivedQty).toBe(0);
    });

    it('never drives a received quantity below zero', async () => {
      const po = await service.getPurchaseOrderById('po-001');
      po.items[0].receivedQty = 1;
      await service.reverseGoodsReceiptNote('grn-001', mockUser, 'over-reversal guard');
      expect(po.items[0].receivedQty).toBe(0);
    });

    it('lets an order fall back out of COMPLETED', async () => {
      const po = await service.getPurchaseOrderById('po-001');
      po.items[0].receivedQty = 2.5;
      po.status = PurchaseOrderStatus.COMPLETED;
      await service.reverseGoodsReceiptNote('grn-001', mockUser, 'wrong delivery');
      expect(po.status).not.toBe(PurchaseOrderStatus.COMPLETED);
    });

    it('withdraws the stock the receipt created, found by its grn id', async () => {
      fallbackRepo.find = jest.fn().mockResolvedValue([{ id: 'mr-1' }, { id: 'mr-2' }]);
      await service.reverseGoodsReceiptNote('grn-001', mockUser, 'wrong delivery');
      expect(fallbackRepo.find).toHaveBeenCalledWith({ where: { grnId: 'grn-001' } });
      expect(fallbackRepo.softDelete).toHaveBeenCalledTimes(2);
    });

    it('records who reversed it and why on the receipt itself', async () => {
      const reversed = await service.reverseGoodsReceiptNote('grn-001', mockUser, 'quantity keyed wrongly');
      expect(reversed.reversedAt).toBeInstanceOf(Date);
      expect(reversed.reversedById).toBe(mockUser.id);
      expect(reversed.reversedReason).toBe('quantity keyed wrongly');
    });

    // A half-reversed receipt is worse than a wrong one: the register and the
    // order would disagree with nothing to say which is right.
    it('does all of it in one transaction', async () => {
      fakeDataSource.transaction.mockClear();
      await service.reverseGoodsReceiptNote('grn-001', mockUser, 'wrong delivery');
      expect(fakeDataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('3-Way Matching Report', () => {
    it('should generate reconciliation report comparing PO, GRN, and Requisitions', async () => {
      const reports = await service.getThreeWayMatchReport('proj-srinagar');
      expect(reports).toBeDefined();
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBeGreaterThanOrEqual(1);
      expect(reports[0].poNumber).toBe('PO-KIPL-2026-0001');
      // Status is reported for the order, not per line: a payment requisition
      // item references the PO number and nothing finer, so there is no data
      // with which to attribute a billed amount to an individual line.
      expect(reports[0].status).toBe('PENDING_GRN');
    });

    it('reports the figures a reviewer needs to see side by side', async () => {
      const [report] = await service.getThreeWayMatchReport('proj-srinagar');
      expect(report).toHaveProperty('orderedValue');
      expect(report).toHaveProperty('receivedValue');
      expect(report).toHaveProperty('billedAmount');
      expect(report).toHaveProperty('billedAheadOfReceipt');
      expect(report).toHaveProperty('needsAttention');
    });

    it('scopes payment requisition items to the project', async () => {
      await service.getThreeWayMatchReport('proj-srinagar');
      const qb = prItemRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'pr.projectId = :projectId',
        { projectId: 'proj-srinagar' },
      );
    });
  });
});
