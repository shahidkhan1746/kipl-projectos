import { Repository } from 'typeorm';
import { Project } from './project.entity';
export declare class ProjectsService {
    private readonly repo;
    constructor(repo: Repository<Project>);
    findAll(): Promise<Project[]>;
    findById(id: string): Promise<Project>;
    create(data: Partial<Project>): Promise<Project>;
    update(id: string, data: Partial<Project>): Promise<Project>;
}
