import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { MasterDropdownOption } from './master-data.entity';
import { CreateMasterOptionDto } from './dto/create-master-option.dto';
import { UpdateMasterOptionDto } from './dto/update-master-option.dto';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(MasterDropdownOption)
    private readonly repo: Repository<MasterDropdownOption>,
  ) {}

  async findAll(filter?: {
    dropdownType?: string;
    category?: string;
    search?: string;
    activeOnly?: boolean;
  }): Promise<MasterDropdownOption[]> {
    const qb = this.repo.createQueryBuilder('o');

    if (filter?.dropdownType) {
      qb.andWhere('o.dropdownType = :type', { type: filter.dropdownType });
    }

    if (filter?.category) {
      qb.andWhere('o.category = :category', { category: filter.category });
    }

    if (filter?.activeOnly !== false) {
      qb.andWhere('o.isActive = :active', { active: true });
    }

    if (filter?.search && filter.search.trim()) {
      const s = `%${filter.search.trim()}%`;
      qb.andWhere(
        '(o.label ILIKE :s OR o.value ILIKE :s OR o.spec ILIKE :s OR CAST(o.metadata AS text) ILIKE :s)',
        { s },
      );
    }

    qb.orderBy('o.displayOrder', 'ASC').addOrderBy('o.label', 'ASC');
    return qb.getMany();
  }

  async getAllGrouped(activeOnly = true): Promise<Record<string, MasterDropdownOption[]>> {
    const all = await this.findAll({ activeOnly });
    const grouped: Record<string, MasterDropdownOption[]> = {
      material: [],
      unit: [],
      equipment_type: [],
      site_zone: [],
      stakeholder: [],
    };

    for (const opt of all) {
      if (!grouped[opt.dropdownType]) {
        grouped[opt.dropdownType] = [];
      }
      grouped[opt.dropdownType].push(opt);
    }

    return grouped;
  }

  async findOne(id: string): Promise<MasterDropdownOption> {
    const opt = await this.repo.findOne({ where: { id } });
    if (!opt) throw new NotFoundException(`Dropdown option ${id} not found`);
    return opt;
  }

  async create(dto: CreateMasterOptionDto): Promise<MasterDropdownOption> {
    const existing = await this.repo.findOne({
      where: { dropdownType: dto.dropdownType, value: dto.value },
    });
    if (existing) {
      throw new ConflictException(
        `An option with value '${dto.value}' already exists under type '${dto.dropdownType}'`,
      );
    }

    const created = this.repo.create({
      ...dto,
      label: dto.label || dto.value,
      metadata: dto.metadata || {},
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive !== false,
    });

    return this.repo.save(created);
  }

  async update(id: string, dto: UpdateMasterOptionDto): Promise<MasterDropdownOption> {
    const opt = await this.findOne(id);

    if (dto.value && dto.value !== opt.value) {
      const type = dto.dropdownType || opt.dropdownType;
      const duplicate = await this.repo.findOne({
        where: { dropdownType: type, value: dto.value },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `An option with value '${dto.value}' already exists under type '${type}'`,
        );
      }
    }

    Object.assign(opt, dto);
    return this.repo.save(opt);
  }

  async toggleActive(id: string): Promise<MasterDropdownOption> {
    const opt = await this.findOne(id);
    opt.isActive = !opt.isActive;
    return this.repo.save(opt);
  }

  async remove(id: string, hard = false): Promise<{ success: boolean; message: string }> {
    const opt = await this.findOne(id);
    if (hard) {
      await this.repo.remove(opt);
      return { success: true, message: `Option permanently removed` };
    }
    opt.isActive = false;
    await this.repo.save(opt);
    return { success: true, message: `Option deactivated` };
  }
}
