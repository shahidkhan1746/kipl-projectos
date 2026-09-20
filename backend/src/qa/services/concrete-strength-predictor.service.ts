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
   * The individual cube strengths of a test set, in MPa.
   */
  cubeStrengths(dto: ConcretePredictionRequestDto): number[] {
    const cubeSize = dto.cubeSizeMm || 150
    return (dto.measuredLoadsKn ?? [])
      .filter(load => load > 0)
      .map(load => this.convertLoadToStrengthMpa(load, cubeSize))
      .filter(mpa => mpa > 0)
  }

  /**
   * IS 516: an individual cube may not differ from the mean of the set by more
   * than 15%. When one does, the test result is INVALID and the set is recast.
   *
   * The rule is not "drop the odd one and average the rest". Doing that made
   * the reported strength rise as the weak cube got weaker — 450/455/300 kN
   * reported 20.11 MPa where the true mean was 17.85, because the failing cube
   * was silently discarded. It was also non-monotonic: push the bad cube low
   * enough and every cube ends up more than the threshold from the mean, the
   * filter empties, and it falls back to the raw mean again.
   *
   * So nothing is discarded. The mean is the mean, and the caller is told the
   * set is not a valid test.
   */
  hasOutlier(strengths: number[], tolerance = 0.15): boolean {
    if (strengths.length < 2) return false
    const mean = strengths.reduce((sum, s) => sum + s, 0) / strengths.length
    if (mean <= 0) return false
    return strengths.some(s => Math.abs(s - mean) / mean > tolerance)
  }

  /**
   * Evaluates measured cube test results. Every cube counts.
   */
  computeEarlyStrength(dto: ConcretePredictionRequestDto): number {
    if (dto.measuredStrengthMpa !== undefined && dto.measuredStrengthMpa > 0) {
      return dto.measuredStrengthMpa
    }

    if (dto.measuredLoadsKn && dto.measuredLoadsKn.length > 0) {
      const strengths = this.cubeStrengths(dto)
      if (!strengths.length) {
        throw new BadRequestException('At least one positive crushing load must be provided.')
      }
      const mean = strengths.reduce((sum, s) => sum + s, 0) / strengths.length
      return +mean.toFixed(2)
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
    const cubes = this.cubeStrengths(dto)
    const outlierDetected = this.hasOutlier(cubes)
    const earlyStrength = this.computeEarlyStrength(dto)

    // ── Equivalent age, not calendar age ──────────────────────────────────
    //
    // The temperature factor was previously applied by dividing the measured
    // strength by a REDUCED maturity, which made the prediction rise as the
    // curing got colder. The same M25 cube reading 15.0 MPa at 7 days came out
    // as 20.17 MPa / NON-COMPLIANT at 20°C and 31.67 MPa / COMPLIANT at 5°C —
    // a failing pour approved for loading purely because someone typed the real
    // Srinagar winter temperature into the form.
    //
    // The error is conflating two different quantities. Dividing by maturity so
    // far gives the strength the mix would reach given unlimited ideal curing.
    // The 28-day cube is not tested under unlimited ideal curing: it is tested
    // on day 28, at whatever temperature the site actually is. Cold concrete
    // does not merely gain strength later — by day 28 it has not gained it yet,
    // and that is precisely what the acceptance test will measure.
    //
    // So temperature converts calendar days to equivalent days, at both ends:
    // maturity reached by the test, and maturity reachable by day 28.
    const tempFactor = this.calculateTemperatureFactor(curingTemp)
    const equivalentAgeAtTest = dto.testAgeDays * tempFactor
    const equivalentAgeAt28d = 28 * tempFactor

    const maturityAtTest = this.calculateMaturityFactor(equivalentAgeAtTest, cementType)
    const maturityAt28d = this.calculateMaturityFactor(equivalentAgeAt28d, cementType)

    // What the mix would reach with unlimited ideal curing. Worth reporting —
    // it distinguishes a weak pour from a merely slow one — but never the
    // basis for letting load onto a structure.
    const potential = +(earlyStrength / maturityAtTest).toFixed(2)

    // What the 28-day acceptance cube is expected to read.
    const predicted28d = +(potential * maturityAt28d).toFixed(2)

    // Reported as the fraction of the mix's potential that day 28 will realise
    // at this temperature: 100% at 20°C and below that whenever curing is cold.
    const effectiveMaturity = maturityAt28d

    // ── The temperature may lower the verdict. It may never raise it. ─────
    //
    // The physics above is sound in both directions: a cube reading 15 MPa
    // after only 4.5 equivalent days really does imply a stronger mix than one
    // that needed 7 full days at 20°C, so a cold site predicts MORE strength.
    //
    // That is fine as physics and unacceptable as a compliance gate. The curing
    // temperature is a number somebody types into a form; nothing measures it,
    // nothing checks it. A model where entering a colder site turns a failing
    // pour into an approved one puts the entire weight of a structural decision
    // on an unverified field, and it points the wrong way — the coldest pours,
    // where curing genuinely is most at risk, would be judged most leniently.
    //
    // So acceptance is decided on the more conservative of the two: the
    // prediction at the reported temperature, and the prediction as if curing
    // were at the 20°C reference. A cold reading can explain a low result and
    // can lower a verdict; it can never buy one.
    const referenceMaturityAtTest = this.calculateMaturityFactor(dto.testAgeDays, cementType)
    const predictedAtReference = +(earlyStrength / referenceMaturityAtTest).toFixed(2)
    const assessed = +Math.min(predicted28d, predictedAtReference).toFixed(2)

    // The interval covers cube-to-cube test scatter (~6.5% CV, IS 516) AND the
    // error of extrapolating from an early age, which grows the earlier the
    // test is: a 3-day cube says far less about day 28 than a 7-day cube does.
    // Quoting only the test scatter made a prediction look four times more
    // certain than it is.
    const testCv = 0.065
    const extrapolationCv = 0.18 * (1 - maturityAtTest)
    const combinedCv = Math.sqrt(testCv * testCv + extrapolationCv * extrapolationCv)
    const seEst = +(combinedCv * predicted28d).toFixed(2)
    const lowerBound = +Math.max(0, predicted28d - 1.96 * seEst).toFixed(2)
    const upperBound = +(predicted28d + 1.96 * seEst).toFixed(2)

    const marginPct = +(((assessed - config.fck) / config.fck) * 100).toFixed(1)

    // Compliance evaluation against characteristic strength fck and target mean ftm
    const slowNote = potential > predicted28d + 0.05
      ? ` Curing at ${curingTemp}°C, day 28 realises only ${(maturityAt28d * 100).toFixed(0)}% of this mix's potential ${potential} MPa — the pour may be slow rather than weak, but the acceptance cube is taken on day 28 either way.`
      : ''

    let complianceStatus: ComplianceStatus = 'COMPLIANT'
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    let recommendation = ''

    // An invalid test set decides nothing. IS 516 puts a 15% spread between
    // individual cubes and the mean outside acceptance, so there is no number
    // here to approve or refuse a pour on — only a set to recast.
    if (outlierDetected) {
      complianceStatus = 'NON_COMPLIANT_RISK'
      riskLevel = 'HIGH'
      recommendation =
        `TEST INVALID: individual cube strengths (${cubes.map(c => c.toFixed(2)).join(', ')} MPa) differ from their mean by more than the 15% IS 516 allows. ` +
        `This set cannot be used to accept or reject the pour. Recast and retest, and check cube preparation, compaction and capping before blaming the mix.`
    } else if (assessed >= config.targetMeanStrength) {
      complianceStatus = 'COMPLIANT'
      riskLevel = 'LOW'
      recommendation = `Strength gain is on track. Predicted 28-day strength (${predicted28d} MPa) exceeds the target mean strength (${config.targetMeanStrength} MPa) with a margin of +${marginPct}% over the design grade.${slowNote}`
    } else if (assessed >= config.fck) {
      complianceStatus = 'BORDERLINE'
      riskLevel = 'MEDIUM'
      recommendation = `Predicted 28-day strength (${predicted28d} MPa) meets the characteristic design grade (${config.fck} MPa) but is below the target mean strength (${config.targetMeanStrength} MPa). Maintain continuous water curing for 14 days and schedule 14-day check cubes.${slowNote}`
    } else {
      complianceStatus = 'NON_COMPLIANT_RISK'
      riskLevel = 'HIGH'
      recommendation = `WARNING: predicted 28-day strength (${predicted28d} MPa) is below the required design grade (${config.fck} MPa) by ${Math.abs(marginPct)}%. Do NOT load or cast upper structural lifts until 28-day cubes, or rebound/UPV core tests, confirm adequate strength. Audit the batch water-cement ratio and cement freshness.${slowNote}`
    }

    return {
      grade: dto.grade,
      targetCharacteristicStrengthMpa: config.fck,
      targetMeanStrengthMpa: config.targetMeanStrength,
      measuredEarlyAgeDays: dto.testAgeDays,
      measuredEarlyStrengthMpa: earlyStrength,
      predicted28dStrengthMpa: predicted28d,
      assessedStrengthMpa: assessed,
      potentialStrengthMpa: potential,
      outlierDetected,
      cubeStrengthsMpa: cubes,
      predictionInterval95: {
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
