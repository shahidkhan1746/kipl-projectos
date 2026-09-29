import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { CreateWbsTaskDto, UpdateWbsTaskDto } from './wbs-task.dto'

// The same pipe settings as main.ts: unknown fields are stripped, so every
// field the app writes has to be declared or it silently disappears.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })
const run = (metatype: any, value: any) => pipe.transform(value, { type: 'body', metatype })

describe('WBS task DTOs', () => {
  it('keeps every field the edit dialog sends', async () => {
    const body = {
      progressPct: 40, status: 'in_progress', actualStart: '2026-02-01', actualEnd: '', remarks: 'r',
      delayReason: 'd', eotApplied: true, eotDays: 3, plannedDuration: 90, calendar: 'winter_restricted',
      scheduleScope: 'contract', constraintType: 'SNET', constraintDate: '2026-03-01',
      dependencies: [{ code: '1', type: 'SS', lag: 10 }],
    }
    const out = await run(UpdateWbsTaskDto, body)
    expect(out).toMatchObject({ ...body, dependencies: [{ code: '1', type: 'SS', lag: 10 }] })
  })

  it('requires a code and a title on create', async () => {
    await expect(run(CreateWbsTaskDto, { projectId: 'p1', title: 'x' })).rejects.toThrow()
    await expect(run(CreateWbsTaskDto, { projectId: 'p1', wbsCode: '1' })).rejects.toThrow()
    await expect(run(CreateWbsTaskDto, { projectId: 'p1', wbsCode: '1', title: 'x' })).resolves.toBeTruthy()
  })

  it('refuses a relationship type that does not exist', async () => {
    await expect(run(UpdateWbsTaskDto, { dependencies: [{ code: '1', type: 'XX', lag: 0 }] })).rejects.toThrow()
  })

  it('refuses a negative or fractional duration and an unknown calendar', async () => {
    await expect(run(UpdateWbsTaskDto, { plannedDuration: -5 })).rejects.toThrow()
    await expect(run(UpdateWbsTaskDto, { plannedDuration: 2.5 })).rejects.toThrow()
    await expect(run(UpdateWbsTaskDto, { calendar: 'lunar' })).rejects.toThrow()
  })

  it('refuses progress outside 0–100', async () => {
    await expect(run(UpdateWbsTaskDto, { progressPct: 140 })).rejects.toThrow()
  })

  it('strips a field nobody declared', async () => {
    const out = await run(UpdateWbsTaskDto, { remarks: 'ok', isCritical: true, totalFloat: -99 })
    expect(out).toEqual({ remarks: 'ok' })
  })
})
