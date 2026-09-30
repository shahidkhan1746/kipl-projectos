import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../hr/employee.entity'
import { ProjectsModule } from '../projects/projects.module'
import { OfficeAsset, OfficeAssetEvent } from './asset.entity'
import { AssetsController } from './assets.controller'
import { AssetsService } from './assets.service'
@Module({ imports: [ProjectsModule, TypeOrmModule.forFeature([OfficeAsset, OfficeAssetEvent, Employee])], controllers: [AssetsController], providers: [AssetsService] })
export class AssetsModule {}
