import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { Employee } from '../hr/employee.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectScopeInterceptor } from './project-scope.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Employee])],
  providers: [
    ProjectsService,
    { provide: APP_INTERCEPTOR, useClass: ProjectScopeInterceptor },
  ],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
