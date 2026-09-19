import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { CreateMasterOptionDto } from './dto/create-master-option.dto';
import { UpdateMasterOptionDto } from './dto/update-master-option.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('master-data')
@UseGuards(JwtAuthGuard)
export class MasterDataController {
  constructor(private readonly svc: MasterDataService) {}

  @Get()
  async getAllGrouped(@Query('activeOnly') activeOnly?: string) {
    const active = activeOnly !== 'false';
    return this.svc.getAllGrouped(active);
  }

  @Get('list')
  async findAll(
    @Query('type') dropdownType?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const active = activeOnly !== 'false';
    return this.svc.findAll({ dropdownType, category, search, activeOnly: active });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER)
  async create(@Body() dto: CreateMasterOptionDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateMasterOptionDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async toggle(@Param('id') id: string) {
    return this.svc.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async remove(@Param('id') id: string, @Query('hard') hard?: string) {
    return this.svc.remove(id, hard === 'true');
  }
}
