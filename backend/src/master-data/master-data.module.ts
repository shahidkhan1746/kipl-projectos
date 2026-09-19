import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDropdownOption } from './master-data.entity';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MasterDropdownOption])],
  providers: [MasterDataService],
  controllers: [MasterDataController],
  exports: [MasterDataService],
})
export class MasterDataModule {}
