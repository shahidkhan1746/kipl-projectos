import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PdfService } from './pdf.service'

@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(private readonly pdfSvc: PdfService) {}

  @Post('salary-slip')
  async salarySlip(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateSalarySlip(body)
    const filename = 'SalarySlip_' + (body.employee?.empCode ?? 'EMP') + '_' + body.month + '_' + body.year + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }

  @Post('ra-bill')
  async raBill(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateRaBill(body)
    const filename = 'RaBill_' + (body.bill?.billNo ?? 'RA') + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }

  @Post('inspection')
  async inspection(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateInspectionReport(body)
    const filename = 'Inspection_' + (body.inspection?.date ?? 'report') + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }

  @Post('attendance-report')
  async attendanceReport(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateAttendanceReport(body)
    const filename = 'Attendance_' + (body.date ?? 'Report') + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }
}