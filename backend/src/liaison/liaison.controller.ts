import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { LiaisonService }  from './liaison.service';
import { CreateFileDto }   from './dto/create-file.dto';
import { ApproveFileDto }  from './dto/approve-file.dto';
import { CreateLetterDto } from './dto/create-letter.dto';
import { SendLetterDto }   from './dto/send-letter.dto';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { LiaisonStatus }   from './liaison-file.entity';

@Controller('liaison')
@UseGuards(JwtAuthGuard)
export class LiaisonController {
  constructor(private readonly svc: LiaisonService) {}

  @Get('files')
  listFiles(@Query() q: any, @Request() req: any) {
    return this.svc.listFiles({
      projectId:  q.projectId,
      status:     q.status,
      priority:   q.priority,
      department: q.department,
      fileType:   q.fileType,
      page:       q.page  ? parseInt(q.page)  : 1,
      limit:      q.limit ? parseInt(q.limit) : 25,
      userId:     req.user.id,
    });
  }

  @Post('files')
  @HttpCode(HttpStatus.CREATED)
  createFile(@Body() dto: CreateFileDto, @Request() req: any) {
    return this.svc.createFile(dto, req.user.id);
  }

  @Get('files/:id')
  getFile(@Param('id') id: string) {
    return this.svc.getFile(id);
  }

  @Patch('files/:id/approve')
  approveFile(@Param('id') id: string, @Body() dto: ApproveFileDto, @Request() req: any) {
    return this.svc.processApproval(id, dto, req.user.id, req.user.role);
  }

  @Patch('files/:id/close')
  async closeFile(@Param('id') id: string) {
    const file = await this.svc.getFile(id);
    file.currentStatus = LiaisonStatus.CLOSED;
    return this.svc.fileRepo.save(file);
  }

  @Post('files/:id/documents')
  @HttpCode(HttpStatus.CREATED)
  uploadDocument(@Param('id') fileId: string, @Body() body: any, @Request() req: any) {
    return this.svc.uploadDocument({
      fileId,
      uploadedById:       req.user.id,
      documentName:       body.documentName,
      cloudinaryUrl:      body.cloudinaryUrl,
      cloudinaryPublicId: body.cloudinaryPublicId,
      fileSizeBytes:      body.fileSizeBytes,
      mimeType:           body.mimeType,
    });
  }

  @Get('letters')
  listLetters(@Query() q: any) {
    return this.svc.listLetters({ projectId: q.projectId, letterType: q.letterType });
  }

  @Post('letters')
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
  @HttpCode(HttpStatus.OK)
  sendLetter(@Param('id') id: string, @Body() dto: SendLetterDto) {
    return this.svc.sendLetterByEmail(id, dto);
  }

  @Get('dashboard')
  dashboard(@Query('projectId') projectId?: string) {
    return this.svc.dashboard(projectId);
  }
}
