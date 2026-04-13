import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { QaService } from './qa.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('qa') @UseGuards(JwtAuthGuard)
export class QaController {
  constructor(private readonly svc: QaService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  // Checklists
  @Get('checklists')
  list(@Query('projectId') pid: string, @Query('category') cat?: string) { return this.svc.listChecklists(pid, cat) }

  @Post('checklists/seed') @HttpCode(HttpStatus.CREATED)
  seed(@Body('projectId') pid: string) { return this.svc.seedChecklists(pid) }

  @Post('checklists') @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.createChecklist(body) }

  @Get('checklists/:id')
  getOne(@Param('id') id: string) { return this.svc.getChecklist(id) }

  // Inspections
  @Get('inspections')
  inspections(@Query() q: any) { return this.svc.listInspections({ projectId:q.projectId, workItem:q.workItem, result:q.result, fromDate:q.fromDate, toDate:q.toDate }) }

  @Post('inspections') @HttpCode(HttpStatus.CREATED)
  createInsp(@Body() body: any) { return this.svc.createInspection(body) }

  @Get('inspections/:id')
  getInsp(@Param('id') id: string) { return this.svc.getInspection(id) }

  @Patch('inspections/:id')
  updateInsp(@Param('id') id: string, @Body() body: any) { return this.svc.updateInspection(id, body) }

  // NCRs
  @Get('ncrs')
  ncrs(@Query() q: any) { return this.svc.listNcrs({ projectId:q.projectId, status:q.status, severity:q.severity }) }

  @Post('ncrs') @HttpCode(HttpStatus.CREATED)
  createNcr(@Body() body: any) { return this.svc.createNcr(body) }

  @Patch('ncrs/:id/close')
  closeNcr(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.closeNcr(id, { ...body, closedBy: req.user?.id })
  }
}