import type { Response } from 'express';
import { RaBillPdfService } from './ra-bill.pdf.service';
import { Repository } from 'typeorm';
import { BoqItem } from './boq-item.entity';
export declare class RaBillController {
    private readonly pdfService;
    private readonly boqRepo;
    constructor(pdfService: RaBillPdfService, boqRepo: Repository<BoqItem>);
    generatePdf(payload: any, res: Response): Promise<void>;
    updateBoqItem(id: string, body: {
        quotedCost?: number;
    }): Promise<{
        success: boolean;
        id: string;
        quotedCost: number | undefined;
    }>;
    getBoqItems(): Promise<BoqItem[]>;
}
