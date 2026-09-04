import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  findAll() {
    return this.baseQuery()
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string) {
    const project = await this.baseQuery()
      .where('project.id = :id', { id })
      .getOne();
    if (!project) throw new NotFoundException('Project not found');
    return project;
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

  async update(id: string, data: Partial<Project>) {
    await this.findById(id);
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
