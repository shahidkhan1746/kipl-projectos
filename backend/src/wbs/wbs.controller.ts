import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Res, GoneException, Request } from '@nestjs/common'
import type { Response } from 'express'
import { WbsService } from './wbs.service'
import { WbsPdfService } from './wbs-pdf.service'
import { CreateWbsTaskDto, UpdateWbsTaskDto, CreateBaselineDto } from './dto/wbs-task.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const WBS_WRITE = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.LIAISON_OFFICER,
]
const WBS_SEED = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER]

@Controller('wbs') @UseGuards(JwtAuthGuard)
export class WbsController {
  constructor(
    private readonly svc: WbsService,
    private readonly pdfSvc: WbsPdfService,
  ) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  // The activities with the live forecast laid over them. Reads never write.
  @Get()
  list(@Query('projectId') pid: string) { return this.svc.listScheduled(pid) }

  // Schedule health: errors that stop the calculation, and network-quality warnings.
  @Get('issues')
  issues(@Query('projectId') pid: string) { return this.svc.scheduleIssues(pid) }

  @Post('seed') @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...WBS_SEED)
  seed(@Body() body: { projectId: string; force?: boolean }) {
    return this.svc.seed(body.projectId, body.force ?? false)
  }

  @Post('enabling') @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...WBS_SEED)
  addEnabling(@Body('projectId') pid: string) { return this.svc.addEnablingPhase(pid) }

  // Removed. It rewrote the logic from the planned dates, so the CPM could only
  // ever reproduce the dates it was given (CPM audit F-01).
  @Post('remodel-dependencies')
  @UseGuards(RolesGuard) @Roles(...WBS_SEED)
  remodel() {
    throw new GoneException('Deriving logic from planned dates has been removed. Enter predecessors and durations; the CPM computes the dates.')
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...WBS_WRITE)
  create(@Body() body: CreateWbsTaskDto) { return this.svc.create({ ...body }) }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(...WBS_WRITE)
  update(@Param('id') id: string, @Body() body: UpdateWbsTaskDto) { return this.svc.update(id, { ...body }) }

  // ── CPM & PERT ────────────────────────────────────────────────────────
  @Get('cpm')
  cpm(@Query('projectId') pid: string) { return this.svc.getCPM(pid) }

  @Get('pert')
  pert(@Query('projectId') pid: string) { return this.svc.getPERT(pid) }

  @Get('risk-forecast')
  riskForecast(@Query('projectId') pid: string) { return this.svc.getRiskForecast(pid) }

  @Get('eot-register')
  eotRegister(@Query('projectId') pid: string) { return this.svc.getEotRegister(pid) }

  /** Progress S-curve: baseline, forecast and latest-permissible curves, with Clause 16.3. */
  @Get('s-curve')
  sCurve(@Query('projectId') pid: string, @Query('baselineId') baselineId?: string) {
    return this.svc.getSCurve(pid, baselineId)
  }

  @Post('recalculate')
  @UseGuards(RolesGuard) @Roles(...WBS_WRITE)
  recalculate(@Body('projectId') pid: string) { return this.svc.recalculate(pid) }

  // ── Baselines ─────────────────────────────────────────────────────────
  @Get('baselines')
  baselines(@Query('projectId') pid: string) { return this.svc.listBaselines(pid) }

  @Post('baselines') @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...WBS_SEED)
  createBaseline(@Body() body: CreateBaselineDto, @Request() req: any) {
    return this.svc.createBaseline(body.projectId, body.name, body.notes, req.user?.name ?? req.user?.email)
  }

  /** The accepted programme — the baseline progress and delay are measured against. */
  @Get('baselines/active')
  activeBaseline(@Query('projectId') pid: string) { return this.svc.getActiveBaseline(pid) }

  @Post('baselines/:id/activate')
  @UseGuards(RolesGuard) @Roles(...WBS_WRITE)
  activateBaseline(@Param('id') id: string) { return this.svc.activateBaseline(id) }

  @Get('baselines/:id/variance')
  baselineVariance(@Param('id') id: string) { return this.svc.baselineVariance(id) }

  // ── PDF Generation ────────────────────────────────────────────────────
  @Get('pdf/gantt-full')
  async ganttFullPdf(@Query('projectId') pid: string, @Res() res: Response) {
    const tasks = await this.svc.listScheduled(pid)
    const dashboard = await this.svc.dashboard(pid)
    const buffer = await this.pdfSvc.generateGanttFull(tasks, dashboard as any)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="KIPL_Gantt_Full_${new Date().toISOString().split('T')[0]}.pdf"`,
    })
    res.end(buffer)
  }

  @Get('pdf/gantt-quarterly')
  async ganttQuarterlyPdf(@Query('projectId') pid: string, @Res() res: Response) {
    const tasks = await this.svc.listScheduled(pid)
    const dashboard = await this.svc.dashboard(pid)
    const buffer = await this.pdfSvc.generateGanttQuarterly(tasks, dashboard as any)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="KIPL_Gantt_Quarterly_${new Date().toISOString().split('T')[0]}.pdf"`,
    })
    res.end(buffer)
  }

  @Get('pdf/report')
  async progressReportPdf(@Query('projectId') pid: string, @Res() res: Response) {
    const tasks = await this.svc.listScheduled(pid)
    const dashboard = await this.svc.dashboard(pid)
    const cpm = await this.svc.getCPM(pid)
    const pert = await this.svc.getPERT(pid)
    const buffer = await this.pdfSvc.generateProgressReport(tasks, dashboard as any, cpm, pert)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="KIPL_ProgressReport_${new Date().toISOString().split('T')[0]}.pdf"`,
    })
    res.end(buffer)
  }
}
