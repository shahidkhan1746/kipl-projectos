import { ConflictException } from '@nestjs/common'
import { HrService } from './hr.service'
import { AttendanceStatus } from './attendance.entity'
import { SalaryStatus } from './salary-record.entity'

/**
 * Covers generateSalary() and the monthly attendance rollup it consumes.
 *
 * Wages are pro-rated over working days, where a working day is any day the
 * site is open — every day except Sunday. April 2026 has 30 days and 4 Sundays,
 * so workingDays = 26 throughout.
 *
 * Two statutory deductions apply, both with a cliff worth pinning down:
 *   PF  = 12% of basic, capped at a 15,000 wage ceiling
 *   ESI = 0.75% of gross, but only while gross <= 21,000
 */

const EMPLOYEE = {
  id: 'emp-1',
  baseSalary: 30000,
  hra: 10000,
  allowances: 5000,
}

/** Builds `count` attendance rows of one status, as getAttendance would return. */
const rows = (status: AttendanceStatus, count: number) =>
  Array.from({ length: count }, () => ({ status, geoVerified: true }))

const build = (opts: { employee?: any; attendance?: any[]; existingSalary?: any } = {}) => {
  const saved: any[] = []
  const employee = 'employee' in opts ? opts.employee : EMPLOYEE
  const empRepo = { findOne: jest.fn().mockResolvedValue(employee) }
  const attRepo = {
    createQueryBuilder: jest.fn(() => ({
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(opts.attendance ?? []),
    })),
  }
  const salRepo = {
    findOne: jest.fn().mockResolvedValue(opts.existingSalary ?? null),
    create: jest.fn((r: any) => r),
    save: jest.fn(async (r: any) => {
      saved.push(r)
      return { id: 'sal-1', ...r }
    }),
  }
  const config = { get: jest.fn(() => undefined) } // fall back to statutory defaults
  const svc = new HrService(
    empRepo as any,
    attRepo as any,
    salRepo as any,
    {} as any,
    {} as any,
    config as any,
    {} as any,
  )
  return { svc, saved, salRepo }
}

const april = { employeeId: 'emp-1', month: 4, year: 2026 } as any

describe('HrService.getMonthlyReport — attendance rollup', () => {
  it('counts each status and reports Sundays as non-working', async () => {
    const { svc } = build({
      attendance: [
        ...rows(AttendanceStatus.PRESENT, 20),
        ...rows(AttendanceStatus.ABSENT, 2),
        ...rows(AttendanceStatus.HALF_DAY, 2),
        ...rows(AttendanceStatus.LEAVE, 1),
      ],
    })
    const { summary } = await svc.getMonthlyReport('emp-1', 2026, 4)

    expect(summary.present).toBe(20)
    expect(summary.absent).toBe(2)
    expect(summary.halfDay).toBe(2)
    expect(summary.onLeave).toBe(1)
    expect(summary.workingDays).toBe(26) // April 2026: 30 days less 4 Sundays
  })

  it('counts February 2026 as 24 working days', async () => {
    const { svc } = build()
    const { summary } = await svc.getMonthlyReport('emp-1', 2026, 2)

    expect(summary.workingDays).toBe(24) // 28 days less 4 Sundays
  })

  it('flags present days that were never GPS-verified', async () => {
    // These are the rows a supervisor should be asked to justify.
    const { svc } = build({
      attendance: [
        { status: AttendanceStatus.PRESENT, geoVerified: true },
        { status: AttendanceStatus.PRESENT, geoVerified: false },
        { status: AttendanceStatus.PRESENT, geoVerified: false },
        { status: AttendanceStatus.ABSENT, geoVerified: false }, // absent, not counted
      ],
    })
    const { summary } = await svc.getMonthlyReport('emp-1', 2026, 4)

    expect(summary.geoUnverified).toBe(2)
  })
})

describe('HrService.generateSalary — pro-rata earnings', () => {
  it('pays full basic and HRA for a full month of attendance', async () => {
    const { svc, saved } = build({
      employee: { id: 'emp-1', baseSalary: 26000, hra: 0, allowances: 0 },
      attendance: rows(AttendanceStatus.PRESENT, 26),
    })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].workingDays).toBe(26)
    expect(saved[0].daysPresent).toBe(26)
    expect(saved[0].baseSalary).toBe(26000)
    expect(saved[0].grossSalary).toBe(26000)
  })

  it('counts a half day as half a day present', async () => {
    const { svc, saved } = build({
      attendance: [...rows(AttendanceStatus.PRESENT, 20), ...rows(AttendanceStatus.HALF_DAY, 2)],
    })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].daysPresent).toBe(21) // 20 + (2 x 0.5)
    expect(saved[0].daysAbsent).toBe(5) // 26 - 21
  })

  it('pro-rates basic and HRA across the days actually worked', async () => {
    const { svc, saved } = build({
      attendance: [...rows(AttendanceStatus.PRESENT, 20), ...rows(AttendanceStatus.HALF_DAY, 2)],
    })
    await svc.generateSalary(april, 'u-hr')

    // 30,000 / 26 x 21 and 10,000 / 26 x 21, plus flat allowances.
    expect(saved[0].baseSalary).toBe(24230.77)
    expect(saved[0].hra).toBe(8076.92)
    expect(saved[0].allowances).toBe(5000)
    expect(saved[0].grossSalary).toBe(37307.69)
  })

  it('pays nothing but allowances when no attendance was recorded', async () => {
    const { svc, saved } = build({ attendance: [] })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].daysPresent).toBe(0)
    expect(saved[0].baseSalary).toBe(0)
    expect(saved[0].grossSalary).toBe(5000) // allowances are not pro-rated
  })
})

describe('HrService.generateSalary — statutory deductions', () => {
  it('caps PF at the 15,000 wage ceiling for a higher earner', async () => {
    const { svc, saved } = build({ attendance: rows(AttendanceStatus.PRESENT, 26) })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].pfAmount).toBe(1800) // 15,000 x 12%, not 30,000 x 12%
  })

  it('computes PF on actual basic below the ceiling', async () => {
    const { svc, saved } = build({
      employee: { id: 'emp-1', baseSalary: 12000, hra: 3000, allowances: 1000 },
      attendance: rows(AttendanceStatus.PRESENT, 26),
    })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].pfAmount).toBe(1440) // 12,000 x 12%
  })

  it('applies ESI while gross stays within the 21,000 threshold', async () => {
    const { svc, saved } = build({
      employee: { id: 'emp-1', baseSalary: 12000, hra: 3000, allowances: 1000 },
      attendance: rows(AttendanceStatus.PRESENT, 26),
    })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].grossSalary).toBe(16000)
    expect(saved[0].esiAmount).toBe(120) // 16,000 x 0.75%
    expect(saved[0].netSalary).toBe(14440) // 16,000 - 1,440 - 120
  })

  it('drops ESI entirely once gross clears the threshold', async () => {
    const { svc, saved } = build({ attendance: rows(AttendanceStatus.PRESENT, 26) })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].grossSalary).toBeGreaterThan(21000)
    expect(saved[0].esiAmount).toBe(0)
  })

  it('nets gross down by PF and ESI only', async () => {
    const { svc, saved } = build({
      attendance: [...rows(AttendanceStatus.PRESENT, 20), ...rows(AttendanceStatus.HALF_DAY, 2)],
    })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].netSalary).toBe(35507.69) // 37,307.69 - 1,800 - 0
    expect(saved[0].tdsAmount).toBe(0)
    expect(saved[0].otherDeductions).toBe(0)
  })

  /**
   * DOCUMENTS CURRENT BEHAVIOUR — READ BEFORE CHANGING.
   *
   * PF is charged on the employee's *contracted* base salary, not on the basic
   * actually earned that month, so an employee with no attendance is still
   * deducted the full PF amount and can be paid less than their allowances.
   *
   * EPF is normally computed on the PF wages actually earned in the month
   * (subject to the 15,000 ceiling), which would make this 0. If that is the
   * intended reading, change pfAmount to derive from earnedBasic and update
   * this expectation — it is pinned here so the change is deliberate and
   * visible rather than silent.
   */
  it('charges PF on contracted basic even when nothing was earned', async () => {
    const { svc, saved } = build({ attendance: [] })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].baseSalary).toBe(0) // nothing earned
    expect(saved[0].pfAmount).toBe(1800) // still deducted in full
    expect(saved[0].netSalary).toBe(3162.5) // 5,000 allowances - 1,800 - 37.50
  })

  it('honours PF and ESI rates overridden in config', async () => {
    const { svc, saved } = build({ attendance: rows(AttendanceStatus.PRESENT, 26) })
    ;(svc as any).config.get = jest.fn((k: string) =>
      ({ PF_RATE: '0.10', ESI_THRESHOLD: '50000', ESI_RATE: '0.01' })[k],
    )
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].pfAmount).toBe(1500) // 15,000 x 10%
    expect(saved[0].esiAmount).toBe(450) // 45,000 gross x 1%, now under threshold
  })
})

describe('HrService.generateSalary — guards', () => {
  it('refuses to generate a second payslip for the same month', async () => {
    // Double payment protection: the muster roll is generated monthly and a
    // re-run must not silently issue a duplicate.
    const { svc } = build({ existingSalary: { id: 'sal-existing' } })

    await expect(svc.generateSalary(april, 'u-hr')).rejects.toThrow(ConflictException)
  })

  it('opens the payslip as a draft attributed to the generator', async () => {
    const { svc, saved } = build({ attendance: rows(AttendanceStatus.PRESENT, 26) })
    await svc.generateSalary(april, 'u-hr')

    expect(saved[0].status).toBe(SalaryStatus.DRAFT)
    expect(saved[0].approvedBy).toBe('u-hr')
  })

  it('rejects an unknown employee', async () => {
    const { svc } = build({ employee: null })

    await expect(svc.generateSalary(april, 'u-hr')).rejects.toThrow(/Employee not found/i)
  })
})
