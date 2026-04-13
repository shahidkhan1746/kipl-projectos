import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiaisonFile }      from './liaison-file.entity';
import { ApprovalWorkflow } from './approval-workflow.entity';
import { FileDocument }     from './file-document.entity';
import { Letter }           from './letter.entity';
import { LiaisonService }   from './liaison.service';
import { LiaisonController } from './liaison.controller';
import { PdfModule }        from '../pdf/pdf.module';
import { GmailModule }      from '../gmail/gmail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiaisonFile, ApprovalWorkflow, FileDocument, Letter]),
    PdfModule,
    GmailModule,
  ],
  providers:   [LiaisonService],
  controllers: [LiaisonController],
  exports:     [LiaisonService],
})
export class LiaisonModule {}
