import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Employee, EmployeeStatus } from './employee.entity'
import { Timesheet, TimesheetStatus } from './timesheet.entity'
import { Attendance, AttendanceStatus, AttendanceSource } from './attendance.entity'
import { SalaryRecord, SalaryStatus } from './salary-record.entity'
import { LeaveRequest, LeaveStatus } from './leave-request.entity'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UsersService } from '../users/users.service'
import { MarkAttendanceDto } from './dto/mark-attendance.dto'
import { GenerateSalaryDto } from './dto/generate-salary.dto'
import { ApplyLeaveDto } from './dto/apply-leave.dto'

function gpsDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(lat2 - lat1)
  const dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() !== 0) count++
  }
  return count
}

@Injectable()
export class HrService {
  private readonly log = new Logger(HrService.name)
  constructor(
    @InjectRepository(Employee)      private readonly empRepo:   Repository<Employee>,
    @InjectRepository(Attendance)    private readonly attRepo:   Repository<Attendance>,
    @InjectRepository(SalaryRecord)  private readonly salRepo:   Repository<SalaryRecord>,
    @InjectRepository(LeaveRequest)  private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(Timesheet)     private readonly tsRepo:    Repository<Timesheet>,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async generateNextEmpCode(): Promise<string> {
      const last = await this.empRepo
        .createQueryBuilder('e')
        .where("e.empCode LIKE 'KIPL-%'")
        .orderBy('e.createdAt', 'DESC')
        .getOne()
      if (!last) return 'KIPL-001'
      const num = parseInt(last.empCode.replace('KIPL-', '')) || 0
      return 'KIPL-' + String(num + 1).padStart(3, '0')
    }
  
    async createEmployee(dto: any): Promise<Employee> {
    if (!dto.empCode) dto.empCode = await this.generateNextEmpCode()
        const exists = await this.empRepo.findOne({ where: { empCode: dto.empCode } })
    if (exists) throw new ConflictException('Employee code already exists')
    const { createLogin, loginEmail, loginRole, loginPassword, ...empData } = dto
    const employee = await this.empRepo.save(this.empRepo.create(empData)) as unknown as Employee

    if (createLogin && loginEmail && loginPassword) {
      try {
        await this.usersService.createUser({
          name:     (empData.firstName + ' ' + (empData.lastName ?? '')).trim(),
          email:    loginEmail,
          role:     loginRole ?? 'engineer',
          password: loginPassword,
        })
      } catch (e) {
        // User creation failed (e.g. duplicate email) — don't fail the employee creation
        console.warn('User creation failed for employee:', loginEmail, e.message)
      }
    }

    return employee
  }

  async listEmployees(p: { department?: string; status?: string; search?: string; projectId?: string }) {
    const qb = this.empRepo.createQueryBuilder('e').orderBy('e.createdAt', 'DESC')
    if (p.department) qb.andWhere('e.department = :dept', { dept: p.department })
    if (p.status)     qb.andWhere('e.status = :status', { status: p.status })
    if (p.projectId)  qb.andWhere('e.projectId = :pid', { pid: p.projectId })
    if (p.search)     qb.andWhere('(e.firstName ILIKE :s OR e.lastName ILIKE :s OR e.empCode ILIKE :s)', { s: '%' + p.search + '%' })
    return qb.getMany()
  }

  async getEmployee(id: string): Promise<Employee> {
    const emp = await this.empRepo.findOne({ where: { id } })
    if (!emp) throw new NotFoundException('Employee not found')
    return emp
  }

  async updateEmployee(id: string, data: any): Promise<Employee> {
    const { createLogin, loginEmail, loginRole, loginPassword, id: _id, createdAt, updatedAt, ...empData } = data
    if (Object.keys(empData).length > 0) {
      await this.empRepo.update(id, empData)
    }
    if (createLogin && loginEmail && loginPassword) {
      try {
        const emp = await this.getEmployee(id)
        await this.usersService.createUser({
          name:     (emp.firstName + ' ' + (emp.lastName ?? '')).trim(),
          email:    loginEmail,
          role:     loginRole ?? 'engineer',
          password: loginPassword,
        })
      } catch (e) {
        console.warn('User creation failed on update for employee:', loginEmail, e.message)
      }
    }
    return this.getEmployee(id)
  }

  async markAttendance(dto: MarkAttendanceDto): Promise<Attendance> {
    const existing = await this.attRepo.findOne({ where: { employeeId: dto.employeeId, date: dto.date } })
    let geoVerified = false
    let distanceFromSite: number | undefined
    const SITE_LAT = 34.0920
    const SITE_LNG = 74.8740
    const GEO_RADIUS = parseInt(this.config.get('GEO_FENCE_RADIUS') ?? '500')
    if (dto.checkInLat && dto.checkInLng) {
      distanceFromSite = Math.round(gpsDistance(dto.checkInLat, dto.checkInLng, SITE_LAT, SITE_LNG))
      geoVerified = distanceFromSite <= GEO_RADIUS
    }
    const record = this.attRepo.create({
      employeeId: dto.employeeId, date: dto.date, status: dto.status,
      source: dto.source ?? AttendanceSource.MANUAL, projectId: dto.projectId,
      checkInLat: dto.checkInLat, checkInLng: dto.checkInLng,
      checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : new Date(),
      checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : undefined,
      geoVerified, distanceFromSite, remarks: dto.remarks,
    })
    if (existing) {
      await this.attRepo.update(existing.id, record)
      return this.attRepo.findOne({ where: { id: existing.id } }) as Promise<Attendance>
    }
    return this.attRepo.save(record)
  }

  async bulkMarkAttendance(records: MarkAttendanceDto[]): Promise<{ saved: number; errors: string[] }> {
    let saved = 0; const errors: string[] = []
    for (const r of records) {
      try { await this.markAttendance(r); saved++ }
      catch (e: any) { errors.push(r.employeeId + ': ' + e.message) }
    }
    return { saved, errors }
  }

  async getAttendance(p: { employeeId?: string; date?: string; month?: number; year?: number; projectId?: string }) {
    const qb = this.attRepo.createQueryBuilder('a').orderBy('a.date', 'DESC')
    if (p.employeeId) qb.andWhere('a.employeeId = :eid', { eid: p.employeeId })
    if (p.date)       qb.andWhere('a.date = :date', { date: p.date })
    if (p.projectId)  qb.andWhere('a.projectId = :pid', { pid: p.projectId })
    if (p.month && p.year) qb.andWhere('EXTRACT(MONTH FROM a.date) = :m AND EXTRACT(YEAR FROM a.date) = :y', { m: p.month, y: p.year })
    return qb.getMany()
  }

  async getTodayAttendance(projectId?: string) {
    const today = new Date().toISOString().split('T')[0]
    const records = await this.getAttendance({ date: today, projectId })
    const allEmp  = await this.empRepo.find({ where: { status: EmployeeStatus.ACTIVE, ...(projectId ? { projectId } : {}) } })
    const markedIds = records.map(r => r.employeeId)
    const absent = allEmp.filter(e => !markedIds.includes(e.id))
    return {
      date: today,
      present: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
      absent: absent.length,
      halfDay: records.filter(r => r.status === AttendanceStatus.HALF_DAY).length,
      onLeave: records.filter(r => r.status === AttendanceStatus.LEAVE).length,
      total: allEmp.length,
      records,
      absentEmployees: absent.map(e => ({ id: e.id, empCode: e.empCode, name: (e.firstName + ' ' + (e.lastName ?? '')).trim(), designation: e.designation })),
    }
  }

  async getMonthlyReport(employeeId: string, year: number, month: number) {
    const records = await this.getAttendance({ employeeId, month, year })
    return {
      records,
      summary: {
        present:       records.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absent:        records.filter(r => r.status === AttendanceStatus.ABSENT).length,
        halfDay:       records.filter(r => r.status === AttendanceStatus.HALF_DAY).length,
        onLeave:       records.filter(r => r.status === AttendanceStatus.LEAVE).length,
        geoUnverified: records.filter(r => !r.geoVerified && r.status === AttendanceStatus.PRESENT).length,
        workingDays:   workingDaysInMonth(year, month),
      },
    }
  }

  async generateSalary(dto: GenerateSalaryDto, generatedBy: string): Promise<SalaryRecord> {
    const existing = await this.salRepo.findOne({ where: { employeeId: dto.employeeId, month: dto.month, year: dto.year } })
    if (existing) throw new ConflictException('Salary already generated for this month')
    const emp = await this.getEmployee(dto.employeeId)
    const { summary } = await this.getMonthlyReport(dto.employeeId, dto.year, dto.month)
    const workingDays = summary.workingDays
    const daysPresent = summary.present + (summary.halfDay * 0.5)
    const perDay      = Number(emp.baseSalary) / workingDays
    const earnedBasic = perDay * daysPresent
    const earnedHra   = (Number(emp.hra) / workingDays) * daysPresent
    const allowances  = Number(emp.allowances)
    const gross       = earnedBasic + earnedHra + allowances
    const PF_RATE     = parseFloat(this.config.get('PF_RATE') ?? '0.12')
    const pfAmount    = Math.min(Number(emp.baseSalary), 15000) * PF_RATE
    const ESI_THRESHOLD = parseFloat(this.config.get('ESI_THRESHOLD') ?? '21000')
    const ESI_RATE    = parseFloat(this.config.get('ESI_RATE') ?? '0.0075')
    const esiAmount   = gross <= ESI_THRESHOLD ? gross * ESI_RATE : 0
    const netSalary   = gross - pfAmount - esiAmount
    return this.salRepo.save(this.salRepo.create({
      employeeId: dto.employeeId, month: dto.month, year: dto.year,
      workingDays, daysPresent, daysAbsent: workingDays - daysPresent,
      baseSalary: +earnedBasic.toFixed(2), hra: +earnedHra.toFixed(2), allowances,
      grossSalary: +gross.toFixed(2), pfAmount: +pfAmount.toFixed(2),
      esiAmount: +esiAmount.toFixed(2), tdsAmount: 0, otherDeductions: 0,
      netSalary: +netSalary.toFixed(2), status: SalaryStatus.DRAFT, approvedBy: generatedBy,
    }))
  }

  async listSalary(p: { employeeId?: string; month?: number; year?: number; status?: string }) {
    const qb = this.salRepo.createQueryBuilder('s').orderBy('s.year','DESC').addOrderBy('s.month','DESC')
    if (p.employeeId) qb.andWhere('s.employeeId = :eid', { eid: p.employeeId })
    if (p.month)      qb.andWhere('s.month = :m', { m: p.month })
    if (p.year)       qb.andWhere('s.year = :y', { y: p.year })
    if (p.status)     qb.andWhere('s.status = :s', { s: p.status })
    return qb.getMany()
  }

  async approveSalary(id: string): Promise<SalaryRecord> {
    await this.salRepo.update(id, { status: SalaryStatus.APPROVED })
    const rec = await this.salRepo.findOne({ where: { id } })
    if (!rec) throw new NotFoundException('Not found')
    return rec
  }

  async markPaid(id: string, paymentMode: string): Promise<SalaryRecord> {
    await this.salRepo.update(id, { status: SalaryStatus.PAID, paidOn: new Date().toISOString().split('T')[0], paymentMode })
    const rec = await this.salRepo.findOne({ where: { id } })
    if (!rec) throw new NotFoundException('Not found')
    return rec
  }

  async applyLeave(dto: ApplyLeaveDto): Promise<LeaveRequest> {
    return this.leaveRepo.save(this.leaveRepo.create(dto))
  }

  async listLeaves(p: { employeeId?: string; status?: string }) {
    const qb = this.leaveRepo.createQueryBuilder('l').orderBy('l.createdAt','DESC')
    if (p.employeeId) qb.andWhere('l.employeeId = :eid', { eid: p.employeeId })
    if (p.status)     qb.andWhere('l.status = :s', { s: p.status })
    return qb.getMany()
  }

  async processLeave(id: string, status: LeaveStatus, approvedBy: string): Promise<LeaveRequest> {
    await this.leaveRepo.update(id, { status, approvedBy, approvedAt: new Date() })
    const leave = await this.leaveRepo.findOne({ where: { id } })
    if (!leave) throw new NotFoundException('Not found')
    return leave
  }

  async dashboard(projectId?: string) {
    const empFilter: any = { status: EmployeeStatus.ACTIVE }
    if (projectId) empFilter.projectId = projectId
    const totalEmp = await this.empRepo.count({ where: empFilter })
    const today    = await this.getTodayAttendance(projectId)
    const pendingLeaves    = await this.leaveRepo.count({ where: { status: LeaveStatus.PENDING } })
    const pendingSalaries  = await this.salRepo.count({ where: { status: SalaryStatus.DRAFT } })
    return {
      totalEmployees: totalEmp,
      presentToday:   today.present,
      absentToday:    today.absent,
      onLeaveToday:   today.onLeave,
      attendancePct:  totalEmp > 0 ? Math.round((today.present / totalEmp) * 100) : 0,
      pendingLeaves,
      pendingSalaries,
    }
  }
  // ── Timesheets ────────────────────────────────────────────
  async submitTimesheet(data: {
    employeeId: string; date: string; projectId?: string
    activities: any[]; workDoneSummary?: string
    issuesFaced?: string; nextDayPlan?: string
    attendanceStatus?: string
  }): Promise<Timesheet> {
    const existing = await this.tsRepo.findOne({ where: { employeeId: data.employeeId, date: data.date } })
    if (existing) {
      await this.tsRepo.update(existing.id, { ...data, status: TimesheetStatus.SUBMITTED })
      return this.tsRepo.findOne({ where: { id: existing.id } }) as Promise<Timesheet>
    }
    return this.tsRepo.save(this.tsRepo.create({ ...data, status: TimesheetStatus.SUBMITTED }))
  }

  async getTimesheets(p: { employeeId?: string; date?: string; month?: number; year?: number; projectId?: string; status?: string }) {
    const qb = this.tsRepo.createQueryBuilder('ts').orderBy('ts.date', 'DESC')
    if (p.employeeId) qb.andWhere('ts.employeeId = :eid', { eid: p.employeeId })
    if (p.date)       qb.andWhere('ts.date = :date', { date: p.date })
    if (p.projectId)  qb.andWhere('ts.projectId = :pid', { pid: p.projectId })
    if (p.status)     qb.andWhere('ts.status = :s', { s: p.status })
    if (p.month && p.year) qb.andWhere('EXTRACT(MONTH FROM ts.date) = :m AND EXTRACT(YEAR FROM ts.date) = :y', { m: p.month, y: p.year })
    return qb.getMany()
  }

  async approveTimesheet(id: string, approvedBy: string): Promise<Timesheet> {
    await this.tsRepo.update(id, { status: TimesheetStatus.APPROVED, approvedBy, approvedAt: new Date() })
    return this.tsRepo.findOne({ where: { id } }) as Promise<Timesheet>
  }

  async rejectTimesheet(id: string, reason: string, approvedBy: string): Promise<Timesheet> {
    await this.tsRepo.update(id, { status: TimesheetStatus.REJECTED, rejectionReason: reason, approvedBy })
    return this.tsRepo.findOne({ where: { id } }) as Promise<Timesheet>
  }

  async deleteEmployee(id: string) {
    return this.empRepo.delete(id)
  }

  // ── Site Diary ↔ Timesheets reconciliation ───────────────────
  // Bucket the day's "present" timesheets by each employee's labour category,
  // so the Site Diary headcount can be pulled from — and checked against — HR.
  private bucket(timesheets: Timesheet[], catById: Map<string, string | null>) {
    const present = timesheets.filter(t => (t.attendanceStatus ?? 'present') === 'present')
    let skilled = 0, unskilled = 0, supervisory = 0, uncategorised = 0
    for (const t of present) {
      const c = catById.get(t.employeeId) ?? null
      if (c === 'skilled') skilled++
      else if (c === 'unskilled') unskilled++
      else if (c === 'supervisory') supervisory++
      else uncategorised++
    }
    return { present: present.length, total: timesheets.length, skilled, unskilled, supervisory, uncategorised }
  }

  async dailyManpower(projectId: string | undefined, date: string) {
    const ts = await this.getTimesheets({ projectId, date })
    const ids = [...new Set(ts.map(t => t.employeeId))]
    const emps = ids.length ? await this.empRepo.find({ where: { id: In(ids) } }) : []
    const catById = new Map(emps.map(e => [e.id, e.labourCategory ?? null] as [string, string | null]))
    return { date, ...this.bucket(ts, catById) }
  }

  async manpowerRange(projectId: string | undefined, from: string, to: string) {
    const qb = this.tsRepo.createQueryBuilder('ts').where('ts.date BETWEEN :from AND :to', { from, to })
    if (projectId) qb.andWhere('ts.projectId = :pid', { pid: projectId })
    const ts = await qb.getMany()
    const ids = [...new Set(ts.map(t => t.employeeId))]
    const emps = ids.length ? await this.empRepo.find({ where: { id: In(ids) } }) : []
    const catById = new Map(emps.map(e => [e.id, e.labourCategory ?? null] as [string, string | null]))
    const byDate = new Map<string, Timesheet[]>()
    for (const t of ts) {
      const d = String(t.date)
      if (!byDate.has(d)) byDate.set(d, [])
      byDate.get(d)!.push(t)
    }
    const out: Record<string, ReturnType<typeof this.bucket>> = {}
    for (const [d, list] of byDate) out[d] = this.bucket(list, catById)
    return out
  }
}