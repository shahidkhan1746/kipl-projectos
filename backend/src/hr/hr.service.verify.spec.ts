import { NotFoundException } from '@nestjs/common'
import { HrService } from './hr.service'
import { EmployeeStatus } from './employee.entity'

describe('HrService.verifyEmployee', () => {
  it('returns verified payload when employee is found in database', async () => {
    const mockEmployee = {
      id: 'uuid-1234',
      empCode: 'KIPL-009',
      firstName: 'Farooq',
      lastName: 'Ahmad',
      designation: 'Civil Site Engineer',
      department: 'Civil',
      status: EmployeeStatus.ACTIVE,
      phone: '+91 99999 00000',
      email: 'farooq@kiplstpsrinagar.com',
      bloodGroup: 'A+',
      dateOfJoining: '2023-01-15',
      baseSalary: 45000,
      aadharNo: '1234-5678-9012',
      panNo: 'ABCDE1234F',
      bankAccount: { accountNo: '1122334455' },
    }

    const qb = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockEmployee),
    }

    const empRepo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
    }

    const svc = new HrService(
      empRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    )

    const result = await svc.verifyEmployee('KIPL-009')

    expect(result.verified).toBe(true)
    expect(result.status).toBe('ACTIVE')
    expect(result.empCode).toBe('KIPL-009')
    expect(result.fullName).toBe('Farooq Ahmad')
    expect(result.designation).toBe('Civil Site Engineer')
    expect(result.project.company).toBe('Khilari Infrastructure Pvt. Ltd.')
    expect(result.project.client).toContain('UEED')
    expect(result.project.scheme).toContain('AMRUT')

    // Verify sensitive data is NOT leaked
    expect((result as any).baseSalary).toBeUndefined()
    expect((result as any).aadharNo).toBeUndefined()
    expect((result as any).panNo).toBeUndefined()
    expect((result as any).bankAccount).toBeUndefined()
  })

  it('provides verified fallback record for KIPL-DL-SXR-002 (Zubair Shah)', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    }

    const empRepo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
    }

    const svc = new HrService(
      empRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    )

    const result = await svc.verifyEmployee('KIPL-DL-SXR-002')

    expect(result.verified).toBe(true)
    expect(result.fullName).toBe('Zubair Shah')
    expect(result.empCode).toBe('KIPL-DL-SXR-002')
    expect(result.designation).toBe('Sr. Engineer - Operations')
    expect(result.phone).toBe('+91 941927 9999')
    expect(result.email).toBe('shahzubair69@gmail.com')
    expect(result.address).toContain('Sakidafar')
  })

  it('throws NotFoundException when code does not exist', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    }

    const empRepo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
    }

    const svc = new HrService(
      empRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    )

    await expect(svc.verifyEmployee('INVALID-CODE-999')).rejects.toThrow(NotFoundException)
  })
})
