import { Injectable, NotFoundException, ConflictException, Logger, ForbiddenException, BadRequestException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Employee, EmployeeStatus, EmploymentType } from './employee.entity'
import { Timesheet, TimesheetStatus } from './timesheet.entity'
import { Attendance, AttendanceStatus, AttendanceSource } from './attendance.entity'
import { SalaryRecord, SalaryStatus } from './salary-record.entity'
import { LeaveRequest, LeaveStatus } from './leave-request.entity'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UsersService } from '../users/users.service'
import { MarkAttendanceDto } from './dto/mark-attendance.dto'
import { GenerateSalaryDto } from './dto/generate-salary.dto'
import { ApplyLeaveDto } from './dto/apply-leave.dto'
import { User, UserRole } from '../users/user.entity'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { OpsEvents } from '../ops-sync/ops-events'

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
    @Optional() private readonly events?: EventEmitter2,
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
  
    // Empty date fields arrive from the form as "" — Postgres rejects that for
    // a `date` column, so blank optional dates must become NULL.
    private nullifyEmptyDates(data: any) {
      for (const k of ['dateOfJoining', 'dateOfBirth']) {
        if (data[k] === '') data[k] = null
      }
      return data
    }

    async createEmployee(dto: any): Promise<Employee> {
    if (!dto.empCode) dto.empCode = await this.generateNextEmpCode()
    const exists = await this.empRepo.findOne({ where: { empCode: dto.empCode } })
    if (exists) throw new ConflictException('Employee code already exists')
    const { createLogin, loginEmail, loginRole, loginPassword, ...rest } = dto
    const empData = this.nullifyEmptyDates(rest)
    const employee = await this.empRepo.save(this.empRepo.create(empData)) as unknown as Employee

    if (createLogin && loginPassword) {
      const defaultEmail = ((empData.firstName || 'user').toLowerCase().replace(/\s+/g, '') + '@kipl.in')
      const targetEmail = (loginEmail || rest.email || defaultEmail).trim().toLowerCase()
      try {
        const user = await this.usersService.createUser({
          name:     (empData.firstName + ' ' + (empData.lastName ?? '')).trim(),
          email:    targetEmail,
          role:     loginRole ?? 'engineer',
          password: loginPassword,
        })
        employee.userId = user.id
        await this.empRepo.save(employee)
      } catch (e: any) {
        if (e instanceof ConflictException) {
          const existing = await this.usersService.findByEmail(targetEmail)
          if (existing) {
            employee.userId = existing.id
            await this.empRepo.save(employee)
          }
        } else {
          this.log.error(`User creation failed for employee: ${targetEmail}`, e?.stack || e?.message)
        }
      }
    }

    return employee
  }

  async listEmployees(p: { department?: string; status?: string; search?: string; projectId?: string }) {
    const qb = this.empRepo.createQueryBuilder('e').orderBy('e.createdAt', 'DESC')
    if (p.department) qb.andWhere('e.department = :dept', { dept: p.department })
    if (p.status)     qb.andWhere('e.status = :status', { status: p.status })
    if (p.projectId)  qb.andWhere('e.projectId = :pid', { pid: p.projectId })
    if (p.search)     qb.andWhere('(e.firstName ILIKE :s OR e.lastName ILIKE :s OR e.empCode ILIKE :s OR e.email ILIKE :s)', { s: '%' + p.search + '%' })
    return qb.getMany()
  }

  async teamDirectory(p: { department?: string; search?: string; projectId?: string }, actor?: User) {
    let projectId = p.projectId
    if (actor && !this.canManageAttendance(actor)) {
      const employee = await this.employeeForUser(actor)
      projectId = employee.projectId
    }
    const qb = this.empRepo.createQueryBuilder('e')
      .select([
        'e.id', 'e.empCode', 'e.firstName', 'e.lastName', 'e.designation',
        'e.department', 'e.phone', 'e.email', 'e.status', 'e.projectId', 'e.photoUrl',
      ])
      .where('e.status = :status', { status: EmployeeStatus.ACTIVE })
      .orderBy('e.firstName', 'ASC')
      .addOrderBy('e.lastName', 'ASC')
    if (p.department) qb.andWhere('e.department = :dept', { dept: p.department })
    if (projectId) qb.andWhere('e.projectId = :pid', { pid: projectId })
    if (p.search) {
      qb.andWhere('(e.firstName ILIKE :s OR e.lastName ILIKE :s OR e.empCode ILIKE :s OR e.email ILIKE :s OR e.phone ILIKE :s)', { s: '%' + p.search + '%' })
    }
    return qb.getMany()
  }

  async myEmployee(user: User) {
    const employee = await this.employeeForUser(user)
    return {
      id: employee.id,
      empCode: employee.empCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      projectId: employee.projectId,
      status: employee.status,
    }
  }

  async getEmployee(id: string): Promise<Employee> {
    const emp = await this.empRepo.findOne({ where: { id } })
    if (!emp) throw new NotFoundException('Employee not found')
    return emp
  }

  async updateEmployee(id: string, data: any): Promise<Employee> {
    const { createLogin, loginEmail, loginRole, loginPassword, id: _id, createdAt, updatedAt, ...rest } = data
    const empData = this.nullifyEmptyDates(rest)
    if (Object.keys(empData).length > 0) {
      await this.empRepo.update(id, empData)
    }
    if (createLogin && loginPassword) {
      try {
        const emp = await this.getEmployee(id)
        const defaultEmail = ((emp.firstName || 'user').toLowerCase().replace(/\s+/g, '') + '@kipl.in')
        const targetEmail = (loginEmail || emp.email || rest.email || defaultEmail).trim().toLowerCase()
        const user = await this.usersService.createUser({
          name:     (emp.firstName + ' ' + (emp.lastName ?? '')).trim(),
          email:    targetEmail,
          role:     loginRole ?? 'engineer',
          password: loginPassword,
        })
        await this.empRepo.update(id, { userId: user.id })
      } catch (e: any) {
        if (e instanceof ConflictException) {
          const emp = await this.getEmployee(id)
          const targetEmail = (loginEmail || emp.email || rest.email || '').trim().toLowerCase()
          const existing = targetEmail ? await this.usersService.findByEmail(targetEmail) : null
          if (existing) await this.empRepo.update(id, { userId: existing.id })
        } else {
          this.log.error(`User creation failed on update for employee: ${id}`, e?.stack || e?.message)
        }
      }
    }
    return this.getEmployee(id)
  }

  private canManageAttendance(user?: Pick<User, 'role'>): boolean {
    return !!user && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.PROJECT_MANAGER,
      UserRole.HR_OFFICER,
    ].includes(user.role)
  }

  private canManageWorkforce(user?: Pick<User, 'role'>): boolean {
    return !!user && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.PROJECT_MANAGER,
      UserRole.HR_OFFICER,
      UserRole.ENGINEER,
      UserRole.SUPERVISOR,
    ].includes(user.role)
  }

  private async resolveProjectId(preferred?: string | null): Promise<string> {
    if (preferred) return preferred
    const rows = await this.empRepo.query(
      `SELECT id FROM projects WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
    )
    const id = rows?.[0]?.id
    if (!id) throw new BadRequestException('No active project is configured')
    return id
  }

  private async employeeForUser(user?: Pick<User, 'email'> & Partial<Pick<User, 'name' | 'role' | 'id'>>): Promise<Employee> {
    if (!user) throw new ForbiddenException('No employee identity is linked to this account')

    if (user.id) {
      const byUser = await this.empRepo.findOne({
        where: { userId: user.id, status: EmployeeStatus.ACTIVE },
      })
      if (byUser) return byUser
    }

    if (user.email) {
      const byEmail = await this.empRepo.createQueryBuilder('e')
        .where('LOWER(e.email) = LOWER(:email)', { email: user.email.trim() })
        .andWhere('e.status = :status', { status: EmployeeStatus.ACTIVE })
        .getOne()
      if (byEmail) {
        if (user.id && !byEmail.userId) {
          byEmail.userId = user.id
          await this.empRepo.save(byEmail)
        }
        return byEmail
      }
    }

    throw new ForbiddenException('No active employee record is linked to this account')
  }

  async markAttendance(dto: MarkAttendanceDto, actor?: User): Promise<Attendance> {
    const canManage = this.canManageAttendance(actor)
    const isSelfService = !!actor && !canManage
    let safeDto = { ...dto }
    if (isSelfService) {
      const employee = await this.employeeForUser(actor)
      if (safeDto.employeeId !== employee.id) {
        throw new ForbiddenException('You may only mark attendance for your own employee record')
      }
      safeDto = {
        ...safeDto,
        employeeId: employee.id,
        projectId: await this.resolveProjectId(employee.projectId),
        source: AttendanceSource.MOBILE,
      }
      const todayParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date())
      const datePart = (type: string) => todayParts.find(part => part.type === type)?.value
      const todayInIndia = `${datePart('year')}-${datePart('month')}-${datePart('day')}`
      if (safeDto.date !== todayInIndia) {
        throw new ForbiddenException('Self-service attendance can only be marked for today')
      }
      safeDto.status = AttendanceStatus.PRESENT
    }

    if (!safeDto.projectId) {
      safeDto.projectId = await this.resolveProjectId(null)
    }

    const existing = await this.attRepo.findOne({ where: { employeeId: safeDto.employeeId, date: safeDto.date } })
    let geoVerified = existing?.geoVerified ?? false
    let distanceFromSite: number | undefined = existing?.distanceFromSite
    const SITE_LAT = parseFloat(this.config.get('SITE_LAT') ?? '34.1380')
    const SITE_LNG = parseFloat(this.config.get('SITE_LNG') ?? '74.8724')
    const GEO_RADIUS = parseInt(this.config.get('GEO_FENCE_RADIUS') ?? '500')
    const hasLat = safeDto.checkInLat !== undefined && safeDto.checkInLat !== null
    const hasLng = safeDto.checkInLng !== undefined && safeDto.checkInLng !== null
    const hasOutLat = safeDto.checkOutLat !== undefined && safeDto.checkOutLat !== null
    const hasOutLng = safeDto.checkOutLng !== undefined && safeDto.checkOutLng !== null
    if (hasLat !== hasLng) throw new BadRequestException('Both check-in latitude and longitude are required')
    if (hasOutLat !== hasOutLng) throw new BadRequestException('Both check-out latitude and longitude are required')
    if (hasLat && hasLng) {
      distanceFromSite = Math.round(gpsDistance(safeDto.checkInLat!, safeDto.checkInLng!, SITE_LAT, SITE_LNG))
      geoVerified = distanceFromSite <= GEO_RADIUS
    }
    if (hasOutLat && hasOutLng) {
      distanceFromSite = Math.round(gpsDistance(safeDto.checkOutLat!, safeDto.checkOutLng!, SITE_LAT, SITE_LNG))
      geoVerified = distanceFromSite <= GEO_RADIUS
    }
    if (isSelfService && !existing && (!hasLat || !geoVerified)) {
      throw new ForbiddenException('Mobile check-in must be GPS verified inside the site geofence')
    }
    if (isSelfService && safeDto.checkOutTime && (!hasOutLat || !geoVerified)) {
      throw new ForbiddenException('Mobile check-out must be GPS verified inside the site geofence')
    }

    const capturedFromRemarks = (() => {
      const m = String(safeDto.remarks || '').match(/Captured offline on device at ([0-9T:.Z+-]+)/)
      if (!m) return null
      const captured = new Date(m[1])
      const age = Date.now() - captured.getTime()
      if (Number.isNaN(captured.getTime()) || age < 0 || age > 36 * 3600 * 1000) return null
      return captured
    })()
    const checkInTime = existing?.checkInTime ?? (isSelfService
      ? (capturedFromRemarks && !safeDto.checkOutTime ? capturedFromRemarks : new Date())
      : safeDto.checkInTime ? new Date(safeDto.checkInTime) : new Date())
    const checkOutTime = safeDto.checkOutTime
      ? (isSelfService ? (capturedFromRemarks ?? new Date()) : new Date(safeDto.checkOutTime))
      : existing?.checkOutTime
    if (Number.isNaN(checkInTime.getTime()) || (checkOutTime && Number.isNaN(checkOutTime.getTime()))) {
      throw new BadRequestException('Attendance time is invalid')
    }
    if (checkOutTime && checkOutTime < checkInTime) {
      throw new BadRequestException('Check-out time cannot be before check-in time')
    }
    const hoursWorked = checkOutTime
      ? Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / 3_600_000) * 100) / 100
      : existing?.hoursWorked

    const record = this.attRepo.create({
      employeeId: safeDto.employeeId, date: safeDto.date, status: safeDto.status,
      source: safeDto.source ?? existing?.source ?? AttendanceSource.MANUAL,
      projectId: safeDto.projectId ?? existing?.projectId,
      checkInLat: hasLat ? safeDto.checkInLat : existing?.checkInLat,
      checkInLng: hasLng ? safeDto.checkInLng : existing?.checkInLng,
      checkOutLat: hasOutLat ? safeDto.checkOutLat : existing?.checkOutLat,
      checkOutLng: hasOutLng ? safeDto.checkOutLng : existing?.checkOutLng,
      checkInTime,
      checkOutTime,
      hoursWorked,
      geoVerified,
      distanceFromSite,
      remarks: safeDto.remarks ?? existing?.remarks,
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

  async getAttendance(p: { employeeId?: string; date?: string; month?: number; year?: number; projectId?: string }, actor?: User) {
    let scoped = { ...p }
    if (actor && !this.canManageAttendance(actor)) {
      const employee = await this.employeeForUser(actor)
      scoped = { ...scoped, employeeId: employee.id, projectId: employee.projectId }
    }
    const qb = this.attRepo.createQueryBuilder('a').orderBy('a.date', 'DESC')
    if (scoped.employeeId) qb.andWhere('a.employeeId = :eid', { eid: scoped.employeeId })
    if (scoped.date)       qb.andWhere('a.date = :date', { date: scoped.date })
    if (scoped.projectId)  qb.andWhere('a.projectId = :pid', { pid: scoped.projectId })
    if (scoped.month && scoped.year) qb.andWhere('EXTRACT(MONTH FROM a.date) = :m AND EXTRACT(YEAR FROM a.date) = :y', { m: scoped.month, y: scoped.year })
    return qb.getMany()
  }

  async getTodayAttendance(projectId?: string) {
    const today = new Date().toISOString().split('T')[0]
    const records = await this.getAttendance({ date: today, projectId })
    const allEmp  = await this.empRepo.find({ where: { status: EmployeeStatus.ACTIVE, ...(projectId ? { projectId } : {}) } })
    const markedIds = records.map(r => r.employeeId)
    const notMarked = allEmp.filter(e => !markedIds.includes(e.id))
    return {
      date: today,
      present: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
      absent: notMarked.length + records.filter(r => r.status === AttendanceStatus.ABSENT).length,
      halfDay: records.filter(r => r.status === AttendanceStatus.HALF_DAY).length,
      onLeave: records.filter(r => r.status === AttendanceStatus.LEAVE).length,
      total: allEmp.length,
      records,
      absentEmployees: notMarked.map(e => ({ id: e.id, empCode: e.empCode, name: (e.firstName + ' ' + (e.lastName ?? '')).trim(), designation: e.designation })),
    }
  }

  async getMonthlyReport(employeeId: string, year: number, month: number, actor?: User) {
    const records = await this.getAttendance({ employeeId, month, year }, actor)
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
    // EPF is charged on the PF wages actually EARNED in the month (basic as
    // pro-rated for attendance), capped by the statutory wage ceiling — not on
    // the contracted basic. Charging the contracted figure deducted full PF
    // from an employee who worked a partial month, and could net them below
    // their allowances when they worked none at all.
    const PF_WAGE_CEILING = parseFloat(this.config.get('PF_WAGE_CEILING') ?? '15000')
    const pfAmount    = Math.min(earnedBasic, PF_WAGE_CEILING) * PF_RATE
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
      netSalary: +netSalary.toFixed(2), status: SalaryStatus.DRAFT, generatedBy,
    }))
  }

  async getSalary(id: string): Promise<SalaryRecord> {
    const rec = await this.salRepo.findOne({ where: { id } })
    if (!rec) throw new NotFoundException('Salary record not found')
    return rec
  }

  async listSalary(p: { employeeId?: string; month?: number; year?: number; status?: string }) {
    const qb = this.salRepo.createQueryBuilder('s').orderBy('s.year','DESC').addOrderBy('s.month','DESC')
    if (p.employeeId) qb.andWhere('s.employeeId = :eid', { eid: p.employeeId })
    if (p.month)      qb.andWhere('s.month = :m', { m: p.month })
    if (p.year)       qb.andWhere('s.year = :y', { y: p.year })
    if (p.status)     qb.andWhere('s.status = :s', { s: p.status })
    return qb.getMany()
  }

  async approveSalary(id: string, actorId?: string): Promise<SalaryRecord> {
    const rec = await this.salRepo.findOne({ where: { id } })
    if (!rec) throw new NotFoundException('Not found')
    if (actorId && rec.generatedBy && rec.generatedBy === actorId) {
      throw new ForbiddenException('You cannot approve a salary you generated')
    }
    await this.salRepo.update(id, { status: SalaryStatus.APPROVED, approvedBy: actorId })
    return this.salRepo.findOne({ where: { id } }) as Promise<SalaryRecord>
  }

  async markPaid(id: string, paymentMode: string): Promise<SalaryRecord> {
    await this.salRepo.update(id, { status: SalaryStatus.PAID, paidOn: new Date().toISOString().split('T')[0], paymentMode })
    const rec = await this.salRepo.findOne({ where: { id } })
    if (!rec) throw new NotFoundException('Not found')
    this.events?.emit(OpsEvents.SALARY_PAID, rec)
    return rec
  }

  async applyLeave(dto: ApplyLeaveDto, actor?: User): Promise<LeaveRequest> {
    let safe = { ...dto }
    if (actor && !this.canManageAttendance(actor)) {
      const employee = await this.employeeForUser(actor)
      safe.employeeId = employee.id
    }
    return this.leaveRepo.save(this.leaveRepo.create(safe))
  }

  async listLeaves(p: { employeeId?: string; status?: string }, actor?: User) {
    let employeeId = p.employeeId
    if (actor && !this.canManageAttendance(actor)) {
      const employee = await this.employeeForUser(actor)
      employeeId = employee.id
    }
    const qb = this.leaveRepo.createQueryBuilder('l').orderBy('l.createdAt','DESC')
    if (employeeId) qb.andWhere('l.employeeId = :eid', { eid: employeeId })
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
  }, actor?: User): Promise<Timesheet> {
    let safe = { ...data }
    if (actor && !this.canManageWorkforce(actor)) {
      const employee = await this.employeeForUser(actor)
      safe.employeeId = employee.id
      safe.projectId = employee.projectId || safe.projectId
    }
    const existing = await this.tsRepo.findOne({ where: { employeeId: safe.employeeId, date: safe.date } })
    if (existing) {
      await this.tsRepo.update(existing.id, { ...safe, status: TimesheetStatus.SUBMITTED })
      return this.tsRepo.findOne({ where: { id: existing.id } }) as Promise<Timesheet>
    }
    return this.tsRepo.save(this.tsRepo.create({ ...safe, status: TimesheetStatus.SUBMITTED }))
  }

  async getTimesheets(p: { employeeId?: string; date?: string; month?: number; year?: number; projectId?: string; status?: string }, actor?: User) {
    let employeeId = p.employeeId
    if (actor && !this.canManageWorkforce(actor)) {
      const employee = await this.employeeForUser(actor)
      employeeId = employee.id
    }
    const qb = this.tsRepo.createQueryBuilder('ts').orderBy('ts.date', 'DESC')
    if (employeeId) qb.andWhere('ts.employeeId = :eid', { eid: employeeId })
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
