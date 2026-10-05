import { AssetsService } from './assets.service'
import { OfficeAsset, OfficeAssetEvent } from './asset.entity'
import { Employee } from '../hr/employee.entity'
import { User, UserRole } from '../users/user.entity'
import { AssetActionDto, AssetWriteDto } from './asset.dto'

describe('Office asset lifecycle', () => {
  const user = { id: 'actor', name: 'Operator', role: UserRole.ADMIN } as User
  let service: AssetsService
  let asset: OfficeAsset
  let repo: any
  let events: any
  let employees: any
  let projects: any
  let manager: any
  beforeEach(() => {
    asset = { id: 'asset', projectId: 'project', assetTag: 'LAP-1', name: 'Laptop', location: 'Office', status: 'available', condition: 'good', version: 1 } as OfficeAsset
    repo = { findOne: jest.fn(async () => asset), create: jest.fn(x => x), save: jest.fn(async x => x) }
    events = { create: jest.fn(x => x), save: jest.fn(async x => x) }
    employees = { findOne: jest.fn(async () => ({ id: 'employee', firstName: 'Test', lastName: 'Employee' })) }
    projects = { allowedProjectIds: jest.fn(async () => ['project']), findById: jest.fn(async () => ({})) }
    manager = { query: jest.fn(async (sql: string) => sql.includes('MAX(') ? [{ maximum: '0' }] : []), getRepository: (entity: unknown) => entity === OfficeAsset ? repo : entity === OfficeAssetEvent ? events : entity === Employee ? employees : null }
    service = new AssetsService(repo, events, employees, projects, { transaction: async fn => fn(manager) } as any)
  })
  const action = (name: AssetActionDto['action'], extra = {}) => ({ projectId: 'project', version: 1, action: name, eventDate: '2026-01-01', reason: 'Recorded by operator', ...extra })
  const write = (extra = {}): AssetWriteDto => ({ projectId: 'project', name: 'Laptop', category: 'laptop', condition: 'good', location: 'Office', ...extra })
  it('allocates a tag under a transaction lock without accepting a client tag', async () => {
    const saved = await service.create(write({ assetTag: 'CLIENT-TAG' }), user)
    expect(saved.assetTag).toBe('KIPL-AST-000001')
    expect(manager.query.mock.calls[0]).toEqual(['SELECT pg_advisory_xact_lock($1, $2)', [74191, 1]])
    expect(manager.query.mock.calls[1][0]).toContain('FROM office_assets WHERE asset_tag')
    expect(events.save).toHaveBeenCalledWith(expect.objectContaining({ after: expect.objectContaining({ assetTag: saved.assetTag }) }))
  })
  it('continues existing numbering and does not wrap at six digits', async () => {
    manager.query.mockImplementation(async (sql: string) => sql.includes('MAX(') ? [{ maximum: '999999' }] : [])
    expect((await service.create(write(), user)).assetTag).toBe('KIPL-AST-1000000')
  })
  it('preserves legacy tags when editing without a tag', async () => {
    expect((await service.update('asset', write({ version: 1, reason: 'Correction' }), user)).assetTag).toBe('LAP-1')
  })
  it('rejects attempts to change permanent tags', async () => {
    await expect(service.update('asset', write({ version: 1, reason: 'Correction', assetTag: 'NEW' }), user)).rejects.toThrow('permanent')
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('fails closed for users without project assignments', async () => {
    projects.allowedProjectIds.mockResolvedValue([])
    await expect(service.authorize('project', user)).rejects.toThrow('Not assigned')
  })
  it('rejects stale versions before writing', async () => {
    await expect(service.action('asset', action('verify', { version: 2 }), user)).rejects.toThrow('Asset changed')
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('restricts custodian lookup to an active employee in the same project', async () => {
    await service.action('asset', action('assign', { employeeId: 'employee' }), user)
    expect(employees.findOne).toHaveBeenCalledWith({ where: { id: 'employee', projectId: 'project', status: 'active' } })
    expect(asset.status).toBe('assigned')
    expect(asset.version).toBe(2)
    expect(events.save).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'actor', before: expect.objectContaining({ status: 'available' }), after: expect.objectContaining({ status: 'assigned' }) }))
  })
  it('rejects unavailable custodians', async () => {
    employees.findOne.mockResolvedValue(null)
    await expect(service.action('asset', action('assign', { employeeId: 'employee' }), user)).rejects.toThrow('active employee')
  })
  it('rejects assignment of unserviceable equipment', async () => {
    asset.condition = 'unserviceable'
    await expect(service.action('asset', action('assign', { employeeId: 'employee' }), user)).rejects.toThrow('Unserviceable')
  })
  it('requires an assigned item to be returned before repair or disposal', async () => {
    asset.status = 'assigned'
    await expect(service.action('asset', action('repair'), user)).rejects.toThrow('Cannot')
    await expect(service.action('asset', action('dispose'), user)).rejects.toThrow('Cannot')
  })
  it('restricts disposal permission', async () => {
    await expect(service.action('asset', action('dispose'), { ...user, role: UserRole.ACCOUNTS })).rejects.toThrow('Only an administrator')
  })
  it('makes disposed assets read-only', async () => {
    asset.status = 'disposed'
    await expect(service.action('asset', action('verify'), user)).rejects.toThrow('read-only')
  })
  it('preserves custody when recovering a lost assigned asset', async () => {
    asset.status = 'lost'; asset.assignedEmployeeId = 'employee'
    await service.action('asset', action('recover'), user)
    expect(asset.status).toBe('assigned')
  })
  it('rejects retrograde verification and future events', async () => {
    asset.lastVerified = '2026-02-01'
    await expect(service.action('asset', action('verify'), user)).rejects.toThrow('cannot precede')
    await expect(service.action('asset', action('verify', { eventDate: '2999-01-01' }), user)).rejects.toThrow('future')
  })
  it('requires a distinct transfer destination', async () => {
    await expect(service.action('asset', action('transfer', { location: 'Office' }), user)).rejects.toThrow('different destination')
  })
  it('requires an audit reason', async () => {
    await expect(service.action('asset', action('verify', { reason: ' ' }), user)).rejects.toThrow('note is required')
  })
})
