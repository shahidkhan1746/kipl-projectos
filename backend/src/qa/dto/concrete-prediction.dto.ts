export type ConcreteGrade = 'M15' | 'M20' | 'M25' | 'M30' | 'M35' | 'M40' | 'M50'
export type CementType = 'OPC_43' | 'OPC_53' | 'PPC' | 'PSC'
export type ComplianceStatus = 'COMPLIANT' | 'BORDERLINE' | 'NON_COMPLIANT_RISK'

export class ConcretePredictionRequestDto {
  grade: ConcreteGrade
  cementType?: CementType
  waterCementRatio?: number
  testAgeDays: number // typically 3 or 7
  measuredLoadsKn?: number[] // crushing loads in kN for 150mm cubes
  measuredStrengthMpa?: number // direct early strength in MPa if already converted
  slumpMm?: number
  curingTemperatureCelsius?: number // ambient / curing water temp (defaults to 20°C)
  cubeSizeMm?: number // 150 mm (standard) or 100 mm
}

export class ConcretePredictionResponseDto {
  grade: ConcreteGrade
  targetCharacteristicStrengthMpa: number // f_ck
  targetMeanStrengthMpa: number // f_tm = f_ck + 1.65 * standard_deviation (IS 456)
  measuredEarlyAgeDays: number
  measuredEarlyStrengthMpa: number
  /**
   * Strength expected at 28 CALENDAR days if curing continues at the stated
   * temperature. This is the number compliance is judged on, because it is the
   * one the 28-day cube will be compared against.
   */
  predicted28dStrengthMpa: number
  /**
   * The figure compliance is actually decided on: the lower of the prediction
   * at the reported curing temperature and the prediction at the 20°C
   * reference. Curing temperature is an unverified form field, so it is allowed
   * to lower a verdict and never to raise one.
   */
  assessedStrengthMpa: number
  /**
   * Strength the mix would reach given unlimited ideal curing. Always greater
   * than or equal to the 28-day figure, and equal to it at 20°C. Reported
   * because it is genuinely useful — it says whether a cold pour is weak or
   * merely slow — but it is NOT what compliance is decided on.
   */
  potentialStrengthMpa: number
  /**
   * True when any individual cube deviated more than 15% from the mean. Under
   * IS 516 the test result is then invalid and the set must be recast — no
   * cube is discarded to rescue the average.
   */
  outlierDetected: boolean
  cubeStrengthsMpa: number[]
  predictionInterval95: {
    lowerMpa: number
    upperMpa: number
  }
  complianceStatus: ComplianceStatus
  marginPct: number // % above/below f_ck
  maturityFactorPct: number // expected % of 28d strength at this age
  temperatureCorrectionFactor: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  remediationRecommendation: string
}

export interface ConcreteGradeConfig {
  grade: ConcreteGrade
  fck: number // Characteristic compressive strength in N/mm²
  standardDeviation: number // Table 8 IS 456:2000 standard deviation (s)
  targetMeanStrength: number // f_tm = f_ck + 1.65 * s
  maxWcRatio: number // Maximum water-cement ratio for severe exposure (IS 456 Table 5)
  minCementContentKgM3: number // Minimum cement content kg/m³
}
