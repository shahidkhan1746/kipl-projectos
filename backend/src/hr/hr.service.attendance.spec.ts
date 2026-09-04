import { ForbiddenException, BadRequestException } from '@nestjs/common'
import { HrService } from './hr.service'
import { AttendanceStatus, AttendanceSource } from './attendance.entity'
import { EmployeeStatus } from './employee.entity'
import { UserRole } from '../users/user.entity'

/**
 * Covers markAttendance() — the anti-fraud surface of the mobile app.
 *
 * A site worker checking in from their phone must be physically at the Nishat
 * STP site, on today's date, against their own employee record. Each of those
 * three guards is enforced here, so each is tested here.
 *
 * The site geofence is (34.0920, 74.8740) with a default 500 m radius. Offsets
 * used below are due north, where 1 degree of latitude is ~111.32 km:
 *
 *   +0.001796 deg  ->   200 m  (inside)
 *   +0.017967 deg  -> 1,998 m  (outside)
 */

const SITE_LAT = 34.0920
const SITE_LNG = 74.8740
const INSIDE_LAT = SITE_LAT + 0.001796 // 200 m from site
const OUTSIDE_LAT = SITE_LAT + 0.017967 // 1,998 m from site

const EMPLOYEE = {
  id: 'emp-1',
  email: 'mason@kipl.in',
  projectId: 'proj-1',
  status: EmployeeStatus.ACTIVE,
}

const hrOfficer = { id: 'u-hr', email: 'hr@kipl.in', role: UserRole.HR_OFFICER } as any
const worker = { id: 'u-1', email: 'mason@kipl.in', role: UserRole.FIELD_STAFF } as any

/** Today in Asia/Kolkata — the only date self-service attendance accepts. */
const todayInIndia = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

const build = (opts: { employee?: any; existing?: any; radius?: string } = {}) => {
  const employee = 'employee' in opts ? opts.employee : EMPLOYEE
  const saved: any[] = []

  const empRepo = {
    findOne: jest.fn().mockResolvedValue(employee),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(employee),
    })),
  }
  const attRepo = {
    findOne: jest.fn().mockResolvedValue(opts.existing ?? null),
    create: jest.fn((r: any) => r),
    save: jest.fn(async (r: any) => {
      saved.push(r)
      return { id: 'att-1', ...r }
    }),
    update: jest.fn(async (_id: string, r: any) => {
      saved.push(r)
      return { affected: 1 }
    }),
  }
  const config = { get: jest.fn((k: string) => (k === 'GEO_FENCE_RADIUS' ? opts.radius : undefined)) }
  const svc = new HrService(
    empRepo as any,
    attRepo as any,
    {} as any,
    {} as any,
    {} as any,
    config as any,
    {} as any,
  )
  return { svc, attRepo, saved }
}

const selfCheckIn = (over: any = {}) => ({
  employeeId: 'emp-1',
  date: todayInIndia(),
  status: AttendanceStatus.PRESENT,
  checkInLat: INSIDE_LAT,
  checkInLng: SITE_LNG,
  ...over,
})

describe('HrService.markAttendance — geofence', () => {
  it('accepts a check-in inside the 500 m site radius and records the distance', async () => {
    const { svc, saved } = build()
    await svc.markAttendance(selfCheckIn() as any, worker)

    expect(saved[0].geoVerified).toBe(true)
    expect(saved[0].distanceFromSite).toBe(200)
  })

  it('rejects a self-service check-in from outside the geofence', async () => {
    const { svc } = build()
    await expect(
      svc.markAttendance(selfCheckIn({ checkInLat: OUTSIDE_LAT }) as any, worker),
    ).rejects.toThrow(ForbiddenException)
  })

  it('rejects a self-service check-in that carries no GPS fix at all', async () => {
    // No coordinates means nothing proves the worker was on site.
    const { svc } = build()
    await expect(
      svc.markAttendance(
        selfCheckIn({ checkInLat: undefined, checkInLng: undefined }) as any,
        worker,
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('honours a widened GEO_FENCE_RADIUS from config', async () => {
    const { svc, saved } = build({ radius: '2500' })
    await svc.markAttendance(selfCheckIn({ checkInLat: OUTSIDE_LAT }) as any, worker)

    expect(saved[0].geoVerified).toBe(true)
    expect(saved[0].distanceFromSite).toBe(1998)
  })

  it('still records an out-of-fence position for an HR officer, flagged unverified', async () => {
    // HR may correct attendance from the office; the record must show it was
    // not GPS-verified so the muster roll can surface it.
    const { svc, saved } = build()
    await svc.markAttendance(
      {
        employeeId: 'emp-1',
        date: '2026-04-10',
        status: AttendanceStatus.PRESENT,
        checkInLat: OUTSIDE_LAT,
        checkInLng: SITE_LNG,
      } as any,
      hrOfficer,
    )

    expect(saved[0].geoVerified).toBe(false)
    expect(saved[0].distanceFromSite).toBe(1998)
  })

  it('rejects a latitude sent without its longitude', async () => {
    const { svc } = build()
    await expect(
      svc.markAttendance(selfCheckIn({ checkInLng: undefined }) as any, worker),
    ).rejects.toThrow(BadRequestException)
  })
})

describe('HrService.markAttendance — self-service guards', () => {
  it("refuses to mark attendance against another worker's record", async () => {
    // Buddy punching: the phone sends a different employeeId than the caller's.
    const { svc } = build()
    await expect(
      svc.markAttendance(selfCheckIn({ employeeId: 'emp-999' }) as any, worker),
    ).rejects.toThrow(/only mark attendance for your own employee record/i)
  })

  it('refuses to back-date a self-service check-in', async () => {
    const { svc } = build()
    await expect(
      svc.markAttendance(selfCheckIn({ date: '2026-04-01' }) as any, worker),
    ).rejects.toThrow(/only be marked for today/i)
  })

  it('forces status PRESENT and source MOBILE regardless of what the client sent', async () => {
    const { svc, saved } = build()
    await svc.markAttendance(
      selfCheckIn({ status: AttendanceStatus.ABSENT, source: AttendanceSource.BIOMETRIC }) as any,
      worker,
    )

    expect(saved[0].status).toBe(AttendanceStatus.PRESENT)
    expect(saved[0].source).toBe(AttendanceSource.MOBILE)
  })

  it('scopes the record to the employee record, not to client-supplied ids', async () => {
    const { svc, saved } = build()
    await svc.markAttendance(selfCheckIn({ projectId: 'proj-someone-else' }) as any, worker)

    expect(saved[0].employeeId).toBe('emp-1')
    expect(saved[0].projectId).toBe('proj-1')
  })

  it('rejects a caller with no linked active employee record', async () => {
    const { svc } = build({ employee: null })
    await expect(svc.markAttendance(selfCheckIn() as any, worker)).rejects.toThrow(
      /No active employee record/i,
    )
  })

  it('lets an HR officer mark any employee on any date', async () => {
    const { svc, saved } = build()
    await svc.markAttendance(
      { employeeId: 'emp-42', date: '2026-04-10', status: AttendanceStatus.ABSENT } as any,
      hrOfficer,
    )

    expect(saved[0].employeeId).toBe('emp-42')
    expect(saved[0].status).toBe(AttendanceStatus.ABSENT)
  })

  it('treats an unauthenticated call as an unscoped manual entry', async () => {
    // No actor at all (bulk import, seeder) bypasses self-service scoping.
    const { svc, saved } = build()
    await svc.markAttendance({
      employeeId: 'emp-7',
      date: '2026-04-10',
      status: AttendanceStatus.HALF_DAY,
    } as any)

    expect(saved[0].employeeId).toBe('emp-7')
    expect(saved[0].source).toBe(AttendanceSource.MANUAL)
  })
})

describe('HrService.markAttendance — check-out and hours', () => {
  it('computes hours worked between check-in and check-out', async () => {
    const { svc, saved } = build()
    await svc.markAttendance(
      {
        employeeId: 'emp-1',
        date: '2026-04-10',
        status: AttendanceStatus.PRESENT,
        checkInTime: '2026-04-10T09:00:00.000Z',
        checkOutTime: '2026-04-10T17:30:00.000Z',
      } as any,
      hrOfficer,
    )

    expect(saved[0].hoursWorked).toBe(8.5)
  })

  it('rejects a check-out that precedes the check-in', async () => {
    const { svc } = build()
    await expect(
      svc.markAttendance(
        {
          employeeId: 'emp-1',
          date: '2026-04-10',
          status: AttendanceStatus.PRESENT,
          checkInTime: '2026-04-10T17:00:00.000Z',
          checkOutTime: '2026-04-10T09:00:00.000Z',
        } as any,
        hrOfficer,
      ),
    ).rejects.toThrow(/Check-out time cannot be before check-in/i)
  })

  it('rejects an unparseable timestamp', async () => {
    const { svc } = build()
    await expect(
      svc.markAttendance(
        {
          employeeId: 'emp-1',
          date: '2026-04-10',
          status: AttendanceStatus.PRESENT,
          checkInTime: 'not-a-date',
        } as any,
        hrOfficer,
      ),
    ).rejects.toThrow(/Attendance time is invalid/i)
  })

  it('preserves the original check-in time when checking out later the same day', async () => {
    // The second call of the day is a check-out; it must not reset the arrival
    // time, or the shift length collapses to zero.
    const today = todayInIndia()
    const morning = new Date(`${today}T09:00:00.000Z`)
    const { svc, saved } = build({
      existing: { id: 'att-1', checkInTime: morning, geoVerified: true, distanceFromSite: 200 },
    })
    await svc.markAttendance(
      selfCheckIn({ checkOutTime: `${today}T17:00:00.000Z` }) as any,
      worker,
    )

    expect(saved[0].checkInTime).toEqual(morning)
  })

  it('server-stamps a self-service check-out, ignoring the time the phone sent', async () => {
    // Anti-fraud: a worker must not be able to claim a longer shift by posting
    // a check-out timestamp of their choosing. The server clock decides.
    const today = todayInIndia()
    const morning = new Date(`${today}T09:00:00.000Z`)
    const claimed = `${today}T23:59:00.000Z`
    const { svc, saved } = build({ existing: { id: 'att-1', checkInTime: morning } })

    const before = Date.now()
    await svc.markAttendance(selfCheckIn({ checkOutTime: claimed }) as any, worker)
    const after = Date.now()

    const stamped = saved[0].checkOutTime.getTime()
    expect(stamped).toBeGreaterThanOrEqual(before)
    expect(stamped).toBeLessThanOrEqual(after)
    expect(stamped).not.toBe(new Date(claimed).getTime())
  })

  it('updates the existing row instead of creating a duplicate for the day', async () => {
    const { svc, attRepo } = build({
      existing: { id: 'att-1', checkInTime: new Date('2026-04-10T09:00:00.000Z') },
    })
    attRepo.findOne.mockResolvedValueOnce({
      id: 'att-1',
      checkInTime: new Date('2026-04-10T09:00:00.000Z'),
    })
    await svc.markAttendance(
      { employeeId: 'emp-1', date: '2026-04-10', status: AttendanceStatus.PRESENT } as any,
      hrOfficer,
    )

    expect(attRepo.update).toHaveBeenCalledWith('att-1', expect.anything())
    expect(attRepo.save).not.toHaveBeenCalled()
  })
})
