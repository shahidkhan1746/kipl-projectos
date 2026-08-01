import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { SiteOrderService } from './site-order.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('site-orders') @UseGuards(JwtAuthGuard)
export class SiteOrderController {
  constructor(private readonly svc: SiteOrderService) {}

  @Get()
  list(@Query('projectId') pid: string, @Query('status') status: string) { return this.svc.list(pid, status) }
  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.svc.remove(id) }
}
