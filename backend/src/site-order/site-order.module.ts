import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SiteOrder } from './site-order.entity'
import { SiteOrderService } from './site-order.service'
import { SiteOrderController } from './site-order.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SiteOrder])],
  providers: [SiteOrderService],
  controllers: [SiteOrderController],
})
export class SiteOrderModule {}
