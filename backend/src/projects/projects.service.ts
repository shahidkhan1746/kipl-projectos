import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { Employee } from '../hr/employee.entity';
import { User, UserRole } from '../users/user.entity';

const CROSS_PROJECT: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.HR_OFFICER,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
];

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) {}

  /** `null` means the caller may see every project. */
  async allowedProjectIds(user: User): Promise<string[] | null> {
    if (CROSS_PROJECT.includes(user.role)) return null
    const ids = new Set<string>()
    const emp = await this.employees.findOne({ where: { userId: user.id } })
    if (emp?.projectId) ids.add(emp.projectId)
    const managed = await this.repo.find({ where: { managerId: user.id } })
    for (const p of managed) ids.add(p.id)
    return [...ids]
  }

  async findAll(user?: User) {
    const q = this.baseQuery().orderBy('project.createdAt', 'DESC')
    if (user) {
      const allowed = await this.allowedProjectIds(user)
      if (allowed && allowed.length === 0) return []
      if (allowed) q.andWhere('project.id IN (:...ids)', { ids: allowed })
    }
    return q.getMany()
  }

  /**
   * One project, optionally scoped to a caller.
   *
   * `asUser` is optional because the PDF generator and the update path call
   * this internally, where there is no request to scope against. Every call
   * that IS on behalf of a request must pass the user: a project row names
   * itself `id`, not `projectId`, so the response-scoping interceptor cannot
   * recognise it and this is the only place the check can happen.
   */
  async findById(id: string, asUser?: User) {
    const project = await this.baseQuery()
      .where('project.id = :id', { id })
      .getOne();
    if (!project) throw new NotFoundException('Project not found');
    if (asUser) {
      const allowed = await this.allowedProjectIds(asUser);
      if (allowed && !allowed.includes(project.id)) {
        throw new ForbiddenException('Not assigned to this project');
      }
    }
    return project;
  }

  async findPublicByCode(code: string) {
    const project = await this.repo.findOne({ where: { code } });
    if (!project) throw new NotFoundException('Project not found');
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      description: project.description,
      client: project.client,
      location: project.location,
      contractValue: project.contractValue,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      progressPct: project.progressPct,
    };
  }

  private baseQuery() {
    return this.repo.createQueryBuilder('project')
      .leftJoin('project.manager', 'manager')
      .addSelect([
        'manager.id',
        'manager.name',
        'manager.email',
        'manager.role',
        'manager.department',
        'manager.designation',
        'manager.avatarUrl',
        'manager.isActive',
      ]);
  }

  create(data: Partial<Project>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Project>, asUser?: User) {
    await this.findById(id, asUser);
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
