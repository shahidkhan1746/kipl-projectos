import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { Employee } from '../../hr/employee.entity';

export const createEmployeeTools = (dataSource: DataSource, projectId: string) => {
  const repo = dataSource.getRepository(Employee);

  return {
    search_employees: tool(<any>{
      description: 'Search for project employees by name, designation, department, or labor category.',
      parameters: z.object({
        query: z.string().describe('Search query for employee name, designation, or department.'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.name || args?.q || args?.search || args?.keyword || '').trim();
        if (!query) {
          const all = await repo.find({
            where: projectId ? { projectId } : {},
            take: args?.limit || 10,
            select: ['id', 'empCode', 'firstName', 'lastName', 'designation', 'department', 'labourCategory', 'status', 'phone', 'email']
          });
          return all;
        }

        const whereBase = projectId ? { projectId } : {};
        const employees = await repo.find({
          where: [
            { ...whereBase, firstName: ILike(`%${query}%`) },
            { ...whereBase, lastName: ILike(`%${query}%`) },
            { ...whereBase, designation: ILike(`%${query}%`) },
            { ...whereBase, department: ILike(`%${query}%`) }
          ],
          take: args?.limit || 10,
          select: ['id', 'empCode', 'firstName', 'lastName', 'designation', 'department', 'labourCategory', 'status', 'phone', 'email']
        });
        return employees;
      }
    }),

    get_employee: tool(<any>{
      description: 'Get detailed information about a specific employee by ID, Employee Code, or Name.',
      parameters: z.object({
        id: z.string().optional().describe('Employee UUID in ProjectOS.'),
        employee_code: z.string().optional().describe('Employee Code (e.g. "KIPL-DL-SXR-009").'),
        name: z.string().optional().describe('Employee name (e.g. "Rinku").'),
      }),
      execute: async (args: any) => {
        const id = (args?.id || '').trim();
        const code = (args?.employee_code || args?.emp_code || args?.empCode || args?.employee_id || args?.id_or_code || '').trim();
        const name = (args?.name || args?.query || '').trim();

        const whereConditions: any[] = [];
        const whereBase = projectId ? { projectId } : {};

        // UUID format check to prevent TypeORM uuid casting errors
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (id && isUuid.test(id)) {
          whereConditions.push({ ...whereBase, id });
        }
        if (code) {
          if (isUuid.test(code)) {
            whereConditions.push({ ...whereBase, id: code });
          }
          whereConditions.push({ ...whereBase, empCode: code });
        }
        if (name) {
          whereConditions.push({ ...whereBase, firstName: ILike(`%${name}%`) });
          whereConditions.push({ ...whereBase, lastName: ILike(`%${name}%`) });
        }

        if (whereConditions.length === 0) {
          return { error: 'No valid employee ID, Code, or Name provided for lookup.' };
        }

        const emp = await repo.findOne({
          where: whereConditions,
          select: ['id', 'empCode', 'firstName', 'lastName', 'designation', 'department', 'labourCategory', 'status', 'phone', 'email', 'dateOfJoining', 'employmentType']
        });

        if (!emp) return { error: 'Employee not found in project records.' };
        return emp;
      }
    }),
  };
};
