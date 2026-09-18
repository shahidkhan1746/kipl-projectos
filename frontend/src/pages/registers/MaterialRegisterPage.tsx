import { toast } from '@/lib/notify';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Cube,
  DownloadSimple,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  Trash,
  Stack,
  FileText,
  PencilSimple,
  FilePdf,
  ArrowRight,
  ArrowSquareOut,
  ShieldCheck,
  Eye,
} from '@phosphor-icons/react';
import { materialRegisterApi } from '@/api/registers.api';
import { useAuthStore } from '@/store/auth.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/date';
import {
  generateMaterialRegisterPdf,
  generateSingleMaterialPdf,
} from './materialRegisterPdf';

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
// PRESET MATERIAL CATALOG PER TAB CATEGORY
// ─────────────────────────────────────────────────────────────
export const MATERIAL_CATEGORIES: Record<
  string,
  { label: string; shortLabel: string; presets: { name: string; unit: string }[] }
> = {
  cement_steel: {
    label: 'Cement & Steel (Clause 55)',
    shortLabel: 'Cement & Steel',
    presets: [
      { name: 'TMT SAIL BARS 8MM', unit: 'KG' },
      { name: 'TMT SAIL BARS 10MM', unit: 'KG' },
      { name: 'TMT SAIL BARS 12MM', unit: 'KG' },
      { name: 'TMT SAIL BARS 16MM', unit: 'KG' },
      { name: 'TMT SAIL BARS 20MM', unit: 'KG' },
      { name: 'TMT SAIL BARS 25MM', unit: 'KG' },
      { name: 'TMT SAIL BARS 32MM', unit: 'KG' },
      { name: 'TMT Steel Fe500D (Jindal/SAIL)', unit: 'MT' },
      { name: 'OPC Cement 43 Grade (IS 269)', unit: 'Bags' },
      { name: 'OPC Cement 53 Grade (IS 269)', unit: 'Bags' },
      { name: 'PPC Cement (IS 1489)', unit: 'Bags' },
      { name: 'Structural Steel (Angles/Channels IS 2062)', unit: 'MT' },
      { name: 'Binding Wire (18 Gauge)', unit: 'KG' },
    ],
  },
  pipes_fittings: {
    label: 'Pipes & Fittings',
    shortLabel: 'Pipes & Fittings',
    presets: [
      { name: 'DI K9 Pipe 150mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 200mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 250mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 300mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 400mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'HDPE Pipe 110mm OD PN6 PE100', unit: 'Rmt' },
      { name: 'HDPE Pipe 160mm OD PN6 PE100', unit: 'Rmt' },
      { name: 'RCC NP3 Pipe 600mm dia', unit: 'Rmt' },
      { name: 'Sluice Valve 150mm PN 1.0 (IS 14846)', unit: 'Nos' },
      { name: 'Non-Return (Check) Valve 150mm', unit: 'Nos' },
      { name: 'Air Release Valve 50mm Double Orifice', unit: 'Nos' },
      { name: 'DI Dismantling Joint 150mm', unit: 'Nos' },
    ],
  },
  aggregate_sand: {
    label: 'Aggregates & Sand',
    shortLabel: 'Aggregates & Sand',
    presets: [
      { name: 'Coarse Aggregate 20mm Graded (IS 383)', unit: 'Cu.m' },
      { name: 'Coarse Aggregate 10mm Graded (IS 383)', unit: 'Cu.m' },
      { name: 'Coarse Aggregate 40mm Graded', unit: 'Cu.m' },
      { name: 'Fine River Sand (Zone II IS 383)', unit: 'Cu.m' },
      { name: 'Stone Dust / Crushed Sand', unit: 'Cu.m' },
      { name: 'Granular Sub-Base (GSB) Material', unit: 'Cu.m' },
      { name: 'Soling Stone / Boulders', unit: 'Cu.m' },
    ],
  },
  chemicals: {
    label: 'Chemicals & Admixtures',
    shortLabel: 'Chemicals & Admixtures',
    presets: [
      { name: 'Integral Liquid Waterproofing Compound', unit: 'Litres' },
      { name: 'Superplasticizer & Retarder (IS 9103)', unit: 'Litres' },
      { name: 'Aluminised Curing Compound', unit: 'Litres' },
      { name: 'Non-Shrink Micro-Concrete / Grout', unit: 'Bags' },
      { name: 'Polysulphide Joint Sealant', unit: 'KG' },
    ],
  },
  other: {
    label: 'Other Materials',
    shortLabel: 'Other Materials',
    presets: [
      { name: 'Precast RCC Manhole Cover & Frame (Heavy Duty)', unit: 'Sets' },
      { name: 'Non-Woven Geotextile Fabric (200 GSM)', unit: 'Sqm' },
      { name: 'Clay Bricks Class 75 (IS 1077)', unit: 'Nos' },
      { name: 'PVC Waterstop 150mm', unit: 'Rmt' },
      { name: 'PVC Perforated Pipe 100mm Drainage', unit: 'Rmt' },
    ],
  },
};

export function getMaterialCategory(matName: string): string {
  const m = (matName || '').toLowerCase();
  if (
    m.includes('cement') ||
    m.includes('opc') ||
    m.includes('ppc') ||
    m.includes('steel') ||
    m.includes('tmt') ||
    m.includes('rebar') ||
    m.includes('sail') ||
    m.includes('jindal') ||
    m.includes('fe500') ||
    m.includes('fe550') ||
    m.includes('structural') ||
    m.includes('binding wire')
  ) {
    return 'cement_steel';
  }
  if (
    m.includes('pipe') ||
    m.includes('fitting') ||
    m.includes('di k') ||
    m.includes('hdpe') ||
    m.includes('rcc np') ||
    m.includes('valve') ||
    m.includes('bend') ||
    m.includes('collar') ||
    m.includes('flange') ||
    m.includes('dismantling')
  ) {
    return 'pipes_fittings';
  }
  if (
    m.includes('aggregate') ||
    m.includes('sand') ||
    m.includes('gravel') ||
    m.includes('stone') ||
    m.includes('bajri') ||
    m.includes('dust') ||
    m.includes('grit') ||
    m.includes('gsb') ||
    m.includes('soling') ||
    m.includes('boulder')
  ) {
    return 'aggregate_sand';
  }
  if (
    m.includes('admixture') ||
    m.includes('chemical') ||
    m.includes('curing') ||
    m.includes('waterproof') ||
    m.includes('compound') ||
    m.includes('grout') ||
    m.includes('sealant') ||
    m.includes('epoxy')
  ) {
    return 'chemicals';
  }
  return 'other';
}

const TABS = [
  { id: 'all', label: 'All Materials', shortLabel: 'All Materials' },
  { id: 'cement_steel', label: 'Cement & Steel (Clause 55)', shortLabel: 'Cement & Steel' },
  { id: 'pipes_fittings', label: 'Pipes & Fittings', shortLabel: 'Pipes & Fittings' },
  { id: 'aggregate_sand', label: 'Aggregates & Sand', shortLabel: 'Aggregates & Sand' },
  { id: 'chemicals', label: 'Chemicals & Admixtures', shortLabel: 'Chemicals & Admixtures' },
  { id: 'other', label: 'Other Materials', shortLabel: 'Other Materials' },
];

const BLANK_FORM: any = {
  date: new Date().toISOString().split('T')[0],
  category: 'cement_steel',
  material: 'TMT SAIL BARS 16MM',
  unit: 'KG',
  receivedQty: '',
  consumedQty: '',
  contractorRep: 'Gowhar Shah (Project Manager)',
  ueedRep: 'Er. Samiullah Beigh / AEE S&D-I',
  remarks: '',
};

export default function MaterialRegisterPage() {
  const { activeProjectId } = useAuthStore();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK_FORM);

  // Edit row state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  // Deep-dive component inspection state
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['mat-reg', activeProjectId],
    queryFn: () => materialRegisterApi.list(activeProjectId!).then((r) => r.data),
    enabled: !!activeProjectId,
  });

  const { data: summary = {} } = useQuery({
    queryKey: ['mat-reg-sum', activeProjectId],
    queryFn: () => materialRegisterApi.summary(activeProjectId!).then((r) => r.data),
    enabled: !!activeProjectId,
  });

  const createM = useMutation({
    mutationFn: () =>
      materialRegisterApi.create({
        projectId: activeProjectId,
        date: form.date,
        material: form.material,
        unit: form.unit || undefined,
        receivedQty: parseFloat(form.receivedQty) || 0,
        consumedQty: parseFloat(form.consumedQty) || 0,
        contractorRep: form.contractorRep || undefined,
        ueedRep: form.ueedRep || undefined,
        remarks: form.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mat-reg'] });
      qc.invalidateQueries({ queryKey: ['mat-reg-sum'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Material register entry added successfully');
    },
    onError: (e: any) =>
      toast.error('Could not save entry: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const updateM = useMutation({
    mutationFn: () =>
      materialRegisterApi.update(editForm.id, {
        date: editForm.date,
        material: editForm.material,
        unit: editForm.unit || undefined,
        receivedQty: parseFloat(editForm.receivedQty) || 0,
        consumedQty: parseFloat(editForm.consumedQty) || 0,
        contractorRep: editForm.contractorRep || undefined,
        ueedRep: editForm.ueedRep || undefined,
        remarks: editForm.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mat-reg'] });
      qc.invalidateQueries({ queryKey: ['mat-reg-sum'] });
      setShowEditModal(false);
      setEditForm(null);
      toast.success('Material register entry updated successfully');
    },
    onError: (e: any) =>
      toast.error('Could not update entry: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const delM = useMutation({
    mutationFn: (id: string) => materialRegisterApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mat-reg'] });
      qc.invalidateQueries({ queryKey: ['mat-reg-sum'] });
      toast.success('Entry deleted');
    },
    onError: (e: any) =>
      toast.error('Could not delete: ' + (e?.response?.data?.message ?? e?.message)),
  });

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setEF = (k: string, v: any) => setEditForm((f: any) => ({ ...f, [k]: v }));
  const num = (n: any) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: rows.length,
      cement_steel: 0,
      pipes_fittings: 0,
      aggregate_sand: 0,
      chemicals: 0,
      other: 0,
    };
    for (const r of rows) {
      const cat = getMaterialCategory(r.material);
      if (counts[cat] !== undefined) counts[cat]++;
      else counts.other++;
    }
    return counts;
  }, [rows]);

  // Filtered rows for active tab and search
  const filteredRows = useMemo(() => {
    return rows.filter((r: any) => {
      const cat = getMaterialCategory(r.material);
      if (activeTab !== 'all' && cat !== activeTab) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mat = (r.material || '').toLowerCase();
        const cRep = (r.contractorRep || '').toLowerCase();
        const uRep = (r.ueedRep || '').toLowerCase();
        const rem = (r.remarks || '').toLowerCase();
        if (!mat.includes(q) && !cRep.includes(q) && !uRep.includes(q) && !rem.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, activeTab, searchTerm]);

  // Filtered summary cards for active tab
  const filteredSummary = useMemo(() => {
    const res: Record<string, any> = {};
    for (const [mat, s] of Object.entries(summary as Record<string, any>)) {
      const cat = getMaterialCategory(mat);
      if (activeTab === 'all' || cat === activeTab) {
        res[mat] = s;
      }
    }
    return res;
  }, [summary, activeTab]);

  // Open create modal with optional preset material
  function handleOpenCreateModal(presetMaterial?: string, presetUnit?: string, presetCategory?: string) {
    const targetCat = presetCategory || (activeTab !== 'all' ? activeTab : 'cement_steel');
    const presets = MATERIAL_CATEGORIES[targetCat]?.presets || [];
    const defaultItem = presets[0] || { name: '', unit: 'Nos' };

    setForm({
      ...BLANK_FORM,
      category: targetCat,
      material: presetMaterial || defaultItem.name,
      unit: presetUnit || defaultItem.unit,
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  }

  // Handle category change inside the create modal
  function handleModalCategoryChange(newCat: string) {
    const presets = MATERIAL_CATEGORIES[newCat]?.presets || [];
    const defaultItem = presets[0] || { name: '', unit: 'Nos' };
    setForm((f: any) => ({
      ...f,
      category: newCat,
      material: defaultItem.name,
      unit: defaultItem.unit,
    }));
  }

  // Open edit modal for an existing row
  function handleOpenEdit(r: any) {
    const cat = getMaterialCategory(r.material);
    setEditForm({
      id: r.id,
      date: r.date ? (r.date.includes('T') ? r.date.split('T')[0] : r.date) : '',
      category: cat,
      material: r.material,
      unit: r.unit || '',
      receivedQty: r.receivedQty !== undefined && r.receivedQty !== null ? String(r.receivedQty) : '',
      consumedQty: r.consumedQty !== undefined && r.consumedQty !== null ? String(r.consumedQty) : '',
      contractorRep: r.contractorRep || '',
      ueedRep: r.ueedRep || '',
      remarks: r.remarks || '',
    });
    setShowEditModal(true);
  }

  // Export filtered rows to CSV
  function exportToCsv() {
    if (!filteredRows || filteredRows.length === 0) {
      toast.error('No rows to export');
      return;
    }
    const headers = [
      'Date',
      'Material',
      'Category',
      'Received Qty',
      'Consumed Qty',
      'Balance',
      'Unit',
      'Contractor Rep',
      'UEED Rep',
      'Remarks',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map((r: any) =>
        [
          `"${r.date || ''}"`,
          `"${(r.material || '').replace(/"/g, '""')}"`,
          `"${MATERIAL_CATEGORIES[getMaterialCategory(r.material)]?.shortLabel || 'Other'}"`,
          r.receivedQty || 0,
          r.consumedQty || 0,
          r.balance || 0,
          `"${r.unit || ''}"`,
          `"${(r.contractorRep || '').replace(/"/g, '""')}"`,
          `"${(r.ueedRep || '').replace(/"/g, '""')}"`,
          `"${(r.remarks || '').replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Material_Register_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }

  // Export Official Clause 55 Joint Register PDF
  function handleDownloadClause55Pdf() {
    if (!filteredRows || filteredRows.length === 0) {
      toast.error('No entries to include in PDF report');
      return;
    }
    const tabLabel = TABS.find((t) => t.id === activeTab)?.label || 'All Materials';
    generateMaterialRegisterPdf({
      rows: filteredRows,
      summary: filteredSummary,
      activeTabLabel: tabLabel,
      projectName: 'Dal Lake Sewerage Scheme — 38.5 MLD STP & Allied Works, Nishat',
    });
    toast.success('Clause 55 Joint Register PDF generated');
  }

  // Deep dive calculations for selected material
  const selectedMatSummary = selectedMaterial
    ? (summary as Record<string, any>)[selectedMaterial] || { received: 0, consumed: 0, balance: 0, unit: '' }
    : null;

  const selectedMatRows = useMemo(() => {
    if (!selectedMaterial) return [];
    return rows.filter((r: any) => r.material === selectedMaterial);
  }, [rows, selectedMaterial]);

  const selectedCat = selectedMaterial ? getMaterialCategory(selectedMaterial) : 'other';
  const selectedCatMeta = MATERIAL_CATEGORIES[selectedCat] || { label: 'General Material', shortLabel: 'Material' };

  function handleDownloadSinglePdf() {
    if (!selectedMaterial || !selectedMatSummary) return;
    generateSingleMaterialPdf({
      material: selectedMaterial,
      categoryLabel: selectedCatMeta.label,
      summary: selectedMatSummary,
      rows: selectedMatRows,
      projectName: 'Dal Lake Sewerage Scheme — 38.5 MLD STP & Allied Works, Nishat',
    });
    toast.success(`Stock Card PDF for ${selectedMaterial} generated`);
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>
              Material Log / Register
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: C.blueBg,
                color: C.blue,
                padding: '3px 9px',
                borderRadius: 12,
              }}
            >
              Clause 55 Compliant
            </span>
          </div>
          <p style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>
            Mandatory site receipts, daily consumption, running balance-in-hand &amp; joint field inspection register
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="md"
            icon={<DownloadSimple size={15} />}
            onClick={exportToCsv}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<FilePdf size={15} color={C.red} weight="bold" />}
            onClick={handleDownloadClause55Pdf}
            disabled={filteredRows.length === 0}
            title="Download official A4 Clause 55 Joint Register PDF"
          >
            Download PDF Register
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={15} weight="bold" />}
            onClick={() => handleOpenCreateModal()}
          >
            Add Register Entry
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: `1.5px solid ${C.border}`,
          paddingBottom: 2,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                border: 'none',
                background: isActive ? C.navy : 'transparent',
                color: isActive ? '#fff' : C.text2,
                borderRadius: '8px 8px 0 0',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                  color: isActive ? '#fff' : C.text2,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUMMARY CARDS (CLICKABLE DEEP-DIVE COMPONENT CARDS)
      ───────────────────────────────────────────────────────────── */}
      {Object.keys(filteredSummary).length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {Object.entries(filteredSummary).map(([mat, s]: [string, any]) => {
            const isNegative = s.balance < 0;
            const isZero = s.balance === 0;

            return (
              <div
                key={mat}
                onClick={() => setSelectedMaterial(mat)}
                style={{
                  background: C.card,
                  border: `1.5px solid ${isNegative ? C.red : C.border}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.blue;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isNegative ? C.red : C.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                }}
                title="Click to view detailed item movement history & stock card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, lineHeight: 1.3 }}>{mat}</div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isNegative ? C.redBg : isZero ? C.amberBg : C.greenBg,
                      color: isNegative ? C.red : isZero ? C.amber : C.green,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isNegative ? 'Negative' : isZero ? 'Depleted' : 'In Stock'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: `1px solid #f1f5f9`, paddingTop: 8 }}>
                  <span style={{ color: C.text3 }}>
                    Recd: <b style={{ color: C.text1 }}>{num(s.received)}</b>
                  </span>
                  <span style={{ color: C.text3 }}>
                    Used: <b style={{ color: C.text1 }}>{num(s.consumed)}</b>
                  </span>
                  <span style={{ color: C.text3 }}>
                    Bal:{' '}
                    <b style={{ color: isNegative ? C.red : isZero ? C.amber : C.green, fontSize: 13 }}>
                      {num(s.balance)}
                    </b>{' '}
                    <span style={{ fontSize: 11 }}>{s.unit ?? ''}</span>
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: C.blue,
                    fontWeight: 600,
                    paddingTop: 2,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} /> Inspect Movement Ledger
                  </span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: '#f8fafc',
            border: `1px dashed ${C.border}`,
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.text2 }}>
            <Stack size={20} color={C.blue} />
            <span>
              No stock entries recorded under <b>{TABS.find((t) => t.id === activeTab)?.label}</b> yet.
            </span>
          </div>
          <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => handleOpenCreateModal()}>
            Add First {TABS.find((t) => t.id === activeTab)?.shortLabel || 'Material'} Entry
          </Button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SEARCH & FILTER BAR
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', minWidth: 280, maxWidth: 440, flex: 1 }}>
          <MagnifyingGlass
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.text3 }}
          />
          <input
            type="text"
            placeholder="Search material description, contractor rep, UEED rep, remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: `1.5px solid ${C.border}`,
              fontSize: 12,
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ fontSize: 12, color: C.text2 }}>
          Showing <b>{filteredRows.length}</b> {filteredRows.length === 1 ? 'entry' : 'entries'}
          {activeTab !== 'all' && (
            <span>
              {' '}in <b>{TABS.find((t) => t.id === activeTab)?.shortLabel}</b>
            </span>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LEDGER DATA TABLE WITH ROW EDIT & DELETE
      ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1.5px solid ${C.border}`,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isError ? (
          <div style={{ padding: 24, color: C.red, fontSize: 13, textAlign: 'center' }}>
            Could not load the material register.
            <button
              onClick={() => refetch()}
              style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 8 }}
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Spinner />
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: C.text3, fontSize: 13 }}>
            <Cube size={36} color={C.border} style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontWeight: 600, color: C.text2, margin: '0 0 4px' }}>No entries found</p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {searchTerm ? 'Try adjusting your search criteria' : 'Click "Add Register Entry" to record site receipts or consumption'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: C.navy }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '10%' }}>
                    Date
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '23%' }}>
                    Material Description
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '10%' }}>
                    Received
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '10%' }}>
                    Consumed
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '11%' }}>
                    Balance
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '6%' }}>
                    Unit
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '13%' }}>
                    Contractor Rep
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '13%' }}>
                    UEED / Client Rep
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', width: '7%' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r: any, idx: number) => {
                  const cat = getMaterialCategory(r.material);

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: idx % 2 === 0 ? '#ffffff' : '#fafbfc',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontSize: 12, color: C.text2, whiteSpace: 'nowrap' }}>
                        {formatDate(r.date)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: C.text1 }}>
                        <div
                          onClick={() => setSelectedMaterial(r.material)}
                          style={{
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: C.blue,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Click to inspect this material's ledger"
                        >
                          <span>{r.material}</span>
                          <ArrowSquareOut size={12} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: C.text2,
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {MATERIAL_CATEGORIES[cat]?.shortLabel || 'Material'}
                          </span>
                          {r.remarks && (
                            <span style={{ fontSize: 11, color: C.text3, fontStyle: 'italic' }}>
                              · {r.remarks}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: C.green, fontWeight: 600, textAlign: 'right' }}>
                        {r.receivedQty > 0 ? `+${num(r.receivedQty)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: C.amber, fontWeight: 600, textAlign: 'right' }}>
                        {r.consumedQty > 0 ? `-${num(r.consumedQty)}` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: r.balance < 0 ? C.red : r.balance === 0 ? C.text3 : C.text1,
                          textAlign: 'right',
                        }}
                      >
                        {num(r.balance)}
                      </td>
                      <td style={{ padding: '10px 10px', fontSize: 12, color: C.text3, textAlign: 'center' }}>
                        {r.unit ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: C.text2 }}>
                        {r.contractorRep ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle size={14} color={C.green} weight="fill" />
                            <span>{r.contractorRep}</span>
                          </div>
                        ) : (
                          <span style={{ color: C.text3, fontSize: 11 }}>Unsigned</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: C.text2 }}>
                        {r.ueedRep ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle size={14} color={C.blue} weight="fill" />
                            <span>{r.ueedRep}</span>
                          </div>
                        ) : (
                          <span style={{ color: C.text3, fontSize: 11 }}>Unsigned</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: C.blue,
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Edit entry"
                          >
                            <PencilSimple size={14} weight="bold" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete entry for "${r.material}" on ${formatDate(r.date)}?`)) {
                                delM.mutate(r.id);
                              }
                            }}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: C.red,
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete entry"
                          >
                            <Trash size={14} />
                          </button>
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
          MODAL 1: ADD MATERIAL REGISTER ENTRY
      ───────────────────────────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Material Log / Register Entry"
        width={620}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createM.isPending}
              onClick={() => createM.mutate()}
              disabled={!form.material || (!form.receivedQty && !form.consumedQty)}
            >
              Save Register Entry
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Category Selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
              Material Category *
            </label>
            <select
              value={form.category}
              onChange={(e) => handleModalCategoryChange(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #d1d5db',
                fontSize: 13,
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              {Object.entries(MATERIAL_CATEGORIES).map(([catKey, catMeta]) => (
                <option key={catKey} value={catKey}>
                  {catMeta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Material Specification */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
            <Input
              label="Entry Date *"
              type="date"
              value={form.date}
              onChange={(e: any) => setF('date', e.target.value)}
            />

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                Material &amp; Specification *
              </label>
              <input
                list="modal-mat-presets"
                value={form.material}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = MATERIAL_CATEGORIES[form.category]?.presets.find((p) => p.name === val);
                  setForm((f: any) => ({
                    ...f,
                    material: val,
                    unit: matched?.unit || f.unit,
                  }));
                }}
                placeholder="Choose standard item or type custom"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '8px 12px',
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <datalist id="modal-mat-presets">
                {MATERIAL_CATEGORIES[form.category]?.presets.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Received, Consumed, and Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Input
              label="Received Qty"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={form.receivedQty}
              onChange={(e) => setF('receivedQty', e.target.value)}
            />
            <Input
              label="Consumed Qty"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={form.consumedQty}
              onChange={(e) => setF('consumedQty', e.target.value)}
            />
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                Unit of Measure *
              </label>
              <input
                list="units-list"
                value={form.unit}
                onChange={(e) => setF('unit', e.target.value)}
                placeholder="KG / MT / Bags"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '8px 12px',
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <datalist id="units-list">
                {['KG', 'MT', 'Bags', 'Rmt', 'Cu.m', 'Sqm', 'Nos', 'Sets', 'Litres'].map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Joint Signing Representatives */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Contractor Representative (Signed / Name)"
              placeholder="Gowhar Shah (Project Manager)"
              value={form.contractorRep}
              onChange={(e) => setF('contractorRep', e.target.value)}
            />
            <Input
              label="UEED / Department Rep (Signed / Name)"
              placeholder="Er. Samiullah Beigh / AEE S&D-I"
              value={form.ueedRep}
              onChange={(e) => setF('ueedRep', e.target.value)}
            />
          </div>

          {/* Remarks & Challan No */}
          <Input
            label="Challan / Invoice No., Batch Test Ref &amp; Remarks"
            placeholder="e.g. Challan #9823 from SAIL Srinagar Yard; Mill Test Certificate verified"
            value={form.remarks}
            onChange={(e) => setF('remarks', e.target.value)}
          />
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: EDIT MATERIAL REGISTER ENTRY
      ───────────────────────────────────────────────────────────── */}
      {showEditModal && editForm && (
        <Modal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditForm(null);
          }}
          title="Edit Material Register Entry"
          width={620}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setEditForm(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={updateM.isPending}
                onClick={() => updateM.mutate()}
                disabled={!editForm.material || (!editForm.receivedQty && !editForm.consumedQty)}
              >
                Save Changes
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Category Selector */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                Material Category *
              </label>
              <select
                value={editForm.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setEditForm((f: any) => ({ ...f, category: newCat }));
                }}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #d1d5db',
                  fontSize: 13,
                  background: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {Object.entries(MATERIAL_CATEGORIES).map(([catKey, catMeta]) => (
                  <option key={catKey} value={catKey}>
                    {catMeta.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Material Specification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
              <Input
                label="Entry Date *"
                type="date"
                value={editForm.date}
                onChange={(e: any) => setEF('date', e.target.value)}
              />

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                  Material &amp; Specification *
                </label>
                <input
                  list="edit-modal-mat-presets"
                  value={editForm.material}
                  onChange={(e) => setEF('material', e.target.value)}
                  placeholder="Material description"
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <datalist id="edit-modal-mat-presets">
                  {MATERIAL_CATEGORIES[editForm.category]?.presets.map((p) => (
                    <option key={p.name} value={p.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Received, Consumed, and Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input
                label="Received Qty"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={editForm.receivedQty}
                onChange={(e) => setEF('receivedQty', e.target.value)}
              />
              <Input
                label="Consumed Qty"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={editForm.consumedQty}
                onChange={(e) => setEF('consumedQty', e.target.value)}
              />
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: 'block' }}>
                  Unit of Measure *
                </label>
                <input
                  list="units-list-edit"
                  value={editForm.unit}
                  onChange={(e) => setEF('unit', e.target.value)}
                  placeholder="KG / MT / Bags"
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <datalist id="units-list-edit">
                  {['KG', 'MT', 'Bags', 'Rmt', 'Cu.m', 'Sqm', 'Nos', 'Sets', 'Litres'].map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Joint Signing Representatives */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Contractor Representative (Signed / Name)"
                placeholder="Gowhar Shah (Project Manager)"
                value={editForm.contractorRep}
                onChange={(e) => setEF('contractorRep', e.target.value)}
              />
              <Input
                label="UEED / Department Rep (Signed / Name)"
                placeholder="Er. Samiullah Beigh / AEE S&D-I"
                value={editForm.ueedRep}
                onChange={(e) => setEF('ueedRep', e.target.value)}
              />
            </div>

            {/* Remarks & Challan No */}
            <Input
              label="Challan / Invoice No., Batch Test Ref &amp; Remarks"
              placeholder="e.g. Challan #9823 from SAIL Srinagar Yard; Mill Test Certificate verified"
              value={editForm.remarks}
              onChange={(e) => setEF('remarks', e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: COMPONENT DEEP-DIVE INSPECTION & STOCK CARD MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedMaterial && selectedMatSummary && (
        <Modal
          open={!!selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          title={`Material Stock Card & Movement Ledger: ${selectedMaterial}`}
          width={860}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FilePdf size={14} color={C.red} weight="bold" />}
                  onClick={handleDownloadSinglePdf}
                >
                  Download Stock Card (PDF)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    const sMat = selectedMaterial;
                    const sUnit = selectedMatSummary.unit;
                    setSelectedMaterial(null);
                    handleOpenCreateModal(sMat, sUnit, selectedCat);
                  }}
                >
                  Add Movement for this Item
                </Button>
              </div>
              <Button variant="primary" size="sm" onClick={() => setSelectedMaterial(null)}>
                Done / Close
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Identity Box */}
            <div
              style={{
                background: '#f8fafc',
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text1 }}>
                    {selectedMaterial}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {selectedCatMeta.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
                  Tender Clause 55 mandatory daily accounting · Unit of record: <b>{selectedMatSummary.unit || '—'}</b>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 8,
                    background:
                      selectedMatSummary.balance < 0
                        ? C.redBg
                        : selectedMatSummary.balance === 0
                        ? C.amberBg
                        : C.greenBg,
                    color:
                      selectedMatSummary.balance < 0
                        ? C.red
                        : selectedMatSummary.balance === 0
                        ? C.amber
                        : C.green,
                  }}
                >
                  {selectedMatSummary.balance < 0
                    ? 'Negative Stock'
                    : selectedMatSummary.balance === 0
                    ? 'Depleted'
                    : 'Physical Stock Available'}
                </span>
              </div>
            </div>

            {/* 4 Summary KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>TOTAL RECEIVED (INWARD)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginTop: 4 }}>
                  +{num(selectedMatSummary.received)} <span style={{ fontSize: 12 }}>{selectedMatSummary.unit}</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>TOTAL CONSUMED (OUTWARD)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.amber, marginTop: 4 }}>
                  -{num(selectedMatSummary.consumed)} <span style={{ fontSize: 12 }}>{selectedMatSummary.unit}</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>BALANCE-IN-HAND</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: selectedMatSummary.balance < 0 ? C.red : C.navy,
                    marginTop: 4,
                  }}
                >
                  {num(selectedMatSummary.balance)} <span style={{ fontSize: 12 }}>{selectedMatSummary.unit}</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>TOTAL MOVEMENTS / LOGS</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.blue, marginTop: 4 }}>
                  {selectedMatRows.length} <span style={{ fontSize: 12 }}>entries</span>
                </div>
              </div>
            </div>

            {/* Movement Ledger Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text1 }}>
                  Movement Timeline &amp; Joint Signatures
                </h4>
                <span style={{ fontSize: 11, color: C.text3 }}>
                  Sorted latest to earliest
                </span>
              </div>

              <div
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  maxHeight: 340,
                  overflowY: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text2 }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.text2 }}>Received</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.text2 }}>Consumed</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.text2 }}>Balance</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text2 }}>Contractor Rep</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text2 }}>UEED Rep</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text2 }}>Remarks</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.text2 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMatRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: C.text3, fontSize: 12 }}>
                          No movement logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      selectedMatRows.map((r: any, idx: number) => (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: `1px solid #f1f5f9`,
                            background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontSize: 12, color: C.text2, whiteSpace: 'nowrap' }}>
                            {formatDate(r.date)}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 12, color: C.green, fontWeight: 600, textAlign: 'right' }}>
                            {r.receivedQty > 0 ? `+${num(r.receivedQty)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 12, color: C.amber, fontWeight: 600, textAlign: 'right' }}>
                            {r.consumedQty > 0 ? `-${num(r.consumedQty)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: r.balance < 0 ? C.red : C.text1, textAlign: 'right' }}>
                            {num(r.balance)}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: C.text2 }}>
                            {r.contractorRep ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={13} color={C.green} weight="fill" />
                                <span>{r.contractorRep}</span>
                              </div>
                            ) : (
                              <span style={{ color: C.text3 }}>Unsigned</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: C.text2 }}>
                            {r.ueedRep ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={13} color={C.blue} weight="fill" />
                                <span>{r.ueedRep}</span>
                              </div>
                            ) : (
                              <span style={{ color: C.text3 }}>Unsigned</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: C.text3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.remarks || '—'}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <button
                                onClick={() => handleOpenEdit(r)}
                                style={{
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: C.blue,
                                  cursor: 'pointer',
                                  padding: '3px 5px',
                                  borderRadius: 4,
                                }}
                                title="Edit entry"
                              >
                                <PencilSimple size={13} weight="bold" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete entry for "${r.material}" on ${formatDate(r.date)}?`)) {
                                    delM.mutate(r.id);
                                  }
                                }}
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: C.red,
                                  cursor: 'pointer',
                                  padding: '3px 5px',
                                  borderRadius: 4,
                                }}
                                title="Delete entry"
                              >
                                <Trash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
