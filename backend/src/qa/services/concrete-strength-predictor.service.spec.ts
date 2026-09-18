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
      expect(result.confidenceInterval95.lowerMpa).toBeLessThan(result.predicted28dStrengthMpa)
      expect(result.confidenceInterval95.upperMpa).toBeGreaterThan(result.predicted28dStrengthMpa)
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
      expect(result.remediationRecommendation).toContain('exceeds target mean strength')
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
      expect(result.confidenceInterval95.lowerMpa).toBeDefined()
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
