import { Injectable, NotFoundException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectUpdate } from './project-update.entity'
import { TeamMember } from './team-member.entity'

// Roles that may edit/delete ANY update (override the author-only rule)
const OVERRIDE_ROLES = ['super_admin', 'admin', 'project_manager']

function parseJsonArray(val: any): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

@Injectable()
export class UpdatesService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesService.name)

  constructor(
    @InjectRepository(ProjectUpdate) private updates: Repository<ProjectUpdate>,
    @InjectRepository(TeamMember) private team: Repository<TeamMember>,
  ) {}

  async onModuleInit() {
    try {
      await this.updates.query(`ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;`)
      this.logger.log('Database self-check: project_updates.videos column verified.')
    } catch (err: any) {
      this.logger.warn(`Could not run schema self-check for project_updates.videos: ${err?.message}`)
    }
  }

  // ---- Project updates (admin) ----
  async listAll() {
    try {
      const rows = await this.updates.find({ order: { date: 'DESC', createdAt: 'DESC' } })
      return rows.map(r => ({
        ...r,
        photos: parseJsonArray(r.photos),
        videos: parseJsonArray(r.videos),
      }))
    } catch (err: any) {
      this.logger.warn(`listAll failed via TypeORM: ${err?.message}. Using safe fallback query.`)
      try {
        const rows = await this.updates.query(
          `SELECT id, project_id as "projectId", date, title, description, category, photos, 
           is_published as "isPublished", created_by as "createdBy", created_by_id as "createdById", 
           created_at as "createdAt", updated_at as "updatedAt" 
           FROM project_updates ORDER BY date DESC, created_at DESC`
        )
        return (rows || []).map((r: any) => ({
          ...r,
          photos: parseJsonArray(r.photos),
          videos: parseJsonArray(r.videos),
        }))
      } catch (err2: any) {
        this.logger.error(`Fallback listAll query failed: ${err2?.message}`)
        return []
      }
    }
  }

  async getOne(id: string) {
    let u: any
    try {
      u = await this.updates.findOne({ where: { id } })
    } catch (err: any) {
      const rows = await this.updates.query(`SELECT * FROM project_updates WHERE id = $1 LIMIT 1`, [id])
      u = rows?.[0]
    }
    if (!u) throw new NotFoundException('Update not found')
    u.photos = parseJsonArray(u.photos)
    u.videos = parseJsonArray(u.videos)
    return u
  }

  // Only the author may edit/delete their own update; override roles may edit any
  private assertCanEdit(u: ProjectUpdate, user: any) {
    const isAuthor = !!u.createdById && !!user?.id && u.createdById === user.id
    if (!isAuthor && !OVERRIDE_ROLES.includes(user?.role))
      throw new ForbiddenException('You can only edit updates you created.')
  }

  create(body: any, user?: any) {
    const u = this.updates.create({
      projectId: body.projectId ?? null,
      date: body.date,
      title: body.title,
      description: body.description ?? '',
      category: body.category ?? 'general',
      photos: Array.isArray(body.photos) ? body.photos : parseJsonArray(body.photos),
      videos: Array.isArray(body.videos) ? body.videos : parseJsonArray(body.videos),
      isPublished: body.isPublished ?? true,
      createdBy: user?.name ?? null,
      createdById: user?.id ?? null,
    })
    return this.updates.save(u)
  }

  async update(id: string, body: any, user?: any) {
    const u = await this.getOne(id)
    this.assertCanEdit(u, user)
    Object.assign(u, {
      projectId: body.projectId ?? u.projectId,
      date: body.date ?? u.date,
      title: body.title ?? u.title,
      description: body.description ?? u.description,
      category: body.category ?? u.category,
      photos: Array.isArray(body.photos) ? body.photos : u.photos,
      videos: Array.isArray(body.videos) ? body.videos : (u.videos ?? []),
      isPublished: body.isPublished ?? u.isPublished,
    })
    return this.updates.save(u)
  }

  async remove(id: string, user?: any) {
    const u = await this.getOne(id)
    this.assertCanEdit(u, user)
    await this.updates.delete(id)
    return { ok: true }
  }

  // ---- Public reads ----
  async listPublic() {
    try {
      const rows = await this.updates.find({
        where: { isPublished: true },
        order: { date: 'DESC', createdAt: 'DESC' },
      })
      return rows.map(r => ({
        ...r,
        photos: parseJsonArray(r.photos),
        videos: parseJsonArray(r.videos),
      }))
    } catch (err: any) {
      this.logger.warn(`listPublic failed via TypeORM: ${err?.message}. Using safe fallback query.`)
      try {
        const rows = await this.updates.query(
          `SELECT id, project_id as "projectId", date, title, description, category, photos, 
           is_published as "isPublished", created_by as "createdBy", created_by_id as "createdById", 
           created_at as "createdAt", updated_at as "updatedAt" 
           FROM project_updates WHERE is_published = true ORDER BY date DESC, created_at DESC`
        )
        return (rows || []).map((r: any) => ({
          ...r,
          photos: parseJsonArray(r.photos),
          videos: parseJsonArray(r.videos),
        }))
      } catch (err2: any) {
        this.logger.error(`Fallback listPublic query failed: ${err2?.message}`)
        return []
      }
    }
  }

  // Flatten every published photo and video into a single gallery feed (newest first),
  // carrying enough context to link media back to its timeline entry.
  async gallery() {
    try {
      const rows = await this.listPublic()
      const allMedia: any[] = []
      for (const u of rows) {
        const photos = parseJsonArray(u.photos)
        // Photos
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i]
          if (p && p.url) {
            allMedia.push({
              url: p.url,
              caption: p.caption ?? u.title,
              date: u.date,
              category: u.category,
              updateId: u.id,
              idx: i,
              mediaType: 'photo',
            })
          }
        }
        const videos = parseJsonArray(u.videos)
        // Videos
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i]
          if (v && v.url) {
            allMedia.push({
              url: v.url,
              caption: v.title || u.title,
              thumbnail: v.thumbnail,
              provider: v.provider || 'upload',
              date: u.date,
              category: u.category,
              updateId: u.id,
              idx: i,
              mediaType: 'video',
            })
          }
        }
      }
      return allMedia
    } catch (err: any) {
      this.logger.error(`gallery failed: ${err?.message}`)
      return []
    }
  }

  // ---- Team ----
  listTeamAll() {
    return this.team.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  listTeamPublic() {
    return this.team.find({ where: { isPublished: true }, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  createTeam(body: any) {
    const m = this.team.create({
      name: body.name,
      title: body.title ?? '',
      department: body.department ?? '',
      photoUrl: body.photoUrl ?? null,
      photoKey: body.photoKey ?? null,
      bio: body.bio ?? '',
      sortOrder: body.sortOrder ?? 0,
      isPublished: body.isPublished ?? true,
    })
    return this.team.save(m)
  }

  async updateTeam(id: string, body: any) {
    const m = await this.team.findOne({ where: { id } })
    if (!m) throw new NotFoundException('Team member not found')
    Object.assign(m, {
      name: body.name ?? m.name,
      title: body.title ?? m.title,
      department: body.department ?? m.department,
      photoUrl: body.photoUrl ?? m.photoUrl,
      photoKey: body.photoKey ?? m.photoKey,
      bio: body.bio ?? m.bio,
      sortOrder: body.sortOrder ?? m.sortOrder,
      isPublished: body.isPublished ?? m.isPublished,
    })
    return this.team.save(m)
  }

  async removeTeam(id: string) {
    await this.team.delete(id)
    return { ok: true }
  }
}
