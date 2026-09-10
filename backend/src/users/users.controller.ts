import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUserDto): Promise<User> {
    return this.usersService.create(body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  async getMe(@Request() req: any): Promise<Omit<User, 'passwordHash'>> {
    const { passwordHash: _omit, ...safe } = req.user ?? {};
    return safe;
  }

  @Get('me/profile')
  async getMyProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Post('name-change-request')
  @HttpCode(HttpStatus.OK)
  async submitNameChangeRequest(
    @Request() req: any,
    @Body() body: { requestedName: string; reason?: string },
  ) {
    return this.usersService.submitNameChangeRequest(req.user.id, body.requestedName, body.reason);
  }

  @Get('name-change-requests')
  async getNameChangeRequests(@Request() req: any) {
    return this.usersService.getNameChangeRequests(req.user);
  }

  @Post('name-change-requests/:id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async reviewNameChangeRequest(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { action: 'approve' | 'reject'; note?: string },
  ) {
    return this.usersService.reviewNameChangeRequest(id, req.user, body.action, body.note);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto): Promise<User | null> {
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    return this.usersService.resetPassword(id, body.password);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string): Promise<any> {
    return this.usersService.deleteUser(id);
  }
}
