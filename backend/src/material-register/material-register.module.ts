import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MaterialRegister } from './material-register.entity'
import { MaterialRegisterService } from './material-register.service'
import { MaterialRegisterController } from './material-register.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MaterialRegister])],
  providers: [MaterialRegisterService],
  controllers: [MaterialRegisterController],
})
export class MaterialRegisterModule {}
