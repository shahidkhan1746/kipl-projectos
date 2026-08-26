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
    return this.repo.delete(id)
  }
}