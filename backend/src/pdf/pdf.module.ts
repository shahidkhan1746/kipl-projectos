import { Module } from '@nestjs/common'
import { PdfService } from './pdf.service'
import { PdfController } from './pdf.controller'
import { HrModule } from '../hr/hr.module'
import { EpcModule } from '../epc/epc.module'
import { QaModule } from '../qa/qa.module'
import { ProjectsModule } from '../projects/projects.module'

@Module({
  imports: [HrModule, EpcModule, QaModule, ProjectsModule],
  providers: [PdfService],
  controllers: [PdfController],
  exports: [PdfService],
})
export class PdfModule {}
