import { Injectable } from '@nestjs/common'
import { WbsTask } from '../wbs-task.entity'

export type WorkCategory =
  | 'EARTHWORK_EXCAVATION'
  | 'PIPE_LAYING'
  | 'STRUCTURAL_CIVIL'
  | 'ELECTRO_MECHANICAL'
  | 'ROAD_REINSTATEMENT'
  | 'GENERAL'

export type TaskRiskCategory =
  | 'LOW_RISK'
  | 'MEDIUM_RISK'
  | 'HIGH_RISK'
  | 'CRITICAL_PATH_AT_RISK'

export interface TaskRiskAssessment {
  wbsCode: string
  title: string
  workCategory: WorkCategory
  alphaDyn: number // Dynamic optimistic multiplier
  betaDyn: number  // Dynamic pessimistic multiplier
  riskScore: number // 0 to 100
  riskCategory: TaskRiskCategory
  weatherVulnerability: boolean
  isWinterScheduled: boolean
  isCritical: boolean
  riskDrivers: string[]
}

export interface ProjectRiskForecast {
  totalTasks: number
  criticalTasksCount: number
  winterVulnerableTasksCount: number
  averageRiskScore: number
  riskBreakdown: {
    low: number
    medium: number
    high: number
    criticalAtRisk: number
  }
  tasks: TaskRiskAssessment[]
}

interface BaseCategoryRisk {
  alpha: number
  beta: number
}

const CATEGORY_BASE_RISKS: Record<WorkCategory, BaseCategoryRisk> = {
  EARTHWORK_EXCAVATION: { alpha: 0.85, beta: 1.45 }, // High geotechnical & water table variance
  PIPE_LAYING:          { alpha: 0.90, beta: 1.25 }, // Moderate linear variance
  STRUCTURAL_CIVIL:     { alpha: 0.90, beta: 1.20 }, // Confined structural pour, controlled
  ELECTRO_MECHANICAL:   { alpha: 0.95, beta: 1.15 }, // Factory pre-tested equipment
  ROAD_REINSTATEMENT:   { alpha: 0.85, beta: 1.35 }, // Weather & traffic dependent
  GENERAL:              { alpha: 0.90, beta: 1.30 }, // Default PERT baseline
}

@Injectable()
export class PertRiskEngineService {
  /**
   * Classify civil engineering work category from task title and description.
   */
  classifyWorkCategory(task: Partial<WbsTask>): WorkCategory {
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase()

    if (
      text.includes('excav') ||
      text.includes('earthwork') ||
      text.includes('trench') ||
      text.includes('dewater') ||
      text.includes('shoring') ||
      text.includes('strata')
    ) {
      return 'EARTHWORK_EXCAVATION'
    }

    if (
      text.includes('pipe') ||
      text.includes('laying') ||
      text.includes('rising main') ||
      text.includes('sewer') ||
      text.includes('jointing') ||
      text.includes('hydro test') ||
      text.includes('alignment')
    ) {
      return 'PIPE_LAYING'
    }

    if (
      text.includes('road') ||
      text.includes('reinstatement') ||
      text.includes('asphalt') ||
      text.includes('bitumen') ||
      text.includes('wbm') ||
      text.includes('gsb') ||
      text.includes('pavement')
    ) {
      return 'ROAD_REINSTATEMENT'
    }

    if (
      text.includes('concrete') ||
      text.includes('manhole') ||
      text.includes('wet well') ||
      text.includes('pump house') ||
      text.includes('sbr') ||
      text.includes('basin') ||
      text.includes('rcc') ||
      text.includes('shuttering')
    ) {
      return 'STRUCTURAL_CIVIL'
    }

    if (
      text.includes('pump') ||
      text.includes('blower') ||
      text.includes('transformer') ||
      text.includes('scada') ||
      text.includes('valve') ||
      text.includes('electrical') ||
      text.includes('cable') ||
      text.includes('dg set') ||
      text.includes('motor')
    ) {
      return 'ELECTRO_MECHANICAL'
    }

    return 'GENERAL'
  }

  /**
   * Determines if a task's planned schedule falls within Srinagar's sub-zero winter freeze (Dec, Jan, Feb).
   */
  isWinterFreezeScheduled(startDateStr?: string, endDateStr?: string): boolean {
    if (!startDateStr && !endDateStr) return false

    const datesToCheck: string[] = []
    if (startDateStr) datesToCheck.push(startDateStr)
    if (endDateStr) datesToCheck.push(endDateStr)

    for (const d of datesToCheck) {
      const date = new Date(d)
      if (!isNaN(date.getTime())) {
        const month = date.getUTCMonth() // 0 = Jan, 1 = Feb, 11 = Dec
        if (month === 11 || month === 0 || month === 1) return true
      }
    }

    return false
  }

  /**
   * Determines if a task falls in high-precipitation / monsoon period (July, August).
   */
  isMonsoonScheduled(startDateStr?: string, endDateStr?: string): boolean {
    if (!startDateStr && !endDateStr) return false
    const datesToCheck = [startDateStr, endDateStr].filter(Boolean) as string[]

    for (const d of datesToCheck) {
      const date = new Date(d)
      if (!isNaN(date.getTime())) {
        const month = date.getUTCMonth()
        if (month === 6 || month === 7) return true // 6 = July, 7 = August
      }
    }
    return false
  }

  /**
   * Evaluates dynamic multi-factor risk and produces adjusted optimistic/pessimistic multipliers.
   */
  assessTaskRisk(task: WbsTask, isLiaisonGated = false): TaskRiskAssessment {
    const category = this.classifyWorkCategory(task)
    const base = CATEGORY_BASE_RISKS[category]

    let alpha = base.alpha
    let beta = base.beta
    const drivers: string[] = []

    // 1. Srinagar Seasonal Weather Factors
    const isWinter = this.isWinterFreezeScheduled(task.plannedStart, task.plannedEnd)
    const isMonsoon = this.isMonsoonScheduled(task.plannedStart, task.plannedEnd)

    if (isWinter) {
      // Freezing soils & snow impede excavation and concrete curing
      beta = +(beta * 1.30).toFixed(3)
      alpha = +(alpha * 0.95).toFixed(3)
      drivers.push('Srinagar Winter Freeze (Dec-Feb): Sub-zero curing & frozen soil restrictions')
    } else if (isMonsoon) {
      beta = +(beta * 1.15).toFixed(3)
      drivers.push('Dal Lake Monsoon / Snowmelt: High water table & continuous dewatering requirement')
    }

    // 2. Category-Specific Drivers
    if (category === 'EARTHWORK_EXCAVATION') {
      drivers.push('Geotechnical Uncertainty: Water-logged peat and boulder strata in Dal catchment')
    } else if (category === 'ROAD_REINSTATEMENT') {
      drivers.push('Traffic Constraints: High-density city traffic permitting and asphalt plant dependencies')
    }

    // 3. Liaison & Regulatory Bottlenecks
    if (isLiaisonGated) {
      drivers.push('Gated by Pending Government Clearance (UEED / LCMA / Traffic Police)')
    }

    // 4. Delay Slippage Momentum
    const delayDays = Number(task.delayDays) || 0
    const plannedDur = Number(task.plannedDuration) || 0
    if (delayDays > 0 && plannedDur > 0) {
      const ratio = delayDays / plannedDur
      drivers.push(`Active Slippage Momentum: Task already delayed by ${delayDays} days (${+(ratio * 100).toFixed(0)}% of duration)`)
    }

    // Compute composite numerical risk score (0 to 100)
    // Beta expansion beyond 1.0 represents upside risk
    const betaExcess = Math.max(0, beta - 1.0)
    let score = Math.round(betaExcess * 80)
    if (isLiaisonGated) score += 15
    if (delayDays > 0) score += Math.min(25, Math.round((delayDays / (plannedDur || 30)) * 25))
    if (task.isCritical) score += 20
    score = Math.min(100, Math.max(5, score))

    // Classify into risk tiers
    let riskCategory: TaskRiskCategory = 'LOW_RISK'
    if (task.isCritical && score >= 60) {
      riskCategory = 'CRITICAL_PATH_AT_RISK'
    } else if (score >= 65) {
      riskCategory = 'HIGH_RISK'
    } else if (score >= 40) {
      riskCategory = 'MEDIUM_RISK'
    }

    return {
      wbsCode: task.wbsCode,
      title: task.title,
      workCategory: category,
      alphaDyn: alpha,
      betaDyn: beta,
      riskScore: score,
      riskCategory,
      weatherVulnerability: isWinter || isMonsoon,
      isWinterScheduled: isWinter,
      isCritical: !!task.isCritical,
      riskDrivers: drivers.length ? drivers : ['Standard execution within normal parameters'],
    }
  }

  /**
   * Generates a project-wide risk forecast rollup.
   */
  generateProjectRiskForecast(tasks: WbsTask[], liaisonGatedCodes: Set<string>): ProjectRiskForecast {
    const assessments = tasks.map(t => this.assessTaskRisk(t, liaisonGatedCodes.has(t.wbsCode)))

    let low = 0
    let medium = 0
    let high = 0
    let criticalAtRisk = 0
    let totalScore = 0
    let winterCount = 0
    let criticalCount = 0

    for (const a of assessments) {
      totalScore += a.riskScore
      if (a.isWinterScheduled) winterCount++
      if (a.isCritical) criticalCount++

      if (a.riskCategory === 'CRITICAL_PATH_AT_RISK') criticalAtRisk++
      else if (a.riskCategory === 'HIGH_RISK') high++
      else if (a.riskCategory === 'MEDIUM_RISK') medium++
      else low++
    }

    return {
      totalTasks: tasks.length,
      criticalTasksCount: criticalCount,
      winterVulnerableTasksCount: winterCount,
      averageRiskScore: tasks.length ? Math.round(totalScore / tasks.length) : 0,
      riskBreakdown: {
        low,
        medium,
        high,
        criticalAtRisk,
      },
      tasks: assessments,
    }
  }
}
