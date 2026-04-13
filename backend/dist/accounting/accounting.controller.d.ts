import { AccountingService } from './accounting.service';
export declare class AccountingController {
    private readonly svc;
    constructor(svc: AccountingService);
    dashboard(pid: string): Promise<{
        totalExpenses: number;
        totalPaid: number;
        totalPending: number;
        totalUnpaid: number;
        totalTdsDeducted: number;
        totalTdsDeposited: number;
        tdsLiability: number;
        byCategory: Record<string, number>;
        expenseCount: number;
        pendingCount: number;
    }>;
    vendors(q: any): Promise<import("./vendor.entity").Vendor[]>;
    createVendor(body: any): Promise<import("./vendor.entity").Vendor>;
    vendorLedger(id: string): Promise<{
        vendor: import("./vendor.entity").Vendor;
        expenses: import("./expense.entity").Expense[];
        totalBilled: number;
        totalPaid: number;
        totalTds: number;
        balance: number;
    }>;
    vendor(id: string): Promise<import("./vendor.entity").Vendor>;
    expenses(q: any): Promise<import("./expense.entity").Expense[]>;
    createExpense(body: any): Promise<import("./expense.entity").Expense[]>;
    approveExpense(id: string, req: any): Promise<import("./expense.entity").Expense | null>;
    payExpense(id: string, body: any): Promise<import("./expense.entity").Expense | null>;
    transactions(q: any): Promise<import("./transaction.entity").Transaction[]>;
    addTxn(body: any): Promise<import("./transaction.entity").Transaction[]>;
    tds(q: any): Promise<import("./tds-entry.entity").TdsEntry[]>;
    depositTds(id: string, body: any): Promise<import("./tds-entry.entity").TdsEntry | null>;
    listInvoices(q: any): Promise<import("./invoice.entity").Invoice[]>;
    createInvoice(body: any, req: any): Promise<import("./invoice.entity").Invoice[]>;
    getInvoice(id: string): Promise<import("./invoice.entity").Invoice | null>;
    updateInvoice(id: string, body: any): Promise<import("./invoice.entity").Invoice | null>;
    deleteInvoice(id: string): Promise<import("typeorm").DeleteResult>;
}
