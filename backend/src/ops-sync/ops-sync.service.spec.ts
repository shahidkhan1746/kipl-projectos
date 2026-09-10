import { OpsSyncService } from './ops-sync.service'
import { TxnType } from '../accounting/transaction.entity'
import { TaskStatus } from '../tasks/task.entity'
import { RaBillStatus } from '../epc/ra-bill.entity'
import { TaskStatus as WbsStatus } from '../wbs/wbs-task.entity'

function repoMock(overrides: Record<string, any> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(async (row: any) => ({ id: 'new-1', ...row })),
    create: jest.fn((row: any) => row),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function build(over: {
  invoices?: any
  txns?: any
  tasks?: any
  fleet?: any
  materials?: any
  wbs?: any
  diaries?: any
  employees?: any
  omLogs?: any
  omEvents?: any
  raBills?: any
  ncrs?: any
  accounting?: any
  hr?: any
} = {}) {
  const invoices = over.invoices ?? repoMock()
  const txns = over.txns ?? repoMock()
  const tasks = over.tasks ?? repoMock()
  const fleet = over.fleet ?? repoMock()
  const materials = over.materials ?? repoMock()
  const wbs = over.wbs ?? repoMock()
  const diaries = over.diaries ?? repoMock()
  const employees = over.employees ?? repoMock()
  const omLogs = over.omLogs ?? repoMock()
  const omEvents = over.omEvents ?? repoMock()
  const raBills = over.raBills ?? repoMock()
  const ncrs = over.ncrs ?? repoMock()
  const accounting = over.accounting ?? {
    createInvoice: jest.fn(async (b: any) => ({ id: 'inv-1', ...b })),
    updateInvoice: jest.fn(async (id: string, b: any) => ({ id, ...b })),
    addTransaction: jest.fn(async (b: any) => ({ id: 'txn-1', ...b })),
  }
  const hr = over.hr ?? {
    dailyManpower: jest.fn().mockResolvedValue({ present: 0, skilled: 0, unskilled: 0, supervisory: 0 }),
  }
  const svc = new OpsSyncService(
    invoices as any, txns as any, tasks as any, fleet as any, materials as any,
    wbs as any, diaries as any, employees as any,
    omLogs as any, omEvents as any, raBills as any, ncrs as any,
    accounting as any, hr as any,
  )
  return { svc, invoices, txns, tasks, fleet, materials, wbs, diaries, employees, omLogs, omEvents, raBills, ncrs, accounting, hr }
}

describe('OpsSyncService — money', () => {
  it('creates an accounting invoice from an EPC RA bill and posts a receipt when it is paid', async () => {
    const { svc, accounting } = build()
    await svc.syncRaBillToInvoice({
      id: 'ra-1',
      projectId: 'proj-1',
      billNo: 'RA-03',
      billDate: '2026-04-01',
      prevBilled: 100,
      netThisBill: 50,
      gstPct: 18,
      tdsPct: 2,
      securityDepositPct: 5,
      netPayable: 55,
      status: RaBillStatus.PAID,
      paidDate: '2026-04-10',
    } as any)

    expect(accounting.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'proj-1',
      raNumber: 'RA-03',
      status: 'paid',
    }))
    expect(accounting.updateInvoice).toHaveBeenCalledWith('inv-1', expect.objectContaining({
      status: 'paid',
      paidAmount: 55,
    }))
  })

  it('does not post salary twice', async () => {
    const { svc, accounting, txns, employees } = build({
      txns: repoMock({ findOne: jest.fn().mockResolvedValue({ id: 'txn-existing' }) }),
    })
    employees.findOne.mockResolvedValue({ id: 'emp-1', projectId: 'proj-1', firstName: 'A', lastName: 'B' })
    const result = await svc.postSalaryPayment({
      id: 'sal-1', employeeId: 'emp-1', month: 4, year: 2026, netSalary: 40000, paidOn: '2026-04-30',
    } as any)
    expect(result?.id).toBe('txn-existing')
    expect(accounting.addTransaction).not.toHaveBeenCalled()
  })

  it('posts a salary payment against the employee project', async () => {
    const { svc, accounting, employees } = build()
    employees.findOne.mockResolvedValue({ id: 'emp-1', projectId: 'proj-1', firstName: 'Ravi', lastName: 'Kumar' })
    await svc.postSalaryPayment({
      id: 'sal-1', employeeId: 'emp-1', month: 4, year: 2026, netSalary: 40000,
      paidOn: '2026-04-30', paymentMode: 'bank_transfer',
    } as any)
    expect(accounting.addTransaction).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'proj-1',
      type: TxnType.PAYMENT,
      refType: 'salary',
      refId: 'sal-1',
      debit: 40000,
    }))
  })
})

describe('OpsSyncService — site diary', () => {
  it('fills empty diary labour from HR timesheet manpower', async () => {
    const { svc, hr, diaries } = build({
      hr: { dailyManpower: jest.fn().mockResolvedValue({ present: 12, skilled: 4, unskilled: 7, supervisory: 1 }) },
    })
    await svc.fillDiaryLabourFromTimesheets({
      id: 'd1', projectId: 'p1', date: '2026-04-10', labourTotal: 0,
    } as any)
    expect(hr.dailyManpower).toHaveBeenCalledWith('p1', '2026-04-10')
    expect(diaries.update).toHaveBeenCalledWith('d1', expect.objectContaining({
      labourSkilled: 4, labourUnskilled: 7, labourSupervisory: 1, labourTotal: 12,
    }))
  })

  it('does not overwrite labour the engineer already entered', async () => {
    const { svc, hr, diaries } = build()
    await svc.fillDiaryLabourFromTimesheets({
      id: 'd1', projectId: 'p1', date: '2026-04-10', labourTotal: 20,
    } as any)
    expect(hr.dailyManpower).not.toHaveBeenCalled()
    expect(diaries.update).not.toHaveBeenCalled()
  })

  it('creates plant logs and material rows once per diary', async () => {
    const { svc, fleet, materials } = build()
    const diary = {
      id: 'd1', projectId: 'p1', date: '2026-04-10', submittedBy: 'Site',
      equipment: [{ type: 'Excavator', hours: 6 }],
      materialsReceived: [{ material: 'Cement', quantity: 40, unit: 'Bags' }],
    } as any
    expect(await svc.syncDiaryEquipmentToFleet(diary)).toBe(1)
    expect(await svc.syncDiaryMaterialsToRegister(diary)).toBe(1)
    fleet.findOne.mockResolvedValue({ id: 'existing' })
    materials.findOne.mockResolvedValue({ id: 'existing' })
    expect(await svc.syncDiaryEquipmentToFleet(diary)).toBe(0)
    expect(await svc.syncDiaryMaterialsToRegister(diary)).toBe(0)
  })
})

describe('OpsSyncService — meetings, NCR, BOQ', () => {
  it('opens a task for each meeting action and is idempotent', async () => {
    const { svc, tasks } = build()
    const meeting = {
      id: 'm1', projectId: 'p1', minutedBy: 'PM',
      actionItems: [{ action: 'Submit RA-1', responsible: 'Accounts', dueDate: '2026-04-15' }],
    } as any
    expect(await svc.syncMeetingActionsToTasks(meeting)).toBe(1)
    expect(tasks.save).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Submit RA-1',
      category: 'meeting',
      description: expect.stringContaining('[MOM:m1:0]'),
    }))
    tasks.findOne.mockResolvedValue({ id: 't1', status: TaskStatus.TODO })
    expect(await svc.syncMeetingActionsToTasks(meeting)).toBe(0)
  })

  it('puts the matching WBS task on hold for an open NCR and releases it on close', async () => {
    const { svc, wbs } = build()
    wbs.findOne.mockResolvedValue({
      id: 'w1', wbsCode: '2.1', delayReason: null, progressPct: 40, status: WbsStatus.IN_PROGRESS,
    })
    await svc.holdWbsForNcr({ projectId: 'p1', ncrNo: 'NCR-0001', workItem: '2.1', description: 'Bad joint' } as any)
    expect(wbs.update).toHaveBeenCalledWith('w1', expect.objectContaining({ status: WbsStatus.ON_HOLD }))

    wbs.find.mockResolvedValue([{
      id: 'w1', progressPct: 40, delayReason: 'NCR:NCR-0001 Bad joint',
    }])
    await svc.releaseWbsForNcr({ projectId: 'p1', ncrNo: 'NCR-0001' } as any)
    expect(wbs.update).toHaveBeenCalledWith('w1', expect.objectContaining({ status: WbsStatus.IN_PROGRESS }))
  })

  it('writes BOQ measured progress onto WBS tasks that share the payment milestone', async () => {
    const { svc, wbs } = build()
    wbs.find.mockResolvedValue([
      { id: 'w1', isMilestone: false, progressPct: 0, actualStart: null, status: WbsStatus.NOT_STARTED },
    ])
    await svc.syncBoqProgressToWbs({
      projectId: 'p1', estimatedQty: 100, measuredQty: 40, paymentMilestone: 'Pipe Laying & Backfilling',
    } as any)
    expect(wbs.update).toHaveBeenCalledWith('w1', expect.objectContaining({
      progressPct: 40,
      status: WbsStatus.IN_PROGRESS,
    }))
  })

  it('deducts a major NCR from the latest draft RA bill once', async () => {
    const { svc, raBills } = build({
      raBills: repoMock({
        findOne: jest.fn().mockResolvedValue({
          id: 'ra-1', projectId: 'p1', status: RaBillStatus.DRAFT,
          netThisBill: 100000, gstAmount: 0, tdsAmount: 0, securityDepositAmount: 0,
          ncrDeductions: [], otherDeductions: 0, netPayable: 100000,
        }),
      }),
    })
    const ncr = { projectId: 'p1', ncrNo: 'NCR-0002', severity: 'major' } as any
    const once = await svc.applyNcrDeductionToDraftRa(ncr)
    expect(once.otherDeductions).toBe(5000)
    expect(once.netPayable).toBe(95000)
    raBills.findOne.mockResolvedValue(once)
    const twice = await svc.applyNcrDeductionToDraftRa(ncr, once)
    expect(twice.ncrDeductions).toHaveLength(1)
  })

  it('posts plant hours onto the O&M log and opens a breakdown event', async () => {
    const { svc, omLogs, omEvents } = build()
    await svc.syncFleetToOm({
      id: 'f1', projectId: 'p1', logType: 'plant', date: '2026-04-10',
      machineType: 'DG Set', machineId: 'DG-01', hoursWorked: 4, breakdown: true,
      breakdownDetails: 'Overheat', reportedBy: 'Site',
    } as any)
    expect(omLogs.save).toHaveBeenCalledWith(expect.objectContaining({
      dgHours: 4,
      remarks: expect.stringContaining('fleet:f1'),
    }))
    expect(omEvents.save).toHaveBeenCalledWith(expect.objectContaining({
      type: 'breakdown',
      equipment: 'DG Set DG-01',
    }))
  })
})
