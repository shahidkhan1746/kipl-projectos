import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Setting } from './setting.entity'

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(Setting) private repo: Repository<Setting>) {}

  async get(key: string): Promise<string | null> {
    const s = await this.repo.findOne({ where: { key } })
    return s?.value ?? null
  }

  async set(key: string, value: string, label?: string, category?: string): Promise<Setting> {
    const existing = await this.repo.findOne({ where: { key } })
    if (existing) {
      await this.repo.update(existing.id, { value, label, category })
      return this.repo.findOne({ where: { key } }) as Promise<Setting>
    }
    return this.repo.save(this.repo.create({ key, value, label: label ?? key, category: category ?? 'general' }))
  }

  async getAll(category?: string): Promise<Setting[]> {
    if (category) return this.repo.find({ where: { category } })
    return this.repo.find()
  }

  async setBulk(settings: Array<{ key: string; value: string; label?: string; category?: string }>): Promise<void> {
    for (const s of settings) await this.set(s.key, s.value, s.label, s.category)
  }
}
