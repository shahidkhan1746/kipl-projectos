import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { EpcService } from './epc.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'
import { RaBillStatus } from './ra-bill.entity'

const EPC_WRITE = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.LIAISON_OFFICER,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
]
const EPC_SEED = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER]

@Controller('epc')
@UseGuards(JwtAuthGuard)
export class EpcController {
  constructor(private readonly svc: EpcService) {}

  @Get('payment-milestones')
  milestones() { return this.svc.getPaymentMilestones() }

  // ── BOQ — specific routes BEFORE parameterized routes ─────
  @Get('boq/summary')                               // MUST be before boq/:id
  summary(@Query('projectId') pid: string) { return this.svc.boqSummary(pid) }

  @Post('boq/seed')                                 // MUST be before boq/:id
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...EPC_SEED)
  seedBoq(@Body() body: { projectId: string; force?: boolean; confirm?: string }) {
    return this.svc.seedBoqItems(body.projectId, body.force ?? false, body.confirm)
  }

  @Get('boq')
  listBoq(@Query('projectId') pid: string, @Query('category') cat?: string) {
    return this.svc.listBoqItems(pid, cat)
  }

  @Post('boq')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  createBoq(@Body() body: any) { return this.svc.createBoqItem(body) }

  @Patch('boq/:id')
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  updateBoq(@Param('id') id: string, @Body() body: any) { return this.svc.updateBoqItem(id, body) }

  @Patch('boq/:id/measure')
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  measure(@Param('id') id: string, @Body('measuredQty') qty: number) {
    return this.svc.updateMeasuredQty(id, qty)
  }

  // ── RA Bills ─────────────────────────────────────────────
  @Get('ra-bills')
  listRa(@Query('projectId') pid: string) { return this.svc.listRaBills(pid) }

  @Post('ra-bills')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  createRa(@Body() body: any) { return this.svc.createRaBill(body) }

  @Get('ra-bills/:id')
  getRa(@Param('id') id: string) { return this.svc.getRaBill(id) }

  @Delete('ra-bills/:id')
  @UseGuards(RolesGuard) @Roles(...EPC_SEED)
  deleteRaBill(@Param('id') id: string) { return this.svc.deleteRaBill(id) }

  @Patch('ra-bills/:id')
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  updateRaBill(@Param('id') id: string, @Body() body: any) { return this.svc.updateRaBill(id, body) }

  @Patch('ra-bills/:id/status')
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: RaBillStatus,
    @Body('remarks') remarks?: string,
  ) {
    return this.svc.updateRaBillStatus(id, status, remarks)
  }

  // ── Measurements ──────────────────────────────────────────
  @Get('measurements')
  listMb(@Query() q: any) {
    return this.svc.listMeasurements({ projectId: q.projectId, boqItemId: q.boqItemId, raBillId: q.raBillId })
  }

  @Post('measurements')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  addMb(@Body() body: any) { return this.svc.addMeasurement(body) }

  @Patch('boq/quoted-rate')
  @UseGuards(RolesGuard) @Roles(...EPC_WRITE)
  saveQuotedRate(@Body() body: {
    projectId: string
    category: string
    subCategory: string
    quotedAmount: number
  }) {
    return this.svc.saveQuotedRateByCategory(
      body.projectId,
      body.category,
      body.subCategory,
      body.quotedAmount,
    )
  }
}