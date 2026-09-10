import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectUpdate } from './project-update.entity'
import { TeamMember } from './team-member.entity'
import { UpdatesService } from './updates.service'
import { UpdatesController } from './updates.controller'
import { PublicUpdatesController } from './public.controller'
import { StorageModule } from '../storage/storage.module'
import { ProjectsModule } from '../projects/projects.module'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUpdate, TeamMember]), StorageModule, ProjectsModule],
  controllers: [UpdatesController, PublicUpdatesController],
  providers: [UpdatesService],
})
export class UpdatesModule {}
