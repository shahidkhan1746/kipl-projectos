import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { Vendor } from '../../accounting/vendor.entity';

export const createVendorTools = (dataSource: DataSource, projectId: string) => {
  const repo = dataSource.getRepository(Vendor);

  return {
    search_vendors: tool(<any>{
      description: 'Search for project vendors, subcontractors, suppliers, and agencies.',
      parameters: z.object({
        query: z.string().describe('Search query for vendor or trade name.'),
        category: z.string().optional().describe('Filter by category (e.g. "subcontractor", "material_supplier").'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.name || args?.q || args?.search || args?.keyword || '').trim();
        const category = args?.category;
        const whereBase = projectId ? { projectId } : {};

        if (!query) {
          const whereClause: any = { ...whereBase };
          if (category) whereClause.category = category;
          const vendors = await repo.find({
            where: whereClause,
            take: args?.limit || 10,
            select: ['id', 'name', 'tradeName', 'category', 'phone', 'email', 'isActive']
          });
          return vendors;
        }

        const whereClause: any[] = [
          { ...whereBase, name: ILike(`%${query}%`) },
          { ...whereBase, tradeName: ILike(`%${query}%`) }
        ];

        if (category) {
          whereClause.forEach(w => (w.category = category));
        }

        const vendors = await repo.find({
          where: whereClause,
          take: args?.limit || 10,
          select: ['id', 'name', 'tradeName', 'category', 'phone', 'email', 'isActive']
        });
        return vendors;
      }
    }),

    get_vendor: tool(<any>{
      description: 'Get detailed information about a specific vendor or subcontractor by ID or Name.',
      parameters: z.object({
        id: z.string().optional().describe('Vendor UUID in ProjectOS.'),
        name: z.string().optional().describe('Vendor name (e.g. "Keller").'),
      }),
      execute: async (args: any) => {
        const id = (args?.id || args?.vendor_id || args?.id_or_code || '').trim();
        const name = (args?.name || args?.query || args?.vendor_name || '').trim();

        const whereConditions: any[] = [];
        const whereBase = projectId ? { projectId } : {};
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (id && isUuid.test(id)) {
          whereConditions.push({ ...whereBase, id });
        }
        if (name) {
          if (isUuid.test(name)) {
            whereConditions.push({ ...whereBase, id: name });
          }
          whereConditions.push({ ...whereBase, name: ILike(`%${name}%`) });
          whereConditions.push({ ...whereBase, tradeName: ILike(`%${name}%`) });
        }

        if (whereConditions.length === 0) {
          return { error: 'No valid vendor ID or Name provided for lookup.' };
        }

        const vendor = await repo.findOne({
          where: whereConditions,
          select: ['id', 'name', 'tradeName', 'category', 'phone', 'email', 'address', 'gstin', 'pan', 'isActive']
        });

        if (!vendor) return { error: 'Vendor not found in project records.' };
        return vendor;
      }
    }),
  };
};
