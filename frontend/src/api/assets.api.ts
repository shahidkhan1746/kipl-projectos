import api from './client'

export const CATEGORIES = { furniture: 'Furniture', computer: 'Desktop computer', laptop: 'Laptop', printer: 'Printer / scanner', vehicle: 'Vehicle', office_equipment: 'Office equipment', other: 'Other' }
export const STATUSES = { available: 'Available', assigned: 'Assigned', under_repair: 'Under repair', lost: 'Lost', disposed: 'Disposed' }
export const CONDITIONS = { new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', unserviceable: 'Unserviceable' }
export type AssetCategory = keyof typeof CATEGORIES
export type AssetStatus = keyof typeof STATUSES
export interface OfficeAsset {
  id: string; projectId: string; assetTag: string; name: string; category: AssetCategory; location: string; status: AssetStatus;
  condition: keyof typeof CONDITIONS; brand: string | null; model: string | null; serialNumber: string | null;
  supplier: string | null; invoiceNumber: string | null; purchaseDate: string | null; purchaseCost: number | string | null;
  warrantyUntil: string | null; registrationNumber: string | null; insuranceUntil: string | null; serviceDue: string | null;
  photoUrl: string | null; documentUrl: string | null; notes: string | null;
  assignedEmployeeId: string | null; assignedTo: string | null; lastVerified: string | null; version: number;
}
export type AssetWrite = Pick<OfficeAsset, 'projectId' | 'name' | 'category' | 'location' | 'condition'> & Partial<Omit<OfficeAsset, 'id' | 'status' | 'assignedTo' | 'assignedEmployeeId' | 'lastVerified'>> & { reason?: string }
export type AssetAction = 'assign' | 'return' | 'transfer' | 'repair' | 'repair_complete' | 'lost' | 'recover' | 'dispose' | 'verify' | 'maintenance'
export interface AssetEvent { id: string; action: string; eventDate: string; createdAt: string; reason: string; actorName: string; before: Partial<OfficeAsset> | null; after: Partial<OfficeAsset> }
export interface AssetList { items: OfficeAsset[]; total: number; page: number; pageSize: number; counts: Partial<Record<AssetStatus, number>> }
export const assetsApi = {
  list: (projectId: string, filters: { search?: string; status?: string; category?: string; page: number }) => api.get<AssetList>('/api/v1/assets', { params: { projectId, ...filters } }),
  custodians: (projectId: string) => api.get<Array<{ id: string; empCode: string; firstName: string; lastName?: string }>>('/api/v1/assets/custodians', { params: { projectId } }),
  history: (id: string, projectId: string) => api.get<AssetEvent[]>(`/api/v1/assets/${id}/history`, { params: { projectId } }),
  create: (data: AssetWrite) => api.post<OfficeAsset>('/api/v1/assets', data),
  update: (id: string, data: AssetWrite) => api.put<OfficeAsset>(`/api/v1/assets/${id}`, data),
  action: (id: string, data: { projectId: string; version: number; action: AssetAction; eventDate: string; reason: string; employeeId?: string; location?: string }) => api.post<OfficeAsset>(`/api/v1/assets/${id}/events`, data),
}
