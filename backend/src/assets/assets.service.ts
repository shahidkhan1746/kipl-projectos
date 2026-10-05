import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { ProjectsService } from '../projects/projects.service'
import { Employee, EmployeeStatus } from '../hr/employee.entity'
import { User, UserRole } from '../users/user.entity'
import { OfficeAsset, OfficeAssetEvent } from './asset.entity'
import { AssetActionDto, AssetQueryDto, AssetWriteDto } from './asset.dto'

/** Project checks live here too: an empty assignment list must fail closed. */
@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(OfficeAsset) private readonly assets: Repository<OfficeAsset>,
    @InjectRepository(OfficeAssetEvent) private readonly events: Repository<OfficeAssetEvent>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly projects: ProjectsService,
    private readonly db: DataSource,
  ) {}

  async authorize(projectId: string, user: User) {
    if (!projectId || !user?.id) throw new ForbiddenException('An authenticated project context is required')
    const allowed = await this.projects.allowedProjectIds(user)
    if (allowed !== null && !allowed.includes(projectId)) throw new ForbiddenException('Not assigned to this project')
    await this.projects.findById(projectId, user)
  }

  async list(q: AssetQueryDto, user: User) {
    await this.authorize(q.projectId, user)
    const page = q.page ?? 1
    const qb = this.assets.createQueryBuilder('a').where('a.projectId = :pid', { pid: q.projectId })
    if (q.search?.trim()) qb.andWhere('(a.name ILIKE :term OR a.assetTag ILIKE :term OR a.serialNumber ILIKE :term OR a.assignedTo ILIKE :term OR a.location ILIKE :term)', { term: `%${q.search.trim()}%` })
    if (q.category) qb.andWhere('a.category = :category', { category: q.category })
    if (q.status) qb.andWhere('a.status = :status', { status: q.status })
    const [items, total] = await qb.orderBy('a.createdAt', 'DESC').addOrderBy('a.id', 'ASC').skip((page - 1) * 25).take(25).getManyAndCount()
    const counts = await this.assets.createQueryBuilder('a').select('a.status', 'status').addSelect('COUNT(*)', 'count')
      .where('a.projectId = :pid', { pid: q.projectId }).groupBy('a.status').getRawMany()
    return { items, total, page, pageSize: 25, counts: Object.fromEntries(counts.map(r => [r.status, Number(r.count)])) }
  }

  async custodians(projectId: string, user: User) {
    await this.authorize(projectId, user)
    // Do not expose HR's salary, bank, contact or identity fields to asset operators.
    return this.employees.find({ where: { projectId, status: EmployeeStatus.ACTIVE }, select: ['id', 'empCode', 'firstName', 'lastName'], order: { firstName: 'ASC' } })
  }

  async history(id: string, projectId: string, user: User) {
    await this.authorize(projectId, user)
    if (!await this.assets.findOne({ where: { id, projectId } })) throw new NotFoundException('Asset not found in this project')
    return this.events.find({ where: { assetId: id, projectId }, order: { createdAt: 'DESC', id: 'DESC' }, take: 100 })
  }

  private fields(dto: AssetWriteDto): Partial<OfficeAsset> {
    if (!dto.name?.trim() || !dto.location?.trim()) throw new BadRequestException('Asset name and location are required')
    if (dto.purchaseDate && dto.warrantyUntil && dto.warrantyUntil < dto.purchaseDate) throw new BadRequestException('Warranty cannot end before purchase')
    const text = (v?: string) => v?.trim() || null
    return {
      name: dto.name.trim(), category: dto.category, location: dto.location.trim(), condition: dto.condition,
      brand: text(dto.brand), model: text(dto.model), serialNumber: text(dto.serialNumber), supplier: text(dto.supplier), invoiceNumber: text(dto.invoiceNumber),
      purchaseDate: dto.purchaseDate || null, purchaseCost: dto.purchaseCost ?? null, warrantyUntil: dto.warrantyUntil || null,
      registrationNumber: dto.category === 'vehicle' ? text(dto.registrationNumber) : null,
      insuranceUntil: dto.category === 'vehicle' ? dto.insuranceUntil || null : null, serviceDue: dto.serviceDue || null,
      documentUrl: text(dto.documentUrl), photoUrl: text(dto.photoUrl), notes: text(dto.notes),
    }
  }

  private async record(manager: EntityManager, asset: OfficeAsset, user: User, action: string, reason: string, eventDate: string, before: OfficeAsset | null) {
    const repo = manager.getRepository(OfficeAssetEvent)
    await repo.save(repo.create({ assetId: asset.id, projectId: asset.projectId, actorId: user.id, actorName: user.name || 'User', action, reason, eventDate,
      before: before ? JSON.parse(JSON.stringify(before)) : null, after: JSON.parse(JSON.stringify(asset)) }))
  }

  private async unique<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation() } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('This asset tag already exists in the project')
      throw error
    }
  }

  async create(dto: AssetWriteDto, user: User) {
    await this.authorize(dto.projectId, user)
    const fields = this.fields(dto)
    return this.unique(() => this.db.transaction(async manager => {
      const repo = manager.getRepository(OfficeAsset)
      // Transaction-scoped PostgreSQL lock serializes allocation across processes.
      // Read all projects and include disposed records; existing tags are never rewritten.
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [74191, 1])
      const [counter] = await manager.query("SELECT COALESCE(MAX(SUBSTRING(asset_tag FROM 10)::numeric), 0)::text AS maximum FROM office_assets WHERE asset_tag ~ '^KIPL-AST-[0-9]+$'")
      const assetTag = `KIPL-AST-${(BigInt(counter.maximum) + 1n).toString().padStart(6, '0')}`
      const asset = await repo.save(repo.create({ ...fields, assetTag, projectId: dto.projectId, status: 'available', version: 1 }))
      await this.record(manager, asset, user, 'created', 'Asset registered', new Date().toISOString().slice(0, 10), null)
      return asset
    }))
  }

  private async locked(manager: EntityManager, id: string, projectId: string, version?: number) {
    const asset = await manager.getRepository(OfficeAsset).findOne({ where: { id, projectId }, lock: { mode: 'pessimistic_write' } })
    if (!asset) throw new NotFoundException('Asset not found in this project')
    if (!version || asset.version !== version) throw new ConflictException('Asset changed. Refresh and try again')
    return asset
  }

  async update(id: string, dto: AssetWriteDto, user: User) {
    await this.authorize(dto.projectId, user)
    if (!dto.reason?.trim()) throw new BadRequestException('A correction reason is required')
    const fields = this.fields(dto)
    return this.unique(() => this.db.transaction(async manager => {
      const asset = await this.locked(manager, id, dto.projectId, dto.version)
      if (dto.assetTag !== undefined && dto.assetTag !== asset.assetTag) throw new BadRequestException('Asset tags are permanent and cannot be changed')
      if (asset.status === 'disposed') throw new BadRequestException('Disposed assets cannot be edited')
      if (fields.location !== asset.location) throw new BadRequestException('Use Transfer to change an existing asset location')
      const before = { ...asset }
      Object.assign(asset, fields, { version: asset.version + 1 })
      const saved = await manager.getRepository(OfficeAsset).save(asset)
      await this.record(manager, saved, user, 'updated', dto.reason!.trim(), new Date().toISOString().slice(0, 10), before)
      return saved
    }))
  }

  async action(id: string, dto: AssetActionDto, user: User) {
    await this.authorize(dto.projectId, user)
    if (!dto.reason?.trim()) throw new BadRequestException('A reason or verification note is required')
    if (dto.eventDate > new Date().toISOString().slice(0, 10)) throw new BadRequestException('An event cannot be recorded in the future')
    return this.db.transaction(async manager => {
      const asset = await this.locked(manager, id, dto.projectId, dto.version)
      const before = { ...asset }
      if (asset.status === 'disposed') throw new BadRequestException('Disposed assets are read-only')
      const requireStatus = (...statuses: string[]) => { if (!statuses.includes(asset.status)) throw new BadRequestException(`Cannot ${dto.action.replace(/_/g, ' ')} an asset that is ${asset.status.replace(/_/g, ' ')}`) }
      switch (dto.action) {
        case 'assign': {
          requireStatus('available')
          if (asset.condition === 'unserviceable') throw new BadRequestException('Unserviceable assets cannot be assigned')
          if (!dto.employeeId) throw new BadRequestException('Choose a custodian')
          const employee = await manager.getRepository(Employee).findOne({ where: { id: dto.employeeId, projectId: dto.projectId, status: EmployeeStatus.ACTIVE } })
          if (!employee) throw new BadRequestException('Custodian must be an active employee in this project')
          asset.assignedEmployeeId = employee.id
          asset.assignedTo = [employee.firstName, employee.lastName].filter(Boolean).join(' ')
          asset.status = 'assigned'
          break
        }
        case 'return': requireStatus('assigned'); asset.assignedEmployeeId = null; asset.assignedTo = null; asset.status = 'available'; break
        case 'transfer':
          requireStatus('available', 'assigned')
          if (!dto.location?.trim() || dto.location.trim() === asset.location) throw new BadRequestException('Enter a different destination location')
          asset.location = dto.location.trim(); break
        case 'repair': requireStatus('available'); asset.status = 'under_repair'; break
        case 'repair_complete': requireStatus('under_repair'); asset.status = 'available'; break
        case 'lost': requireStatus('available', 'assigned', 'under_repair'); asset.status = 'lost'; break
        case 'recover': requireStatus('lost'); asset.status = asset.assignedEmployeeId ? 'assigned' : 'available'; break
        case 'dispose':
          if (![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(user.role)) throw new ForbiddenException('Only an administrator or project manager may dispose of assets')
          requireStatus('available', 'under_repair', 'lost'); asset.status = 'disposed'; asset.assignedEmployeeId = null; asset.assignedTo = null; break
        case 'verify':
          requireStatus('available', 'assigned', 'under_repair')
          if (asset.lastVerified && dto.eventDate < asset.lastVerified) throw new BadRequestException('Verification date cannot precede the latest verification')
          asset.lastVerified = dto.eventDate; break
        case 'maintenance': requireStatus('available', 'assigned', 'under_repair'); break
        default: throw new BadRequestException('Unknown asset action')
      }
      asset.version++
      const saved = await manager.getRepository(OfficeAsset).save(asset)
      await this.record(manager, saved, user, dto.action, dto.reason.trim(), dto.eventDate, before)
      return saved
    })
  }
}
