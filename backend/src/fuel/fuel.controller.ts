import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { User, UserRole } from '../users/user.entity'
import { FuelService } from './fuel.service'
import { FuelEntryDto, FuelMachineDto, FuelPaymentDto, FuelRegisterQueryDto, FuelSupplierDto, FuelVoidDto } from './fuel.dto'

/** The same people who keep the Fleet logbook record fuel; managers correct and void. */
const RECORD = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER, UserRole.SUPERVISOR]
const MANAGE = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER]
const READ = [...RECORD, UserRole.ACCOUNTS, UserRole.ACCOUNTANT]
/** Money paid to the pump, and its price: managers and accounts, not the site. */
const PAY = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTS, UserRole.ACCOUNTANT]

@Controller('fuel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ)
export class FuelController {
  constructor(private readonly service: FuelService) {}

  @Get() register(@Query() q: FuelRegisterQueryDto, @Request() req: { user: User }) { return this.service.register(q, req.user) }

  @Post('entries') @Roles(...RECORD)
  create(@Body() dto: FuelEntryDto, @Request() req: { user: User }) { return this.service.createEntry(dto, req.user) }

  @Put('entries/:id') @Roles(...MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FuelEntryDto, @Request() req: { user: User }) { return this.service.updateEntry(id, dto, req.user) }

  @Post('entries/:id/void') @Roles(...MANAGE)
  void(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FuelVoidDto, @Request() req: { user: User }) { return this.service.voidEntry(id, dto, req.user) }

  @Post('payments') @Roles(...PAY)
  createPayment(@Body() dto: FuelPaymentDto, @Request() req: { user: User }) { return this.service.createPayment(dto, req.user) }

  @Post('payments/:id/void') @Roles(...PAY)
  voidPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FuelVoidDto, @Request() req: { user: User }) { return this.service.voidPayment(id, dto, req.user) }

  @Post('suppliers') @Roles(...PAY)
  createSupplier(@Body() dto: FuelSupplierDto, @Request() req: { user: User }) { return this.service.saveSupplier(null, dto, req.user) }

  @Put('suppliers/:id') @Roles(...PAY)
  updateSupplier(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FuelSupplierDto, @Request() req: { user: User }) { return this.service.saveSupplier(id, dto, req.user) }

  @Post('machines') @Roles(...MANAGE)
  createMachine(@Body() dto: FuelMachineDto, @Request() req: { user: User }) { return this.service.createMachine(dto, req.user) }

  @Put('machines/:id') @Roles(...MANAGE)
  updateMachine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FuelMachineDto, @Request() req: { user: User }) { return this.service.updateMachine(id, dto, req.user) }
}
