import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectUpdate } from './project-update.entity'
import { TeamMember } from './team-member.entity'

// Roles that may edit/delete ANY update (override the author-only rule)
const OVERRIDE_ROLES = ['super_admin', 'admin', 'project_manager']

@Injectable()
export class UpdatesService {
  constructor(
    @InjectRepository(ProjectUpdate) private updates: Repository<ProjectUpdate>,
    @InjectRepository(TeamMember) private team: Repository<TeamMember>,
  ) {}

  // ---- Project updates (admin) ----
  listAll() {
    return this.updates.find({ order: { date: 'DESC', createdAt: 'DESC' } })
  }

  async getOne(id: string) {
    const u = await this.updates.findOne({ where: { id } })
    if (!u) throw new NotFoundException('Update not found')
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
      photos: Array.isArray(body.photos) ? body.photos : [],
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
  listPublic() {
    return this.updates.find({
      where: { isPublished: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    })
  }

  // Flatten every published photo into a single gallery feed (newest first),
  // carrying enough context to link a photo back to its timeline entry.
  async gallery() {
    const rows = await this.listPublic()
    return rows.flatMap(u =>
      (u.photos ?? []).map((p, i) => ({
        url: p.url,
        caption: p.caption ?? u.title,
        date: u.date,
        category: u.category,
        updateId: u.id,
        idx: i,
      })),
    )
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
