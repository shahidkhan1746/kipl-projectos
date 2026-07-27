import { Controller, Get } from '@nestjs/common'
import { UpdatesService } from './updates.service'

// No guard = public. Feeds the marketing site's Timeline, Gallery & Team pages.
@Controller('public')
export class PublicUpdatesController {
  constructor(private readonly svc: UpdatesService) {}

  @Get('updates') timeline() { return this.svc.listPublic() }
  @Get('gallery') gallery() { return this.svc.gallery() }
  @Get('team') team() { return this.svc.listTeamPublic() }
}
