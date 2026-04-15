// ============================================================
//  KIPL ProjectOS — ra-bill.controller.ts
//  Endpoints: POST /api/ra-bill/generate-pdf
//             PATCH /api/boq-items/:id
// ============================================================

import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RaBillPdfService } from './ra-bill.pdf.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoqItem } from './boq-item.entity';

@Controller()
export class RaBillController {
  constructor(
    private readonly pdfService: RaBillPdfService,
    @InjectRepository(BoqItem)
    private readonly boqRepo: Repository<BoqItem>,
  ) {}

  // ── Generate RA Bill PDF ───────────────────────────────────
  @Post('ra-bill/generate-pdf')
  async generatePdf(@Body() payload: any, @Res() res: Response) {
    const buffer = await this.pdfService.generate(payload);
    const filename = `KIPL_${payload.header.billNo}_${payload.header.billDate}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Save Quoted Rate back to BOQ ───────────────────────────
  @Patch('boq-items/:id')
  async updateBoqItem(@Param('id') id: string, @Body() body: { quotedCost?: number }) {
    await this.boqRepo.update({ id }, { quotedRate: (body as any).quotedRate ?? (body as any).quotedCost });
    return { success: true, id, quotedCost: body.quotedCost };
  }

  // ── Get all BOQ items (for auto-fill on load) ──────────────
  @Get('boq-items')
  async getBoqItems() {
    return this.boqRepo.find({ order: { category: 'ASC' } });
  }
}

// ── Entity (add quotedCost field if not present) ─────────────
// In your existing boq-item.entity.ts, add:
/*
  @Column({ type: 'decimal', precision: 15, scale: 5, nullable: true })
  quotedCost: number | null;
*/

// ── Migration snippet ─────────────────────────────────────────
/*
  ALTER TABLE boq_item ADD COLUMN IF NOT EXISTS "quotedCost" DECIMAL(15,5);
*/
