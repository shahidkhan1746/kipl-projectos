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
    return this.repo.find({ relations: ['manager'], order: { createdAt: 'DESC' } });
  }

  async findById(id: string) {
    const project = await this.repo.findOne({ where: { id }, relations: ['manager'] });
    if (!project) throw new NotFoundException('Project not found');
    return project;
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
