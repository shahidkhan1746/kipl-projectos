import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus, Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import type { Response } from 'express';
import { LiaisonService }  from './liaison.service';
import { CreateFileDto }   from './dto/create-file.dto';
import { ApproveFileDto }  from './dto/approve-file.dto';
import { CreateLetterDto } from './dto/create-letter.dto';
import { SendLetterDto }   from './dto/send-letter.dto';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { RolesGuard }      from '../auth/guards/roles.guard';
import { Roles }           from '../auth/decorators/roles.decorator';
import { UserRole }        from '../users/user.entity';


const LIA = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.LIAISON_OFFICER,
];

@Controller('liaison')
@UseGuards(JwtAuthGuard)
export class LiaisonController {
  constructor(
    private readonly svc: LiaisonService,
    private readonly storage: StorageService,
  ) {}

  @Patch('files/:id')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  updateFile(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateFile(id, body);
  }

  @Get('files')
  listFiles(@Query() q: any, @Request() req: any) {
    return this.svc.listFiles({
      projectId:  q.projectId,
      status:     q.status,
      priority:   q.priority,
      department: q.department,
      fileType:   q.fileType,
      search:     q.search,
      page:       q.page  ? parseInt(q.page)  : 1,
      limit:      q.limit ? parseInt(q.limit) : 25,
      userId:     req.user.id,
    });
  }

  @Post('files')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  @HttpCode(HttpStatus.CREATED)
  createFile(@Body() dto: CreateFileDto, @Request() req: any) {
    return this.svc.createFile(dto, req.user.id);
  }

  @Get('files/:id')
  getFile(@Param('id') id: string) {
    return this.svc.getFile(id);
  }

  @Patch('files/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  approveFile(@Param('id') id: string, @Body() dto: ApproveFileDto, @Request() req: any) {
    return this.svc.processApproval(id, dto, req.user.id, req.user.role);
  }

  @Patch('files/:id/close')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  closeFile(@Param('id') id: string) {
    return this.svc.closeFile(id);
  }

  @Post('files/:id/documents')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') fileId: string,
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req: any,
  ) {
    let url = body.cloudinaryUrl
    let key = body.cloudinaryPublicId
    let size = body.fileSizeBytes
    let mime = body.mimeType
    let name = body.documentName
    if (file) {
      const uploaded = await this.storage.upload(file, 'liaison')
      url = uploaded.url
      key = uploaded.key
      size = file.size
      mime = file.mimetype
      name = name || file.originalname
    }
    return this.svc.uploadDocument({
      fileId,
      uploadedById:       req.user.id,
      documentName:       name,
      cloudinaryUrl:      url,
      cloudinaryPublicId: key,
      fileSizeBytes:      size,
      mimeType:           mime,
    });
  }

  @Get('letters')
  listLetters(@Query() q: any) {
    return this.svc.listLetters({ projectId: q.projectId, letterType: q.letterType });
  }

  @Post('letters')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  @HttpCode(HttpStatus.CREATED)
  createLetter(@Body() dto: CreateLetterDto, @Request() req: any) {
    return this.svc.createLetter(dto, req.user.id);
  }

  @Get('letters/:id')
  getLetter(@Param('id') id: string) {
    return this.svc.getLetter(id);
  }

  @Get('letters/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const letter = await this.svc.getLetter(id);
    const pdf    = await this.svc.generateLetterPdf(id);
    const fname  = `${(letter.letterNumber ?? id).replace(/\//g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(pdf);
  }

  @Post('letters/:id/send')
  @UseGuards(RolesGuard)
  @Roles(...LIA)
  @HttpCode(HttpStatus.OK)
  sendLetter(@Param('id') id: string, @Body() dto: SendLetterDto) {
    return this.svc.sendLetterByEmail(id, dto);
  }

  @Get('dashboard')
  dashboard(@Query('projectId') projectId?: string) {
    return this.svc.dashboard(projectId);
  }
}
