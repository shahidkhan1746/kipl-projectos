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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ProcurementService } from './procurement.service';
import {
  CreateRequisitionDto,
  HoApprovalDto,
  CreatePurchaseOrderDto,
  UpdatePoStatusDto,
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
  UserRole.VIEWER,
];

const SITE_INDENT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.SUPERVISOR,
];

const HO_APPROVAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
  UserRole.ENGINEER,
];

@Controller('procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  // ─────────────────────────────────────────────────────────────
  // REQUISITIONS
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

  @Post('requisitions/:id/approve-ho')
  @UseGuards(RolesGuard)
  @Roles(...HO_APPROVAL_ROLES)
  async approveHoRequisition(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: HoApprovalDto,
  ) {
    return this.service.approveHoRequisition(id, req.user, dto);
  }

  @Post('requisitions/:id/convert-po')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...HO_APPROVAL_ROLES)
  async convertRequisitionToPo(
    @Param('id') id: string,
    @Request() req: any,
    @Body() overrides?: Partial<CreatePurchaseOrderDto>,
  ) {
    return this.service.convertRequisitionToPo(id, req.user, overrides);
  }

  // ─────────────────────────────────────────────────────────────
  // PURCHASE ORDERS (PO)
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
  @Roles(...HO_APPROVAL_ROLES)
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
  @Roles(...HO_APPROVAL_ROLES)
  async updatePoStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePoStatusDto,
  ) {
    return this.service.updatePoStatus(id, dto.status, dto.notes);
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
}
