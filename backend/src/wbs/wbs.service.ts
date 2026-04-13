import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WbsTask, TaskStatus } from './wbs-task.entity'

const SEED_TASKS = [
  {
    "wbsCode": "1",
    "title": "Survey, Design & Vetting",
    "level": 1,
    "sortOrder": 1,
    "plannedStart": "2025-09-27",
    "plannedEnd": "2025-12-21",
    "plannedDuration": 45,
    "isMilestone": false,
    "paymentPct": 5,
    "paymentMilestone": "Survey & Vetting of Design"
  },
  {
    "wbsCode": "2",
    "title": "Sewer Network — Civil Works",
    "level": 1,
    "sortOrder": 2,
    "plannedStart": "2025-12-22",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 411,
    "isMilestone": false,
    "paymentPct": 55,
    "paymentMilestone": "Pipe Laying & Backfilling"
  },
  {
    "wbsCode": "3",
    "title": "IPS Construction — Civil",
    "level": 1,
    "sortOrder": 3,
    "plannedStart": "2025-12-22",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 411,
    "isMilestone": false,
    "paymentPct": 30,
    "paymentMilestone": "Civil Structure Work"
  },
  {
    "wbsCode": "4",
    "title": "STP Construction (30 MLD)",
    "level": 1,
    "sortOrder": 4,
    "plannedStart": "2025-12-22",
    "plannedEnd": "2027-05-06",
    "plannedDuration": 500,
    "isMilestone": false,
    "paymentPct": 30,
    "paymentMilestone": "Civil Structure Work"
  },
  {
    "wbsCode": "5",
    "title": "Rising Mains & Appurtenances",
    "level": 1,
    "sortOrder": 5,
    "plannedStart": "2026-03-01",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 342,
    "isMilestone": false,
    "paymentPct": 55,
    "paymentMilestone": "Pipe Laying & Backfilling"
  },
  {
    "wbsCode": "6",
    "title": "E&M Works — IPS & STP",
    "level": 1,
    "sortOrder": 6,
    "plannedStart": "2026-09-01",
    "plannedEnd": "2027-09-06",
    "plannedDuration": 370,
    "isMilestone": false,
    "paymentPct": 40,
    "paymentMilestone": "Delivery at Site after TPI"
  },
  {
    "wbsCode": "7",
    "title": "Road Reinstatement",
    "level": 1,
    "sortOrder": 7,
    "plannedStart": "2026-06-01",
    "plannedEnd": "2028-03-27",
    "plannedDuration": 523,
    "isMilestone": false,
    "paymentPct": 20,
    "paymentMilestone": "Permanent Road Reinstatement"
  },
  {
    "wbsCode": "8",
    "title": "Testing & Commissioning",
    "level": 1,
    "sortOrder": 8,
    "plannedStart": "2027-09-01",
    "plannedEnd": "2028-03-27",
    "plannedDuration": 66,
    "isMilestone": false,
    "paymentPct": 10,
    "paymentMilestone": "Sectional Flow Testing"
  },
  {
    "wbsCode": "9",
    "title": "Free Trial Run (6 Months)",
    "level": 1,
    "sortOrder": 9,
    "plannedStart": "2027-11-07",
    "plannedEnd": "2028-05-06",
    "plannedDuration": 181,
    "isMilestone": true,
    "paymentPct": 5,
    "paymentMilestone": "Trial Run Completion"
  },
  {
    "wbsCode": "10",
    "title": "O&M Period (5 Years)",
    "level": 1,
    "sortOrder": 10,
    "plannedStart": "2028-05-07",
    "plannedEnd": "2033-05-06",
    "plannedDuration": 1825,
    "isMilestone": false,
    "paymentPct": 5,
    "paymentMilestone": "O&M Year 1"
  },
  {
    "wbsCode": "2.1",
    "title": "200mm dia RCC NP3 Pipes (184,793m)",
    "level": 2,
    "sortOrder": 11,
    "plannedStart": "2025-12-22",
    "plannedEnd": "2026-12-31",
    "plannedDuration": 374,
    "isMilestone": false,
    "parentId": "2",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "2.2",
    "title": "300-500mm dia Pipes",
    "level": 2,
    "sortOrder": 12,
    "plannedStart": "2026-01-01",
    "plannedEnd": "2027-01-31",
    "plannedDuration": 395,
    "isMilestone": false,
    "parentId": "2",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "2.3",
    "title": "700-1000mm dia Pipes",
    "level": 2,
    "sortOrder": 13,
    "plannedStart": "2026-03-01",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 342,
    "isMilestone": false,
    "parentId": "2",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "2.4",
    "title": "RCC Manholes (3,728 Nos)",
    "level": 2,
    "sortOrder": 14,
    "plannedStart": "2025-12-22",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 411,
    "isMilestone": false,
    "parentId": "2",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "2.5",
    "title": "Masonry Chambers (15,814 Nos)",
    "level": 2,
    "sortOrder": 15,
    "plannedStart": "2026-01-01",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 401,
    "isMilestone": false,
    "parentId": "2",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "3.1",
    "title": "IPS-1 at Node 102",
    "level": 2,
    "sortOrder": 16,
    "plannedStart": "2025-12-22",
    "plannedEnd": "2026-09-30",
    "plannedDuration": 282,
    "isMilestone": false,
    "parentId": "3",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "3.2",
    "title": "IPS-3 at Node 1053",
    "level": 2,
    "sortOrder": 17,
    "plannedStart": "2026-01-01",
    "plannedEnd": "2026-12-31",
    "plannedDuration": 365,
    "isMilestone": false,
    "parentId": "3",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "3.3",
    "title": "IPS-5 at Node 1532",
    "level": 2,
    "sortOrder": 18,
    "plannedStart": "2026-03-01",
    "plannedEnd": "2027-01-31",
    "plannedDuration": 336,
    "isMilestone": false,
    "parentId": "3",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "3.4",
    "title": "IPS-9 at Node 4011 (Largest)",
    "level": 2,
    "sortOrder": 19,
    "plannedStart": "2026-01-01",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 401,
    "isMilestone": false,
    "parentId": "3",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "3.5",
    "title": "MPS at Habak",
    "level": 2,
    "sortOrder": 20,
    "plannedStart": "2026-06-01",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 250,
    "isMilestone": false,
    "parentId": "3",
    "responsible": "Civil Team"
  },
  {
    "wbsCode": "M1",
    "title": "MILESTONE: Design Approval from UEED",
    "level": 1,
    "sortOrder": 21,
    "plannedStart": "2025-12-21",
    "plannedEnd": "2025-12-21",
    "plannedDuration": 0,
    "isMilestone": true,
    "paymentMilestone": "Design Approval"
  },
  {
    "wbsCode": "M2",
    "title": "MILESTONE: RA-1 Bill Submission",
    "level": 1,
    "sortOrder": 22,
    "plannedStart": "2026-04-07",
    "plannedEnd": "2026-04-07",
    "plannedDuration": 0,
    "isMilestone": true,
    "paymentMilestone": "RA-1 (5% of net)"
  },
  {
    "wbsCode": "M3",
    "title": "MILESTONE: 30% Network Complete",
    "level": 1,
    "sortOrder": 23,
    "plannedStart": "2026-09-30",
    "plannedEnd": "2026-09-30",
    "plannedDuration": 0,
    "isMilestone": true,
    "paymentMilestone": "Interim Progress"
  },
  {
    "wbsCode": "M4",
    "title": "MILESTONE: All IPS Civil Complete",
    "level": 1,
    "sortOrder": 24,
    "plannedStart": "2027-02-06",
    "plannedEnd": "2027-02-06",
    "plannedDuration": 0,
    "isMilestone": true,
    "paymentMilestone": "Civil Completion"
  },
  {
    "wbsCode": "M5",
    "title": "MILESTONE: STP Commissioned",
    "level": 1,
    "sortOrder": 25,
    "plannedStart": "2027-09-06",
    "plannedEnd": "2027-09-06",
    "plannedDuration": 0,
    "isMilestone": true,
    "paymentMilestone": "STP Testing & Commissioning"
  },
  {
    "wbsCode": "M6",
    "title": "MILESTONE: Completion Certificate",
    "level": 1,
    "sortOrder": 26,
    "plannedStart": "2025-09-27",
    "plannedEnd": "2028-03-27",
    "plannedDuration": 0,
    "isMilestone": true,
    "paymentMilestone": "Completion Certificate by UEED"
  }
]

@Injectable()
export class WbsService {
  constructor(@InjectRepository(WbsTask) private repo: Repository<WbsTask>) {}

  async seed(projectId: string): Promise<{ seeded: number }> {
    const existing = await this.repo.count({ where: { projectId } })
    if (existing > 0) return { seeded: 0 }
    const tasks = SEED_TASKS.map(t => this.repo.create({ ...t, projectId, status: TaskStatus.NOT_STARTED, progressPct: 0 }))
    await this.repo.save(tasks)
    return { seeded: tasks.length }
  }

  async list(projectId: string) {
    return this.repo.find({ where: { projectId }, order: { sortOrder: 'ASC' } })
  }

  async update(id: string, data: any): Promise<WbsTask> {
    // Auto-calculate delay days
    if (data.plannedEnd && data.actualEnd) {
      const planned = new Date(data.plannedEnd)
      const actual  = new Date(data.actualEnd)
      data.delayDays = Math.max(0, Math.round((actual.getTime() - planned.getTime()) / 86400000))
    } else if (data.plannedEnd && data.progressPct < 100) {
      const today   = new Date()
      const planned = new Date(data.plannedEnd)
      if (today > planned) {
        data.delayDays = Math.round((today.getTime() - planned.getTime()) / 86400000)
        if (!data.status) data.status = TaskStatus.DELAYED
      }
    }
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } }) as Promise<WbsTask>
  }

  async create(data: any): Promise<WbsTask> {
    const count = await this.repo.count({ where: { projectId: data.projectId } })
    return this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 })) as any
  }

  async dashboard(projectId: string) {
    const tasks = await this.list(projectId)
    const nonMilestones = tasks.filter(t => !t.isMilestone)
    const total     = nonMilestones.length
    const completed = nonMilestones.filter(t => t.status === TaskStatus.COMPLETED).length
    const delayed   = nonMilestones.filter(t => t.status === TaskStatus.DELAYED || t.delayDays > 0).length
    const inProg    = nonMilestones.filter(t => t.status === TaskStatus.IN_PROGRESS).length
    const avgProg   = total > 0 ? nonMilestones.reduce((s, t) => s + Number(t.progressPct), 0) / total : 0
    const milestones = tasks.filter(t => t.isMilestone)
    const passedMs   = milestones.filter(t => {
      return t.status === TaskStatus.COMPLETED || new Date(t.plannedEnd) < new Date()
    })
    const contractEnd = new Date('2028-03-27')
    const today       = new Date()
    const daysRemaining = Math.round((contractEnd.getTime() - today.getTime()) / 86400000)
    const contractPct   = Math.min(100, Math.max(0,
      (today.getTime() - new Date('2025-09-27').getTime()) /
      (contractEnd.getTime() - new Date('2025-09-27').getTime()) * 100
    )).toFixed(1)
    return {
      totalTasks: total, completed, delayed, inProgress: inProg,
      overallProgress: avgProg.toFixed(1),
      milestones: milestones.length, milestonesHit: passedMs.length,
      daysRemaining, contractPct,
      contractEnd: '2028-03-27',
    }
  }
}
