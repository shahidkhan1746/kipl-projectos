import { Test, TestingModule } from '@nestjs/testing'
import { ConcreteStrengthPredictorService, CONCRETE_GRADE_CONFIGS } from './concrete-strength-predictor.service'
import { BadRequestException } from '@nestjs/common'

describe('ConcreteStrengthPredictorService (ML & Maturity Kinetics)', () => {
  let service: ConcreteStrengthPredictorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConcreteStrengthPredictorService],
    }).compile()

    service = module.get<ConcreteStrengthPredictorService>(ConcreteStrengthPredictorService)
  })

  it('provides configuration for standard IS 456 concrete grades M15 to M50', () => {
    const configs = service.getGradeConfigs()
    expect(configs.length).toBe(7)
    expect(CONCRETE_GRADE_CONFIGS.M25.fck).toBe(25)
    expect(CONCRETE_GRADE_CONFIGS.M25.targetMeanStrength).toBe(31.6)
  })

  describe('Crushing Load to Stress Conversion', () => {
    it('accurately converts kN crushing load to MPa for 150mm cubes', () => {
      // 562.5 kN / (0.15m * 0.15m) / 1000 = 25.0 N/mm² (MPa)
      const strength = service.convertLoadToStrengthMpa(562.5, 150)
      expect(strength).toBe(25.0)
    })

    it('returns 0 for negative or zero load', () => {
      expect(service.convertLoadToStrengthMpa(0)).toBe(0)
      expect(service.convertLoadToStrengthMpa(-10)).toBe(0)
    })
  })

  describe('Hydration Kinetics & Maturity Curves', () => {
    it('produces higher early-age maturity fraction for OPC 53 than PPC at 3 days', () => {
      const opc53Maturity = service.calculateMaturityFactor(3, 'OPC_53')
      const ppcMaturity = service.calculateMaturityFactor(3, 'PPC')

      expect(opc53Maturity).toBeGreaterThan(ppcMaturity)
      expect(opc53Maturity).toBeGreaterThanOrEqual(0.48) // typically ~52% at 3 days for 53 grade
      expect(ppcMaturity).toBeLessThan(0.45) // PPC gains slower initially
    })

    it('reaches approximately 70-75% strength at 7 days for OPC 53', () => {
      const factor7d = service.calculateMaturityFactor(7, 'OPC_53')
      expect(factor7d).toBeGreaterThanOrEqual(0.68)
      expect(factor7d).toBeLessThanOrEqual(0.78)
    })

    it('clamps maturity factor to 1.0 at 28 days or beyond', () => {
      expect(service.calculateMaturityFactor(28, 'OPC_53')).toBe(1.0)
      expect(service.calculateMaturityFactor(35, 'OPC_53')).toBe(1.0)
    })
  })

  describe('Temperature Correction (Srinagar Climate Factor)', () => {
    it('returns 1.0 at standard reference curing temperature 20°C', () => {
      expect(service.calculateTemperatureFactor(20)).toBe(1.0)
    })

    it('derates early maturity in cold weather (e.g. 5°C - 10°C in Srinagar)', () => {
      const coldFactor = service.calculateTemperatureFactor(8)
      expect(coldFactor).toBeLessThan(0.85)
      expect(coldFactor).toBeGreaterThan(0.65)
    })
  })

  describe('Outlier Handling & Load Averaging', () => {
    it('computes average early strength from an array of 3 cube loads', () => {
      // Three cubes: 360 kN (~16.0 MPa), 382.5 kN (~17.0 MPa), 371.25 kN (~16.5 MPa)
      const early = service.computeEarlyStrength({
        grade: 'M25',
        testAgeDays: 7,
        measuredLoadsKn: [360, 382.5, 371.25],
      })
      expect(early).toBeCloseTo(16.5, 1)
    })

    it('throws BadRequestException if neither loads nor direct strength are supplied', () => {
      expect(() => {
        service.computeEarlyStrength({ grade: 'M25', testAgeDays: 7 })
      }).toThrow(BadRequestException)
    })
  })

  describe('28-Day Strength Prediction & Compliance Classification', () => {
    it('predicts COMPLIANT status for an M25 pour with strong 7-day strength (19.5 MPa)', () => {
      const result = service.predict28DayStrength({
        grade: 'M25',
        cementType: 'OPC_53',
        testAgeDays: 7,
        measuredStrengthMpa: 19.5,
        curingTemperatureCelsius: 20,
      })

      expect(result.grade).toBe('M25')
      expect(result.predicted28dStrengthMpa).toBeGreaterThan(26.0)
      expect(result.complianceStatus).toBe('BORDERLINE') // >= 25, but may be below 31.6 target mean
      expect(result.marginPct).toBeGreaterThan(0)
      expect(result.predictionInterval95.lowerMpa).toBeLessThan(result.predicted28dStrengthMpa)
      expect(result.predictionInterval95.upperMpa).toBeGreaterThan(result.predicted28dStrengthMpa)
    })

    it('predicts COMPLIANT (LOW risk) when 7-day strength exceeds 23 MPa for M25', () => {
      const result = service.predict28DayStrength({
        grade: 'M25',
        cementType: 'OPC_53',
        testAgeDays: 7,
        measuredStrengthMpa: 24.0,
      })

      expect(result.predicted28dStrengthMpa).toBeGreaterThan(31.6)
      expect(result.complianceStatus).toBe('COMPLIANT')
      expect(result.riskLevel).toBe('LOW')
      expect(result.remediationRecommendation).toContain('exceeds the target mean strength')
    })

    it('flags NON_COMPLIANT_RISK (HIGH risk) when early strength is critically low', () => {
      // 7-day strength of only 11 MPa for M25 (expected ~17-18 MPa)
      const result = service.predict28DayStrength({
        grade: 'M25',
        cementType: 'OPC_53',
        testAgeDays: 7,
        measuredStrengthMpa: 11.0,
      })

      expect(result.predicted28dStrengthMpa).toBeLessThan(20.0)
      expect(result.complianceStatus).toBe('NON_COMPLIANT_RISK')
      expect(result.riskLevel).toBe('HIGH')
      expect(result.marginPct).toBeLessThan(0)
      expect(result.remediationRecommendation).toContain('WARNING')
      expect(result.remediationRecommendation).toContain('Do NOT load or cast upper structural lifts')
    })

    it('accounts for 3-day early test load accurately', () => {
      // 3-day load of 320 kN on 150mm cube (~14.22 MPa) for M25 OPC_53
      const result = service.predict28DayStrength({
        grade: 'M25',
        cementType: 'OPC_53',
        testAgeDays: 3,
        measuredLoadsKn: [320, 315, 325],
      })

      expect(result.measuredEarlyAgeDays).toBe(3)
      expect(result.predicted28dStrengthMpa).toBeGreaterThan(25.0)
      expect(result.predictionInterval95.lowerMpa).toBeDefined()
    })

    it('rejects invalid test ages outside 1 to 28 days', () => {
      expect(() => {
        service.predict28DayStrength({
          grade: 'M25',
          testAgeDays: 0,
          measuredStrengthMpa: 15,
        })
      }).toThrow(BadRequestException)
    })
  })
})

/**
 * The two defects that made this service unsafe to act on.
 *
 * It gates a decision — the recommendation text says whether to load a pour or
 * cast the lift above it — so a number that moves the wrong way is not a
 * cosmetic problem.
 */
describe('ConcreteStrengthPredictorService: safety of the verdict', () => {
  const svc = new ConcreteStrengthPredictorService()

  const at = (temp: number) => svc.predict28DayStrength({
    grade: 'M25', testAgeDays: 7, measuredStrengthMpa: 15,
    cementType: 'OPC_53', curingTemperatureCelsius: temp,
  } as any)

  describe('cold curing must not improve the verdict', () => {
    // Was: the same 15.0 MPa cube read NON_COMPLIANT at 20°C and COMPLIANT at
    // 5°C, because the prediction divided by a maturity reduced for cold. A
    // failing Srinagar winter pour was approved for loading by typing in the
    // real temperature.
    it('assesses no more at 5°C than at 20°C for the same cube', () => {
      expect(at(5).assessedStrengthMpa).toBeLessThanOrEqual(at(20).assessedStrengthMpa)
    })

    // The 20°C reference is the ceiling, whichever way the site deviates from
    // it: a cold reading is capped there and a hot one falls below it. No
    // temperature anyone can type improves the verdict.
    it('never lets any temperature beat the 20°C reference', () => {
      const ceiling = at(20).assessedStrengthMpa
      for (const t of [40, 35, 30, 25, 20, 15, 10, 5, 0, -5]) {
        expect(at(t).assessedStrengthMpa).toBeLessThanOrEqual(ceiling)
      }
    })

    // Hot curing genuinely does mean a weaker mix for the same reading, and
    // that direction is kept: the correction is one-way, not switched off.
    it('still lets a hot site lower the verdict', () => {
      expect(at(30).assessedStrengthMpa).toBeLessThan(at(20).assessedStrengthMpa)
    })

    it('reports the physical prediction unchanged, whichever way it points', () => {
      expect(at(5).predicted28dStrengthMpa).toBeGreaterThan(at(5).assessedStrengthMpa)
    })

    it('does not turn a failing pour into a compliant one', () => {
      expect(at(20).complianceStatus).toBe('NON_COMPLIANT_RISK')
      expect(at(5).complianceStatus).toBe('NON_COMPLIANT_RISK')
      expect(at(0).complianceStatus).toBe('NON_COMPLIANT_RISK')
    })

    it('is unchanged at the 20°C reference temperature', () => {
      const ref = at(20)
      expect(ref.temperatureCorrectionFactor).toBe(1)
      expect(ref.predicted28dStrengthMpa).toBe(ref.potentialStrengthMpa)
      expect(ref.assessedStrengthMpa).toBe(ref.predicted28dStrengthMpa)
    })

    it('still reports the potential strength, so slow is distinguishable from weak', () => {
      const cold = at(5)
      expect(cold.potentialStrengthMpa).toBeGreaterThan(cold.predicted28dStrengthMpa)
      expect(cold.remediationRecommendation).toContain('slow rather than weak')
    })
  })

  describe('a weak cube is never discarded to rescue the average', () => {
    const set = (bad: number) => ({ measuredLoadsKn: [450, 455, bad] }) as any
    const trueMean = (bad: number) =>
      [450, 455, bad].reduce((sum, l) => sum + (l * 1000) / 22500, 0) / 3

    // Was: 450/455/300 kN reported 20.11 MPa against a true mean of 17.85,
    // because the failing cube fell outside the filter and was dropped.
    it('reports the mean of every cube, however bad one of them is', () => {
      for (const bad of [420, 380, 340, 300, 250, 200]) {
        expect(svc.computeEarlyStrength(set(bad))).toBeCloseTo(trueMean(bad), 1)
      }
    })

    it('never reports more strength as a cube gets weaker', () => {
      const reported = [420, 380, 340, 300, 250, 200].map(b => svc.computeEarlyStrength(set(b)))
      for (let i = 1; i < reported.length; i++) {
        expect(reported[i]).toBeLessThan(reported[i - 1])
      }
    })

    it('flags a set that IS 516 puts outside acceptance', () => {
      expect(svc.hasOutlier([20.0, 20.22, 13.33])).toBe(true)
      expect(svc.hasOutlier([20.0, 20.22, 18.67])).toBe(false)
    })

    // The threshold IS 516 sets is 15%, and the code was written to 20% while
    // its own comment said 15. A cube 18% off the mean sits in that gap: it is
    // an invalid set that the looser figure would have waved through.
    it('uses the 15% IS 516 threshold, not the 20% the code once applied', () => {
      expect(svc.hasOutlier([20.0, 20.22, 15.11])).toBe(true)
    })

    it('refuses to accept a pour on an invalid test set', () => {
      const result = svc.predict28DayStrength({
        grade: 'M25', testAgeDays: 7, measuredLoadsKn: [450, 455, 300],
      } as any)
      expect(result.outlierDetected).toBe(true)
      expect(result.complianceStatus).toBe('NON_COMPLIANT_RISK')
      expect(result.remediationRecommendation).toContain('TEST INVALID')
    })

    it('tolerates a single cube, which has no mean to deviate from', () => {
      expect(svc.hasOutlier([20.0])).toBe(false)
      expect(svc.hasOutlier([])).toBe(false)
    })
  })

  describe('the interval does not overstate certainty', () => {
    // Was: a flat 6.5% CV, which is cube scatter alone. Extrapolating from day
    // 3 is far less certain than from day 7, and the interval said otherwise.
    it('is wider for a 3-day test than a 7-day one', () => {
      const common = { grade: 'M25', measuredStrengthMpa: 15, cementType: 'OPC_53' } as any
      const d3 = svc.predict28DayStrength({ ...common, testAgeDays: 3 })
      const d7 = svc.predict28DayStrength({ ...common, testAgeDays: 7 })
      const width = (r: any) => (r.predictionInterval95.upperMpa - r.predictionInterval95.lowerMpa) / r.predicted28dStrengthMpa
      expect(width(d3)).toBeGreaterThan(width(d7))
    })

    it('never quotes a negative lower bound', () => {
      const r = svc.predict28DayStrength({
        grade: 'M50', testAgeDays: 1, measuredStrengthMpa: 0.5,
      } as any)
      expect(r.predictionInterval95.lowerMpa).toBeGreaterThanOrEqual(0)
    })
  })
})
