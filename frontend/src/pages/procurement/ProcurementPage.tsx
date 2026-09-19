import { useState, useRef, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { procurementApi } from '@/api/procurement.api';
import { accountingApi } from '@/api/accounting.api';
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
  UploadSimple,
  ShieldCheck,
  Scales,
} from '@phosphor-icons/react';
import { formatDate } from '@/lib/date';
import { toast } from '@/lib/notify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { PaymentRequisitionTab } from './PaymentRequisitionTab';
import { GoodsReceiptNotesTab } from './GoodsReceiptNotesTab';
import { ThreeWayMatchTab } from './ThreeWayMatchTab';

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

// ─────────────────────────────────────────────────────────────
// PRESET CATALOGS & DROPDOWN VALUES
// ─────────────────────────────────────────────────────────────
const SITE_LOCATIONS = [
  'Habak STP (Main Treatment Plant)',
  'Hazratbal Pumping Station (Zone 1)',
  'Nishat Pumping Station (Zone 2)',
  'Brane / Brein Pumping Station (Zone 3)',
  'Dalgate Pumping Station (Zone 4)',
  'Habak - Hazratbal Trunk Rising Main',
  'Nishat - Dalgate Trunk Interceptor',
  'Central Batching Plant & Stores (Habak)',
  'Mechanical Workshop & Fabrication Yard',
  'Outfall Channel / Dal Lake Shoreline',
  'Other / Custom Site Location',
];

const WORK_COMPONENTS = [
  'Sewer Pipeline Trenching & Pipe Laying',
  'Pumping Station Wet Well / Dry Well Structure',
  'STP SBR Basins & Inlet Civil Works',
  'Electromechanical Pumps, Valves & Piping',
  'Road Cutting & Trench Reinstatement',
  'Safety Shoring & Dewatering Works',
  'Electrical Panels, Cabling & DG Sets',
  'O&M Consumables & Lab Chemical Dosing',
  'Camp & Site Infrastructure',
  'Other Civil / Mechanical Scope',
];

interface CatalogEntry {
  name: string;
  defaultUnit: string;
  spec: string;
}

const MATERIAL_CATALOG: Record<string, CatalogEntry[]> = {
  'Reinforcement Steel': [
    { name: 'TMT Fe500D 8mm (IS 1786)', defaultUnit: 'MT', spec: 'High ductile TMT rebar for seismic Zone V' },
    { name: 'TMT Fe500D 10mm (IS 1786)', defaultUnit: 'MT', spec: 'High ductile TMT rebar' },
    { name: 'TMT Fe500D 12mm (IS 1786)', defaultUnit: 'MT', spec: 'High ductile TMT rebar' },
    { name: 'TMT Fe500D 16mm (IS 1786)', defaultUnit: 'MT', spec: 'High ductile TMT rebar for main reinforcement' },
    { name: 'TMT Fe500D 20mm (IS 1786)', defaultUnit: 'MT', spec: 'Heavy structural reinforcement' },
    { name: 'TMT Fe500D 25mm (IS 1786)', defaultUnit: 'MT', spec: 'Foundation and raft reinforcement' },
    { name: 'TMT Fe500D 32mm (IS 1786)', defaultUnit: 'MT', spec: 'Heavy civil raft / column rebar' },
    { name: 'GI Binding Wire (18 Gauge)', defaultUnit: 'Kg', spec: 'Annealed galvanized binding wire' },
    { name: 'Concrete Cover Blocks 40mm/50mm', defaultUnit: 'Nos', spec: 'High strength cementitious cover spacers' },
  ],
  'Cement & Pozzolana': [
    { name: 'OPC 53 Grade Cement (IS 12269)', defaultUnit: 'Bags', spec: 'High strength ordinary Portland cement (50kg bags)' },
    { name: 'OPC 43 Grade Cement (IS 8112)', defaultUnit: 'Bags', spec: 'Standard Portland cement for general RCC' },
    { name: 'PPC Portland Pozzolana Cement (IS 1489)', defaultUnit: 'Bags', spec: 'Fly-ash blended cement for hydraulic structures' },
    { name: 'Non-Shrink Structural Grout (GP2)', defaultUnit: 'Bags', spec: 'Free-flow cementitious grout for machinery baseplates' },
    { name: 'Rapid Hardening Repair Mortar', defaultUnit: 'Bags', spec: 'Quick-setting polymer modified mortar' },
  ],
  'Pipes & Conduits': [
    { name: 'DI K9 Pipe 150mm dia (IS 8329)', defaultUnit: 'Metre', spec: 'Ductile iron socket & spigot pressure pipe' },
    { name: 'DI K9 Pipe 200mm dia (IS 8329)', defaultUnit: 'Metre', spec: 'Ductile iron rising main pipe' },
    { name: 'DI K9 Pipe 250mm dia (IS 8329)', defaultUnit: 'Metre', spec: 'Ductile iron sewer rising main' },
    { name: 'DI K9 Pipe 300mm dia (IS 8329)', defaultUnit: 'Metre', spec: 'Heavy duty trunk main pipe' },
    { name: 'HDPE PN10 Pipe 110mm dia (PE100)', defaultUnit: 'Metre', spec: 'High density polyethylene pressure pipe' },
    { name: 'HDPE PN10 Pipe 160mm dia (PE100)', defaultUnit: 'Metre', spec: 'HDPE trunk rising main' },
    { name: 'HDPE PN10 Pipe 200mm dia (PE100)', defaultUnit: 'Metre', spec: 'HDPE outfall and sub-main pipe' },
    { name: 'RCC NP3 Pipe 300mm dia (IS 458)', defaultUnit: 'Metre', spec: 'Reinforced concrete non-pressure pipe' },
    { name: 'RCC NP3 Pipe 450mm dia (IS 458)', defaultUnit: 'Metre', spec: 'Reinforced concrete trunk gravity sewer' },
    { name: 'RCC NP3 Pipe 600mm dia (IS 458)', defaultUnit: 'Metre', spec: 'Large diameter RCC sewer pipe' },
  ],
  'Valves & Flow Controls': [
    { name: 'CI Sluice Valve 150mm PN 1.0 (IS 14846)', defaultUnit: 'Nos', spec: 'Cast iron resilient seated sluice valve' },
    { name: 'CI Sluice Valve 200mm PN 1.0 (IS 14846)', defaultUnit: 'Nos', spec: 'Flanged sluice valve for pumping station' },
    { name: 'Non-Return Valve (NRV) 150mm Dual Plate', defaultUnit: 'Nos', spec: 'Wafer type swing check valve' },
    { name: 'Non-Return Valve (NRV) 200mm Dual Plate', defaultUnit: 'Nos', spec: 'Pump discharge check valve' },
    { name: 'Air Release Valve (Kinetic Type) 80mm', defaultUnit: 'Nos', spec: 'Tamper-proof double orifice air valve' },
    { name: 'Dismantling Joint 150mm / 200mm DI', defaultUnit: 'Nos', spec: 'Restrained telescopic dismantling joint' },
    { name: 'Flanged Bends / Tees / Reducers (DI K12)', defaultUnit: 'Nos', spec: 'Fabricated flanged pressure fittings' },
  ],
  'Aggregates & Sand': [
    { name: 'Coarse Aggregate 20mm (Graded)', defaultUnit: 'MT', spec: 'Crushed hard stone aggregate for concrete' },
    { name: 'Coarse Aggregate 10mm (Graded)', defaultUnit: 'MT', spec: '10mm aggregate for structural RCC' },
    { name: 'Coarse Aggregate 40mm (Sub-base)', defaultUnit: 'MT', spec: '40mm ballast for road subgrade' },
    { name: 'River Sand (Zone II Grading)', defaultUnit: 'Cum', spec: 'Clean washed river sand for plaster & concrete' },
    { name: 'Crushed Stone Sand (M-Sand)', defaultUnit: 'MT', spec: 'Manufactured sand conforming to IS 383' },
    { name: 'Stone Dust / GSB Material', defaultUnit: 'MT', spec: 'Granular sub-base road filling material' },
    { name: 'Wet Mix Macadam (WMM) Mix', defaultUnit: 'MT', spec: 'Premixed crushed stone road base material' },
  ],
  'Safety PPE & Confined Space': [
    { name: 'Safety Helmets with Chin Strap (IS 2925)', defaultUnit: 'Nos', spec: 'Industrial safety helmets with ratchet adjustment' },
    { name: 'High-Visibility Fluorescent Vests', defaultUnit: 'Nos', spec: 'Class 2 reflective safety jackets' },
    { name: 'Steel Toe Safety Shoes / Gumboots', defaultUnit: 'Pairs', spec: 'Acid and oil resistant protective footwear' },
    { name: 'Full Body Safety Harness (IS 3521)', defaultUnit: 'Nos', spec: 'Double lanyard shock absorbing safety harness' },
    { name: 'Multi-Gas Detector (H2S, CO, O2, LEL)', defaultUnit: 'Nos', spec: 'Portable 4-gas monitor with audio/visual alarm' },
    { name: 'Manhole Recovery Tripod & Winch', defaultUnit: 'Sets', spec: 'Confined space rescue tripod with 20m cable winch' },
    { name: 'Heavy Duty Nitrile / Sewage Gloves', defaultUnit: 'Pairs', spec: 'Chemical and puncture resistant sewer gloves' },
  ],
  'Electromechanical & Pumps': [
    { name: 'Submersible Non-Clog Sewage Pump', defaultUnit: 'Nos', spec: 'Centrifugal non-clog pump with vortex impeller' },
    { name: 'Centrifugal Dewatering Pump (Diesel 5HP)', defaultUnit: 'Nos', spec: 'High discharge trench dewatering pump' },
    { name: 'Mechanical Fine Bar Screen (6mm opening)', defaultUnit: 'Sets', spec: 'Automatic raked bar screen for inlet chamber' },
    { name: 'Submersible Mixers (SBR Basin)', defaultUnit: 'Nos', spec: 'Stainless steel propeller mixer for anoxic zone' },
  ],
  'Chemicals & Waterproofing': [
    { name: 'Integral Waterproofing Liquid Admixture', defaultUnit: 'Ltr', spec: 'Conplast WP90 / equivalent waterproofing agent' },
    { name: 'Curing Compound (Resin / Wax Based)', defaultUnit: 'Ltr', spec: 'Aluminized membrane forming curing compound' },
    { name: 'Polymer Modified Bitumen Coating', defaultUnit: 'Ltr', spec: 'Protective damp-proofing for underground concrete' },
    { name: 'Hydrophilic Swellable Waterbar (20x10mm)', defaultUnit: 'Metre', spec: 'Bentonite / polymer waterstop for construction joints' },
  ],
  'Consumables, Hardware & POL': [
    { name: 'Diesel / High Speed HSD for DG & Fleet', defaultUnit: 'Ltr', spec: 'BS-VI diesel fuel for plant and equipment' },
    { name: 'Welding Electrodes (E6013 / E7018)', defaultUnit: 'Pkt', spec: 'Heavy coated mild steel welding rods' },
    { name: 'Anchor Fasteners & Bolts (Grade 8.8)', defaultUnit: 'Nos', spec: 'Galvanized high tensile structural bolts' },
    { name: 'Cutting & Grinding Discs (4" / 14")', defaultUnit: 'Nos', spec: 'Reinforced abrasive cutoff wheels' },
  ],
  'Equipment & Machinery Rental': [
    { name: 'Hydraulic Excavator (JCB 3DX) Hire', defaultUnit: 'Days', spec: 'Backhoe loader with operator and fuel' },
    { name: 'Transit Mixer 6 Cum Hire', defaultUnit: 'Days', spec: 'Concrete delivery transit mixer' },
    { name: 'Mobile Crane 15T / 20T Hire', defaultUnit: 'Days', spec: 'Hydraulic crane for pipe lifting and erection' },
    { name: 'Diesel Generator 125 kVA Hire', defaultUnit: 'Months', spec: 'Silent acoustic DG set for site power' },
  ],
  'Other / Custom Material': [],
};

const UNITS = ['MT', 'Bags', 'Metre', 'Nos', 'Cum', 'Sqm', 'Kg', 'Ltr', 'Pairs', 'Sets', 'Pkt', 'Days', 'Months'];

const PAYMENT_TERMS_PRESETS = [
  '30 days after site receipt & joint inspection',
  '100% against site delivery & challan verification',
  '10% Advance with order, 90% on site delivery',
  'Weekly Running Account (RA) settlement',
  'Immediate against delivery challan (local purchase)',
  'Custom Payment Terms',
];

const DELIVERY_TERMS_PRESETS = [
  'FOR Site Srinagar, inclusive of transit insurance & unloading',
  'Ex-Factory / Ex-Godown (Freight paid by KIPL)',
  'Door delivery to Central Batching Plant, Habak',
  'Direct dispatch to Pumping Station site',
  'Custom Delivery Terms',
];

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal (7-14 Days)', color: '#0284c7', bg: '#f0f9ff' },
  high: { label: 'High Priority (3-5 Days)', color: C.amber, bg: C.amberBg },
  urgent: { label: 'Urgent (24-48 Hours)', color: C.red, bg: C.redBg },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'payment_requisitions' | 'requisitions' | 'orders' | 'grns' | 'matching'>('payment_requisitions');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [showNewReqModal, setShowNewReqModal] = useState(false);
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [selectedPo, setSelectedPo] = useState<any | null>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Form States for Dual HO Approvals
  const [hoRemarks, setHoRemarks] = useState('');
  const [hoVendor, setHoVendor] = useState('');
  const [hoBudgetHead, setHoBudgetHead] = useState('');

  // Custom Site & Scope field toggles
  const [customSite, setCustomSite] = useState('');
  const [customPaymentTerms, setCustomPaymentTerms] = useState('');
  const [customDeliveryTerms, setCustomDeliveryTerms] = useState('');

  // New Requisition Form State
  const [newReq, setNewReq] = useState<{
    title: string;
    workComponent: string;
    customWorkComponent?: string;
    siteLocation: string;
    customLocation: string;
    requiredByDate: string;
    priority: 'normal' | 'high' | 'urgent';
    justification: string;
    attachmentUrl: string;
    items: Array<{
      category: string;
      itemDescription: string;
      customDescription?: string;
      quantity: number;
      unit: string;
      estimatedRate: number;
      estimatedAmount: number;
      specifications?: string;
    }>;
  }>({
    title: '',
    workComponent: WORK_COMPONENTS[0],
    customWorkComponent: '',
    siteLocation: SITE_LOCATIONS[0],
    customLocation: '',
    requiredByDate: '',
    priority: 'normal',
    justification: '',
    attachmentUrl: '',
    items: [
      {
        category: 'Reinforcement Steel',
        itemDescription: MATERIAL_CATALOG['Reinforcement Steel'][0].name,
        customDescription: '',
        quantity: 1,
        unit: 'MT',
        estimatedRate: 62000,
        estimatedAmount: 62000,
        specifications: MATERIAL_CATALOG['Reinforcement Steel'][0].spec,
      },
    ],
  });

  // Direct PO Form State
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
    paymentTerms: PAYMENT_TERMS_PRESETS[0],
    deliveryTerms: DELIVERY_TERMS_PRESETS[0],
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

  const { data: vendors = [] } = useQuery({
    queryKey: ['accounting-vendors', activeProjectId],
    queryFn: () => accountingApi.vendors({ projectId: activeProjectId }).then((r: any) => r.data?.items ?? r.data ?? []),
    enabled: !!activeProjectId,
  });

  const { data: paymentRequisitions = [] } = useQuery({
    queryKey: ['payment-requisitions', activeProjectId, 'all'],
    queryFn: () => procurementApi.getPaymentRequisitions(activeProjectId!, 'all').then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  const { data: grns = [] } = useQuery({
    queryKey: ['procurement-grns', activeProjectId],
    queryFn: () => procurementApi.getAllGrns(activeProjectId!).then((r: any) => r.data),
    enabled: !!activeProjectId,
  });

  // Direct File Upload Handler
  async function handleFileUpload(file: File) {
    setIsUploading(true);
    try {
      const res = await procurementApi.uploadAttachment(file);
      const url = res.data?.url ?? res.data?.fileUrl ?? res.data?.key ?? '';
      setNewReq((prev) => ({ ...prev, attachmentUrl: url }));
      setUploadedFileName(file.name);
      toast.success(`Attached "${file.name}" successfully!`);
    } catch (err: any) {
      toast.error('File upload failed: ' + (err?.response?.data?.message ?? err?.message));
    } finally {
      setIsUploading(false);
    }
  }

  // Mutations
  const createReqM = useMutation({
    mutationFn: () => {
      const location = newReq.siteLocation === 'Other / Custom Site Location' && newReq.customLocation?.trim()
        ? newReq.customLocation.trim()
        : newReq.siteLocation;

      const scope = newReq.workComponent === 'Other Civil / Mechanical Scope' && newReq.customWorkComponent?.trim()
        ? newReq.customWorkComponent.trim()
        : newReq.workComponent;

      const title = newReq.title.trim()
        ? newReq.title
        : `${scope} - ${location}`;

      const items = newReq.items.map((it) => {
        const isCustom = it.category === 'Other / Custom Material' || it.itemDescription === 'Custom / Other Item...' || it.itemDescription === 'Custom Item...';
        const finalDescription = isCustom && it.customDescription?.trim()
          ? it.customDescription.trim()
          : (it.customDescription?.trim() || it.itemDescription);

        return {
          itemDescription: finalDescription,
          category: it.category,
          quantity: Number(it.quantity) || 0,
          unit: it.unit,
          estimatedRate: Number(it.estimatedRate) || 0,
          estimatedAmount: (Number(it.quantity) || 0) * (Number(it.estimatedRate) || 0),
          specifications: it.specifications || '',
        };
      });

      return procurementApi.createRequisition({
        projectId: activeProjectId!,
        title,
        siteLocation: location,
        requiredByDate: newReq.requiredByDate,
        priority: newReq.priority,
        justification: newReq.justification,
        attachmentUrl: newReq.attachmentUrl,
        items,
      });
    },
    onSuccess: () => {
      toast.success('Material Requisition submitted to Head Office successfully.');
      qc.invalidateQueries({ queryKey: ['procurement-requisitions'] });
      setShowNewReqModal(false);
      setUploadedFileName('');
      setNewReq({
        title: '',
        workComponent: WORK_COMPONENTS[0],
        customWorkComponent: '',
        siteLocation: SITE_LOCATIONS[0],
        customLocation: '',
        requiredByDate: '',
        priority: 'normal',
        justification: '',
        attachmentUrl: '',
        items: [
          {
            category: 'Reinforcement Steel',
            itemDescription: MATERIAL_CATALOG['Reinforcement Steel'][0].name,
            customDescription: '',
            quantity: 1,
            unit: 'MT',
            estimatedRate: 62000,
            estimatedAmount: 62000,
            specifications: MATERIAL_CATALOG['Reinforcement Steel'][0].spec,
          },
        ],
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
    mutationFn: () => {
      const paymentTerms = newPo.paymentTerms === 'Custom Payment Terms' && customPaymentTerms.trim()
        ? customPaymentTerms.trim()
        : newPo.paymentTerms;
      const deliveryTerms = newPo.deliveryTerms === 'Custom Delivery Terms' && customDeliveryTerms.trim()
        ? customDeliveryTerms.trim()
        : newPo.deliveryTerms;

      return procurementApi.createPurchaseOrder({
        ...newPo,
        paymentTerms,
        deliveryTerms,
        projectId: activeProjectId!,
      });
    },
    onSuccess: () => {
      toast.success('Direct Purchase Order issued successfully.');
      qc.invalidateQueries({ queryKey: ['procurement-orders'] });
      setShowNewPoModal(false);
      setCustomPaymentTerms('');
      setCustomDeliveryTerms('');
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

  // Calculate live grand total of new indent
  const newReqGrandTotal = newReq.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedRate) || 0),
    0,
  );

  // Calculate live grand total of new direct PO
  const newPoSubtotal = newPo.items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitRate) || 0),
    0,
  );
  const newPoTax = newPo.items.reduce(
    (sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.unitRate) || 0) * (Number(i.gstRate) || 0)) / 100,
    0,
  );
  const newPoGrandTotal = newPoSubtotal + newPoTax + (Number(newPo.freightCharges) || 0);

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
      {/* Top Header */}
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
          {activeTab === 'requisitions' && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setShowNewReqModal(true)}
            >
              New Material Indent
            </Button>
          )}
          {activeTab === 'orders' && (
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
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, gap: 16, overflowX: 'auto' }}>
        <button
          onClick={() => { setActiveTab('payment_requisitions'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'payment_requisitions' ? 700 : 500,
            color: activeTab === 'payment_requisitions' ? C.green : C.text2,
            borderBottom: activeTab === 'payment_requisitions' ? `3px solid ${C.green}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={17} color={activeTab === 'payment_requisitions' ? C.green : undefined} />
          Payment Requisitions (Official Format)
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: activeTab === 'payment_requisitions' ? C.greenBg : '#f1f5f9', color: activeTab === 'payment_requisitions' ? C.green : C.text2, fontWeight: 700 }}>
            {paymentRequisitions.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('requisitions'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'requisitions' ? 700 : 500,
            color: activeTab === 'requisitions' ? C.blue : C.text2,
            borderBottom: activeTab === 'requisitions' ? `3px solid ${C.blue}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={17} />
          Material Indents
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: activeTab === 'requisitions' ? C.blueBg : '#f1f5f9', color: activeTab === 'requisitions' ? C.blue : C.text2, fontWeight: 700 }}>
            {reqTotalCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('orders'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'orders' ? 700 : 500,
            color: activeTab === 'orders' ? C.blue : C.text2,
            borderBottom: activeTab === 'orders' ? `3px solid ${C.blue}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <ShoppingCart size={17} />
          Purchase Orders (PO)
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: activeTab === 'orders' ? C.blueBg : '#f1f5f9', color: activeTab === 'orders' ? C.blue : C.text2, fontWeight: 700 }}>
            {poTotalCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('grns'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'grns' ? 700 : 500,
            color: activeTab === 'grns' ? C.blue : C.text2,
            borderBottom: activeTab === 'grns' ? `3px solid ${C.blue}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Truck size={17} />
          Goods Receipt Notes (GRN)
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: activeTab === 'grns' ? C.blueBg : '#f1f5f9', color: activeTab === 'grns' ? C.blue : C.text2, fontWeight: 700 }}>
            {grns.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('matching'); setFilterStatus('all'); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 4px',
            fontSize: 14,
            fontWeight: activeTab === 'matching' ? 700 : 500,
            color: activeTab === 'matching' ? C.blue : C.text2,
            borderBottom: activeTab === 'matching' ? `3px solid ${C.blue}` : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <Scales size={17} />
          3-Way Matching Engine
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PAYMENT REQUISITIONS TAB (OFFICIAL KIPL EXCEL FORMAT)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payment_requisitions' && activeProjectId && (
        <PaymentRequisitionTab activeProjectId={activeProjectId} />
      )}

      {/* ─────────────────────────────────────────────────────────────
          REQUISITIONS TAB
      ───────────────────────────────────────────────────────────── */}
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

      {/* ─────────────────────────────────────────────────────────────
          PURCHASE ORDERS TAB
      ───────────────────────────────────────────────────────────── */}
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

      {/* ─────────────────────────────────────────────────────────────
          GOODS RECEIPT NOTES (GRN) TAB
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'grns' && activeProjectId && (
        <GoodsReceiptNotesTab activeProjectId={activeProjectId} />
      )}

      {/* ─────────────────────────────────────────────────────────────
          3-WAY MATCHING RECONCILIATION ENGINE TAB
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'matching' && activeProjectId && (
        <ThreeWayMatchTab activeProjectId={activeProjectId} />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: NEW SITE MATERIAL REQUISITION (INDENT)
      ───────────────────────────────────────────────────────────── */}
      {showNewReqModal && (
        <Modal
          open={showNewReqModal}
          onClose={() => setShowNewReqModal(false)}
          title="Submit Site Material Requisition (Indent)"
          width={960}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row 1: Work Component & Priority Dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: newReq.workComponent === 'Other Civil / Mechanical Scope' ? '1.2fr 1.2fr 1fr' : '1.6fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                  Work Scope / Component Category *
                </label>
                <select
                  value={newReq.workComponent}
                  onChange={(e) => setNewReq({ ...newReq, workComponent: e.target.value })}
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
                  {WORK_COMPONENTS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {newReq.workComponent === 'Other Civil / Mechanical Scope' && (
                <Input
                  label="Specify Custom Scope / Component *"
                  placeholder="e.g. Electrical Transformer Substation"
                  value={newReq.customWorkComponent || ''}
                  onChange={(e) => setNewReq({ ...newReq, customWorkComponent: e.target.value })}
                />
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                  Site Priority *
                </label>
                <select
                  value={newReq.priority}
                  onChange={(e: any) => setNewReq({ ...newReq, priority: e.target.value })}
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
                  <option value="normal">Normal (Regular - 7-14 Days)</option>
                  <option value="high">High Priority (Within 3-5 Days)</option>
                  <option value="urgent">Urgent (Immediate - 24-48 Hours)</option>
                </select>
              </div>
            </div>

            {/* Custom Title (Optional override) */}
            <Input
              label="Indent Title / Specific Component Description"
              placeholder="e.g. Fe500D Reinforcement for Brane PS Wet Well Raft"
              value={newReq.title}
              onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
            />

            {/* Row 2: Pumping Station / Site Location & Required By Date */}
            <div style={{ display: 'grid', gridTemplateColumns: newReq.siteLocation === 'Other / Custom Site Location' ? '1.2fr 1fr 1fr' : '1.5fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                  Target Site / Pumping Station Location *
                </label>
                <select
                  value={newReq.siteLocation}
                  onChange={(e) => setNewReq({ ...newReq, siteLocation: e.target.value })}
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
                  {SITE_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {newReq.siteLocation === 'Other / Custom Site Location' && (
                <Input
                  label="Specify Custom Location *"
                  placeholder="e.g. Gupkar Road Cross Drainage"
                  value={newReq.customLocation}
                  onChange={(e) => setNewReq({ ...newReq, customLocation: e.target.value })}
                />
              )}

              <Input
                type="date"
                label="Required on Site By *"
                value={newReq.requiredByDate}
                onChange={(e: any) => setNewReq({ ...newReq, requiredByDate: e.target.value })}
              />
            </div>

            {/* Technical Justification */}
            <Input
              label="Engineering Justification & Scope"
              placeholder="e.g. Excavation at Habak Wet Well completed; rebar required immediately for bottom raft concreting to avoid pit collapse."
              value={newReq.justification}
              onChange={(e) => setNewReq({ ...newReq, justification: e.target.value })}
            />

            {/* Attachment: Direct File Upload + URL Fallback */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                Quotation / Drawing / Indent Slip Attachment
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />

                <Button
                  variant="secondary"
                  size="sm"
                  icon={isUploading ? <Spinner size={14} /> : <UploadSimple size={14} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading file...' : 'Upload File (PDF / Image)'}
                </Button>

                {uploadedFileName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: C.greenBg, color: C.green, padding: '5px 10px', borderRadius: 6, fontWeight: 600 }}>
                    <CheckCircle size={14} weight="fill" />
                    <span>Attached: {uploadedFileName}</span>
                    <button
                      type="button"
                      onClick={() => { setUploadedFileName(''); setNewReq((p) => ({ ...p, attachmentUrl: '' })); }}
                      style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <span style={{ fontSize: 12, color: C.text3 }}>or paste link:</span>

                <input
                  type="text"
                  placeholder="https://... Google Drive or document link"
                  value={newReq.attachmentUrl}
                  onChange={(e) => setNewReq({ ...newReq, attachmentUrl: e.target.value })}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    height: 38,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #d1d5db',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                DYNAMIC MATERIAL ITEMS WITH CATEGORY & ITEM DROPDOWNS
            ───────────────────────────────────────────────────────────── */}
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Itemized Materials Required</span>
                  <span style={{ fontSize: 12, color: C.text3, marginLeft: 8 }}>(Select from standard catalog or choose Custom)</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={13} weight="bold" />}
                  onClick={() =>
                    setNewReq({
                      ...newReq,
                      items: [
                        ...newReq.items,
                        {
                          category: 'Reinforcement Steel',
                          itemDescription: MATERIAL_CATALOG['Reinforcement Steel'][0].name,
                          quantity: 1,
                          unit: 'MT',
                          estimatedRate: 62000,
                          estimatedAmount: 62000,
                          specifications: MATERIAL_CATALOG['Reinforcement Steel'][0].spec,
                        },
                      ],
                    })
                  }
                >
                  Add Line Item
                </Button>
              </div>

              {/* Items Table Container */}
              <div
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 840 }}>
                    <thead>
                      <tr
                        style={{
                          background: '#f8fafc',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.text2,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        <th style={{ padding: '9px 10px', textAlign: 'left', width: '22%' }}>Category</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', width: '30%' }}>Material Description</th>
                        <th style={{ padding: '9px 8px', textAlign: 'right', width: '10%' }}>Qty</th>
                        <th style={{ padding: '9px 8px', textAlign: 'left', width: '11%' }}>Unit</th>
                        <th style={{ padding: '9px 8px', textAlign: 'right', width: '12%' }}>Est. Rate (₹)</th>
                        <th style={{ padding: '9px 10px', textAlign: 'right', width: '11%' }}>Total (₹)</th>
                        <th style={{ padding: '9px 6px', textAlign: 'center', width: '4%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newReq.items.map((item, idx) => {
                        const catalogItems = MATERIAL_CATALOG[item.category] || [];
                        const isOtherCategory = item.category === 'Other / Custom Material' || catalogItems.length === 0;
                        const isCustomItem = isOtherCategory || item.itemDescription === 'Custom / Other Item...' || item.itemDescription === 'Custom Item...';

                        return (
                          <Fragment key={idx}>
                            <tr
                              style={{
                                borderBottom:
                                  idx < newReq.items.length - 1 || isCustomItem
                                    ? `1px solid ${C.border}`
                                    : 'none',
                                background: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                              }}
                            >
                              {/* 1. Category Dropdown */}
                              <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                                <select
                                  value={item.category}
                                  onChange={(e) => {
                                    const cat = e.target.value;
                                    const available = MATERIAL_CATALOG[cat] || [];
                                    const isOther = cat === 'Other / Custom Material' || available.length === 0;
                                    const first = available[0];
                                    const copy = [...newReq.items];
                                    copy[idx] = {
                                      ...copy[idx],
                                      category: cat,
                                      itemDescription: isOther ? 'Custom / Other Item...' : first.name,
                                      customDescription: isOther ? (copy[idx].customDescription || '') : '',
                                      unit: isOther ? (copy[idx].unit || 'Nos') : (first.defaultUnit || 'Nos'),
                                      estimatedRate: isOther ? 0 : (cat === 'Reinforcement Steel' ? 62000 : 0),
                                      estimatedAmount: isOther ? 0 : ((copy[idx].quantity || 1) * (cat === 'Reinforcement Steel' ? 62000 : 0)),
                                      specifications: isOther ? '' : (first.spec || ''),
                                    };
                                    setNewReq({ ...newReq, items: copy });
                                  }}
                                  style={{
                                    width: '100%',
                                    height: 34,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid #cbd5e1`,
                                    fontSize: 12,
                                    background: '#fff',
                                    color: C.text1,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {Object.keys(MATERIAL_CATALOG).map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </td>

                              {/* 2. Material Description Column */}
                              <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                                {isOtherCategory ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <input
                                      type="text"
                                      placeholder="Enter custom material name manually *"
                                      value={item.customDescription || ''}
                                      onChange={(e) => {
                                        const copy = [...newReq.items];
                                        copy[idx].customDescription = e.target.value;
                                        setNewReq({ ...newReq, items: copy });
                                      }}
                                      autoFocus
                                      style={{
                                        width: '100%',
                                        height: 34,
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        border: `1.5px solid ${C.amber}`,
                                        fontSize: 12,
                                        background: '#fffdf5',
                                        color: C.text1,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <span style={{ fontSize: 10, color: C.amber, fontWeight: 600 }}>
                                      ✍️ Custom material: type manual name above
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <select
                                      value={item.itemDescription}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const matched = catalogItems.find((c) => c.name === val);
                                        const isCustom = val === 'Custom / Other Item...';
                                        const copy = [...newReq.items];
                                        copy[idx] = {
                                          ...copy[idx],
                                          itemDescription: val,
                                          customDescription: isCustom ? (copy[idx].customDescription || '') : '',
                                          unit: isCustom ? copy[idx].unit : (matched?.defaultUnit || copy[idx].unit),
                                          specifications: isCustom ? copy[idx].specifications : (matched?.spec || ''),
                                        };
                                        setNewReq({ ...newReq, items: copy });
                                      }}
                                      style={{
                                        width: '100%',
                                        height: 34,
                                        padding: '5px 8px',
                                        borderRadius: 6,
                                        border: `1px solid #cbd5e1`,
                                        fontSize: 12,
                                        background: '#fff',
                                        color: C.text1,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                      }}
                                    >
                                      {catalogItems.map((c) => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                      ))}
                                      <option value="Custom / Other Item...">+ Custom / Other Item...</option>
                                    </select>

                                    {item.itemDescription === 'Custom / Other Item...' && (
                                      <input
                                        type="text"
                                        placeholder="Type custom item name manually *"
                                        value={item.customDescription || ''}
                                        onChange={(e) => {
                                          const copy = [...newReq.items];
                                          copy[idx].customDescription = e.target.value;
                                          setNewReq({ ...newReq, items: copy });
                                        }}
                                        autoFocus
                                        style={{
                                          width: '100%',
                                          height: 32,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                          border: `1.5px solid ${C.amber}`,
                                          fontSize: 12,
                                          background: '#fffdf5',
                                          color: C.text1,
                                          outline: 'none',
                                          boxSizing: 'border-box',
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 3. Quantity */}
                              <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const copy = [...newReq.items];
                                    copy[idx].quantity = parseFloat(e.target.value) || 0;
                                    copy[idx].estimatedAmount = (copy[idx].quantity || 0) * (copy[idx].estimatedRate || 0);
                                    setNewReq({ ...newReq, items: copy });
                                  }}
                                  style={{
                                    width: '100%',
                                    height: 34,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid #cbd5e1`,
                                    fontSize: 12,
                                    textAlign: 'right',
                                    color: C.text1,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </td>

                              {/* 4. Unit Dropdown */}
                              <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                                <select
                                  value={item.unit}
                                  onChange={(e) => {
                                    const copy = [...newReq.items];
                                    copy[idx].unit = e.target.value;
                                    setNewReq({ ...newReq, items: copy });
                                  }}
                                  style={{
                                    width: '100%',
                                    height: 34,
                                    padding: '5px 6px',
                                    borderRadius: 6,
                                    border: `1px solid #cbd5e1`,
                                    fontSize: 12,
                                    background: '#fff',
                                    color: C.text1,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </td>

                              {/* 5. Estimated Rate */}
                              <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.estimatedRate}
                                  onChange={(e) => {
                                    const copy = [...newReq.items];
                                    copy[idx].estimatedRate = parseFloat(e.target.value) || 0;
                                    copy[idx].estimatedAmount = (copy[idx].quantity || 0) * (copy[idx].estimatedRate || 0);
                                    setNewReq({ ...newReq, items: copy });
                                  }}
                                  style={{
                                    width: '100%',
                                    height: 34,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid #cbd5e1`,
                                    fontSize: 12,
                                    textAlign: 'right',
                                    color: C.text1,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </td>

                              {/* 6. Row Subtotal (Live calculated) */}
                              <td
                                style={{
                                  padding: '7px 10px',
                                  textAlign: 'right',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: C.text1,
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {fmtR((item.quantity || 0) * (item.estimatedRate || 0))}
                              </td>

                              {/* 7. Delete Row Action */}
                              <td style={{ padding: '7px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                {newReq.items.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = newReq.items.filter((_, i) => i !== idx);
                                      setNewReq({ ...newReq, items: copy });
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: C.red,
                                      cursor: 'pointer',
                                      padding: 4,
                                      borderRadius: 4,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Delete line item"
                                  >
                                    <Trash size={15} />
                                  </button>
                                ) : (
                                  <span style={{ display: 'inline-block', width: 15 }} />
                                )}
                              </td>
                            </tr>

                            {/* If custom material or "Custom / Other Item..." is selected: show bespoke custom fields */}
                            {isCustomItem && (
                              <tr style={{ background: '#fffbeb', borderBottom: `1px solid ${C.border}` }}>
                                <td colSpan={7} style={{ padding: '8px 12px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                                    <div>
                                      <label style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 3, display: 'block' }}>
                                        Custom Item Detailed Description / Size / Dimensions *
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Sluice Valve 150mm PN 1.0 Flanged with Handwheel"
                                        value={item.customDescription || ''}
                                        onChange={(e) => {
                                          const copy = [...newReq.items];
                                          copy[idx].customDescription = e.target.value;
                                          setNewReq({ ...newReq, items: copy });
                                        }}
                                        style={{
                                          width: '100%',
                                          height: 32,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                          border: `1.5px solid ${C.amber}`,
                                          fontSize: 12,
                                          background: '#fff',
                                          boxSizing: 'border-box',
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 3, display: 'block' }}>
                                        Technical Grade / IS Standards Specification (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g. IS:14846, CI Body, Gunmetal Trim, Class 1 Rating"
                                        value={item.specifications || ''}
                                        onChange={(e) => {
                                          const copy = [...newReq.items];
                                          copy[idx].specifications = e.target.value;
                                          setNewReq({ ...newReq, items: copy });
                                        }}
                                        style={{
                                          width: '100%',
                                          height: 32,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                          border: `1px solid #cbd5e1`,
                                          fontSize: 12,
                                          background: '#fff',
                                          boxSizing: 'border-box',
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: `2px solid ${C.border}` }}>
                        <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: C.navy, fontSize: 12 }}>
                          Grand Estimated Indent Total:
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: C.blue, fontSize: 15, whiteSpace: 'nowrap' }}>
                          {fmtR(newReqGrandTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => setShowNewReqModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!newReq.requiredByDate) {
                    toast.error('Please select the "Required on Site By" date.');
                    return;
                  }
                  if (newReq.workComponent === 'Other Civil / Mechanical Scope' && !newReq.customWorkComponent?.trim()) {
                    toast.error('Please specify the custom work scope / component category.');
                    return;
                  }
                  if (newReq.siteLocation === 'Other / Custom Site Location' && !newReq.customLocation?.trim()) {
                    toast.error('Please specify the custom site location.');
                    return;
                  }
                  for (let i = 0; i < newReq.items.length; i++) {
                    const it = newReq.items[i];
                    const isCustom = it.category === 'Other / Custom Material' || it.itemDescription === 'Custom / Other Item...' || it.itemDescription === 'Custom Item...';
                    if (isCustom && !it.customDescription?.trim() && (!it.itemDescription || it.itemDescription === 'Custom / Other Item...' || it.itemDescription === 'Custom Item...')) {
                      toast.error(`Please enter the custom material name for line item #${i + 1}.`);
                      return;
                    }
                    if (!it.quantity || Number(it.quantity) <= 0) {
                      toast.error(`Please enter a valid quantity greater than 0 for item #${i + 1}.`);
                      return;
                    }
                  }
                  createReqM.mutate();
                }}
                disabled={createReqM.isPending}
              >
                Submit Indent to Head Office
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REQUISITION REVIEW & DUAL HO APPROVAL
      ───────────────────────────────────────────────────────────── */}
      {selectedReq && (
        <Modal
          open={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`Material Indent Review: ${selectedReq.reqNumber}`}
          width={780}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
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
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 2, display: 'block' }}>
                        Select Recommended Vendor (Registry)
                      </label>
                      <select
                        value={hoVendor}
                        onChange={(e) => setHoVendor(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, background: '#fff' }}
                      >
                        <option value="">-- Choose Registered Vendor --</option>
                        {vendors.map((v: any) => (
                          <option key={v.id} value={v.name}>{v.name} ({v.gstin || 'Unregistered'})</option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Or Type Vendor / Remarks"
                      placeholder="e.g. Shalimar Steel Srinagar - Rates verified"
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
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 2, display: 'block' }}>
                        Budget Cost Head
                      </label>
                      <select
                        value={hoBudgetHead}
                        onChange={(e) => setHoBudgetHead(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, background: '#fff' }}
                      >
                        <option value="Dal Lake Civil Raw Materials">Dal Lake Civil Raw Materials</option>
                        <option value="Mechanical & Pump Equipment Head">Mechanical &amp; Pump Equipment Head</option>
                        <option value="Pipe Supply & Erection Head">Pipe Supply &amp; Erection Head</option>
                        <option value="Site O&M Running Expenses">Site O&amp;M Running Expenses</option>
                        <option value="Special Contingency Budget">Special Contingency Budget</option>
                      </select>
                    </div>

                    <Input
                      label="Accounts Remarks"
                      placeholder="Budget available, cleared for PO issuance"
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PURCHASE ORDER DETAILS
      ───────────────────────────────────────────────────────────── */}
      {selectedPo && (
        <Modal
          open={!!selectedPo}
          onClose={() => setSelectedPo(null)}
          title={`Purchase Order: ${selectedPo.poNumber}`}
          width={780}
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DIRECT PURCHASE ORDER
      ───────────────────────────────────────────────────────────── */}
      {showNewPoModal && (
        <Modal
          open={showNewPoModal}
          onClose={() => setShowNewPoModal(false)}
          title="Issue Direct Purchase Order (Head Office)"
          width={960}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Registered Vendor Selector Dropdown */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                Select Vendor / Supplier from Registry
              </label>
              <select
                onChange={(e) => {
                  const v = vendors.find((vend: any) => vend.id === e.target.value);
                  if (v) {
                    setNewPo({
                      ...newPo,
                      vendorId: v.id,
                      vendorName: v.name,
                      vendorGstin: v.gstin || '',
                      vendorPhone: v.phone || '',
                      vendorEmail: v.email || '',
                      vendorAddress: v.address || '',
                    });
                  }
                }}
                style={{ width: '100%', height: 42, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, background: '#fff', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="">-- Choose Registered Vendor or Type Below --</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.gstin ? `(GSTIN: ${v.gstin})` : ''} - {v.phone || 'No phone'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Vendor / Firm Name *"
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
                label="Contact Person &amp; Phone"
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

            {/* Presets for Payment & Delivery Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                  Commercial Payment Terms Dropdown
                </label>
                <select
                  value={newPo.paymentTerms}
                  onChange={(e) => setNewPo({ ...newPo, paymentTerms: e.target.value })}
                  style={{ width: '100%', height: 42, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, background: '#fff', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                >
                  {PAYMENT_TERMS_PRESETS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {newPo.paymentTerms === 'Custom Payment Terms' && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Specify custom payment terms manually *"
                      value={customPaymentTerms}
                      onChange={(e) => setCustomPaymentTerms(e.target.value)}
                      style={{ width: '100%', height: 36, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${C.amber}`, fontSize: 12, background: '#fffdf5', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                  Delivery &amp; Freight Terms Dropdown
                </label>
                <select
                  value={newPo.deliveryTerms}
                  onChange={(e) => setNewPo({ ...newPo, deliveryTerms: e.target.value })}
                  style={{ width: '100%', height: 42, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, background: '#fff', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                >
                  {DELIVERY_TERMS_PRESETS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {newPo.deliveryTerms === 'Custom Delivery Terms' && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Specify custom delivery terms manually *"
                      value={customDeliveryTerms}
                      onChange={(e) => setCustomDeliveryTerms(e.target.value)}
                      style={{ width: '100%', height: 36, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${C.amber}`, fontSize: 12, background: '#fffdf5', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
            </div>

            <Input
              label="Estimated Freight / Loading Charges (₹)"
              type="number"
              value={newPo.freightCharges}
              onChange={(e) => setNewPo({ ...newPo, freightCharges: parseFloat(e.target.value) || 0 })}
            />

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>PO Line Items</span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={13} weight="bold" />}
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

              {/* Items Table */}
              <div
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 840 }}>
                    <thead>
                      <tr
                        style={{
                          background: '#f8fafc',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.text2,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        <th style={{ padding: '9px 10px', textAlign: 'left', width: '32%' }}>Item Description</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center', width: '11%' }}>HSN Code</th>
                        <th style={{ padding: '9px 8px', textAlign: 'right', width: '10%' }}>Qty</th>
                        <th style={{ padding: '9px 8px', textAlign: 'left', width: '10%' }}>Unit</th>
                        <th style={{ padding: '9px 8px', textAlign: 'right', width: '12%' }}>Rate (₹)</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center', width: '10%' }}>GST</th>
                        <th style={{ padding: '9px 10px', textAlign: 'right', width: '11%' }}>Total (₹)</th>
                        <th style={{ padding: '9px 6px', textAlign: 'center', width: '4%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newPo.items.map((item, idx) => {
                        const lineSubtotal = (item.quantity || 0) * (item.unitRate || 0);
                        const lineTax = (lineSubtotal * (item.gstRate || 0)) / 100;
                        const lineTotal = lineSubtotal + lineTax;

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: idx < newPo.items.length - 1 ? `1px solid ${C.border}` : 'none',
                              background: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                            }}
                          >
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                              <input
                                placeholder="Item Description"
                                value={item.itemDescription}
                                onChange={(e) => {
                                  const copy = [...newPo.items];
                                  copy[idx].itemDescription = e.target.value;
                                  setNewPo({ ...newPo, items: copy });
                                }}
                                style={{
                                  width: '100%',
                                  height: 34,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </td>
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                              <input
                                placeholder="HSN"
                                value={item.hsnCode}
                                onChange={(e) => {
                                  const copy = [...newPo.items];
                                  copy[idx].hsnCode = e.target.value;
                                  setNewPo({ ...newPo, items: copy });
                                }}
                                style={{
                                  width: '100%',
                                  height: 34,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 12,
                                  textAlign: 'center',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </td>
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => {
                                  const copy = [...newPo.items];
                                  copy[idx].quantity = parseFloat(e.target.value) || 0;
                                  setNewPo({ ...newPo, items: copy });
                                }}
                                style={{
                                  width: '100%',
                                  height: 34,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 12,
                                  textAlign: 'right',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </td>
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                              <select
                                value={item.unit}
                                onChange={(e) => {
                                  const copy = [...newPo.items];
                                  copy[idx].unit = e.target.value;
                                  setNewPo({ ...newPo, items: copy });
                                }}
                                style={{
                                  width: '100%',
                                  height: 34,
                                  padding: '5px 6px',
                                  borderRadius: 6,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 12,
                                  background: '#fff',
                                  color: C.text1,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              >
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="Rate ₹"
                                value={item.unitRate}
                                onChange={(e) => {
                                  const copy = [...newPo.items];
                                  copy[idx].unitRate = parseFloat(e.target.value) || 0;
                                  setNewPo({ ...newPo, items: copy });
                                }}
                                style={{
                                  width: '100%',
                                  height: 34,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 12,
                                  textAlign: 'right',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </td>
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }}>
                              <select
                                value={item.gstRate}
                                onChange={(e) => {
                                  const copy = [...newPo.items];
                                  copy[idx].gstRate = parseFloat(e.target.value) || 0;
                                  setNewPo({ ...newPo, items: copy });
                                }}
                                style={{
                                  width: '100%',
                                  height: 34,
                                  padding: '5px 6px',
                                  borderRadius: 6,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 12,
                                  background: '#fff',
                                  color: C.text1,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td
                              style={{
                                padding: '7px 10px',
                                textAlign: 'right',
                                fontSize: 12,
                                fontWeight: 700,
                                color: C.text1,
                                whiteSpace: 'nowrap',
                                verticalAlign: 'middle',
                              }}
                            >
                              {fmtR(lineTotal)}
                            </td>
                            <td style={{ padding: '7px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {newPo.items.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = newPo.items.filter((_, i) => i !== idx);
                                    setNewPo({ ...newPo, items: copy });
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: C.red,
                                    cursor: 'pointer',
                                    padding: 4,
                                    borderRadius: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Remove item"
                                >
                                  <Trash size={15} />
                                </button>
                              ) : (
                                <span style={{ display: 'inline-block', width: 15 }} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: `2px solid ${C.border}` }}>
                        <td colSpan={6} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: C.navy, fontSize: 12 }}>
                          Grand Estimated PO Total (incl. GST &amp; Freight):
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: C.blue, fontSize: 15, whiteSpace: 'nowrap' }}>
                          {fmtR(newPoGrandTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
