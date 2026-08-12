import type { Response } from 'express';
import { PdfService } from './pdf.service';
export declare class PdfController {
    private readonly pdfSvc;
    constructor(pdfSvc: PdfService);
    salarySlip(body: any, res: Response): Promise<void>;
    raBill(body: any, res: Response): Promise<void>;
    inspection(body: any, res: Response): Promise<void>;
    attendanceReport(body: any, res: Response): Promise<void>;
    monthlyAttendanceReport(body: any, res: Response): Promise<void>;
}
