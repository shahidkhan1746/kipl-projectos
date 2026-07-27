import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectUpdate } from './project-update.entity'
import { TeamMember } from './team-member.entity'
import { UpdatesService } from './updates.service'
import { UpdatesController } from './updates.controller'
import { PublicUpdatesController } from './public.controller'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectUpdate, TeamMember]), StorageModule],
  controllers: [UpdatesController, PublicUpdatesController],
  providers: [UpdatesService],
})
export class UpdatesModule {}
