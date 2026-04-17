import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { EpcService } from './epc.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RaBillStatus } from './ra-bill.entity'

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
  seedBoq(@Body() body: { projectId: string; force?: boolean }) { return this.svc.seedBoqItems(body.projectId, body.force ?? false) }

  @Get('boq')
  listBoq(@Query('projectId') pid: string, @Query('category') cat?: string) {
    return this.svc.listBoqItems(pid, cat)
  }

  @Post('boq')
  @HttpCode(HttpStatus.CREATED)
  createBoq(@Body() body: any) { return this.svc.createBoqItem(body) }

  @Patch('boq/:id')
  updateBoq(@Param('id') id: string, @Body() body: any) { return this.svc.updateBoqItem(id, body) }

  @Patch('boq/:id/measure')
  measure(@Param('id') id: string, @Body('measuredQty') qty: number) {
    return this.svc.updateMeasuredQty(id, qty)
  }

  // ── RA Bills ─────────────────────────────────────────────
  @Get('ra-bills')
  listRa(@Query('projectId') pid: string) { return this.svc.listRaBills(pid) }

  @Post('ra-bills')
  @HttpCode(HttpStatus.CREATED)
  createRa(@Body() body: any) { return this.svc.createRaBill(body) }

  @Get('ra-bills/:id')
  getRa(@Param('id') id: string) { return this.svc.getRaBill(id) }

  @Patch('ra-bills/:id/status')
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
  addMb(@Body() body: any) { return this.svc.addMeasurement(body) }

  @Patch('boq/quoted-rate')
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