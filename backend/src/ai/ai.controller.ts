import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AiService } from './ai.service'
import { AiIndexerService } from './ai-indexer.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'
import { AiAccessGuard } from './ai-access.guard'
import { KnowledgeCategory } from './ai-knowledge-document.entity'

// All AI endpoints require Super Admin or Project Manager (AiAccessGuard).
// Config/key management additionally requires Super Admin (stacked RolesGuard).
@Controller('ai')
@UseGuards(JwtAuthGuard, AiAccessGuard)
export class AiController {
  constructor(
    private readonly svc: AiService,
    private readonly indexer: AiIndexerService,
  ) {}

  // Config + key pool — SuperAdmin only
  @Get('config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getConfig() {
    return this.svc.getMasked()
  }

  @Post('config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  saveConfig(@Body() body: any) {
    return this.svc.saveConfig(body)
  }

  @Post('keys')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  createKey(@Body() body: any) {
    return this.svc.createKey(body)
  }

  @Patch('keys/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateKey(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateKey(id, body)
  }

  @Delete('keys/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  deleteKey(@Param('id') id: string) {
    return this.svc.deleteKey(id)
  }

  @Post('keys/:id/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  testKey(@Param('id') id: string) {
    return this.svc.testKey(id)
  }

  // Generation — any authenticated user
  @Post('generate')
  async generate(@Body() body: { prompt: string; system?: string }) {
    const text = await this.svc.generate(body.prompt, body.system)
    return { text }
  }

  @Get('chat/sessions')
  getSessions(@Request() req: any, @Query('projectId') projectId: string) {
    return this.svc.getSessions(req.user.id, projectId)
  }

  @Get('chat/sessions/:id')
  getSessionHistory(@Param('id') id: string) {
    return this.svc.getSessionHistory(id)
  }

  @Delete('chat/sessions/:id')
  deleteSession(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteSession(id, req.user.id)
  }

  @Post('chat')
  async chat(
    @Body() body: { sessionId: string; query: string; projectId: string },
    @Request() req: any,
  ) {
    const text = await this.svc.chat(
      body.sessionId,
      body.query,
      req.user.id,
      body.projectId,
    )
    return { text }
  }

  // Knowledge Synchronization & Ingestion
  @Post('sync-knowledge')
  async syncKnowledge(@Body() body: { projectId?: string }) {
    return this.indexer.syncAllKnowledge(body?.projectId)
  }

  // Knowledge Vault & File Pool Endpoints
  @Post('knowledge/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadKnowledgeFile(
    @UploadedFile() file: any,
    @Body('category') category: KnowledgeCategory,
    @Body('projectId') projectId?: string,
    @Request() req?: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded')
    const uploadedBy = req?.user?.name || req?.user?.email || 'User'
    return this.indexer.uploadKnowledgeFile(file, category, projectId, uploadedBy)
  }

  @Get('knowledge/documents')
  async getKnowledgeDocuments(
    @Query('projectId') projectId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.indexer.getKnowledgeDocuments(projectId, category, search)
  }

  @Post('knowledge/fetch-liaison')
  async fetchFromLiaison(@Body('projectId') projectId?: string) {
    return this.indexer.fetchFromLiaison(projectId)
  }

  @Post('knowledge/documents/:id/reindex')
  async reindexKnowledgeDocument(@Param('id') id: string) {
    return this.indexer.reindexKnowledgeDocument(id)
  }

  @Delete('knowledge/documents/:id')
  async deleteKnowledgeDocument(@Param('id') id: string) {
    return this.indexer.deleteKnowledgeDocument(id)
  }
}
