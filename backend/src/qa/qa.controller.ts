import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { QaService } from './qa.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const QA_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.QA_ENGINEER,
]

@Controller('qa')
@UseGuards(JwtAuthGuard)
export class QaController {
  constructor(private readonly svc: QaService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  // Checklists
  @Get('checklists')
  list(@Query('projectId') pid: string, @Query('category') cat?: string) { return this.svc.listChecklists(pid, cat) }

  @Post('checklists/seed')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  @HttpCode(HttpStatus.CREATED)
  seed(@Body('projectId') pid: string) { return this.svc.seedChecklists(pid) }

  @Post('checklists')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.createChecklist(body) }

  @Get('checklists/:id')
  getOne(@Param('id') id: string) { return this.svc.getChecklist(id) }

  // Inspections
  @Get('inspections')
  inspections(@Query() q: any) { return this.svc.listInspections({ projectId:q.projectId, workItem:q.workItem, result:q.result, fromDate:q.fromDate, toDate:q.toDate, limit:q.limit }) }

  @Post('inspections')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  @HttpCode(HttpStatus.CREATED)
  createInsp(@Body() body: any, @Request() req: any) {
    return this.svc.createInspection({
      ...body,
      inspectedBy: req.user?.name ?? req.user?.id,
    })
  }

  @Get('inspections/:id')
  getInsp(@Param('id') id: string) { return this.svc.getInspection(id) }

  @Patch('inspections/:id')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  updateInsp(@Param('id') id: string, @Body() body: any) { return this.svc.updateInspection(id, body) }

  // NCRs
  @Get('ncrs')
  ncrs(@Query() q: any) { return this.svc.listNcrs({ projectId:q.projectId, status:q.status, severity:q.severity, limit:q.limit }) }

  @Post('ncrs')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  @HttpCode(HttpStatus.CREATED)
  createNcr(@Body() body: any, @Request() req: any) {
    return this.svc.createNcr({
      ...body,
      raisedBy: req.user?.name ?? req.user?.id,
    })
  }

  @Patch('ncrs/:id/verify')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  verifyNcr(@Param('id') id: string, @Request() req: any) {
    return this.svc.verifyNcr(id, req.user?.id)
  }

  @Patch('ncrs/:id/close')
  @UseGuards(RolesGuard)
  @Roles(...QA_ROLES)
  closeNcr(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.closeNcr(id, { ...body, closedBy: req.user?.id })
  }
}
