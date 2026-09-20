import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ProcurementService } from './procurement.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateRequisitionDto,
  UpdateRequisitionDraftDto,
  HoApprovalDto,
  CreatePurchaseOrderDto,
  UpdatePoStatusDto,
  CreatePaymentRequisitionDto,
  CreateGrnDto,
} from './dto/procurement.dto';

const READ_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
  UserRole.SUPERVISOR,
  UserRole.QA_ENGINEER,
  UserRole.LIAISON_OFFICER,
  UserRole.FIELD_STAFF,
  UserRole.VIEWER,
];

const SITE_INDENT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.SUPERVISOR,
  UserRole.FIELD_STAFF,
];

const PROCUREMENT_APPROVAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
];

const ACCOUNTS_APPROVAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
];

const ALL_HO_APPROVAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
];

@Controller('procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(
    private readonly service: ProcurementService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    // 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 15MB limit');
    }
    return this.storageService.upload(file, 'procurement');
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MATERIAL REQUISITIONS (SITE INDENTS)
  // ─────────────────────────────────────────────────────────────
  @Get('requisitions')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getRequisitions(
    @Query('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.service.getRequisitions(projectId, status);
  }

  @Post('requisitions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async createRequisition(
    @Request() req: any,
    @Body() dto: CreateRequisitionDto,
  ) {
    return this.service.createRequisition(req.user, dto);
  }

  @Get('requisitions/:id')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getRequisitionById(@Param('id') id: string) {
    return this.service.getRequisitionById(id);
  }

  @Patch('requisitions/:id')
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async updateDraftRequisition(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateRequisitionDraftDto,
  ) {
    return this.service.updateDraftRequisition(id, req.user, dto);
  }

  @Post('requisitions/:id/submit')
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async submitRequisition(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.submitRequisition(id, req.user);
  }

  @Post('requisitions/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async cancelRequisition(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancelRequisition(id, req.user, reason);
  }

  @Post('requisitions/:id/approve-ho')
  @UseGuards(RolesGuard)
  @Roles(...ALL_HO_APPROVAL_ROLES)
  async approveHoRequisition(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: HoApprovalDto,
  ) {
    // Check specific department role
    const userRole = req.user?.role;
    if (dto.department === 'procurement' && !PROCUREMENT_APPROVAL_ROLES.includes(userRole)) {
      throw new BadRequestException('Only procurement managers or administrators can stamp procurement approval.');
    }
    if (dto.department === 'accounts' && !ACCOUNTS_APPROVAL_ROLES.includes(userRole)) {
      throw new BadRequestException('Only accounts personnel or administrators can stamp accounts approval.');
    }
    return this.service.approveHoRequisition(id, req.user, dto);
  }

  @Post('requisitions/:id/convert-po')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...PROCUREMENT_APPROVAL_ROLES)
  async convertRequisitionToPo(
    @Param('id') id: string,
    @Request() req: any,
    @Body() overrides?: Partial<CreatePurchaseOrderDto>,
  ) {
    return this.service.convertRequisitionToPo(id, req.user, overrides);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PURCHASE ORDERS (PO)
  // ─────────────────────────────────────────────────────────────
  @Get('orders')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getPurchaseOrders(
    @Query('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.service.getPurchaseOrders(projectId, status);
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...PROCUREMENT_APPROVAL_ROLES)
  async createDirectPurchaseOrder(
    @Request() req: any,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.createDirectPurchaseOrder(req.user, dto);
  }

  @Get('orders/:id')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getPurchaseOrderById(@Param('id') id: string) {
    return this.service.getPurchaseOrderById(id);
  }

  @Patch('orders/:id/status')
  @UseGuards(RolesGuard)
  @Roles(...ALL_HO_APPROVAL_ROLES)
  async updatePoStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePoStatusDto,
  ) {
    return this.service.updatePoStatus(id, dto.status, dto.notes);
  }

  @Post('orders/:id/issue')
  @UseGuards(RolesGuard)
  @Roles(...PROCUREMENT_APPROVAL_ROLES)
  async issuePo(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.issuePo(id, req.user);
  }

  @Get('orders/:id/pdf')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async downloadPoPdf(@Param('id') id: string, @Res() res: Response) {
    const po = await this.service.getPurchaseOrderById(id);
    const pdfBuffer = await this.service.generatePoPdf(id);
    const safePoNumber = (po.poNumber || 'PO').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safePoNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GOODS RECEIPT NOTES (GRN) & MATERIAL LOG BRIDGE
  // ─────────────────────────────────────────────────────────────
  @Post('orders/:id/grn')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async createGoodsReceiptNote(
    @Param('id') poId: string,
    @Request() req: any,
    @Body() dto: CreateGrnDto,
  ) {
    return this.service.createGoodsReceiptNote(poId, req.user, dto);
  }

  @Get('orders/:id/grns')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getGrnsForPo(
    @Param('id') poId: string,
    @Query('projectId') projectId: string,
  ) {
    return this.service.getGoodsReceiptNotes(projectId, poId);
  }

  /**
   * Reversing a signed receipt moves stock and a purchase order's delivery
   * position, so it sits with the roles that approve procurement rather than
   * with the roles that record a delivery. The site records what arrived; it
   * does not decide that it did not.
   */
  @Post('grns/:id/reverse')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...PROCUREMENT_APPROVAL_ROLES)
  async reverseGoodsReceiptNote(
    @Param('id') grnId: string,
    @Request() req: any,
    @Body() body: { reason?: string },
  ) {
    return this.service.reverseGoodsReceiptNote(grnId, req.user, body?.reason);
  }

  @Get('grns')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getAllGrns(
    @Query('projectId') projectId: string,
    @Query('poId') poId?: string,
  ) {
    return this.service.getGoodsReceiptNotes(projectId, poId);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. KIPL PAYMENT REQUISITIONS (EXCEL PROFORMA FORMAT)
  // ─────────────────────────────────────────────────────────────
  @Get('payment-requisitions')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getPaymentRequisitions(
    @Query('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.service.getPaymentRequisitions(projectId, status);
  }

  @Post('payment-requisitions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async createPaymentRequisition(
    @Request() req: any,
    @Body() dto: CreatePaymentRequisitionDto,
  ) {
    return this.service.createPaymentRequisition(req.user, dto);
  }

  @Get('payment-requisitions/:id')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getPaymentRequisitionById(@Param('id') id: string) {
    return this.service.getPaymentRequisitionById(id);
  }

  @Post('payment-requisitions/:id/approve-ho')
  @UseGuards(RolesGuard)
  @Roles(...ALL_HO_APPROVAL_ROLES)
  async approveHoPaymentRequisition(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: HoApprovalDto,
  ) {
    const userRole = req.user?.role;
    if (dto.department === 'procurement' && !PROCUREMENT_APPROVAL_ROLES.includes(userRole)) {
      throw new BadRequestException('Only procurement managers or administrators can stamp procurement approval.');
    }
    if (dto.department === 'accounts' && !ACCOUNTS_APPROVAL_ROLES.includes(userRole)) {
      throw new BadRequestException('Only accounts personnel or administrators can stamp accounts approval.');
    }
    return this.service.approveHoPaymentRequisition(id, req.user, dto);
  }

  @Post('payment-requisitions/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(...SITE_INDENT_ROLES)
  async cancelPaymentRequisition(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancelPaymentRequisition(id, req.user, reason);
  }

  @Get('payment-requisitions/:id/pdf')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async downloadPaymentRequisitionPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pr = await this.service.getPaymentRequisitionById(id);
    const pdfBuffer = await this.service.generatePaymentRequisitionPdf(id);
    const safePrNumber = (pr.prNumber || 'Payment_Requisition').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safePrNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. 3-WAY MATCHING RECONCILIATION REPORT
  // ─────────────────────────────────────────────────────────────
  @Get('three-way-match')
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  async getThreeWayMatch(
    @Query('projectId') projectId: string,
    @Query('poId') poId?: string,
  ) {
    return this.service.getThreeWayMatchReport(projectId, poId);
  }
}
