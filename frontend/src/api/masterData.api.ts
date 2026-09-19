import api from './client';

export interface MasterDropdownOption {
  id: string;
  dropdownType: 'material' | 'unit' | 'equipment_type' | 'site_zone' | 'stakeholder' | string;
  label: string;
  value: string;
  category?: string;
  unit?: string;
  spec?: string;
  metadata: Record<string, any>;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOptionDto {
  dropdownType: string;
  label: string;
  value: string;
  category?: string;
  unit?: string;
  spec?: string;
  metadata?: Record<string, any>;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateOptionDto {
  label?: string;
  value?: string;
  category?: string;
  unit?: string;
  spec?: string;
  metadata?: Record<string, any>;
  displayOrder?: number;
  isActive?: boolean;
}

export const masterDataApi = {
  getGrouped: (activeOnly = true) =>
    api.get<Record<string, MasterDropdownOption[]>>('/api/v1/master-data', {
      params: { activeOnly },
    }),

  list: (params?: {
    type?: string;
    category?: string;
    search?: string;
    activeOnly?: boolean;
  }) =>
    api.get<MasterDropdownOption[]>('/api/v1/master-data/list', {
      params,
    }),

  get: (id: string) =>
    api.get<MasterDropdownOption>(`/api/v1/master-data/${id}`),

  create: (data: CreateOptionDto) =>
    api.post<MasterDropdownOption>('/api/v1/master-data', data),

  update: (id: string, data: UpdateOptionDto) =>
    api.patch<MasterDropdownOption>(`/api/v1/master-data/${id}`, data),

  toggleActive: (id: string) =>
    api.post<MasterDropdownOption>(`/api/v1/master-data/${id}/toggle`),

  remove: (id: string, hard = false) =>
    api.delete<{ success: boolean; message: string }>(`/api/v1/master-data/${id}`, {
      params: { hard },
    }),
};
