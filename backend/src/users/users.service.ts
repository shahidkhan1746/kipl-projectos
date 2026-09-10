import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Employee } from '../hr/employee.entity';
import { SettingsService } from '../settings/settings.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(Employee)
    private readonly empRepo: Repository<Employee>,
    private readonly settingsService: SettingsService,
  ) {}

  findAll(includeInactive = false) {
    return this.repo.find({ where: includeInactive ? undefined : { isActive: true }, order: { name: 'ASC' } });
  }

  async findById(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();

    // 1. Direct exact match
    let user = await this.repo
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.email)) = :email', { email: normalized })
      .getOne();

    if (user) return user;

    // 2. Company domain alias fallback (@kipl.in, @kiplstpsrinagar.com, @kipl.com, or username only)
    const companyDomains = ['kipl.in', 'kiplstpsrinagar.com', 'kipl.com'];
    const username = normalized.includes('@') ? normalized.split('@')[0] : normalized;
    const isCompanyOrUsername = !normalized.includes('@') || companyDomains.some(d => normalized.endsWith('@' + d));

    if (isCompanyOrUsername && username) {
      const aliasEmails = companyDomains.map(d => `${username}@${d}`);
      user = await this.repo
        .createQueryBuilder('u')
        .where('LOWER(TRIM(u.email)) IN (:...aliasEmails)', { aliasEmails })
        .getOne();
    }

    return user;
  }

  async create(data: {
    name: string; email: string; password: string;
    role?: UserRole | string; department?: string; designation?: string; phone?: string;
  }) {
    const normalizedEmail = (data.email || '').trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = this.repo.create({
      ...data,
      email: normalizedEmail,
      role: (data.role as UserRole) ?? UserRole.ENGINEER,
      passwordHash,
      isActive: true,
    });
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<User>) {
    await this.findById(id); // throws if not found
    if (data.email) data.email = data.email.trim().toLowerCase();
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async updateLastLogin(id: string) {
    await this.repo.update(id, { lastLoginAt: new Date() });
  }

  async updateUser(id: string, data: import('./dto/update-user.dto').UpdateUserDto) {
    const update = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (update.email) update.email = String(update.email).trim().toLowerCase();
    await this.repo.update(id, update);
    return this.repo.findOne({ where: { id } });
  }

  async resetPassword(id: string, password: string) {
    const hash = await bcrypt.hash(password, 10)
    await this.repo.update(id, { passwordHash: hash })
    return { success: true, message: 'Password reset successfully' }
  }

  async createUser(data: { name: string; email: string; role: string; password: string }) {
    const normalizedEmail = (data.email || '').trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    const hash = await bcrypt.hash(data.password, 10);
    if (existing) {
      existing.name = data.name || existing.name;
      if (data.role) existing.role = data.role as any;
      existing.passwordHash = hash;
      existing.isActive = true;
      return this.repo.save(existing);
    }
    const user = this.repo.create({
      name: data.name,
      email: normalizedEmail,
      role: data.role as any,
      passwordHash: hash,
      isActive: true,
    });
    return this.repo.save(user);
  }


  async deleteUser(id: string) {
    return this.repo.delete(id);
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    const employee = await this.empRepo.findOne({
      where: [
        { email: user.email },
        { phone: user.phone },
      ],
    });

    const requestsJson = await this.settingsService.get('name_change_requests');
    let requests: any[] = [];
    try {
      if (requestsJson) requests = JSON.parse(requestsJson);
    } catch { requests = []; }

    const activeRequest = requests
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        designation: user.designation,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      employee: employee ? {
        id: employee.id,
        empCode: employee.empCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.department,
        dateOfJoining: employee.dateOfJoining,
        status: employee.status,
      } : null,
      activeRequest,
    };
  }

  async submitNameChangeRequest(userId: string, requestedName: string, reason?: string) {
    const trimmed = (requestedName || '').trim();
    if (!trimmed || trimmed.length < 2) {
      throw new BadRequestException('Requested name must be at least 2 characters');
    }
    const user = await this.findById(userId);
    if (user.name.trim().toLowerCase() === trimmed.toLowerCase()) {
      throw new BadRequestException('Requested name is the same as your current name');
    }

    const requestsJson = await this.settingsService.get('name_change_requests');
    let requests: any[] = [];
    try {
      if (requestsJson) requests = JSON.parse(requestsJson);
    } catch { requests = []; }

    const isAutoApprove = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

    const requestItem: any = {
      id: randomUUID(),
      userId: user.id,
      currentName: user.name,
      requestedName: trimmed,
      userEmail: user.email,
      userRole: user.role,
      reason: reason?.trim() || '',
      status: isAutoApprove ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
      reviewedBy: isAutoApprove ? user.name : null,
      reviewedAt: isAutoApprove ? new Date().toISOString() : null,
    };

    if (isAutoApprove) {
      await this.repo.update(user.id, { name: trimmed });
      const emp = await this.empRepo.findOne({ where: [{ email: user.email }] });
      if (emp) {
        const parts = trimmed.split(/\s+/);
        await this.empRepo.update(emp.id, {
          firstName: parts[0] || trimmed,
          lastName: parts.slice(1).join(' ') || '',
        });
      }
    }

    // Dismiss older pending requests by this user
    requests = requests.map(r => (r.userId === user.id && r.status === 'pending' ? { ...r, status: 'superseded' } : r));
    requests.unshift(requestItem);
    if (requests.length > 100) requests = requests.slice(0, 100);

    await this.settingsService.set(
      'name_change_requests',
      JSON.stringify(requests),
      'Pending Name Change Requests',
      'users',
    );

    return {
      success: true,
      autoApproved: isAutoApprove,
      request: requestItem,
    };
  }

  async getNameChangeRequests(actor: User) {
    const isManager = actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN || actor.role === UserRole.PROJECT_MANAGER;
    const requestsJson = await this.settingsService.get('name_change_requests');
    let requests: any[] = [];
    try {
      if (requestsJson) requests = JSON.parse(requestsJson);
    } catch { requests = []; }

    if (isManager) {
      return requests;
    }
    return requests.filter(r => r.userId === actor.id);
  }

  async reviewNameChangeRequest(requestId: string, reviewer: User, action: 'approve' | 'reject', note?: string) {
    const isManager = reviewer.role === UserRole.SUPER_ADMIN || reviewer.role === UserRole.ADMIN || reviewer.role === UserRole.PROJECT_MANAGER;
    if (!isManager) {
      throw new ForbiddenException('Only administrators and project managers can review name change requests');
    }

    const requestsJson = await this.settingsService.get('name_change_requests');
    let requests: any[] = [];
    try {
      if (requestsJson) requests = JSON.parse(requestsJson);
    } catch { requests = []; }

    const targetIndex = requests.findIndex(r => r.id === requestId);
    if (targetIndex === -1) {
      throw new NotFoundException('Name change request not found');
    }

    const reqItem = requests[targetIndex];
    if (reqItem.status !== 'pending') {
      throw new BadRequestException(`This request has already been ${reqItem.status}`);
    }

    reqItem.status = action === 'approve' ? 'approved' : 'rejected';
    reqItem.reviewedBy = reviewer.name;
    reqItem.reviewedAt = new Date().toISOString();
    reqItem.reviewNote = note?.trim() || '';

    if (action === 'approve') {
      await this.repo.update(reqItem.userId, { name: reqItem.requestedName });
      const targetUser = await this.repo.findOne({ where: { id: reqItem.userId } });
      if (targetUser) {
        const emp = await this.empRepo.findOne({ where: [{ email: targetUser.email }] });
        if (emp) {
          const parts = reqItem.requestedName.trim().split(/\s+/);
          await this.empRepo.update(emp.id, {
            firstName: parts[0] || reqItem.requestedName,
            lastName: parts.slice(1).join(' ') || '',
          });
        }
      }
    }

    requests[targetIndex] = reqItem;
    await this.settingsService.set(
      'name_change_requests',
      JSON.stringify(requests),
      'Pending Name Change Requests',
      'users',
    );

    return {
      success: true,
      request: reqItem,
    };
  }
}