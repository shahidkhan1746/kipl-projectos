import { BadRequestException, ConflictException } from '@nestjs/common'
import { HrService } from './hr.service'

/**
 * Logins made from the employee form. They used to be best-effort: an email
 * that already had an account kept its old password, and any other failure
 * was only logged, while the form said "saved". These pin down that the form
 * is now told, and that nothing is half-saved.
 */
describe('HrService employee logins', () => {
  const setup = (opts: { existing?: { id: string; email: string } | null; createFails?: Error; saveFails?: Error } = {}) => {
    const saved: any[] = []
    const empRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d: any) => d),
      save: jest.fn(async (d: any) => {
        if (opts.saveFails) throw opts.saveFails
        saved.push(d)
        return { id: 'emp-1', ...d }
      }),
      update: jest.fn().mockResolvedValue({}),
    }
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(opts.existing ?? null),
      createUser: jest.fn(async (d: any) => {
        if (opts.createFails) throw opts.createFails
        return { id: 'user-1', ...d }
      }),
      deleteUser: jest.fn().mockResolvedValue({}),
    }
    const svc = new HrService(empRepo as any, {} as any, {} as any, {} as any, {} as any, {} as any, usersService as any)
    jest.spyOn(svc as any, 'getEmployee').mockResolvedValue({ id: 'emp-1', firstName: 'Wajih', lastName: 'Bhat', email: 'wajih@kiplstpsrinagar.com' })
    return { svc, empRepo, usersService, saved }
  }
  const form = { empCode: 'KIPL-050', firstName: 'Wajih', lastName: 'Bhat', createLogin: true, loginEmail: 'Wajih@KIPLstpsrinagar.com ', loginRole: 'liaison_officer', loginPassword: 'secret1' }

  it('makes the login with the typed password and links it', async () => {
    const { svc, usersService, saved } = setup()
    await svc.createEmployee({ ...form })
    expect(usersService.createUser).toHaveBeenCalledWith({ name: 'Wajih Bhat', email: 'wajih@kiplstpsrinagar.com', role: 'liaison_officer', password: 'secret1' })
    expect(saved[0]).toMatchObject({ firstName: 'Wajih', userId: 'user-1' })
    expect(saved[0]).not.toHaveProperty('loginPassword')
  })

  it('refuses, and saves nothing, when the email (or an alias) already has a login', async () => {
    const { svc, usersService, empRepo } = setup({ existing: { id: 'old', email: 'wajih@kipl.in' } })
    await expect(svc.createEmployee({ ...form })).rejects.toThrow(ConflictException)
    await expect(svc.createEmployee({ ...form })).rejects.toThrow('wajih@kipl.in already has a login, so no new one was made and its password was not changed')
    expect(usersService.createUser).not.toHaveBeenCalled()
    expect(empRepo.save).not.toHaveBeenCalled()
  })

  it('says why when the database will not take the login, and saves nothing', async () => {
    const { svc, empRepo } = setup({ createFails: new Error('invalid input value for enum users_role_enum: "liaison_officer"') })
    await expect(svc.createEmployee({ ...form })).rejects.toThrow(BadRequestException)
    await expect(svc.createEmployee({ ...form })).rejects.toThrow(/could not be created, so nothing was saved: invalid input value for enum/)
    expect(empRepo.save).not.toHaveBeenCalled()
  })

  it('removes the login again if the employee cannot be saved', async () => {
    const { svc, usersService } = setup({ saveFails: new Error('duplicate key') })
    await expect(svc.createEmployee({ ...form })).rejects.toThrow('duplicate key')
    expect(usersService.deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('checks the password and the role on the server too', async () => {
    const { svc } = setup()
    await expect(svc.createEmployee({ ...form, loginPassword: 'abc' })).rejects.toThrow('at least 6 characters')
    await expect(svc.createEmployee({ ...form, loginPassword: undefined })).rejects.toThrow('at least 6 characters')
    await expect(svc.createEmployee({ ...form, loginRole: 'god_mode' })).rejects.toThrow('"god_mode" is not a role')
  })

  it('makes no login when the form does not ask for one', async () => {
    const { svc, usersService, saved } = setup()
    await svc.createEmployee({ ...form, createLogin: false })
    expect(usersService.createUser).not.toHaveBeenCalled()
    expect(saved[0].userId).toBeUndefined()
  })

  it('on edit, never resets an existing login and leaves the record untouched', async () => {
    const { svc, usersService, empRepo } = setup({ existing: { id: 'user-9', email: 'wajih@kiplstpsrinagar.com' } })
    await expect(svc.updateEmployee('emp-1', { designation: 'Liaison', createLogin: true, loginPassword: 'secret1' })).rejects.toThrow(ConflictException)
    expect(usersService.createUser).not.toHaveBeenCalled()
    expect(empRepo.update).not.toHaveBeenCalled()
  })

  it('on edit, makes the login from the employee email and links it with the edit', async () => {
    const { svc, usersService, empRepo } = setup()
    await svc.updateEmployee('emp-1', { designation: 'Liaison', createLogin: true, loginRole: 'liaison_officer', loginPassword: 'secret1' })
    expect(usersService.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'wajih@kiplstpsrinagar.com', role: 'liaison_officer' }))
    expect(empRepo.update).toHaveBeenCalledWith('emp-1', { designation: 'Liaison', userId: 'user-1' })
  })
})
