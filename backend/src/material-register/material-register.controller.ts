import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { MaterialRegisterService } from './material-register.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('material-register') @UseGuards(JwtAuthGuard)
export class MaterialRegisterController {
  constructor(private readonly svc: MaterialRegisterService) {}

  @Get()
  list(@Query('projectId') pid: string) { return this.svc.list(pid) }
  @Get('summary')
  summary(@Query('projectId') pid: string) { return this.svc.summary(pid) }
  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.svc.remove(id) }
}
