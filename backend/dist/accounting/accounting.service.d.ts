import { Repository } from 'typeorm';
import { Vendor } from './vendor.entity';
import { Expense } from './expense.entity';
import { Transaction } from './transaction.entity';
import { TdsEntry } from './tds-entry.entity';
import { Invoice } from './invoice.entity';
export declare class AccountingService {
    private invoiceRepo;
    private vendorRepo;
    private expenseRepo;
    private txnRepo;
    private tdsRepo;
    constructor(invoiceRepo: Repository<Invoice>, vendorRepo: Repository<Vendor>, expenseRepo: Repository<Expense>, txnRepo: Repository<Transaction>, tdsRepo: Repository<TdsEntry>);
    createVendor(d: Partial<Vendor>): Promise<Vendor>;
    listVendors(p: {
        projectId?: string;
        category?: string;
        search?: string;
    }): Promise<Vendor[]>;
    getVendor(id: string): Promise<Vendor>;
    vendorLedger(vendorId: string): Promise<{
        vendor: Vendor;
        expenses: Expense[];
        totalBilled: number;
        totalPaid: number;
        totalTds: number;
        balance: number;
    }>;
    createExpense(data: any): Promise<Expense[]>;
    listExpenses(p: {
        projectId?: string;
        vendorId?: string;
        category?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<Expense[]>;
    approveExpense(id: string, approvedBy: string): Promise<Expense | null>;
    markExpensePaid(id: string, data: any): Promise<Expense | null>;
    addTransaction(data: any): Promise<Transaction[]>;
    listTransactions(p: {
        projectId?: string;
        vendorId?: string;
        fromDate?: string;
        toDate?: string;
        type?: string;
    }): Promise<Transaction[]>;
    listTds(p: {
        projectId?: string;
        quarter?: string;
        fy?: string;
        status?: string;
    }): Promise<TdsEntry[]>;
    depositTds(id: string, data: any): Promise<TdsEntry | null>;
    dashboard(projectId: string): Promise<{
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
    listInvoices(q: {
        projectId?: string;
        status?: string;
        limit?: number;
    }): Promise<Invoice[]>;
    createInvoice(body: any): Promise<Invoice[]>;
    updateInvoice(id: string, body: any): Promise<Invoice | null>;
    deleteInvoice(id: string): Promise<import("typeorm").DeleteResult>;
    getInvoice(id: string): Promise<Invoice | null>;
}
