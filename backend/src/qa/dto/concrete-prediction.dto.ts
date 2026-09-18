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
  predicted28dStrengthMpa: number
  confidenceInterval95: {
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
