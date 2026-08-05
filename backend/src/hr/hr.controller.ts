import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, Res, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { HrService } from './hr.service'
import { buildIdCardHtml } from './id-card.html'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { MarkAttendanceDto } from './dto/mark-attendance.dto'
import { GenerateSalaryDto } from './dto/generate-salary.dto'
import { ApplyLeaveDto } from './dto/apply-leave.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { LeaveStatus } from './leave-request.entity'

@Controller('hr')
@UseGuards(JwtAuthGuard)
export class HrController {
  constructor(private readonly svc: HrService) {}
  @Get('dashboard')
  dashboard(@Query('projectId') projectId?: string) { return this.svc.dashboard(projectId) }
  @Get('employees/next-code')
    nextEmpCode() { return this.svc.generateNextEmpCode().then(code => ({ code })) }
  
    @Get('employees')
  listEmployees(@Query() q: any) { return this.svc.listEmployees({ department: q.department, status: q.status, search: q.search, projectId: q.projectId }) }
  @Post('employees') @HttpCode(HttpStatus.CREATED)
  createEmployee(@Body() dto: CreateEmployeeDto) { return this.svc.createEmployee(dto) }
  @Delete('employees/:id') @HttpCode(HttpStatus.NO_CONTENT)
  deleteEmployee(@Param('id') id: string) { return this.svc.deleteEmployee(id) }

  @Get('employees/:id')
  getEmployee(@Param('id') id: string) { return this.svc.getEmployee(id) }

  // ── ID card ────────────────────────────────────────────────────
  // HTML card — viewable/printable in the browser (no Gotenberg needed).
  @Get('id-card/:id')
  async idCardHtml(@Param('id') id: string, @Query('style') style: string, @Res() res: Response) {
    const emp = await this.svc.getEmployee(id)
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.end(buildIdCardHtml(emp, style))
  }
  // Server-rendered PDF via Gotenberg (set GOTENBERG_URL). Falls back with a
  // clear message if not configured — the in-app jsPDF card still works.
  @Get('id-card/:id/pdf')
  async idCardPdf(@Param('id') id: string, @Query('style') style: string, @Res() res: Response) {
    const emp = await this.svc.getEmployee(id)
    const g = process.env.GOTENBERG_URL
    if (!g) { res.status(501).json({ message: 'Server PDF needs GOTENBERG_URL configured. Use the in-app ID Card (PDF) or View HTML card.' }); return }
    try {
      const html = buildIdCardHtml(emp, style)
      const FD: any = (globalThis as any).FormData
      const B: any = (globalThis as any).Blob
      const fd = new FD()
      fd.append('files', new B([html], { type: 'text/html' }), 'index.html')
      const r = await (globalThis as any).fetch(`${g.replace(/\/$/, '')}/forms/chromium/convert/html`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error('Gotenberg returned ' + r.status)
      const buf = Buffer.from(await r.arrayBuffer())
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="ID-${emp.empCode ?? id}.pdf"` })
      res.end(buf)
    } catch (e: any) {
      res.status(502).json({ message: 'Gotenberg render failed: ' + (e?.message ?? e) })
    }
  }
  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() body: any) { return this.svc.updateEmployee(id, body) }
  @Get('attendance')
  getAttendance(@Query() q: any) { return this.svc.getAttendance({ employeeId: q.employeeId, date: q.date, month: q.month ? parseInt(q.month) : undefined, year: q.year ? parseInt(q.year) : undefined, projectId: q.projectId }) }
  @Get('attendance/today')
  todayAttendance(@Query('projectId') projectId?: string) { return this.svc.getTodayAttendance(projectId) }
  @Post('attendance') @HttpCode(HttpStatus.CREATED)
  markAttendance(@Body() dto: MarkAttendanceDto) { return this.svc.markAttendance(dto) }
  @Post('attendance/bulk') @HttpCode(HttpStatus.CREATED)
  bulkAttendance(@Body() body: { records: MarkAttendanceDto[] }) { return this.svc.bulkMarkAttendance(body.records) }
  @Get('attendance/report/:empId/:year/:month')
  monthlyReport(@Param('empId') empId: string, @Param('year') year: string, @Param('month') month: string) { return this.svc.getMonthlyReport(empId, parseInt(year), parseInt(month)) }
  @Get('salary')
  listSalary(@Query() q: any) { return this.svc.listSalary({ employeeId: q.employeeId, month: q.month ? parseInt(q.month) : undefined, year: q.year ? parseInt(q.year) : undefined, status: q.status }) }
  @Post('salary/generate') @HttpCode(HttpStatus.CREATED)
  generateSalary(@Body() dto: GenerateSalaryDto, @Request() req: any) { return this.svc.generateSalary(dto, req.user.id) }
  @Patch('salary/:id/approve')
  approveSalary(@Param('id') id: string) { return this.svc.approveSalary(id) }
  @Patch('salary/:id/paid')
  markPaid(@Param('id') id: string, @Body('paymentMode') pm: string) { return this.svc.markPaid(id, pm ?? 'bank_transfer') }
  @Get('leave')
  listLeaves(@Query() q: any) { return this.svc.listLeaves({ employeeId: q.employeeId, status: q.status }) }
  @Post('leave') @HttpCode(HttpStatus.CREATED)
  applyLeave(@Body() dto: ApplyLeaveDto) { return this.svc.applyLeave(dto) }
  @Patch('leave/:id/approve')
  approveLeave(@Param('id') id: string, @Request() req: any) { return this.svc.processLeave(id, LeaveStatus.APPROVED, req.user.id) }
  // ── Timesheets ───────────────────────────────────────────────
    @Get('timesheets')
    getTimesheets(@Query() q: any) {
      return this.svc.getTimesheets({ employeeId: q.employeeId, date: q.date, month: q.month?parseInt(q.month):undefined, year: q.year?parseInt(q.year):undefined, projectId: q.projectId, status: q.status })
    }
    // Site-diary reconciliation: manpower present on a given day / date range
    @Get('manpower')
    manpower(@Query('projectId') pid: string, @Query('date') date: string) { return this.svc.dailyManpower(pid, date) }
    @Get('manpower-range')
    manpowerRange(@Query('projectId') pid: string, @Query('from') from: string, @Query('to') to: string) { return this.svc.manpowerRange(pid, from, to) }
    @Post('timesheets') @HttpCode(HttpStatus.CREATED)
    submitTimesheet(@Body() body: any) { return this.svc.submitTimesheet(body) }
    @Patch('timesheets/:id/approve')
    approveTimesheet(@Param('id') id: string, @Request() req: any) { return this.svc.approveTimesheet(id, req.user.id) }
    @Patch('timesheets/:id/reject')
    rejectTimesheet(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) { return this.svc.rejectTimesheet(id, reason, req.user.id) }
  
    @Patch('leave/:id/reject')
  rejectLeave(@Param('id') id: string, @Request() req: any) { return this.svc.processLeave(id, LeaveStatus.REJECTED, req.user.id) }
}