import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    findAll(): Promise<import("./project.entity").Project[]>;
    findOne(id: string): Promise<import("./project.entity").Project>;
    create(body: any): Promise<import("./project.entity").Project>;
    update(id: string, body: any): Promise<import("./project.entity").Project>;
}
