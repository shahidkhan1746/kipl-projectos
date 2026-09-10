import { Controller, Get, Post, Body, Query, Param, Res, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common'
import type { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'
import { PdfService } from './pdf.service'
import { HrService } from '../hr/hr.service'
import { EpcService } from '../epc/epc.service'
import { QaService } from '../qa/qa.service'
import { ProjectsService } from '../projects/projects.service'

const HR_PDF = [
  UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER,
  UserRole.HR_OFFICER, UserRole.ACCOUNTS, UserRole.ACCOUNTANT,
]
const EPC_PDF = [
  UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER, UserRole.ACCOUNTS, UserRole.ACCOUNTANT,
]
const QA_PDF = [
  UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER, UserRole.QA_ENGINEER,
]

@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(
    private readonly pdfSvc: PdfService,
    private readonly hr: HrService,
    private readonly epc: EpcService,
    private readonly qa: QaService,
    private readonly projects: ProjectsService,
  ) {}

  private send(res: Response, pdf: Buffer, filename: string) {
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` })
    res.send(pdf)
  }

  @Get('salary-slip/:id')
  @UseGuards(RolesGuard) @Roles(...HR_PDF)
  async salarySlipById(@Param('id') id: string, @Res() res: Response) {
    const payload = await this.loadSalary(id)
    const pdf = await this.pdfSvc.generateSalarySlip(payload)
    this.send(res, pdf, `SalarySlip_${payload.employee?.empCode ?? 'EMP'}_${payload.month}_${payload.year}.pdf`)
  }

  @Post('salary-slip')
  @UseGuards(RolesGuard) @Roles(...HR_PDF)
  async salarySlip(@Body() body: any, @Res() res: Response) {
    const payload = body?.id ? await this.loadSalary(body.id) : body
    const pdf = await this.pdfSvc.generateSalarySlip(payload)
    this.send(res, pdf, `SalarySlip_${payload.employee?.empCode ?? 'EMP'}_${payload.month}_${payload.year}.pdf`)
  }

  @Get('ra-bill/:id')
  @UseGuards(RolesGuard) @Roles(...EPC_PDF)
  async raBillById(@Param('id') id: string, @Res() res: Response) {
    const payload = await this.loadRaBill(id)
    const pdf = await this.pdfSvc.generateRaBill(payload)
    this.send(res, pdf, `RaBill_${payload.bill?.billNo ?? 'RA'}.pdf`)
  }

  @Post('ra-bill')
  @UseGuards(RolesGuard) @Roles(...EPC_PDF)
  async raBill(@Body() body: any, @Res() res: Response) {
    const payload = body?.id || body?.billId ? await this.loadRaBill(body.id || body.billId) : body
    const pdf = await this.pdfSvc.generateRaBill(payload)
    this.send(res, pdf, `RaBill_${payload.bill?.billNo ?? 'RA'}.pdf`)
  }

  @Get('inspection/:id')
  @UseGuards(RolesGuard) @Roles(...QA_PDF)
  async inspectionById(@Param('id') id: string, @Res() res: Response) {
    const payload = await this.loadInspection(id)
    const pdf = await this.pdfSvc.generateInspectionReport(payload)
    this.send(res, pdf, `Inspection_${payload.inspection?.date ?? 'report'}.pdf`)
  }

  @Post('inspection')
  @UseGuards(RolesGuard) @Roles(...QA_PDF)
  async inspection(@Body() body: any, @Res() res: Response) {
    const payload = body?.id || body?.inspectionId ? await this.loadInspection(body.id || body.inspectionId) : body
    const pdf = await this.pdfSvc.generateInspectionReport(payload)
    this.send(res, pdf, `Inspection_${payload.inspection?.date ?? 'report'}.pdf`)
  }

  @Get('attendance-report')
  @UseGuards(RolesGuard) @Roles(...HR_PDF)
  async attendanceReportGet(@Query('date') date: string, @Query('projectId') projectId: string, @Res() res: Response) {
    if (!date) throw new BadRequestException('date is required')
    const payload = await this.loadAttendance(date, projectId)
    const pdf = await this.pdfSvc.generateAttendanceReport(payload)
    this.send(res, pdf, `Attendance_${date}.pdf`)
  }

  @Post('attendance-report')
  @UseGuards(RolesGuard) @Roles(...HR_PDF)
  async attendanceReport(@Body() body: any, @Res() res: Response) {
    const payload = body?.date && !body?.records ? await this.loadAttendance(body.date, body.projectId) : body
    const pdf = await this.pdfSvc.generateAttendanceReport(payload)
    this.send(res, pdf, `Attendance_${payload.date ?? 'Report'}.pdf`)
  }

  @Get('monthly-attendance-report')
  @UseGuards(RolesGuard) @Roles(...HR_PDF)
  async monthlyAttendanceGet(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const y = parseInt(year, 10)
    const m = parseInt(month, 10)
    if (!y || !m) throw new BadRequestException('year and month are required')
    const payload = await this.loadMonthlyAttendance(y, m, projectId)
    const pdf = await this.pdfSvc.generateMonthlyAttendanceReport(payload)
    this.send(res, pdf, `Monthly_Attendance_${y}_${m}.pdf`)
  }

  @Post('monthly-attendance-report')
  @UseGuards(RolesGuard) @Roles(...HR_PDF)
  async monthlyAttendanceReport(@Body() body: any, @Res() res: Response) {
    const payload = body?.records ? body : await this.loadMonthlyAttendance(Number(body.year), Number(body.month), body.projectId)
    const pdf = await this.pdfSvc.generateMonthlyAttendanceReport(payload)
    this.send(res, pdf, `Monthly_Attendance_${payload.year}_${payload.month}.pdf`)
  }

  private async loadSalary(id: string) {
    const record = await this.hr.getSalary(id)
    const employee = await this.hr.getEmployee(record.employeeId)
    return {
      employee,
      record,
      month: record.month,
      year: record.year,
      daysPresent: Number(record.daysPresent || 0),
      totalDays: Number(record.workingDays || 0),
    }
  }

  private async loadRaBill(id: string) {
    const bill = await this.epc.getRaBill(id)
    if (!bill) throw new NotFoundException('RA bill not found')
    let project: any = null
    try { project = await this.projects.findById(bill.projectId) } catch { project = null }
    return { bill, project }
  }

  private async loadInspection(id: string) {
    const inspection = await this.qa.getInspection(id)
    let checklist: any = null
    if (inspection.checklistId) {
      try { checklist = await this.qa.getChecklist(inspection.checklistId) } catch { checklist = null }
    }
    return { inspection, checklist }
  }

  private async loadAttendance(date: string, projectId?: string) {
    const records = await this.hr.getAttendance({ date, projectId })
    const employees = await this.hr.listEmployees({ projectId, status: 'active' } as any)
    const today = await this.hr.getTodayAttendance(projectId)
    return { date, records, employees, today }
  }

  private async loadMonthlyAttendance(year: number, month: number, projectId?: string) {
    const records = await this.hr.getAttendance({ year, month, projectId })
    const employees = await this.hr.listEmployees({ projectId, status: 'active' } as any)
    let project: any = null
    if (projectId) {
      try { project = await this.projects.findById(projectId) } catch { project = null }
    }
    return { year, month, records, employees, project }
  }
}