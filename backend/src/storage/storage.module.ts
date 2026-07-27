import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StorageConfig } from './storage-config.entity'
import { StorageService } from './storage.service'
import { StorageController } from './storage.controller'

@Module({
  imports: [TypeOrmModule.forFeature([StorageConfig])],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
