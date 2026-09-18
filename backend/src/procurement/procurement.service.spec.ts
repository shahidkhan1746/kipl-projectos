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
import { ProcurementPdfService } from './procurement-pdf.service';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let reqRepo: any;
  let reqItemRepo: any;
  let poRepo: any;
  let poItemRepo: any;
  let pdfService: any;

  const mockUser = {
    id: 'user-123',
    name: 'Er. Shahid Site Engineer',
    email: 'shahid@kipl.com',
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
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockReq]),
      }),
    };

    reqItemRepo = {
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    poRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'po-new' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'po-001') {
          return Promise.resolve({
            id: 'po-001',
            poNumber: 'PO-KIPL-2026-0001',
            vendorName: 'J&K Steel Traders',
            subtotalAmount: 150000,
            taxAmount: 27000,
            grandTotal: 177000,
            status: PurchaseOrderStatus.ISSUED,
            items: [],
          });
        }
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    poItemRepo = {
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    pdfService = {
      generatePurchaseOrderPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getRepositoryToken(MaterialRequisition), useValue: reqRepo },
        { provide: getRepositoryToken(RequisitionItem), useValue: reqItemRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: poItemRepo },
        { provide: ProcurementPdfService, useValue: pdfService },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
  });

  describe('createRequisition', () => {
    it('should create an indent with auto-generated REQ number, items, and SUBMITTED_TO_HO status', async () => {
      const result = await service.createRequisition(mockUser, {
        projectId: 'proj-srinagar',
        title: 'Cement for Grouting',
        siteLocation: 'Habak STP',
        requiredByDate: '2026-10-05',
        priority: RequisitionPriority.NORMAL,
        items: [
          {
            itemDescription: 'OPC 53 Cement',
            category: 'Cement',
            quantity: 200,
            unit: 'Bags',
            estimatedRate: 420,
          },
        ],
      });

      expect(reqRepo.create).toHaveBeenCalled();
      expect(result.status).toBe(RequisitionStatus.SUBMITTED_TO_HO);
      expect(result.procurementStatus).toBe(HoDepartmentApprovalStatus.PENDING);
      expect(result.accountsStatus).toBe(HoDepartmentApprovalStatus.PENDING);
      expect(result.estimatedTotal).toBe(84000);
    });
  });

  describe('approveHoRequisition (Dual HO Approval)', () => {
    it('should set PARTIALLY_APPROVED when only HO Procurement approves', async () => {
      const result = await service.approveHoRequisition('req-001', mockUser, {
        department: 'procurement',
        action: 'approved',
        remarks: 'Specs verified, recommended vendor: J&K Steel Works',
        recommendedVendor: 'J&K Steel Works',
      });

      expect(result.procurementStatus).toBe(HoDepartmentApprovalStatus.APPROVED);
      expect(result.accountsStatus).toBe(HoDepartmentApprovalStatus.PENDING);
      expect(result.status).toBe(RequisitionStatus.PARTIALLY_APPROVED);
      expect(result.recommendedVendor).toBe('J&K Steel Works');
    });

    it('should set REJECTED if HO Accounts rejects', async () => {
      const result = await service.approveHoRequisition('req-001', mockUser, {
        department: 'accounts',
        action: 'rejected',
        remarks: 'Budget exceeded for this cost center',
      });

      expect(result.accountsStatus).toBe(HoDepartmentApprovalStatus.REJECTED);
      expect(result.status).toBe(RequisitionStatus.REJECTED);
    });

    it('should set APPROVED when both HO Procurement and Accounts approve', async () => {
      // First, HO Procurement approves
      await service.approveHoRequisition('req-001', mockUser, {
        department: 'procurement',
        action: 'approved',
        recommendedVendor: 'Kashmir Pipes & Steels',
      });

      // Then, HO Accounts approves
      const finalResult = await service.approveHoRequisition('req-001', mockUser, {
        department: 'accounts',
        action: 'approved',
        budgetHead: 'Civil Material Dal Lake',
      });

      expect(finalResult.procurementStatus).toBe(HoDepartmentApprovalStatus.APPROVED);
      expect(finalResult.accountsStatus).toBe(HoDepartmentApprovalStatus.APPROVED);
      expect(finalResult.status).toBe(RequisitionStatus.APPROVED);
    });
  });

  describe('convertRequisitionToPo', () => {
    it('should throw BadRequestException if requisition is not fully approved', async () => {
      reqRepo.findOne.mockResolvedValueOnce({
        ...mockReq,
        status: RequisitionStatus.PARTIALLY_APPROVED,
      });

      await expect(
        service.convertRequisitionToPo('req-001', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate PO and set requisition status to CONVERTED_TO_PO when fully approved', async () => {
      reqRepo.findOne.mockResolvedValueOnce({
        ...mockReq,
        status: RequisitionStatus.APPROVED,
        procurementStatus: HoDepartmentApprovalStatus.APPROVED,
        accountsStatus: HoDepartmentApprovalStatus.APPROVED,
        recommendedVendor: 'Himalayan Steels Ltd.',
      });

      const po = await service.convertRequisitionToPo('req-001', mockUser, {
        freightCharges: 5000,
      });

      expect(poRepo.create).toHaveBeenCalled();
      expect(po.vendorName).toBe('Himalayan Steels Ltd.');
      expect(po.status).toBe(PurchaseOrderStatus.ISSUED);
      expect(po.subtotalAmount).toBe(150000);
      expect(po.taxAmount).toBe(27000); // 18% of 150000
      expect(po.grandTotal).toBe(182000); // 150000 + 27000 + 5000 freight
      expect(reqRepo.save).toHaveBeenCalled();
    });
  });

  describe('createDirectPurchaseOrder', () => {
    it('should calculate item totals, GST, and grand total correctly', async () => {
      const po = await service.createDirectPurchaseOrder(mockUser, {
        projectId: 'proj-srinagar',
        vendorName: 'JK Cements Srinagar',
        items: [
          {
            itemDescription: 'OPC 43 Cement',
            quantity: 100,
            unitRate: 400,
            discountPercent: 5, // 400 - 5% = 380 -> 100 * 380 = 38,000
            gstRate: 28, // 38,000 * 28% = 10,640
          },
        ],
        freightCharges: 2000,
      });

      expect(po.subtotalAmount).toBe(38000);
      expect(po.taxAmount).toBe(10640);
      expect(po.grandTotal).toBe(50640);
      expect(po.status).toBe(PurchaseOrderStatus.ISSUED);
    });
  });

  describe('generatePoPdf', () => {
    it('should return a PDF buffer for an existing PO', async () => {
      const buffer = await service.generatePoPdf('po-001');
      expect(buffer).toBeDefined();
      expect(buffer.toString()).toContain('%PDF');
    });

    it('should throw NotFoundException for non-existent PO', async () => {
      await expect(service.generatePoPdf('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
