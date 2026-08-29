import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { Invoice } from '../../accounting/invoice.entity';
import { Expense } from '../../accounting/expense.entity';

const ALLOWED_FIN_ROLES = new Set([
  'super_admin',
  'admin',
  'project_manager',
  'accounts',
  'accountant',
]);

export const createAccountingTools = (dataSource: DataSource, projectId: string, callerRole?: string) => {
  const invoiceRepo = dataSource.getRepository(Invoice);
  const expenseRepo = dataSource.getRepository(Expense);

  return {
    get_financial_summary: tool(<any>{
      description: 'Query company financial summaries, RA bill invoices, expenses, net payables, and payment status. (Role-restricted)',
      parameters: z.object({
        type: z.enum(['invoices', 'expenses', 'totals']).describe('Financial query type.'),
        status: z.string().optional().describe('Filter by invoice/expense status (e.g. "approved", "paid", "pending").'),
        query: z.string().optional().describe('Search keyword in description or RA/bill number.'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        // Strict server-side role verification
        const normalizedRole = (callerRole || '').trim().toLowerCase();
        if (!ALLOWED_FIN_ROLES.has(normalizedRole)) {
          return {
            error: 'Access denied: You do not have permission to view sensitive project financial figures, invoices, or salary records. Please contact an Administrator or Accounts Officer.',
            authorized: false,
          };
        }

        const whereBase: any = projectId ? { projectId } : {};

        if (args.type === 'invoices') {
          if (args.status) whereBase.status = args.status;
          let whereClause: any = whereBase;
          if (args.query) {
            whereClause = [
              { ...whereBase, raNumber: ILike(`%${args.query}%`) },
              { ...whereBase, remarks: ILike(`%${args.query}%`) },
            ];
          }

          const invoices = await invoiceRepo.find({
            where: whereClause,
            order: { billDate: 'DESC' },
            take: args.limit || 10,
          });

          return {
            authorized: true,
            invoices: invoices.map(inv => ({
              id: inv.id,
              raNumber: inv.raNumber,
              billDate: inv.billDate,
              periodFrom: inv.periodFrom,
              periodTo: inv.periodTo,
              grossAmount: inv.grossAmount,
              netPayable: inv.netPayable,
              paidAmount: inv.paidAmount,
              balanceDue: (Number(inv.netPayable) || 0) - (Number(inv.paidAmount) || 0),
              status: inv.status,
              remarks: inv.remarks,
            })),
          };
        }

        if (args.type === 'expenses') {
          if (args.status) whereBase.status = args.status;
          let whereClause: any = whereBase;
          if (args.query) {
            whereClause = [
              { ...whereBase, description: ILike(`%${args.query}%`) },
              { ...whereBase, billNo: ILike(`%${args.query}%`) },
            ];
          }

          const expenses = await expenseRepo.find({
            where: whereClause,
            order: { date: 'DESC' },
            take: args.limit || 10,
          });

          return {
            authorized: true,
            expenses: expenses.map(exp => ({
              id: exp.id,
              date: exp.date,
              category: exp.category,
              description: exp.description,
              billNo: exp.billNo,
              grossAmount: exp.grossAmount,
              netPayable: exp.netPayable,
              paidAmount: exp.paidAmount,
              status: exp.status,
            })),
          };
        }

        // Aggregate totals
        const invoices = await invoiceRepo.find({ where: projectId ? { projectId } : {} });
        const expenses = await expenseRepo.find({ where: projectId ? { projectId } : {} });

        const totalInvoicedGross = invoices.reduce((sum, i) => sum + Number(i.grossAmount || 0), 0);
        const totalInvoicedNet = invoices.reduce((sum, i) => sum + Number(i.netPayable || 0), 0);
        const totalInvoicePaid = invoices.reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);
        const totalExpenseGross = expenses.reduce((sum, e) => sum + Number(e.grossAmount || 0), 0);
        const totalExpensePaid = expenses.reduce((sum, e) => sum + Number(e.paidAmount || 0), 0);

        return {
          authorized: true,
          totalInvoicedGross,
          totalInvoicedNet,
          totalInvoicePaid,
          outstandingInvoiceReceivable: totalInvoicedNet - totalInvoicePaid,
          totalExpenseGross,
          totalExpensePaid,
          invoiceCount: invoices.length,
          expenseCount: expenses.length,
        };
      },
    }),
  };
};
