import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common'
import type { Response } from 'express'
import { WbsService } from './wbs.service'
import { WbsPdfService } from './wbs-pdf.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('wbs') @UseGuards(JwtAuthGuard)
export class WbsController {
  constructor(
    private readonly svc: WbsService,
    private readonly pdfSvc: WbsPdfService,
  ) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query('projectId') pid: string) { return this.svc.list(pid) }

  @Post('seed') @HttpCode(HttpStatus.CREATED)
  seed(@Body() body: { projectId: string; force?: boolean }) {
    return this.svc.seed(body.projectId, body.force ?? false)
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  // ── CPM & PERT ────────────────────────────────────────────────────────
  @Get('cpm')
  cpm(@Query('projectId') pid: string) { return this.svc.getCPM(pid) }

  @Get('pert')
  pert(@Query('projectId') pid: string) { return this.svc.getPERT(pid) }

  @Get('eot-register')
  eotRegister(@Query('projectId') pid: string) { return this.svc.getEotRegister(pid) }

  @Post('recalculate')
  recalculate(@Body('projectId') pid: string) { return this.svc.recalculate(pid) }

  // ── PDF Generation ────────────────────────────────────────────────────
  @Get('pdf/gantt-full')
  async ganttFullPdf(@Query('projectId') pid: string, @Res() res: Response) {
    const tasks = await this.svc.list(pid)
    const dashboard = await this.svc.dashboard(pid)
    const buffer = await this.pdfSvc.generateGanttFull(tasks, dashboard as any)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="DalLake_Gantt_Full_${new Date().toISOString().split('T')[0]}.pdf"`,
    })
    res.end(buffer)
  }

  @Get('pdf/gantt-quarterly')
  async ganttQuarterlyPdf(@Query('projectId') pid: string, @Res() res: Response) {
    const tasks = await this.svc.list(pid)
    const dashboard = await this.svc.dashboard(pid)
    const buffer = await this.pdfSvc.generateGanttQuarterly(tasks, dashboard as any)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="DalLake_Gantt_Quarterly_${new Date().toISOString().split('T')[0]}.pdf"`,
    })
    res.end(buffer)
  }

  @Get('pdf/report')
  async progressReportPdf(@Query('projectId') pid: string, @Res() res: Response) {
    const tasks = await this.svc.list(pid)
    const dashboard = await this.svc.dashboard(pid)
    const cpm = await this.svc.getCPM(pid)
    const pert = await this.svc.getPERT(pid)
    const buffer = await this.pdfSvc.generateProgressReport(tasks, dashboard as any, cpm, pert)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="DalLake_ProgressReport_${new Date().toISOString().split('T')[0]}.pdf"`,
    })
    res.end(buffer)
  }
}
