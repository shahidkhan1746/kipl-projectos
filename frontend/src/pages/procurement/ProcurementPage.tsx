import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { procurementApi } from '@/api/procurement.api';
import type {
  CreateRequisitionPayload,
  CreatePurchaseOrderPayload,
  HoApprovalPayload,
} from '@/api/procurement.api';
import {
  ShoppingCart,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  WarningCircle,
  X,
  ArrowRight,
  DownloadSimple,
  Buildings,
  CurrencyInr,
  Eye,
  Check,
  Truck,
  Paperclip,
  Trash,
  ShieldCheck,
} from '@phosphor-icons/react';
import { formatDate } from '@/lib/date';
import { toast } from '@/lib/notify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const C = {
  card: '#fff',
  border: '#e2e8f0',
  text1: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  green: '#059669',
  greenBg: '#f0fdf4',
  amber: '#d97706',
  amberBg: '#fffbeb',
  red: '#dc2626',
  redBg: '#fef2f2',
  navy: '#1a2540',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal', color: '#0284c7', bg: '#f0f9ff' },
  high: { label: 'High Priority', color: C.amber, bg: C.amberBg },
  urgent: { label: 'Urgent', color: C.red, bg: C.redBg },
};

const REQ_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
  submitted_to_ho: { label: 'Submitted to HO', color: C.amber, bg: C.amberBg },
  partially_approved: { label: 'Partially Approved', color: C.purple, bg: C.purpleBg },
  approved: { label: 'Fully Approved', color: C.green, bg: C.greenBg },
  converted_to_po: { label: 'PO Issued', color: C.blue, bg: C.blueBg },
  rejected: { label: 'Rejected', color: C.red, bg: C.redBg },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
};

const PO_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
  issued: { label: 'Issued to Vendor', color: C.blue, bg: C.blueBg },
  partially_delivered: { label: 'Partially Delivered', color: C.amber, bg: C.amberBg },
  completed: { label: 'Completed', color: C.green, bg: C.greenBg },
  cancelled: { label: 'Cancelled', color: C.red, bg: C.redBg },
};

const fmtR = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtL = (n: number) => '₹' + ((Number(n) || 0) / 100000).toFixed(2) + ' L';

export default function ProcurementPage() {
  const { activeProjectId, user } = useAuthStore();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'requisitions' | 'orders'>('requisitions');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [showNewReqModal, setShowNewReqModal] = useState(false);
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [selectedPo, setSelectedPo] = useState<any | null>(null);

  // Form States for Dual HO Approvals
  const [hoDept, setHoDept] = useState<'procurement' | 'accounts'>('procurement');
  const [hoRemarks, setHoRemarks] = useState('');
  const [hoVendor, setHoVendor] = useState('');
  const [hoBudgetHead, setHoBudgetHead] = useState('');

  // New Requisition Form
  const [newReq, setNewReq] = useState<CreateRequisitionPayload>({
    projectId: activeProjectId || '',
    title: '',
    siteLocation: 'Dal Lake Project Site, Srinagar',
    requiredByDate: '',
    priority: 'normal',
    justification: '',
    attachmentUrl: '',
    items: [
      { itemDescription: '', category: 'Civil', quantity: 1, unit: 'Nos', estimatedRate: 0, estimatedAmount: 0 },
    ],
  });

  // Direct PO Form
  const [newPo, setNewPo] = useState<CreatePurchaseOrderPayload>({
    projectId: activeProjectId || '',
    vendorName: '',
    vendorContactPerson: '',
    vendorPhone: '',
    vendorEmail: '',
    vendorGstin: '',
    vendorAddress: '',
    billingAddress: 'Khilari Infrastructure Pvt. Ltd., 101-105 Prabhat Centre Annex, CBD Belapur, Navi Mumbai - 400614',
    shippingAddress: 'Dal Lake Sewerage Project Site, Srinagar, J&K',
    paymentTerms: '30 days after site receipt & joint inspection',
    deliveryTerms: 'FOR Site Srinagar, inclusive of transit insurance',
    freightCharges: 0,
    items: [
      { itemDescription: '', hsnCode: '', quantity: 1, unit: 'Nos', unitRate: 0, discountPercent: 0, gstRate: 18 },
    ],
  });

  // Queries
  const { data: requisitions = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['procurement-requisitions', activeProjectId, filterStatus],
    queryFn: () => procurementApi.getRequisitions(activeProjectId!, filterStatus).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['procurement-orders', activeProjectId, filterStatus],
    queryFn: () => procurementApi.getPurchaseOrders(activeProjectId!, filterStatus).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  // Mutations
  const createReqM = useMutation({
    mutationFn: () => procurementApi.createRequisition({ ...newReq, projectId: activeProjectId! }),
    onSuccess: () => {
      toast.success('Material Requisition submitted to Head Office successfully.');
      qc.invalidateQueries({ queryKey: ['procurement-requisitions'] });
      setShowNewReqModal(false);
      setNewReq({
        projectId: activeProjectId || '',
        title: '',
        siteLocation: 'Dal Lake Project Site, Srinagar',
        requiredByDate: '',
        priority: 'normal',
        justification: '',
        attachmentUrl: '',
        items: [{ itemDescription: '', category: 'Civil', quantity: 1, unit: 'Nos', estimatedRate: 0, estimatedAmount: 0 }],
      });
    },
    onError: (e: any) => toast.error('Error creating requisition: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const approveHoM = useMutation({
    mutationFn: (payload: HoApprovalPayload) =>
      procurementApi.approveHoRequisition(selectedReq?.id, payload),
    onSuccess: (res: any) => {
      toast.success('HO Review decision recorded successfully.');
      qc.invalidateQueries({ queryKey: ['procurement-requisitions'] });
      setSelectedReq(res.data);
      setHoRemarks('');
      setHoVendor('');
      setHoBudgetHead('');
    },
    onError: (e: any) => toast.error('Failed to submit HO decision: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const convertPoM = useMutation({
    mutationFn: (reqId: string) => procurementApi.convertRequisitionToPo(reqId),
    onSuccess: (res: any) => {
      toast.success(`Purchase Order ${res.data.poNumber} generated successfully!`);
      qc.invalidateQueries({ queryKey: ['procurement-requisitions'] });
      qc.invalidateQueries({ queryKey: ['procurement-orders'] });
      setSelectedReq(null);
      setActiveTab('orders');
    },
    onError: (e: any) => toast.error('Error generating PO: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const createPoM = useMutation({
    mutationFn: () => procurementApi.createPurchaseOrder({ ...newPo, projectId: activeProjectId! }),
    onSuccess: () => {
      toast.success('Direct Purchase Order issued successfully.');
      qc.invalidateQueries({ queryKey: ['procurement-orders'] });
      setShowNewPoModal(false);
    },
    onError: (e: any) => toast.error('Error issuing PO: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const updatePoStatusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      procurementApi.updatePoStatus(id, status),
    onSuccess: () => {
      toast.success('PO status updated.');
      qc.invalidateQueries({ queryKey: ['procurement-orders'] });
    },
    onError: (e: any) => toast.error('Failed to update status: ' + (e?.response?.data?.message ?? e?.message)),
  });

  // Calculations for stats
  const reqTotalCount = requisitions.length;
  const reqPendingHoCount = requisitions.filter(
    (r: any) => r.status === 'submitted_to_ho' || r.status === 'partially_approved',
  ).length;
  const reqApprovedCount = requisitions.filter((r: any) => r.status === 'approved').length;
  const reqConvertedCount = requisitions.filter((r: any) => r.status === 'converted_to_po').length;

  const poTotalCount = orders.length;
  const poTotalValue = orders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
  const poCompletedCount = orders.filter((o: any) => o.status === 'completed').length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={28} color={C.blue} weight="duotone" />
            Procurement &amp; Purchase Orders (PO)
          </h1>
          <p style={{ fontSize: 14, color: C.text3, marginTop: 4 }}>
            Site Material Indents · Head Office Dual Approval (Procurement &amp; Accounts) · Purchase Orders · 3-Way Matching
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {activeTab === 'requisitions' ? (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setShowNewReqModal(true)}
            >
              New Material Indent
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setShowNewPoModal(true)}
            >
              Issue Direct PO
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, gap: 24 }}>
        <button
          onClick={() => { setActiveTab('requisitions'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 15,
            fontWeight: activeTab === 'requisitions' ? 700 : 500,
            color: activeTab === 'requisitions' ? C.blue : C.text2,
            borderBottom: activeTab === 'requisitions' ? `3px solid ${C.blue}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FileText size={18} />
          Material Requisitions (Indents)
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: activeTab === 'requisitions' ? C.blueBg : '#f1f5f9', color: activeTab === 'requisitions' ? C.blue : C.text2 }}>
            {reqTotalCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('orders'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 15,
            fontWeight: activeTab === 'orders' ? 700 : 500,
            color: activeTab === 'orders' ? C.blue : C.text2,
            borderBottom: activeTab === 'orders' ? `3px solid ${C.blue}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ShoppingCart size={18} />
          Purchase Orders (PO)
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: activeTab === 'orders' ? C.blueBg : '#f1f5f9', color: activeTab === 'orders' ? C.blue : C.text2 }}>
            {poTotalCount}
          </span>
        </button>
      </div>

      {/* REQUISITIONS TAB */}
      {activeTab === 'requisitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3 }}>Total Indents Raised</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginTop: 4 }}>{reqTotalCount}</div>
            </div>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>Awaiting HO Review</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 4 }}>{reqPendingHoCount}</div>
            </div>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Fully Approved (Ready for PO)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{reqApprovedCount}</div>
            </div>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Converted to PO</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4 }}>{reqConvertedCount}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {['all', 'submitted_to_ho', 'partially_approved', 'approved', 'converted_to_po', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: filterStatus === st ? 700 : 500,
                  border: '1px solid ' + (filterStatus === st ? C.blue : C.border),
                  background: filterStatus === st ? C.blueBg : C.card,
                  color: filterStatus === st ? C.blue : C.text2,
                  cursor: 'pointer',
                }}
              >
                {st === 'all' ? 'All Indents' : REQ_STATUS_META[st]?.label || st}
              </button>
            ))}
          </div>

          {/* Requisitions Table */}
          <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {loadingReqs ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : requisitions.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: C.text3 }}>
                <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>No material requisitions found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Submit a new indent from the site to initiate head office approval.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Indent # / Title</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Site / Location</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Required Date</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Est. Amount</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>HO Procurement Review</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>HO Accounts Review</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Overall Status</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.map((req: any) => {
                      const priority = PRIORITY_META[req.priority] || PRIORITY_META.normal;
                      const status = REQ_STATUS_META[req.status] || REQ_STATUS_META.draft;

                      return (
                        <tr key={req.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, color: C.text1 }}>{req.reqNumber}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: priority.bg, color: priority.color }}>
                                {priority.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{req.title}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: C.text2 }}>
                            {req.siteLocation || 'Dal Lake Site'}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.text2 }}>
                            {req.requiredByDate ? formatDate(req.requiredByDate) : 'Immediate'}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: C.text1 }}>
                            {fmtR(req.estimatedTotal)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 12,
                                background: req.procurementStatus === 'approved' ? C.greenBg : req.procurementStatus === 'rejected' ? C.redBg : C.amberBg,
                                color: req.procurementStatus === 'approved' ? C.green : req.procurementStatus === 'rejected' ? C.red : C.amber,
                              }}
                            >
                              {req.procurementStatus === 'approved' ? <CheckCircle size={12} weight="fill" /> : <Clock size={12} weight="fill" />}
                              Procurement: {req.procurementStatus.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 12,
                                background: req.accountsStatus === 'approved' ? C.greenBg : req.accountsStatus === 'rejected' ? C.redBg : C.amberBg,
                                color: req.accountsStatus === 'approved' ? C.green : req.accountsStatus === 'rejected' ? C.red : C.amber,
                              }}
                            >
                              {req.accountsStatus === 'approved' ? <CheckCircle size={12} weight="fill" /> : <Clock size={12} weight="fill" />}
                              Accounts: {req.accountsStatus.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: 20,
                                background: status.bg,
                                color: status.color,
                              }}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Eye size={13} />}
                                onClick={() => setSelectedReq(req)}
                              >
                                Review
                              </Button>

                              {req.status === 'approved' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<ShoppingCart size={13} />}
                                  onClick={() => convertPoM.mutate(req.id)}
                                  disabled={convertPoM.isPending}
                                >
                                  Generate PO
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3 }}>Total Purchase Orders</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginTop: 4 }}>{poTotalCount}</div>
            </div>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Total Commitment</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4 }}>{fmtL(poTotalValue)}</div>
            </div>
            <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Completed Orders</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{poCompletedCount}</div>
            </div>
          </div>

          {/* Orders Table */}
          <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {loadingOrders ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : orders.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: C.text3 }}>
                <ShoppingCart size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>No purchase orders issued yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Approve a material indent to generate a PO or create a direct PO.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>PO Number / Date</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Vendor / Supplier</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Ref. Indent</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Items Count</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Grand Total (₹)</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((po: any) => {
                      const status = PO_STATUS_META[po.status] || PO_STATUS_META.draft;
                      return (
                        <tr key={po.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: C.text1 }}>{po.poNumber}</div>
                            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{formatDate(po.orderDate)}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: C.text1 }}>{po.vendorName}</div>
                            <div style={{ fontSize: 11, color: C.text3 }}>GSTIN: {po.vendorGstin || 'Unregistered'}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: C.text2 }}>
                            {po.requisition?.reqNumber || (po.requisitionId ? 'Linked' : 'Direct Order')}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.text2 }}>
                            {po.items?.length || 0} items
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: C.text1 }}>
                            {fmtR(po.grandTotal)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: 20,
                                background: status.bg,
                                color: status.color,
                              }}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<DownloadSimple size={13} />}
                                onClick={() => procurementApi.downloadPoPdf(po.id, po.poNumber)}
                              >
                                PDF
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Eye size={13} />}
                                onClick={() => setSelectedPo(po)}
                              >
                                Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REQUISITION REVIEW & DUAL HO APPROVAL */}
      {selectedReq && (
        <Modal
          open={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`Material Indent Review: ${selectedReq.reqNumber}`}
          width={760}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header info */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>{selectedReq.title}</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
                  Site: <b>{selectedReq.siteLocation}</b> · Raised by: <b>{selectedReq.requestedByName}</b>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: C.text3 }}>Required By:</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{selectedReq.requiredByDate ? formatDate(selectedReq.requiredByDate) : 'ASAP'}</div>
              </div>
            </div>

            {selectedReq.justification && (
              <div style={{ fontSize: 13, color: C.text2 }}>
                <b>Scope &amp; Justification:</b> {selectedReq.justification}
              </div>
            )}

            {selectedReq.attachmentUrl && (
              <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: C.blue }}>
                <Paperclip size={16} />
                <a href={selectedReq.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: C.blue, textDecoration: 'underline' }}>
                  View Attached Vendor Quotation / Specification Sheet
                </a>
              </div>
            )}

            {/* Line items table */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 8 }}>Requisition Items &amp; Quantities</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: `1px solid ${C.border}` }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Est. Rate (₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Est. Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReq.items?.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.itemDescription}</td>
                      <td style={{ padding: '8px 10px', color: C.text2 }}>{item.category}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtR(item.estimatedRate)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmtR(item.estimatedAmount)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <td colSpan={4} style={{ padding: '10px', textAlign: 'right' }}>Total Estimated Amount:</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: C.blue }}>{fmtR(selectedReq.estimatedTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dual HO Approval Status & Review Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Box 1: HO Procurement */}
              <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>1. HO Procurement Review</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: selectedReq.procurementStatus === 'approved' ? C.greenBg : selectedReq.procurementStatus === 'rejected' ? C.redBg : C.amberBg,
                      color: selectedReq.procurementStatus === 'approved' ? C.green : selectedReq.procurementStatus === 'rejected' ? C.red : C.amber,
                    }}
                  >
                    {selectedReq.procurementStatus.toUpperCase()}
                  </span>
                </div>

                {selectedReq.procurementStatus !== 'pending' ? (
                  <div style={{ fontSize: 12, color: C.text2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>Reviewed by: <b>{selectedReq.procurementApprovedByName}</b></div>
                    <div>Recommended Vendor: <b>{selectedReq.recommendedVendor || 'None specified'}</b></div>
                    <div>Remarks: <i>{selectedReq.procurementRemarks || 'Approved as requested.'}</i></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input
                      label="Recommended Vendor"
                      placeholder="e.g. J&K Steel Works, Srinagar"
                      value={hoVendor}
                      onChange={(e) => setHoVendor(e.target.value)}
                    />
                    <Input
                      label="Procurement Remarks"
                      placeholder="Technical specs & quotation verified"
                      value={hoRemarks}
                      onChange={(e) => setHoRemarks(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={() => approveHoM.mutate({
                          department: 'procurement',
                          action: 'approved',
                          recommendedVendor: hoVendor,
                          remarks: hoRemarks,
                        })}
                        disabled={approveHoM.isPending}
                      >
                        Approve (Procurement)
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => approveHoM.mutate({
                          department: 'procurement',
                          action: 'rejected',
                          remarks: hoRemarks,
                        })}
                        disabled={approveHoM.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: HO Accounts */}
              <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>2. HO Accounts Review</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: selectedReq.accountsStatus === 'approved' ? C.greenBg : selectedReq.accountsStatus === 'rejected' ? C.redBg : C.amberBg,
                      color: selectedReq.accountsStatus === 'approved' ? C.green : selectedReq.accountsStatus === 'rejected' ? C.red : C.amber,
                    }}
                  >
                    {selectedReq.accountsStatus.toUpperCase()}
                  </span>
                </div>

                {selectedReq.accountsStatus !== 'pending' ? (
                  <div style={{ fontSize: 12, color: C.text2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>Reviewed by: <b>{selectedReq.accountsApprovedByName}</b></div>
                    <div>Budget Head: <b>{selectedReq.budgetHead || 'Civil Materials'}</b></div>
                    <div>Remarks: <i>{selectedReq.accountsRemarks || 'Approved as requested.'}</i></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input
                      label="Budget Cost Head"
                      placeholder="e.g. Dal Lake Civil Works"
                      value={hoBudgetHead}
                      onChange={(e) => setHoBudgetHead(e.target.value)}
                    />
                    <Input
                      label="Accounts Remarks"
                      placeholder="Budget available, approved for PO"
                      value={hoRemarks}
                      onChange={(e) => setHoRemarks(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={() => approveHoM.mutate({
                          department: 'accounts',
                          action: 'approved',
                          budgetHead: hoBudgetHead,
                          remarks: hoRemarks,
                        })}
                        disabled={approveHoM.isPending}
                      >
                        Approve (Accounts)
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => approveHoM.mutate({
                          department: 'accounts',
                          action: 'rejected',
                          remarks: hoRemarks,
                        })}
                        disabled={approveHoM.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* If fully approved: Conversion Prompt */}
            {selectedReq.status === 'approved' && (
              <div style={{ background: C.greenBg, border: `1.5px solid ${C.green}`, borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Ready to Generate Purchase Order (PO)</div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                    Both HO Procurement and Accounts approvals are complete. You can now issue the formal PO.
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  icon={<ShoppingCart size={16} />}
                  onClick={() => convertPoM.mutate(selectedReq.id)}
                  disabled={convertPoM.isPending}
                >
                  Generate Purchase Order
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL: PURCHASE ORDER DETAILS */}
      {selectedPo && (
        <Modal
          open={!!selectedPo}
          onClose={() => setSelectedPo(null)}
          title={`Purchase Order: ${selectedPo.poNumber}`}
          width={760}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{selectedPo.vendorName}</div>
                <div style={{ fontSize: 12, color: C.text2 }}>GSTIN: {selectedPo.vendorGstin || 'Unregistered'}</div>
                <div style={{ fontSize: 12, color: C.text3 }}>{selectedPo.vendorAddress}</div>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<DownloadSimple size={16} />}
                onClick={() => procurementApi.downloadPoPdf(selectedPo.id, selectedPo.poNumber)}
              >
                Download Official PO (PDF)
              </Button>
            </div>

            {/* PO Line Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: `1px solid ${C.border}` }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>HSN</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>GST %</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {selectedPo.items?.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.itemDescription}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: C.text3 }}>{item.hsnCode || '-'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtR(item.unitRate)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.gstRate}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmtR(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total breakdown */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.text2 }}>Subtotal:</span>
                  <b>{fmtR(selectedPo.subtotalAmount)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.text2 }}>GST Tax:</span>
                  <b>{fmtR(selectedPo.taxAmount)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.text2 }}>Freight:</span>
                  <b>{fmtR(selectedPo.freightCharges)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1.5px solid ${C.border}`, paddingTop: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 800, color: C.navy }}>Grand Total:</span>
                  <span style={{ fontWeight: 800, color: C.blue }}>{fmtR(selectedPo.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Status change actions */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.text2 }}>
                Current Status: <b>{PO_STATUS_META[selectedPo.status]?.label || selectedPo.status}</b>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedPo.status === 'issued' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updatePoStatusM.mutate({ id: selectedPo.id, status: 'completed' })}
                  >
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: NEW MATERIAL INDENT */}
      {showNewReqModal && (
        <Modal
          open={showNewReqModal}
          onClose={() => setShowNewReqModal(false)}
          title="Submit Site Material Requisition (Indent)"
          width={760}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Input
                label="Requisition Title / Purpose *"
                placeholder="e.g. Fe500D Reinforcement for Wet Well"
                value={newReq.title}
                onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
              />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 4, display: 'block' }}>Priority</label>
                <select
                  value={newReq.priority}
                  onChange={(e: any) => setNewReq({ ...newReq, priority: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Site / Pumping Station Location"
                value={newReq.siteLocation}
                onChange={(e) => setNewReq({ ...newReq, siteLocation: e.target.value })}
              />
              <Input
                label="Required By Date"
                type="date"
                value={newReq.requiredByDate}
                onChange={(e) => setNewReq({ ...newReq, requiredByDate: e.target.value })}
              />
            </div>

            <Input
              label="Engineering Scope / Technical Justification"
              placeholder="Why is this material required? Specify excavation zone or structural component."
              value={newReq.justification}
              onChange={(e) => setNewReq({ ...newReq, justification: e.target.value })}
            />

            <Input
              label="Attachment URL (Vendor Quote / Drawing / Spec Sheet)"
              placeholder="https://... or link to Google Drive / file"
              value={newReq.attachmentUrl}
              onChange={(e) => setNewReq({ ...newReq, attachmentUrl: e.target.value })}
            />

            {/* Dynamic Items Builder */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Itemized Materials Required</span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={12} />}
                  onClick={() =>
                    setNewReq({
                      ...newReq,
                      items: [
                        ...newReq.items,
                        { itemDescription: '', category: 'Civil', quantity: 1, unit: 'Nos', estimatedRate: 0, estimatedAmount: 0 },
                      ],
                    })
                  }
                >
                  Add Line Item
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {newReq.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 70px 100px 36px', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder="Item name / specs"
                      value={item.itemDescription}
                      onChange={(e) => {
                        const copy = [...newReq.items];
                        copy[idx].itemDescription = e.target.value;
                        setNewReq({ ...newReq, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      placeholder="Category"
                      value={item.category}
                      onChange={(e) => {
                        const copy = [...newReq.items];
                        copy[idx].category = e.target.value;
                        setNewReq({ ...newReq, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...newReq.items];
                        copy[idx].quantity = parseFloat(e.target.value) || 0;
                        copy[idx].estimatedAmount = (copy[idx].quantity || 0) * (copy[idx].estimatedRate || 0);
                        setNewReq({ ...newReq, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) => {
                        const copy = [...newReq.items];
                        copy[idx].unit = e.target.value;
                        setNewReq({ ...newReq, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      placeholder="Rate ₹"
                      value={item.estimatedRate}
                      onChange={(e) => {
                        const copy = [...newReq.items];
                        copy[idx].estimatedRate = parseFloat(e.target.value) || 0;
                        copy[idx].estimatedAmount = (copy[idx].quantity || 0) * (copy[idx].estimatedRate || 0);
                        setNewReq({ ...newReq, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    {newReq.items.length > 1 ? (
                      <button
                        onClick={() => {
                          const copy = newReq.items.filter((_, i) => i !== idx);
                          setNewReq({ ...newReq, items: copy });
                        }}
                        style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}
                      >
                        <Trash size={16} />
                      </button>
                    ) : <div />}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => setShowNewReqModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => createReqM.mutate()}
                disabled={createReqM.isPending || !newReq.title || newReq.items.some((i) => !i.itemDescription)}
              >
                Submit Indent to Head Office
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: DIRECT PURCHASE ORDER */}
      {showNewPoModal && (
        <Modal
          open={showNewPoModal}
          onClose={() => setShowNewPoModal(false)}
          title="Issue Direct Purchase Order (Head Office)"
          width={760}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Vendor Name *"
                placeholder="e.g. Shalimar Steel & Hardware"
                value={newPo.vendorName}
                onChange={(e) => setNewPo({ ...newPo, vendorName: e.target.value })}
              />
              <Input
                label="Vendor GSTIN"
                placeholder="01AAAAA0000A1Z5"
                value={newPo.vendorGstin}
                onChange={(e) => setNewPo({ ...newPo, vendorGstin: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Contact Person / Phone"
                placeholder="Mr. Mushtaq (9419000000)"
                value={newPo.vendorContactPerson}
                onChange={(e) => setNewPo({ ...newPo, vendorContactPerson: e.target.value })}
              />
              <Input
                label="Vendor Email"
                placeholder="vendor@domain.com"
                value={newPo.vendorEmail}
                onChange={(e) => setNewPo({ ...newPo, vendorEmail: e.target.value })}
              />
            </div>

            <Input
              label="Vendor Address"
              value={newPo.vendorAddress}
              onChange={(e) => setNewPo({ ...newPo, vendorAddress: e.target.value })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Payment Terms"
                value={newPo.paymentTerms}
                onChange={(e) => setNewPo({ ...newPo, paymentTerms: e.target.value })}
              />
              <Input
                label="Freight / Delivery Charges (₹)"
                type="number"
                value={newPo.freightCharges}
                onChange={(e) => setNewPo({ ...newPo, freightCharges: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>PO Line Items</span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={12} />}
                  onClick={() =>
                    setNewPo({
                      ...newPo,
                      items: [
                        ...newPo.items,
                        { itemDescription: '', hsnCode: '', quantity: 1, unit: 'Nos', unitRate: 0, discountPercent: 0, gstRate: 18 },
                      ],
                    })
                  }
                >
                  Add Item
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {newPo.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 70px 60px 90px 70px 36px', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder="Item Description"
                      value={item.itemDescription}
                      onChange={(e) => {
                        const copy = [...newPo.items];
                        copy[idx].itemDescription = e.target.value;
                        setNewPo({ ...newPo, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      placeholder="HSN"
                      value={item.hsnCode}
                      onChange={(e) => {
                        const copy = [...newPo.items];
                        copy[idx].hsnCode = e.target.value;
                        setNewPo({ ...newPo, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...newPo.items];
                        copy[idx].quantity = parseFloat(e.target.value) || 0;
                        setNewPo({ ...newPo, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) => {
                        const copy = [...newPo.items];
                        copy[idx].unit = e.target.value;
                        setNewPo({ ...newPo, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      placeholder="Rate ₹"
                      value={item.unitRate}
                      onChange={(e) => {
                        const copy = [...newPo.items];
                        copy[idx].unitRate = parseFloat(e.target.value) || 0;
                        setNewPo({ ...newPo, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      placeholder="GST %"
                      value={item.gstRate}
                      onChange={(e) => {
                        const copy = [...newPo.items];
                        copy[idx].gstRate = parseFloat(e.target.value) || 0;
                        setNewPo({ ...newPo, items: copy });
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                    {newPo.items.length > 1 ? (
                      <button
                        onClick={() => {
                          const copy = newPo.items.filter((_, i) => i !== idx);
                          setNewPo({ ...newPo, items: copy });
                        }}
                        style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}
                      >
                        <Trash size={16} />
                      </button>
                    ) : <div />}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => setShowNewPoModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => createPoM.mutate()}
                disabled={createPoM.isPending || !newPo.vendorName || newPo.items.some((i) => !i.itemDescription)}
              >
                Issue Purchase Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
