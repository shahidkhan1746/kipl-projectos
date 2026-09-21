import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { procurementApi } from '@/api/procurement.api';
import { accountingApi } from '@/api/accounting.api';
import { masterDataApi } from '@/api/masterData.api';
import {
  FileText,
  Plus,
  DownloadSimple,
  Eye,
  CheckCircle,
  Clock,
  WarningCircle,
  XCircle,
  Trash,
  Check,
  ShieldCheck,
  CurrencyInr,
} from '@phosphor-icons/react';
import { formatDate } from '@/lib/date';
import { toast } from '@/lib/notify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { generatePaymentRequisitionPdf } from './paymentRequisitionPdf';
import { OFFICIAL_PROJECT_ZONES } from '@/lib/materialCatalog';

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
  excelGreen: '#a9d08e',
  excelGreenText: '#1e3919',
};

const MATERIAL_SERVICE_TYPES = [
  'Material',
  'Services',
  'Equipment Rental',
  'Subcontract Work',
  'POL / Fuel',
  'Civil / Masonry Work',
  'Electrical / Mechanical',
  'Other',
];

const PAYMENT_MODES = [
  'RTGS',
  'NEFT',
  'Cheque',
  'Direct Bank Transfer',
  'Cash',
];

const SITE_LOCATIONS_PRESETS = OFFICIAL_PROJECT_ZONES;

const PR_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
  submitted_to_ho: { label: 'Submitted to HO', color: C.amber, bg: C.amberBg },
  partially_approved: { label: 'Partially Approved', color: C.purple, bg: C.purpleBg },
  approved: { label: 'Fully Approved', color: C.green, bg: C.greenBg },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
  rejected: { label: 'Rejected', color: C.red, bg: C.redBg },
};

const fmtR = (n: any) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtL = (n: any) => '₹' + ((Number(n) || 0) / 100000).toFixed(2) + ' L';

interface ItemFormState {
  vendorId?: string;
  vendorName: string;
  description: string;
  materialOrServices: string;
  isMsme: boolean;
  totalOrderCost: number;
  advancePaid: number;
  amountToPay: number;
  balanceAmount: number;
  siteLocation: string;
  remark: string;
  againstRef: string;
  modeOfPayment: string;
}

export function PaymentRequisitionTab({ activeProjectId }: { activeProjectId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewPrModal, setShowNewPrModal] = useState(false);
  const [selectedPr, setSelectedPr] = useState<any | null>(null);

  // HO Approval Input state inside details modal
  const [approvalRemarks, setApprovalRemarks] = useState('');

  // Form State for creating a new Payment Requisition
  const [prForm, setPrForm] = useState<{
    title: string;
    prDate: string;
    siteLocation: string;
    notes: string;
    items: ItemFormState[];
  }>({
    title: 'Payment Requisition - Site Materials & Services',
    prDate: new Date().toISOString().split('T')[0],
    siteLocation: SITE_LOCATIONS_PRESETS[0],
    notes: '',
    items: [
      {
        vendorName: '',
        description: 'Purchase of Stone Aggregate',
        materialOrServices: 'Material',
        isMsme: true,
        totalOrderCost: 0,
        advancePaid: 0,
        amountToPay: 0,
        balanceAmount: 0,
        siteLocation: SITE_LOCATIONS_PRESETS[0],
        remark: 'Against Tax Invoice',
        againstRef: '',
        modeOfPayment: 'RTGS',
      },
    ],
  });

  // Queries
  const { data: dbSiteZones = [] } = useQuery({
    queryKey: ['master-data-site-zones'],
    queryFn: () => masterDataApi.list({ type: 'site_zone', activeOnly: true }).then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const availableSiteLocations = useMemo(() => {
    if (dbSiteZones && dbSiteZones.length > 0) {
      return dbSiteZones.map((z: any) => z.label || z.value);
    }
    return SITE_LOCATIONS_PRESETS;
  }, [dbSiteZones]);

  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ['payment-requisitions', activeProjectId, filterStatus],
    queryFn: () => procurementApi.getPaymentRequisitions(activeProjectId, filterStatus).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['accounting-vendors', activeProjectId],
    queryFn: () => accountingApi.vendors({ projectId: activeProjectId }).then((r: any) => r.data?.items ?? r.data ?? []),
    enabled: !!activeProjectId,
  });

  // Dual Approval Mutations
  const approveHoM = useMutation({
    mutationFn: ({ department, action }: { department: 'procurement' | 'accounts'; action: 'approved' | 'rejected' }) =>
      procurementApi.approveHoPaymentRequisition(selectedPr.id, {
        department,
        action,
        remarks: approvalRemarks,
      }),
    onSuccess: (res: any) => {
      toast.success('Approval decision recorded successfully.');
      qc.invalidateQueries({ queryKey: ['payment-requisitions'] });
      setSelectedPr(res.data);
      setApprovalRemarks('');
    },
    onError: (err: any) => toast.error('Approval failed: ' + (err?.response?.data?.message ?? err?.message)),
  });

  // Create Mutation
  const createPrM = useMutation({
    mutationFn: (status: 'draft' | 'submitted_to_ho') => {
      const itemsPayload = prForm.items.map((i, idx) => ({
        srNo: idx + 1,
        vendorId: i.vendorId,
        vendorName: i.vendorName.trim() || 'Vendor ' + (idx + 1),
        description: i.description,
        materialOrServices: i.materialOrServices,
        isMsme: i.isMsme,
        totalOrderCost: Number(i.totalOrderCost) || 0,
        advancePaid: Number(i.advancePaid) || 0,
        amountToPay: Number(i.amountToPay) || 0,
        balanceAmount: Number(i.balanceAmount) || 0,
        siteLocation: i.siteLocation || prForm.siteLocation,
        remark: i.remark,
        againstRef: i.againstRef,
        modeOfPayment: i.modeOfPayment,
      }));

      return procurementApi.createPaymentRequisition({
        projectId: activeProjectId,
        title: prForm.title,
        prDate: prForm.prDate,
        siteLocation: prForm.siteLocation,
        notes: prForm.notes,
        status,
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      toast.success('Payment Requisition created successfully!');
      qc.invalidateQueries({ queryKey: ['payment-requisitions'] });
      setShowNewPrModal(false);
      resetPrForm();
    },
    onError: (err: any) => toast.error('Error creating requisition: ' + (err?.response?.data?.message ?? err?.message)),
  });

  const cancelPrM = useMutation({
    mutationFn: (id: string) => procurementApi.cancelPaymentRequisition(id, 'Cancelled by user'),
    onSuccess: () => {
      toast.success('Payment Requisition cancelled.');
      qc.invalidateQueries({ queryKey: ['payment-requisitions'] });
      if (selectedPr) setSelectedPr(null);
    },
    onError: (err: any) => toast.error('Failed to cancel: ' + (err?.response?.data?.message ?? err?.message)),
  });

  function resetPrForm() {
    setPrForm({
      title: 'Payment Requisition - Site Materials & Services',
      prDate: new Date().toISOString().split('T')[0],
      siteLocation: SITE_LOCATIONS_PRESETS[0],
      notes: '',
      items: [
        {
          vendorName: '',
          description: 'Purchase of Stone Aggregate',
          materialOrServices: 'Material',
          isMsme: true,
          totalOrderCost: 0,
          advancePaid: 0,
          amountToPay: 0,
          balanceAmount: 0,
          siteLocation: SITE_LOCATIONS_PRESETS[0],
          remark: 'Against Tax Invoice',
          againstRef: '',
          modeOfPayment: 'RTGS',
        },
      ],
    });
  }

  // Row update helpers
  function updateItem(index: number, patch: Partial<ItemFormState>) {
    setPrForm((prev) => {
      const nextItems = [...prev.items];
      const cur = { ...nextItems[index], ...patch };
      // Auto-calculate balance
      const total = Number(cur.totalOrderCost) || 0;
      const adv = Number(cur.advancePaid) || 0;
      const pay = Number(cur.amountToPay) || 0;
      cur.balanceAmount = Math.max(0, total - adv - pay);
      nextItems[index] = cur;
      return { ...prev, items: nextItems };
    });
  }

  function addItem() {
    setPrForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          vendorName: '',
          description: '',
          materialOrServices: 'Material',
          isMsme: true,
          totalOrderCost: 0,
          advancePaid: 0,
          amountToPay: 0,
          balanceAmount: 0,
          siteLocation: prev.siteLocation,
          remark: 'Against Tax Invoice',
          againstRef: '',
          modeOfPayment: 'RTGS',
        },
      ],
    }));
  }

  function removeItem(index: number) {
    if (prForm.items.length <= 1) {
      toast.error('At least one item is required.');
      return;
    }
    setPrForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  // Totals calculations
  const formTotalCost = prForm.items.reduce((s, it) => s + (Number(it.totalOrderCost) || 0), 0);
  const formAdvancePaid = prForm.items.reduce((s, it) => s + (Number(it.advancePaid) || 0), 0);
  const formAmountToPay = prForm.items.reduce((s, it) => s + (Number(it.amountToPay) || 0), 0);
  const formBalance = prForm.items.reduce((s, it) => s + (Number(it.balanceAmount) || 0), 0);

  // Overall Stats
  const totalCount = requisitions.length;
  const grandTotalCost = requisitions.reduce((s: number, r: any) => s + (Number(r.totalOrderCost) || 0), 0);
  const grandAmountToPay = requisitions.reduce((s: number, r: any) => s + (Number(r.totalAmountToPay) || 0), 0);
  const grandBalance = requisitions.reduce((s: number, r: any) => s + (Number(r.totalBalance) || 0), 0);
  const pendingHoCount = requisitions.filter(
    (r: any) => r.status === 'submitted_to_ho' || r.status === 'partially_approved',
  ).length;

  // Role Checks for Dual Approval
  const userRole = user?.role || '';
  const canProcurementApprove =
    ['super_admin', 'admin', 'project_manager', 'engineer'].includes(userRole) &&
    selectedPr?.procurementStatus === 'pending' &&
    selectedPr?.requestedById !== user?.id &&
    selectedPr?.accountsApprovedById !== user?.id;

  const canAccountsApprove =
    ['super_admin', 'admin', 'accounts', 'accountant'].includes(userRole) &&
    selectedPr?.accountsStatus === 'pending' &&
    selectedPr?.requestedById !== user?.id &&
    selectedPr?.procurementApprovedById !== user?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action Header & Quick Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={22} color={C.green} weight="duotone" />
            Official KIPL Payment Requisitions
          </h2>
          <p style={{ fontSize: 13, color: C.text3, margin: '2px 0 0 0' }}>
            13-Column Proforma Requisitions with Dual HO Approval (Procurement &amp; Accounts) and Official PDF Download
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => setShowNewPrModal(true)}
        >
          New Payment Requisition
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text3 }}>Total Payment Requisitions</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginTop: 4 }}>{totalCount}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>Awaiting HO Stamps</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 4 }}>{pendingHoCount}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Total Order / Material Cost</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4 }}>{fmtL(grandTotalCost)}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Total Amount to Pay In</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{fmtL(grandAmountToPay)}</div>
        </div>

        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Net Balance Outstanding</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.purple, marginTop: 4 }}>{fmtL(grandBalance)}</div>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {['all', 'submitted_to_ho', 'partially_approved', 'approved', 'draft', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: filterStatus === st ? 700 : 500,
              border: '1px solid ' + (filterStatus === st ? C.green : C.border),
              background: filterStatus === st ? C.greenBg : C.card,
              color: filterStatus === st ? C.green : C.text2,
              cursor: 'pointer',
            }}
          >
            {st === 'all' ? 'All Requisitions' : PR_STATUS_META[st]?.label || st}
          </button>
        ))}
      </div>

      {/* Requisitions List Table */}
      <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
        ) : requisitions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: C.text3 }}>
            <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>No payment requisitions found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Create a new payment requisition using the official 13-column Excel proforma format.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Req # / Date</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Title &amp; Site</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Items / Vendors</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Total Cost (₹)</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Amt to Pay In (₹)</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>HO Procurement</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>HO Accounts</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600 }}>Overall Status</th>
                  <th style={{ padding: '12px 16px', color: C.text3, fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((pr: any) => {
                  const status = PR_STATUS_META[pr.status] || PR_STATUS_META.draft;
                  return (
                    <tr key={pr.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: C.text1 }}>{pr.prNumber}</div>
                        <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{formatDate(pr.prDate)}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: C.text1 }}>{pr.title}</div>
                        <div style={{ fontSize: 11, color: C.text3 }}>{pr.siteLocation || 'Site'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.text2 }}>
                        {pr.items?.length || 0} line items
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text1 }}>
                        {fmtR(pr.totalOrderCost)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: C.green }}>
                        {fmtR(pr.totalAmountToPay)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {pr.procurementStatus === 'approved' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, padding: '2px 8px', borderRadius: 12 }}>
                            <CheckCircle size={13} weight="fill" /> Approved
                          </span>
                        ) : pr.procurementStatus === 'rejected' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.red, background: C.redBg, padding: '2px 8px', borderRadius: 12 }}>
                            <XCircle size={13} weight="fill" /> Rejected
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.amber, background: C.amberBg, padding: '2px 8px', borderRadius: 12 }}>
                            <Clock size={13} /> Pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {pr.accountsStatus === 'approved' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, padding: '2px 8px', borderRadius: 12 }}>
                            <CheckCircle size={13} weight="fill" /> Approved
                          </span>
                        ) : pr.accountsStatus === 'rejected' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.red, background: C.redBg, padding: '2px 8px', borderRadius: 12 }}>
                            <XCircle size={13} weight="fill" /> Rejected
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.amber, background: C.amberBg, padding: '2px 8px', borderRadius: 12 }}>
                            <Clock size={13} /> Pending
                          </span>
                        )}
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
                            onClick={() => generatePaymentRequisitionPdf(pr)}
                            title="Download Official Client PDF"
                          >
                            PDF
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Eye size={13} />}
                            onClick={() => setSelectedPr(pr)}
                          >
                            View Sheet
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: NEW PAYMENT REQUISITION (13-COLUMN BUILDER)
      ───────────────────────────────────────────────────────────── */}
      {showNewPrModal && (
        <Modal
          open={showNewPrModal}
          onClose={() => setShowNewPrModal(false)}
          title="Create Payment Requisition (Official KIPL Format)"
          width={1180}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Requisition Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.2fr', gap: 12 }}>
              <Input
                label="Requisition Title / Subject *"
                value={prForm.title}
                onChange={(e) => setPrForm({ ...prForm, title: e.target.value })}
                placeholder="e.g. Payment Requisition - Aggregates & Stone Bajri"
              />

              <Input
                type="date"
                label="Requisition Date *"
                value={prForm.prDate}
                onChange={(e: any) => setPrForm({ ...prForm, prDate: e.target.value })}
              />

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                  Site Location *
                </label>
                <select
                  value={prForm.siteLocation}
                  onChange={(e) => setPrForm({ ...prForm, siteLocation: e.target.value })}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #d1d5db',
                    fontSize: 13,
                    background: '#fff',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {availableSiteLocations.map((loc: string) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 13-Column Line Item Builder */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>
                  Line Items &amp; Vendor Payments ({prForm.items.length})
                </span>
                <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addItem}>
                  Add Item
                </Button>
              </div>

              <div style={{ overflowX: 'auto', border: `1.5px solid ${C.border}`, borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1050 }}>
                  <thead>
                    <tr style={{ background: C.excelGreen, color: C.excelGreenText, fontWeight: 700 }}>
                      <th style={{ padding: '8px 6px', width: 40, textAlign: 'center' }}>Sr</th>
                      <th style={{ padding: '8px 6px', width: 170 }}>Vendor Name</th>
                      <th style={{ padding: '8px 6px', width: 150 }}>Description</th>
                      <th style={{ padding: '8px 6px', width: 100 }}>Material/Serv</th>
                      <th style={{ padding: '8px 6px', width: 65, textAlign: 'center' }}>MSME</th>
                      <th style={{ padding: '8px 6px', width: 95 }}>Total Cost (₹)</th>
                      <th style={{ padding: '8px 6px', width: 90 }}>Adv Paid (₹)</th>
                      <th style={{ padding: '8px 6px', width: 95 }}>Amt To Pay (₹)</th>
                      <th style={{ padding: '8px 6px', width: 85 }}>Balance (₹)</th>
                      <th style={{ padding: '8px 6px', width: 110 }}>Against Ref</th>
                      <th style={{ padding: '8px 6px', width: 85 }}>Mode</th>
                      <th style={{ padding: '8px 6px', width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prForm.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700, color: C.text2 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            list={`vendor-list-${idx}`}
                            value={item.vendorName}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matched = vendors.find((v: any) => v.name === val);
                              updateItem(idx, {
                                vendorName: val,
                                vendorId: matched?.id,
                              });
                            }}
                            placeholder="Vendor Name"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 12,
                            }}
                          />
                          <datalist id={`vendor-list-${idx}`}>
                            {vendors.map((v: any) => (
                              <option key={v.id} value={v.name} />
                            ))}
                          </datalist>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="e.g. Purchase of Stone Aggregate"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 12,
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            value={item.materialOrServices}
                            onChange={(e) => updateItem(idx, { materialOrServices: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '6px 4px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 11,
                            }}
                          >
                            {MATERIAL_SERVICE_TYPES.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={item.isMsme}
                            onChange={(e) => updateItem(idx, { isMsme: e.target.checked })}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            value={item.totalOrderCost || ''}
                            onChange={(e) => updateItem(idx, { totalOrderCost: Number(e.target.value) || 0 })}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 12,
                              textAlign: 'right',
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            value={item.advancePaid || ''}
                            onChange={(e) => updateItem(idx, { advancePaid: Number(e.target.value) || 0 })}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 12,
                              textAlign: 'right',
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            value={item.amountToPay || ''}
                            onChange={(e) => updateItem(idx, { amountToPay: Number(e.target.value) || 0 })}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 12,
                              fontWeight: 700,
                              color: C.green,
                              textAlign: 'right',
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600, color: C.text1 }}>
                          {item.balanceAmount ? fmtR(item.balanceAmount) : '-'}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            value={item.againstRef}
                            onChange={(e) => updateItem(idx, { againstRef: e.target.value })}
                            placeholder="Inv #1098 / PO-01"
                            style={{
                              width: '100%',
                              padding: '6px 6px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 11,
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            value={item.modeOfPayment}
                            onChange={(e) => updateItem(idx, { modeOfPayment: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '6px 4px',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              fontSize: 11,
                            }}
                          >
                            {PAYMENT_MODES.map((pm) => (
                              <option key={pm} value={pm}>{pm}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: C.red,
                              cursor: 'pointer',
                              padding: 2,
                            }}
                            title="Remove row"
                          >
                            <Trash size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: `2px solid ${C.border}` }}>
                      <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right' }}>Total:</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{fmtR(formTotalCost)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{formAdvancePaid ? fmtR(formAdvancePaid) : '-'}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: C.green }}>{fmtR(formAmountToPay)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{formBalance ? fmtR(formBalance) : '-'}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: C.text2 }}>
                Net Amount Payable: <strong style={{ color: C.green, fontSize: 16 }}>{fmtR(formAmountToPay)}</strong>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setShowNewPrModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => createPrM.mutate('draft')}
                  disabled={createPrM.isPending || !prForm.title}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  onClick={() => createPrM.mutate('submitted_to_ho')}
                  disabled={createPrM.isPending || !prForm.title || formAmountToPay <= 0}
                >
                  Submit to Head Office
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW REQUISITION & 13-COL PROFORMA DETAIL
      ───────────────────────────────────────────────────────────── */}
      {selectedPr && (
        <Modal
          open={!!selectedPr}
          onClose={() => setSelectedPr(null)}
          title={`Payment Requisition - ${selectedPr.prNumber}`}
          width={1180}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Top Excel Styled Proforma Card */}
            <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Project Scope Header Banner (Cell A1) */}
              <div
                style={{
                  background: '#f8fafc',
                  borderBottom: `1px solid ${C.border}`,
                  padding: '10px 16px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  lineHeight: 1.4,
                }}
              >
                Survey Design and Execution of Sewerage Scheme Dal Lake Uncovered Areas Pollution Abatement of Dal Lake Uncovered Areas Kashmir J&amp;K on EPC Fixed Cost Turnkey Basis incld. Operation and Maintenance for 5 years after successful completion of free trial run of 6 months.
              </div>

              {/* Subheader: PAYMENT REQUISITION & DATE */}
              <div
                style={{
                  background: '#bfbfbf',
                  padding: '8px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  color: '#111827',
                }}
              >
                <div style={{ flex: 1, textAlign: 'center', letterSpacing: '0.05em' }}>
                  PAYMENT REQUISITION
                </div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  DATE: {formatDate(selectedPr.prDate)}
                </div>
              </div>

              {/* 13-Column Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1050 }}>
                  <thead>
                    <tr style={{ background: C.excelGreen, color: C.excelGreenText, fontWeight: 700 }}>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', textAlign: 'center', width: 40 }}>SR. NO.</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 170 }}>VENDOR NAME</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 160 }}>DESCRIPTION</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 100 }}>MATERIAL / SERVICES</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', textAlign: 'center', width: 65 }}>MSME YES / NO</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', textAlign: 'right', width: 95 }}>Total Order/ Material Cost</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', textAlign: 'right', width: 90 }}>Advance Paid (Rs.)</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', textAlign: 'right', width: 95 }}>AMT TO PAY IN (RS.)</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', textAlign: 'right', width: 85 }}>Balance (Rs.)</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 120 }}>SITE</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 110 }}>REMARK</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 90 }}>AGAINST PI / TAX INV / PO</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #70ad47', width: 80 }}>MODE OF PAYMENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPr.items || []).map((it: any, idx: number) => (
                      <tr key={it.id || idx} style={{ borderBottom: '1px solid #d1d5db' }}>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', fontWeight: 600 }}>{it.vendorName}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb' }}>{it.description}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb' }}>{it.materialOrServices}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 600 }}>{it.isMsme ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{fmtR(it.totalOrderCost)}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{it.advancePaid ? fmtR(it.advancePaid) : '-'}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 700, color: C.green }}>{fmtR(it.amountToPay)}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{it.balanceAmount ? fmtR(it.balanceAmount) : '-'}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', fontSize: 11 }}>{it.siteLocation || selectedPr.siteLocation}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', fontSize: 11 }}>{it.remark || '-'}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', fontSize: 11 }}>{it.againstRef || '-'}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', fontSize: 11 }}>{it.modeOfPayment || 'RTGS'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #70ad47' }}>
                      <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right' }}>Total:</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{fmtR(selectedPr.totalOrderCost)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{selectedPr.totalAdvancePaid ? fmtR(selectedPr.totalAdvancePaid) : '-'}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: C.green, fontSize: 13 }}>{fmtR(selectedPr.totalAmountToPay)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{selectedPr.totalBalance ? fmtR(selectedPr.totalBalance) : '-'}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Thanking You & Signatory Blocks */}
              <div style={{ padding: '14px 20px', background: '#fff', borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 16 }}>
                  THANKING YOU
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, textAlign: 'center' }}>
                  {/* Signature 1: PREPARED BY */}
                  <div style={{ borderTop: `1.5px solid ${C.border}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>PREPARED BY</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginTop: 4 }}>
                      {selectedPr.requestedByName || 'Site Accountant / Engineer'}
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>Site Office Srinagar</div>
                  </div>

                  {/* Signature 2: AUTHORISED SIGNATORY */}
                  <div style={{ borderTop: `1.5px solid ${C.border}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>AUTHORISED SIGNATORY</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginTop: 4 }}>
                      HO Procurement &amp; HO Accounts
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>Head Office Navi Mumbai</div>
                  </div>

                  {/* Signature 3: RECEIVED BY */}
                  <div style={{ borderTop: `1.5px solid ${C.border}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>RECEIVED BY</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginTop: 4 }}>
                      Bank Settlement / Disbursal
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>Disbursement Section</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dual HO Approvals Card */}
            <div style={{ background: '#f8fafc', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={18} color={C.blue} weight="duotone" />
                Head Office Dual Approval Control (Role-Separated)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* 1. HO Procurement Review Box */}
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>1. HO Procurement Department</span>
                    {selectedPr.procurementStatus === 'approved' && (
                      <span style={{ color: C.green, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={14} weight="fill" /> Approved
                      </span>
                    )}
                    {selectedPr.procurementStatus === 'rejected' && (
                      <span style={{ color: C.red, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <XCircle size={14} weight="fill" /> Rejected
                      </span>
                    )}
                    {selectedPr.procurementStatus === 'pending' && (
                      <span style={{ color: C.amber, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} /> Pending
                      </span>
                    )}
                  </div>

                  {selectedPr.procurementApprovedByName && (
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 6 }}>
                      Reviewed By: <strong>{selectedPr.procurementApprovedByName}</strong> on{' '}
                      {formatDate(selectedPr.procurementApprovedAt)}
                    </div>
                  )}
                  {selectedPr.procurementRemarks && (
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 4, fontStyle: 'italic' }}>
                      "{selectedPr.procurementRemarks}"
                    </div>
                  )}

                  {canProcurementApprove && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Check size={13} />}
                        onClick={() => approveHoM.mutate({ department: 'procurement', action: 'approved' })}
                        disabled={approveHoM.isPending}
                      >
                        Approve (Procurement)
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => approveHoM.mutate({ department: 'procurement', action: 'rejected' })}
                        disabled={approveHoM.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. HO Accounts Review Box */}
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>2. HO Accounts &amp; Finance</span>
                    {selectedPr.accountsStatus === 'approved' && (
                      <span style={{ color: C.green, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={14} weight="fill" /> Approved
                      </span>
                    )}
                    {selectedPr.accountsStatus === 'rejected' && (
                      <span style={{ color: C.red, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <XCircle size={14} weight="fill" /> Rejected
                      </span>
                    )}
                    {selectedPr.accountsStatus === 'pending' && (
                      <span style={{ color: C.amber, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} /> Pending
                      </span>
                    )}
                  </div>

                  {selectedPr.accountsApprovedByName && (
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 6 }}>
                      Reviewed By: <strong>{selectedPr.accountsApprovedByName}</strong> on{' '}
                      {formatDate(selectedPr.accountsApprovedAt)}
                    </div>
                  )}
                  {selectedPr.accountsRemarks && (
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 4, fontStyle: 'italic' }}>
                      "{selectedPr.accountsRemarks}"
                    </div>
                  )}

                  {canAccountsApprove && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Check size={13} />}
                        onClick={() => approveHoM.mutate({ department: 'accounts', action: 'approved' })}
                        disabled={approveHoM.isPending}
                      >
                        Approve (Accounts)
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => approveHoM.mutate({ department: 'accounts', action: 'rejected' })}
                        disabled={approveHoM.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {(canProcurementApprove || canAccountsApprove) && (
                <div style={{ marginTop: 10 }}>
                  <Input
                    label="HO Review Remarks / Recommendation"
                    placeholder="Enter approval note, audit code, or budget verification remarks..."
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                {selectedPr.status === 'draft' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => cancelPrM.mutate(selectedPr.id)}
                    disabled={cancelPrM.isPending}
                  >
                    Cancel Requisition
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  variant="secondary"
                  icon={<DownloadSimple size={15} />}
                  onClick={() => generatePaymentRequisitionPdf(selectedPr)}
                >
                  Download PDF (Instant)
                </Button>
                <Button
                  variant="secondary"
                  icon={<DownloadSimple size={15} />}
                  onClick={() => procurementApi.downloadPaymentRequisitionPdf(selectedPr.id, selectedPr.prNumber)}
                >
                  Official Server PDF
                </Button>
                <Button variant="primary" onClick={() => setSelectedPr(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
