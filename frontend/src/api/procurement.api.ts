import api from './client';

export interface RequisitionItemPayload {
  itemDescription: string;
  category?: string;
  quantity: number;
  unit?: string;
  estimatedRate?: number;
  estimatedAmount?: number;
  specifications?: string;
}

export interface CreateRequisitionPayload {
  projectId: string;
  title: string;
  siteLocation?: string;
  requiredByDate?: string;
  priority?: 'normal' | 'high' | 'urgent';
  justification?: string;
  attachmentUrl?: string;
  items: RequisitionItemPayload[];
}

export interface HoApprovalPayload {
  department: 'procurement' | 'accounts';
  action: 'approved' | 'rejected';
  remarks?: string;
  recommendedVendor?: string;
  budgetHead?: string;
}

export interface PurchaseOrderItemPayload {
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitRate: number;
  discountPercent?: number;
  gstRate?: number;
}

export interface CreatePurchaseOrderPayload {
  projectId: string;
  requisitionId?: string;
  vendorName: string;
  vendorContactPerson?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorGstin?: string;
  vendorAddress?: string;
  billingAddress?: string;
  shippingAddress?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  freightCharges?: number;
  otherCharges?: number;
  notes?: string;
  items: PurchaseOrderItemPayload[];
}

export const procurementApi = {
  // Requisitions
  getRequisitions: (projectId: string, status?: string) =>
    api.get('/api/v1/procurement/requisitions', { params: { projectId, status } }),

  getRequisitionById: (id: string) =>
    api.get(`/api/v1/procurement/requisitions/${id}`),

  createRequisition: (data: CreateRequisitionPayload) =>
    api.post('/api/v1/procurement/requisitions', data),

  approveHoRequisition: (id: string, data: HoApprovalPayload) =>
    api.post(`/api/v1/procurement/requisitions/${id}/approve-ho`, data),

  convertRequisitionToPo: (id: string, overrides?: Partial<CreatePurchaseOrderPayload>) =>
    api.post(`/api/v1/procurement/requisitions/${id}/convert-po`, overrides || {}),

  // Purchase Orders
  getPurchaseOrders: (projectId: string, status?: string) =>
    api.get('/api/v1/procurement/orders', { params: { projectId, status } }),

  getPurchaseOrderById: (id: string) =>
    api.get(`/api/v1/procurement/orders/${id}`),

  createPurchaseOrder: (data: CreatePurchaseOrderPayload) =>
    api.post('/api/v1/procurement/orders', data),

  updatePoStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/api/v1/procurement/orders/${id}/status`, { status, notes }),

  downloadPoPdf: async (id: string, poNumber: string) => {
    const res = await api.get(`/api/v1/procurement/orders/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${poNumber || 'PurchaseOrder'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
