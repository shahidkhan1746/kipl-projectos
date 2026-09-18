import { Test, TestingModule } from '@nestjs/testing'
import { PertRiskEngineService } from './pert-risk-engine.service'
import { WbsTask } from '../wbs-task.entity'

describe('PertRiskEngineService (Dynamic PERT & Delay Risk ML)', () => {
  let service: PertRiskEngineService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PertRiskEngineService],
    }).compile()

    service = module.get<PertRiskEngineService>(PertRiskEngineService)
  })

  describe('Work Category Classification', () => {
    it('classifies trenching and excavation as EARTHWORK_EXCAVATION', () => {
      expect(service.classifyWorkCategory({ title: 'Trench Excavation in saturated soil' })).toBe('EARTHWORK_EXCAVATION')
      expect(service.classifyWorkCategory({ title: 'Dewatering and shoring for wet well' })).toBe('EARTHWORK_EXCAVATION')
    })

    it('classifies sewer and pipe laying as PIPE_LAYING', () => {
      expect(service.classifyWorkCategory({ title: 'Laying 600mm RCC NP3 Sewer Pipe' })).toBe('PIPE_LAYING')
      expect(service.classifyWorkCategory({ title: 'DI Rising Main alignment and jointing' })).toBe('PIPE_LAYING')
    })

    it('classifies manholes and SBR basin as STRUCTURAL_CIVIL', () => {
      expect(service.classifyWorkCategory({ title: 'Construction of RCC Manholes' })).toBe('STRUCTURAL_CIVIL')
      expect(service.classifyWorkCategory({ title: 'SBR Aeration Basin Base Slab Concrete' })).toBe('STRUCTURAL_CIVIL')
    })

    it('classifies pumps and electrical as ELECTRO_MECHANICAL', () => {
      expect(service.classifyWorkCategory({ title: 'Installation of Submersible Non-Clog Pumps' })).toBe('ELECTRO_MECHANICAL')
      expect(service.classifyWorkCategory({ title: 'SCADA Automation and Control Panel Cabling' })).toBe('ELECTRO_MECHANICAL')
    })

    it('classifies road restoration as ROAD_REINSTATEMENT', () => {
      expect(service.classifyWorkCategory({ title: 'Road Reinstatement with Bituminous Concrete' })).toBe('ROAD_REINSTATEMENT')
    })
  })

  describe('Srinagar Seasonal Climate Detection', () => {
    it('detects winter freeze for dates in December, January, February', () => {
      expect(service.isWinterFreezeScheduled('2026-12-15', '2027-01-20')).toBe(true)
      expect(service.isWinterFreezeScheduled('2027-02-05', '2027-02-28')).toBe(true)
      expect(service.isWinterFreezeScheduled('2026-05-10', '2026-06-30')).toBe(false)
    })

    it('detects monsoon for July and August', () => {
      expect(service.isMonsoonScheduled('2026-07-15', '2026-08-10')).toBe(true)
      expect(service.isMonsoonScheduled('2026-04-01', '2026-05-01')).toBe(false)
    })
  })

  describe('Task Risk Assessment & Dynamic Multipliers', () => {
    it('gives higher pessimistic multiplier (beta) to excavation than MEP in normal weather', () => {
      const excavation = service.assessTaskRisk({
        wbsCode: '1.1',
        title: 'Deep Trench Excavation',
        plannedDuration: 60,
        plannedStart: '2026-05-01',
        plannedEnd: '2026-06-30',
        isCritical: false,
      } as WbsTask)

      const mep = service.assessTaskRisk({
        wbsCode: '3.1',
        title: 'Submersible Pump Installation',
        plannedDuration: 60,
        plannedStart: '2026-05-01',
        plannedEnd: '2026-06-30',
        isCritical: false,
      } as WbsTask)

      expect(excavation.betaDyn).toBeGreaterThan(mep.betaDyn)
      expect(excavation.workCategory).toBe('EARTHWORK_EXCAVATION')
      expect(mep.workCategory).toBe('ELECTRO_MECHANICAL')
    })

    it('applies winter weather expansion penalty for tasks scheduled in Srinagar winter', () => {
      const summerTask = service.assessTaskRisk({
        wbsCode: '2.1',
        title: 'Pipe Laying Trunk Sewer',
        plannedDuration: 60,
        plannedStart: '2026-05-01',
        plannedEnd: '2026-06-30',
      } as WbsTask)

      const winterTask = service.assessTaskRisk({
        wbsCode: '2.2',
        title: 'Pipe Laying Trunk Sewer',
        plannedDuration: 60,
        plannedStart: '2026-12-01',
        plannedEnd: '2027-01-30',
      } as WbsTask)

      expect(winterTask.betaDyn).toBeGreaterThan(summerTask.betaDyn)
      expect(winterTask.weatherVulnerability).toBe(true)
      expect(winterTask.isWinterScheduled).toBe(true)
      expect(winterTask.riskDrivers.some(d => d.includes('Winter Freeze'))).toBe(true)
    })

    it('elevates risk to CRITICAL_PATH_AT_RISK when critical task has high risk factors', () => {
      const criticalWinterTrench = service.assessTaskRisk(
        {
          wbsCode: '1.2',
          title: 'Critical Trenching for IPS Outfall',
          plannedDuration: 60,
          plannedStart: '2026-12-10',
          plannedEnd: '2027-02-15',
          isCritical: true,
          delayDays: 15,
        } as WbsTask,
        true, // isLiaisonGated
      )

      expect(criticalWinterTrench.isCritical).toBe(true)
      expect(criticalWinterTrench.riskCategory).toBe('CRITICAL_PATH_AT_RISK')
      expect(criticalWinterTrench.riskScore).toBeGreaterThanOrEqual(60)
      expect(criticalWinterTrench.riskDrivers.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Project-Wide Risk Rollup', () => {
    it('produces an aggregate forecast across multiple tasks', () => {
      const tasks = [
        { wbsCode: '1', title: 'Excavation', plannedStart: '2026-12-01', plannedEnd: '2026-12-31', isCritical: true } as WbsTask,
        { wbsCode: '2', title: 'Pipe Laying', plannedStart: '2026-05-01', plannedEnd: '2026-05-31', isCritical: false } as WbsTask,
        { wbsCode: '3', title: 'Pump Commissioning', plannedStart: '2026-06-01', plannedEnd: '2026-06-30', isCritical: false } as WbsTask,
      ]

      const forecast = service.generateProjectRiskForecast(tasks, new Set(['1']))
      expect(forecast.totalTasks).toBe(3)
      expect(forecast.criticalTasksCount).toBe(1)
      expect(forecast.winterVulnerableTasksCount).toBe(1)
      expect(forecast.averageRiskScore).toBeGreaterThan(0)
      expect(forecast.tasks.length).toBe(3)
    })
  })
})
