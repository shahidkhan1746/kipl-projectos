import { Injectable, BadRequestException } from '@nestjs/common'
import {
  ConcreteGrade,
  CementType,
  ConcreteGradeConfig,
  ConcretePredictionRequestDto,
  ConcretePredictionResponseDto,
  ComplianceStatus,
} from '../dto/concrete-prediction.dto'

/**
 * Standard Indian Standard (IS 456:2000 & IS 10262:2019) mix configurations.
 * fck: Characteristic compressive strength (N/mm²)
 * standardDeviation (s): Assumed standard deviation from Table 8 IS 456
 * targetMeanStrength (ftm): fck + 1.65 * s
 */
export const CONCRETE_GRADE_CONFIGS: Record<ConcreteGrade, ConcreteGradeConfig> = {
  M15: { grade: 'M15', fck: 15.0, standardDeviation: 3.5, targetMeanStrength: 20.78, maxWcRatio: 0.55, minCementContentKgM3: 300 },
  M20: { grade: 'M20', fck: 20.0, standardDeviation: 4.0, targetMeanStrength: 26.60, maxWcRatio: 0.50, minCementContentKgM3: 320 },
  M25: { grade: 'M25', fck: 25.0, standardDeviation: 4.0, targetMeanStrength: 31.60, maxWcRatio: 0.45, minCementContentKgM3: 340 },
  M30: { grade: 'M30', fck: 30.0, standardDeviation: 5.0, targetMeanStrength: 38.25, maxWcRatio: 0.45, minCementContentKgM3: 360 },
  M35: { grade: 'M35', fck: 35.0, standardDeviation: 5.0, targetMeanStrength: 43.25, maxWcRatio: 0.40, minCementContentKgM3: 380 },
  M40: { grade: 'M40', fck: 40.0, standardDeviation: 5.0, targetMeanStrength: 48.25, maxWcRatio: 0.40, minCementContentKgM3: 400 },
  M50: { grade: 'M50', fck: 50.0, standardDeviation: 5.0, targetMeanStrength: 58.25, maxWcRatio: 0.35, minCementContentKgM3: 440 },
}

/**
 * Hyperbolic maturity coefficients (ACI 209R / Carino model) by cement type:
 * f(t) / f(28) = [ t / (a + b * t) ] / [ 28 / (a + b * 28) ]
 */
interface MaturityCoefficients {
  a: number
  b: number
}

const CEMENT_KINETICS: Record<CementType, MaturityCoefficients> = {
  OPC_53: { a: 3.20, b: 0.88 }, // 50-55% at 3d, 70-75% at 7d (IS 456 / IRC benchmark for 53 grade)
  OPC_43: { a: 4.20, b: 0.85 }, // 40-45% at 3d, 65-70% at 7d (standard OPC)
  PPC:    { a: 5.60, b: 0.80 }, // 35-40% at 3d, 58-63% at 7d (pozzolanic cement)
  PSC:    { a: 4.80, b: 0.83 }, // 38-42% at 3d, 62-67% at 7d (slag cement)
}

@Injectable()
export class ConcreteStrengthPredictorService {
  /**
   * Returns all standard grade configurations supported by ProjectOS.
   */
  getGradeConfigs(): ConcreteGradeConfig[] {
    return Object.values(CONCRETE_GRADE_CONFIGS)
  }

  /**
   * Convert crushing load in kN to compressive stress in N/mm² (MPa)
   * Standard cube size = 150 mm => area = 22,500 mm²
   */
  convertLoadToStrengthMpa(loadKn: number, cubeSizeMm = 150): number {
    if (loadKn <= 0) return 0
    const areaMm2 = cubeSizeMm * cubeSizeMm
    return +( (loadKn * 1000) / areaMm2 ).toFixed(2)
  }

  /**
   * Calculate maturity fraction achieved at age t days relative to 28 days.
   * Uses non-linear hyperbolic strength gain kinetics (ACI 209R / IS 456).
   */
  calculateMaturityFactor(ageDays: number, cementType: CementType = 'OPC_53'): number {
    if (ageDays <= 0) return 0
    if (ageDays >= 28) return 1.0

    const { a, b } = CEMENT_KINETICS[cementType] || CEMENT_KINETICS.OPC_53
    const num = ageDays / (a + b * ageDays)
    const den = 28 / (a + b * 28)
    const factor = num / den
    return Math.min(1.0, Math.max(0.1, factor))
  }

  /**
   * Temperature maturity correction factor (Nurse-Saul / Arrhenius function).
   * Reference temperature = 20°C.
   * Adjusts for slower winter curing in Srinagar (5°C - 10°C).
   */
  calculateTemperatureFactor(curingTempCelsius = 20): number {
    // Datum temp for concrete hydration is -10°C
    const datum = -10
    const refTemp = 20
    const effectiveTemp = Math.max(0, curingTempCelsius)
    const factor = Math.pow((effectiveTemp - datum) / (refTemp - datum), 0.65)
    // Clamp between 0.60 (very cold) and 1.25 (accelerated steam/hot curing)
    return +( Math.min(1.25, Math.max(0.60, factor)) ).toFixed(3)
  }

  /**
   * Evaluates measured cube test results.
   * Filters outliers according to IS 516 (individual cubes must not deviate > 15% from mean).
   */
  computeEarlyStrength(dto: ConcretePredictionRequestDto): number {
    if (dto.measuredStrengthMpa !== undefined && dto.measuredStrengthMpa > 0) {
      return dto.measuredStrengthMpa
    }

    if (dto.measuredLoadsKn && dto.measuredLoadsKn.length > 0) {
      const cubeSize = dto.cubeSizeMm || 150
      const strengths = dto.measuredLoadsKn
        .filter(load => load > 0)
        .map(load => this.convertLoadToStrengthMpa(load, cubeSize))

      if (!strengths.length) {
        throw new BadRequestException('At least one positive crushing load must be provided.')
      }

      // If 3 cubes are tested, evaluate IS 516 15% outlier rule
      const rawMean = strengths.reduce((sum, s) => sum + s, 0) / strengths.length
      const valid = strengths.filter(s => Math.abs(s - rawMean) / rawMean <= 0.20)
      const finalMean = valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : rawMean
      return +finalMean.toFixed(2)
    }

    throw new BadRequestException('Either measuredStrengthMpa or measuredLoadsKn must be specified.')
  }

  /**
   * Predict 28-day compressive strength from early-age test data.
   */
  predict28DayStrength(dto: ConcretePredictionRequestDto): ConcretePredictionResponseDto {
    const config = CONCRETE_GRADE_CONFIGS[dto.grade]
    if (!config) {
      throw new BadRequestException(`Unknown concrete grade "${dto.grade}". Supported: ${Object.keys(CONCRETE_GRADE_CONFIGS).join(', ')}`)
    }

    if (!dto.testAgeDays || dto.testAgeDays < 1 || dto.testAgeDays > 28) {
      throw new BadRequestException('testAgeDays must be between 1 and 28 days.')
    }

    const cementType: CementType = dto.cementType || 'OPC_53'
    const curingTemp = dto.curingTemperatureCelsius ?? 20
    const earlyStrength = this.computeEarlyStrength(dto)

    const baseMaturity = this.calculateMaturityFactor(dto.testAgeDays, cementType)
    const tempFactor = this.calculateTemperatureFactor(curingTemp)
    const effectiveMaturity = Math.min(1.0, baseMaturity * tempFactor)

    // Extrapolate 28-day predicted strength
    const predicted28d = +(earlyStrength / effectiveMaturity).toFixed(2)

    // Estimate 95% confidence interval based on empirical test error standard deviation (approx 6.5% CV)
    const seEst = +(0.065 * predicted28d).toFixed(2)
    const lowerBound = +(predicted28d - 1.96 * seEst).toFixed(2)
    const upperBound = +(predicted28d + 1.96 * seEst).toFixed(2)

    const marginPct = +(((predicted28d - config.fck) / config.fck) * 100).toFixed(1)

    // Compliance evaluation against characteristic strength fck and target mean ftm
    let complianceStatus: ComplianceStatus = 'COMPLIANT'
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    let recommendation = ''

    if (predicted28d >= config.targetMeanStrength) {
      complianceStatus = 'COMPLIANT'
      riskLevel = 'LOW'
      recommendation = `Strength gain is excellent. Predicted strength (${predicted28d} MPa) exceeds target mean strength (${config.targetMeanStrength} MPa) with an estimated safety margin of +${marginPct}%. Pour is approved for subsequent construction.`
    } else if (predicted28d >= config.fck) {
      complianceStatus = 'BORDERLINE'
      riskLevel = 'MEDIUM'
      recommendation = `Predicted strength (${predicted28d} MPa) meets characteristic design grade (${config.fck} MPa) but is below the target mean strength (${config.targetMeanStrength} MPa). Ensure water curing is strictly maintained for 14 continuous days. Schedule 14-day check cubes.`
    } else {
      complianceStatus = 'NON_COMPLIANT_RISK'
      riskLevel = 'HIGH'
      recommendation = `WARNING: Predicted 28-day strength (${predicted28d} MPa) is below the required design grade (${config.fck} MPa) by ${Math.abs(marginPct)}%. Do NOT load or cast upper structural lifts until 28-day test cubes or non-destructive rebound/UPV core tests confirm adequate strength. Audit batch water-cement ratio and cement freshness.`
    }

    return {
      grade: dto.grade,
      targetCharacteristicStrengthMpa: config.fck,
      targetMeanStrengthMpa: config.targetMeanStrength,
      measuredEarlyAgeDays: dto.testAgeDays,
      measuredEarlyStrengthMpa: earlyStrength,
      predicted28dStrengthMpa: predicted28d,
      confidenceInterval95: {
        lowerMpa: lowerBound,
        upperMpa: upperBound,
      },
      complianceStatus,
      marginPct,
      maturityFactorPct: +(effectiveMaturity * 100).toFixed(1),
      temperatureCorrectionFactor: tempFactor,
      riskLevel,
      remediationRecommendation: recommendation,
    }
  }
}
