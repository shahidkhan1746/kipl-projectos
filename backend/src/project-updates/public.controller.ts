import { Controller, Get, Param } from '@nestjs/common'
import { UpdatesService } from './updates.service'
import { ProjectsService } from '../projects/projects.service'
import { Public } from '../auth/decorators/public.decorator'

// No JWT. Feeds the marketing site's Timeline, Gallery, Team, and /p/:code pages.
@Public()
@Controller('public')
export class PublicUpdatesController {
  constructor(
    private readonly svc: UpdatesService,
    private readonly projects: ProjectsService,
  ) {}

  @Get('updates') timeline() { return this.svc.listPublic() }
  @Get('gallery') gallery() { return this.svc.gallery() }
  @Get('team') team() { return this.svc.listTeamPublic() }
  @Get('project/:code') project(@Param('code') code: string) {
    return this.projects.findPublicByCode(code)
  }
}
