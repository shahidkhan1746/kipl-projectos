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

  async updateUser(id: string, data: import('./dto/update-user.dto').UpdateUserDto) {
    const update = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await this.repo.update(id, update);
    return this.repo.findOne({ where: { id } });
  }

  async resetPassword(id: string, password: string) {
    const hash = await bcrypt.hash(password, 10)
    await this.repo.update(id, { passwordHash: hash })
    return { success: true, message: 'Password reset successfully' }
  }

  async createUser(data: { name: string; email: string; role: string; password: string }) {
    const hash = await bcrypt.hash(data.password, 10)
    const user = this.repo.create({
      name: data.name,
      email: data.email,
      role: data.role as any,
      passwordHash: hash,
      isActive: true,
    })
    return this.repo.save(user)
  }


  async deleteUser(id: string) {
    return this.repo.delete(id)
  }
}