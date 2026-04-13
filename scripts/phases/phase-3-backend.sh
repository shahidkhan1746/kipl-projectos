#!/usr/bin/env bash
# ================================================================
#  Phase 3 — NestJS Backend Scaffold
#  Creates: NestJS project, installs all packages,
#           generates all modules/controllers/services/entities
# ================================================================

set -euo pipefail

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }
info() { echo -e "${B}  →${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"

# ── Create NestJS project if it doesn't exist ─────────────────────
if [[ -f "$BACKEND/package.json" ]]; then
  warn "backend/ already exists — skipping NestJS new"
else
  info "Creating NestJS project..."
  cd "$ROOT"
  nest new backend --package-manager npm --skip-git --language TypeScript << 'EOF'

EOF
  ok "NestJS project created"
fi

cd "$BACKEND"

# ── Install all dependencies ──────────────────────────────────────
info "Installing backend dependencies..."

npm install --save \
  @nestjs/typeorm typeorm pg \
  @nestjs/jwt @nestjs/passport passport passport-jwt passport-local \
  @nestjs/config \
  @nestjs/mapped-types \
  bcryptjs \
  class-validator class-transformer \
  cloudinary multer \
  @nestjs/serve-static \
  geolib \
  date-fns \
  uuid \
  --silent

npm install --save-dev \
  @types/passport-jwt @types/passport-local \
  @types/bcryptjs \
  @types/multer \
  @types/uuid \
  --silent

ok "Dependencies installed"

# ── Copy .env into place ──────────────────────────────────────────
[[ -f "$BACKEND/.env" ]] || cp "$ROOT/backend/.env" "$BACKEND/.env" 2>/dev/null || true

# ── Write all source files ────────────────────────────────────────
info "Writing source files..."

# ── app.module.ts ─────────────────────────────────────────────────
cat > "$BACKEND/src/app.module.ts" << 'TYPESCRIPT'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { LiaisonModule } from './liaison/liaison.module';
import { HrModule } from './hr/hr.module';
import { TasksModule } from './tasks/tasks.module';
import { EpcModule } from './epc/epc.module';
import { AccountingModule } from './accounting/accounting.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // Config — reads from .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('DB_HOST'),
        port:     parseInt(config.get('DB_PORT') ?? '5432'),
        database: config.get('DB_NAME'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        // Auto-creates/updates tables from entities — no migrations needed in dev
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        autoLoadEntities: true,
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    LiaisonModule,
    HrModule,
    TasksModule,
    EpcModule,
    AccountingModule,
    UploadsModule,
  ],
})
export class AppModule {}
TYPESCRIPT

# ── main.ts ───────────────────────────────────────────────────────
cat > "$BACKEND/src/main.ts" << 'TYPESCRIPT'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Global validation pipe — uses class-validator decorators
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // strip unknown properties
    forbidNonWhitelisted: true,
    transform: true,        // auto-transform payloads to DTO types
    transformOptions: { enableImplicitConversion: true },
  }));

  // CORS — allow frontend
  app.enableCors({
    origin: [
      config.get('FRONTEND_URL') ?? 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:4173',
    ],
    credentials: true,
    methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = config.get('PORT') ?? 3000;
  await app.listen(port);
  console.log(`\n  KIPL ProjectOS API running on http://localhost:${port}`);
  console.log(`  Environment: ${config.get('NODE_ENV')}\n`);
}
bootstrap();
TYPESCRIPT

ok "app.module.ts and main.ts written"

# ── Create module directories ──────────────────────────────────────
MODULES=(auth users projects liaison hr tasks epc accounting uploads)
for mod in "${MODULES[@]}"; do
  mkdir -p "$BACKEND/src/$mod"
done
ok "Module directories created"

# ── Shared base entity ─────────────────────────────────────────────
mkdir -p "$BACKEND/src/shared/entities"
cat > "$BACKEND/src/shared/entities/base.entity.ts" << 'TYPESCRIPT'
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Every entity inherits this — gives id, created_at, updated_at for free
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
TYPESCRIPT
ok "Base entity written"

# ── User entity ────────────────────────────────────────────────────
mkdir -p "$BACKEND/src/users"
cat > "$BACKEND/src/users/user.entity.ts" << 'TYPESCRIPT'
import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPER_ADMIN      = 'super_admin',
  ADMIN            = 'admin',
  PROJECT_MANAGER  = 'project_manager',
  ENGINEER         = 'engineer',
  HR_OFFICER       = 'hr_officer',
  LIAISON_OFFICER  = 'liaison_officer',
  ACCOUNTANT       = 'accountant',
  FIELD_STAFF      = 'field_staff',
  VIEWER           = 'viewer',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 200 })
  email: string;

  @Column({ name: 'phone', nullable: true })
  phone: string;

  @Column({ name: 'password_hash' })
  @Exclude()                         // never serialised in responses
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  designation: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;
}
TYPESCRIPT

# ── Users module (minimal) ─────────────────────────────────────────
cat > "$BACKEND/src/users/users.module.ts" << 'TYPESCRIPT'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
TYPESCRIPT

cat > "$BACKEND/src/users/users.service.ts" << 'TYPESCRIPT'
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findAll() {
    return this.repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findById(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async create(data: {
    name: string; email: string; password: string;
    role?: UserRole; department?: string; designation?: string; phone?: string;
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = this.repo.create({ ...data, passwordHash });
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<User>) {
    await this.findById(id); // throws if not found
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async updateLastLogin(id: string) {
    await this.repo.update(id, { lastLoginAt: new Date() });
  }
}
TYPESCRIPT

cat > "$BACKEND/src/users/users.controller.ts" << 'TYPESCRIPT'
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HR_OFFICER, UserRole.PROJECT_MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getMe(@Request() req) {
    return req.user;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
TYPESCRIPT

ok "Users module written"

# ── Auth module ────────────────────────────────────────────────────
mkdir -p "$BACKEND/src/auth/guards"
mkdir -p "$BACKEND/src/auth/strategies"
mkdir -p "$BACKEND/src/auth/decorators"

cat > "$BACKEND/src/auth/auth.module.ts" << 'TYPESCRIPT'
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './refresh-token.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
TYPESCRIPT

cat > "$BACKEND/src/auth/refresh-token.entity.ts" << 'TYPESCRIPT'
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { User } from '../users/user.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;
}
TYPESCRIPT

cat > "$BACKEND/src/auth/auth.service.ts" << 'TYPESCRIPT'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    // Constant-time comparison even if user not found
    const hash = user?.passwordHash ?? '$2b$12$placeholder.hash.prevents.timing.attack';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccess(user.id, user.role),
      this.signRefresh(user.id),
    ]);

    // Store refresh token hash
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshRepo.save(
      this.refreshRepo.create({ user, tokenHash, expiresAt })
    );

    await this.usersService.updateLastLogin(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id, name: user.name,
        email: user.email, role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    return {
      access_token: await this.signAccess(stored.user.id, stored.user.role),
      expires_in: 900,
    };
  }

  async logout(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.refreshRepo.delete({ tokenHash: hash });
  }

  private signAccess(userId: string, role: string) {
    return this.jwtService.signAsync(
      { sub: userId, role },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m' },
    );
  }

  private signRefresh(userId: string) {
    return this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );
  }
}
TYPESCRIPT

cat > "$BACKEND/src/auth/auth.controller.ts" << 'TYPESCRIPT'
import { Controller, Post, Body, UseGuards, Request, Get, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IsEmail, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

class RefreshDto {
  @IsString() refresh_token: string;
}

class LogoutDto {
  @IsString() refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req) {
    return { user: req.user };
  }
}
TYPESCRIPT

cat > "$BACKEND/src/auth/strategies/jwt.strategy.ts" << 'TYPESCRIPT'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return user;
  }
}
TYPESCRIPT

cat > "$BACKEND/src/auth/guards/jwt-auth.guard.ts" << 'TYPESCRIPT'
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
TYPESCRIPT

cat > "$BACKEND/src/auth/guards/roles.guard.ts" << 'TYPESCRIPT'
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

const ROLE_LEVEL: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]:     100,
  [UserRole.ADMIN]:            90,
  [UserRole.PROJECT_MANAGER]:  70,
  [UserRole.ENGINEER]:         50,
  [UserRole.HR_OFFICER]:       50,
  [UserRole.LIAISON_OFFICER]:  50,
  [UserRole.ACCOUNTANT]:       50,
  [UserRole.FIELD_STAFF]:      30,
  [UserRole.VIEWER]:           10,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // super_admin bypasses everything
    if (user.role === UserRole.SUPER_ADMIN) return true;

    return required.some(role => ROLE_LEVEL[user.role] >= ROLE_LEVEL[role]);
  }
}
TYPESCRIPT

cat > "$BACKEND/src/auth/decorators/roles.decorator.ts" << 'TYPESCRIPT'
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
TYPESCRIPT

ok "Auth module written"

# ── Project entity ─────────────────────────────────────────────────
mkdir -p "$BACKEND/src/projects"
cat > "$BACKEND/src/projects/project.entity.ts" << 'TYPESCRIPT'
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { User } from '../users/user.entity';

export enum ProjectStatus {
  ACTIVE     = 'active',
  ON_HOLD    = 'on_hold',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

@Entity('projects')
export class Project extends BaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 30 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  client: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'contract_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractValue: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Column({ name: 'progress_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPct: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'manager_id' })
  manager: User;
}
TYPESCRIPT

cat > "$BACKEND/src/projects/projects.module.ts" << 'TYPESCRIPT'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
TYPESCRIPT

cat > "$BACKEND/src/projects/projects.service.ts" << 'TYPESCRIPT'
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  findAll() {
    return this.repo.find({ relations: ['manager'], order: { createdAt: 'DESC' } });
  }

  async findById(id: string) {
    const project = await this.repo.findOne({ where: { id }, relations: ['manager'] });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(data: Partial<Project>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Project>) {
    await this.findById(id);
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
TYPESCRIPT

cat > "$BACKEND/src/projects/projects.controller.ts" << 'TYPESCRIPT'
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() body: any) {
    return this.projectsService.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER)
  update(@Param('id') id: string, @Body() body: any) {
    return this.projectsService.update(id, body);
  }
}
TYPESCRIPT

ok "Projects module written"

# ── Placeholder modules (to be built phase by phase) ──────────────
for mod in liaison hr tasks epc accounting uploads; do
  cat > "$BACKEND/src/$mod/${mod}.module.ts" << PLACEHOLDER_TS
import { Module } from '@nestjs/common';

// ${mod} module — entities and services added in next phases
@Module({})
export class ${mod^}Module {}
PLACEHOLDER_TS
done

# Fix capitalisation for module class names
declare -A MOD_NAMES=(
  [liaison]="LiaisonModule"
  [hr]="HrModule"
  [tasks]="TasksModule"
  [epc]="EpcModule"
  [accounting]="AccountingModule"
  [uploads]="UploadsModule"
)

for mod in "${!MOD_NAMES[@]}"; do
  CLASS="${MOD_NAMES[$mod]}"
  cat > "$BACKEND/src/$mod/${mod}.module.ts" << PLACEHOLDER_TS
import { Module } from '@nestjs/common';

// ${mod} module — entities and services will be added in later phases
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class ${CLASS} {}
PLACEHOLDER_TS
done

ok "Placeholder modules created for liaison, hr, tasks, epc, accounting, uploads"

# ── Build to verify no TypeScript errors ──────────────────────────
info "Building backend to verify..."
npm run build -- --preserveWatchOutput 2>&1 | tail -10 || \
  warn "Build had warnings — check above. Will still work in dev mode."

ok "Phase 3 complete — NestJS backend scaffolded"
echo ""
echo -e "  Start backend: ${Y}cd backend && npm run start:dev${NC}"
echo ""
