import { toast } from '@/lib/notify';
import { useState, useMemo } from 'react';
import { groupByMaterial, stockState } from './groupRegister';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  SlidersHorizontal,
  Warning,
  CaretRight,
} from '@phosphor-icons/react';
import { materialRegisterApi } from '@/api/registers.api';
import { useAuthStore } from '@/store/auth.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { wbsApi } from '@/api/wbs.api';
import { formatDate } from '@/lib/date';
import {
  generateMaterialRegisterPdf,
  generateSingleMaterialPdf,
} from './materialRegisterPdf';
import {
  MATERIAL_CATEGORIES,
  getMaterialCategory,
  categoryMeta,
  useMasterDropdowns,
} from '@/lib/materialCatalog';

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
  rate: '',
  purpose: '',
  wbsCode: '',
  supplierName: '',
  invoiceNo: '',
  challanNo: '',
  contractorRep: 'Gowhar Shah (Project Manager)',
  ueedRep: 'Er. Samiullah Beigh / AEE S&D-I',
  remarks: '',
};

export default function MaterialRegisterPage() {
  const { activeProjectId } = useAuthStore();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { presetsByCategory } = useMasterDropdowns();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK_FORM);
  const [isCustomMat, setIsCustomMat] = useState(false);

  // Edit row state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isEditCustomMat, setIsEditCustomMat] = useState(false);

  // Deep-dive component inspection state
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  // Grouped by default. The flat ledger is the same rows in date order, which
  // is what an auditor reading a delivery sequence wants; it is not what
  // anyone checking stock wants, and it was the only view there was.
  const [viewMode, setViewMode] = useState<'grouped' | 'ledger'>('grouped');
  // Which groups are open, rather than which are closed, so the default is
  // closed. Expanded-by-default was fine at four materials and unusable at
  // twenty: the point of grouping is that the stock position fits on one
  // screen, and it does not if every ledger is unrolled beneath it.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        rate: form.rate === '' || form.rate == null ? null : parseFloat(form.rate),
        purpose: form.purpose?.trim() || null,
        wbsCode: form.wbsCode?.trim() || null,
        supplierName: form.supplierName?.trim() || null,
        invoiceNo: form.invoiceNo?.trim() || null,
        challanNo: form.challanNo?.trim() || null,
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
        rate: editForm.rate === '' || editForm.rate == null ? null : parseFloat(editForm.rate),
        purpose: editForm.purpose?.trim() || null,
        wbsCode: editForm.wbsCode?.trim() || null,
        supplierName: editForm.supplierName?.trim() || null,
        invoiceNo: editForm.invoiceNo?.trim() || null,
        challanNo: editForm.challanNo?.trim() || null,
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

  // Real activities, not a free-text box. A typed WBS code cannot be joined to
  // anything: "2.3", "2.3 ", "WBS 2.3" and "2.3 Aeration" are four different
  // strings and one activity, and the question this field exists to answer —
  // what did we use on this work — needs them to be the same.
  const { data: wbsTasks = [] } = useQuery({
    queryKey: ['wbs-for-register', activeProjectId],
    queryFn: () => wbsApi.list(activeProjectId!).then((r) => r.data),
    enabled: !!activeProjectId,
  });
  const wbsOptions = useMemo(
    () => (Array.isArray(wbsTasks) ? wbsTasks : []).map((t: any) => ({
      value: t.wbsCode,
      label: `${t.wbsCode} — ${t.title}`,
    })),
    [wbsTasks],
  );

  const materialGroups = useMemo(() => groupByMaterial(filteredRows), [filteredRows]);

  const [showComplete, setShowComplete] = useState(false);
  const [completeDraft, setCompleteDraft] = useState<Record<string, any>>({});

  const completeM = useMutation({
    mutationFn: (entries: any[]) => materialRegisterApi.complete(entries),
    onSuccess: (res: any) => {
      const { updated, skipped } = res?.data ?? {};
      qc.invalidateQueries({ queryKey: ['mat-reg', activeProjectId] });
      qc.invalidateQueries({ queryKey: ['mat-reg-summary', activeProjectId] });
      setShowComplete(false);
      setCompleteDraft({});
      // Rows the server refused are named rather than counted: "3 skipped"
      // tells nobody which three, or what to do about them.
      if (skipped?.length) {
        toast.error(`${updated} updated. ${skipped.length} could not be: ${skipped[0].reason}`);
      } else {
        toast.success(`${updated} ${updated === 1 ? 'entry' : 'entries'} completed.`);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not save those entries.'),
  });

  // Entries that cannot yet answer what they cost or what they were for.
  const incompleteRows = useMemo(
    () => filteredRows.filter((r: any) =>
      (r.rate == null || Number(r.rate) === 0) ||
      !r.purpose ||
      (Number(r.consumedQty) > 0 && !r.wbsCode)
    ),
    [filteredRows],
  );
  const isSearching = searchTerm.trim().length > 0;

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
    const presets = presetsByCategory(targetCat);
    const defaultItem = presets[0] || { name: '', unit: 'Nos' };
    const matName = presetMaterial || defaultItem.name;
    const isCustom = matName ? !presets.some((p) => p.name === matName) : false;

    setIsCustomMat(isCustom);
    setForm({
      ...BLANK_FORM,
      category: targetCat,
      material: matName,
      unit: presetUnit || defaultItem.unit,
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  }

  // Handle category change inside the create modal
  function handleModalCategoryChange(newCat: string) {
    const presets = presetsByCategory(newCat);
    const defaultItem = presets[0] || { name: '', unit: 'Nos' };
    setIsCustomMat(false);
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
    const presets = presetsByCategory(cat);
    const isCustom = !presets.some((p) => p.name === r.material);

    setIsEditCustomMat(isCustom);
    setEditForm({
      id: r.id,
      date: r.date ? (r.date.includes('T') ? r.date.split('T')[0] : r.date) : '',
      category: cat,
      material: r.material,
      unit: r.unit || '',
      receivedQty: r.receivedQty !== undefined && r.receivedQty !== null ? String(r.receivedQty) : '',
      consumedQty: r.consumedQty !== undefined && r.consumedQty !== null ? String(r.consumedQty) : '',
      rate: r.rate !== undefined && r.rate !== null ? String(r.rate) : '',
      purpose: r.purpose ?? '',
      wbsCode: r.wbsCode ?? '',
      supplierName: r.supplierName ?? '',
      invoiceNo: r.invoiceNo ?? '',
      challanNo: r.challanNo ?? '',
      contractorRep: r.contractorRep || '',
      ueedRep: r.ueedRep || '',
      remarks: r.remarks || '',
    });
    setShowEditModal(true);
  }

  // Handle category change inside the edit modal
  function handleEditModalCategoryChange(newCat: string) {
    const presets = presetsByCategory(newCat);
    const defaultItem = presets[0] || { name: '', unit: 'Nos' };
    setIsEditCustomMat(false);
    setEditForm((f: any) => ({
      ...f,
      category: newCat,
      material: defaultItem.name,
      unit: defaultItem.unit,
    }));
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
          `"${categoryMeta(getMaterialCategory(r.material)).shortLabel}"`,
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
  const selectedCatMeta = categoryMeta(selectedCat);

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
            Same material names as Site Diary. Diary receipts post here on submit. Running balance is received − consumed, by exact name.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="md"
            icon={<SlidersHorizontal size={15} />}
            onClick={() => nav('/settings/dropdowns')}
            title="Manage Materials & Dropdowns in Settings"
          >
            Dropdown Settings
          </Button>
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
          {incompleteRows.length > 0 && (
            <Button
              variant="secondary"
              size="md"
              icon={<Warning size={15} color={C.amber} weight="fill" />}
              onClick={() => { setCompleteDraft({}); setShowComplete(true); }}
              title="Fill in rate, purpose and WBS activity for entries that are missing them"
            >
              Complete {incompleteRows.length} {incompleteRows.length === 1 ? 'entry' : 'entries'}
            </Button>
          )}
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
          SUMMARY CARDS — only in date order, where nothing else states stock.

          In the grouped view a collapsed header already carries this material's
          received, consumed and balance, on a row that lines up with every
          other material's. Showing both put the same four numbers on screen
          twice, and they could disagree: the cards come from the summary
          endpoint filtered by tab, the groups from the rows filtered by tab AND
          search, so typing in the search box narrowed one and not the other.
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'ledger' && (Object.keys(filteredSummary).length > 0 ? (
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
      ))}

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          {([['grouped', 'By material'], ['ledger', 'Date order']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                background: viewMode === mode ? '#fff' : 'transparent',
                color: viewMode === mode ? C.navy : C.text2,
                boxShadow: viewMode === mode ? '0 1px 2px rgba(15,23,42,0.10)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.text2 }}>
          {viewMode === 'grouped' && materialGroups.length > 0 && (
            <><b>{materialGroups.length}</b> {materialGroups.length === 1 ? 'material' : 'materials'} · </>
          )}
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
        ) : viewMode === 'grouped' ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {materialGroups.map((g, gi) => {
              const cat = getMaterialCategory(g.material);
              const state = stockState(g.balance);
              const tone = state === 'negative' ? C.red : state === 'empty' ? C.text3 : C.green;
              const toneBg = state === 'negative' ? '#fef2f2' : state === 'empty' ? '#f1f5f9' : '#ecfdf5';
              const label = state === 'negative' ? 'Over-issued' : state === 'empty' ? 'Nil balance' : 'In stock';
              // Closed by default, with two exceptions, then whatever the
              // user last chose for this material wins over both.
              //
              // A search that matches a remark would otherwise hide its own
              // result: the group narrows to the matching rows and then stays
              // shut, so the box looks like it found nothing. And collapsing
              // the only group on screen just hides the entire page behind one
              // click.
              const defaultOpen = isSearching || materialGroups.length === 1;
              const isOpen = g.material in expanded ? expanded[g.material] : defaultOpen;

              return (
                <div key={g.material} style={{ borderTop: gi === 0 ? 'none' : `1px solid ${C.border}` }}>
                  {/* Material header: the stock position, readable without expanding */}
                  <div
                    onClick={() => setExpanded(e => ({ ...e, [g.material]: !isOpen }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                      cursor: 'pointer', background: isOpen ? '#fbfcfe' : '#fff',
                    }}
                  >
                    <CaretRight
                      size={14} weight="bold" color={C.text3}
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
                    />

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{g.material}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, background: '#f1f5f9', color: C.text2, padding: '2px 7px', borderRadius: 4 }}>
                          {categoryMeta(cat).shortLabel}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: toneBg, color: tone, padding: '2px 8px', borderRadius: 999 }}>
                          {label}
                        </span>
                        {/* Quantities in different units are not a total, they
                            are a data-entry fault. Saying so beats printing a
                            number that adds cubic feet to kilograms. */}
                        {g.units.length > 1 && (
                          <span
                            title={`Recorded in ${g.units.join(' and ')}. These cannot be added together — correct the entries so one unit is used.`}
                            style={{ fontSize: 10, fontWeight: 700, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 999 }}
                          >
                            Mixed units: {g.units.join(' / ')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.text3, marginTop: 3 }}>
                        {g.rows.length} {g.rows.length === 1 ? 'movement' : 'movements'}
                        {g.lastActivity && <> · last {formatDate(g.lastActivity)}</>}
                      </div>
                    </div>

                    {/* Received / consumed / balance, aligned across every group */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right', minWidth: 76 }}>
                        <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Received</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text2, fontVariantNumeric: 'tabular-nums' }}>{num(g.received)}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 76 }}>
                        <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Consumed</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: g.consumed > 0 ? C.amber : C.text3, fontVariantNumeric: 'tabular-nums' }}>
                          {g.consumed > 0 ? num(g.consumed) : '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 104 }}>
                        <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Procured for</div>
                        <div
                          style={{ fontSize: 13, fontWeight: 600, color: g.procurementValue > 0 ? C.text2 : C.text3, fontVariantNumeric: 'tabular-nums' }}
                          title={g.unpricedQty > 0
                            ? `${num(g.unpricedQty)} ${g.unit} received with no rate recorded, so it is not in this figure.`
                            : undefined}
                        >
                          {g.procurementValue > 0
                            ? '₹' + g.procurementValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                            : '—'}
                          {g.unpricedQty > 0 && (
                            <span style={{ color: '#b45309', fontWeight: 700 }}> *</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 96 }}>
                        <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: g.units.length > 1 ? C.text3 : tone, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                          {g.units.length > 1 ? (
                            <span style={{ fontSize: 12, fontWeight: 700 }}>needs correction</span>
                          ) : (
                            <>{num(g.balance)} <span style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>{g.unit}</span></>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedMaterial(g.material); }}
                      style={{
                        flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
                        background: '#fff', color: C.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                      title="Inspect this material's movement ledger"
                    >
                      <ArrowSquareOut size={12} /> Ledger
                    </button>
                  </div>

                  {/* Movements. The material, category and unit are in the header
                      above, so the rows carry only what actually differs. */}
                  {isOpen && (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderTop: `1px solid ${C.border}` }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '7px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 110 }}>Date</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 90 }}>In</th>
                            {g.hasConsumption && (
                              <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 90 }}>Out</th>
                            )}
                            <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 110 }}>Balance</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 90 }}>Rate</th>
                            <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 70 }}>Signed</th>
                            <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>Purpose / Source</th>
                            <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 80 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r: any) => (
                            <tr key={r.id} style={{ borderTop: `1px solid #f1f5f9` }}>
                              <td style={{ padding: '9px 18px', fontSize: 12, color: C.text2, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                              <td style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 600, color: r.receivedQty > 0 ? C.green : C.text3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {r.receivedQty > 0 ? `+${num(r.receivedQty)}` : '—'}
                              </td>
                              {g.hasConsumption && (
                                <td style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 600, color: r.consumedQty > 0 ? C.amber : C.text3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {r.consumedQty > 0 ? `-${num(r.consumedQty)}` : '—'}
                                </td>
                              )}
                              <td style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 700, color: r.balance < 0 ? C.red : C.text1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {num(r.balance)}
                              </td>
                              {/* Two names repeated on every row told nobody
                                  anything. What matters is whether both sides
                                  signed; the names are one hover away. */}
                              <td style={{ padding: '9px 10px', fontSize: 12, color: r.rate ? C.text2 : C.text3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {r.rate ? '₹' + Number(r.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                              </td>
                              <td style={{ padding: '9px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span title={`Contractor: ${r.contractorRep || 'unsigned'}\nUEED / Client: ${r.ueedRep || 'unsigned'}`} style={{ display: 'inline-flex', gap: 3 }}>
                                  <CheckCircle size={14} weight="fill" color={r.contractorRep ? C.green : '#e2e8f0'} />
                                  <CheckCircle size={14} weight="fill" color={r.ueedRep ? C.blue : '#e2e8f0'} />
                                </span>
                              </td>
                              <td style={{ padding: '9px 12px', fontSize: 11.5, color: C.text3 }}>
                                {r.purpose ? (
                                  <div style={{ color: C.text2, fontWeight: 600 }}>
                                    {r.purpose}
                                    {r.wbsCode && (
                                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: '#eff6ff', color: C.blue, padding: '1px 6px', borderRadius: 4 }}>
                                        WBS {r.wbsCode}
                                      </span>
                                    )}
                                  </div>
                                ) : Number(r.consumedQty) > 0 ? (
                                  // Stock left with no account of where it went is
                                  // exactly what a client's engineer asks about.
                                  <span style={{ color: '#b45309', fontWeight: 600 }}>No purpose recorded</span>
                                ) : null}
                                <div style={{ marginTop: r.purpose ? 2 : 0 }}>
                                  {[r.supplierName, r.invoiceNo && `Inv ${r.invoiceNo}`, r.challanNo && `Challan ${r.challanNo}`, r.remarks]
                                    .filter(Boolean).join(' · ') || (r.purpose ? '' : '—')}
                                </div>
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    onClick={() => handleOpenEdit(r)}
                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: C.blue, cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'inline-flex' }}
                                    title="Edit entry"
                                  >
                                    <PencilSimple size={13} weight="bold" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete entry for "${r.material}" on ${formatDate(r.date)}?`)) delM.mutate(r.id);
                                    }}
                                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: C.red, cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'inline-flex' }}
                                    title="Delete entry"
                                  >
                                    <Trash size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
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
                            {categoryMeta(cat).shortLabel}
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
              disabled={!form.material || (!form.receivedQty && !form.consumedQty) || (parseFloat(form.consumedQty) > 0 && !form.purpose?.trim())}
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
              <select
                value={isCustomMat ? '__custom__' : form.material}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    setIsCustomMat(true);
                    setForm((f: any) => ({ ...f, material: '' }));
                  } else {
                    setIsCustomMat(false);
                    const matched = presetsByCategory(form.category).find((p) => p.name === val);
                    setForm((f: any) => ({
                      ...f,
                      material: val,
                      unit: matched?.unit || f.unit,
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '8px 12px',
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  background: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {presetsByCategory(form.category).map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.unit})
                  </option>
                ))}
                <option value="__custom__">✍️ Other / Custom Material (Type manually)...</option>
              </select>
              {isCustomMat && (
                <input
                  type="text"
                  placeholder="Enter custom material name manually *"
                  value={form.material}
                  onChange={(e) => setForm((f: any) => ({ ...f, material: e.target.value }))}
                  autoFocus
                  style={{
                    width: '100%',
                    height: 38,
                    marginTop: 6,
                    padding: '8px 12px',
                    border: `1.5px solid ${C.blue}`,
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f8faff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              )}
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

          {/* Rate — the only source of procurement value for material that
              does not arrive through a purchase order. Receipts booked against
              a GRN carry the PO rate automatically. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Rate per unit (₹)"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 420.00"
              value={form.rate}
              onChange={(e) => setF('rate', e.target.value)}
            />
            <Input
              label="Supplier"
              placeholder="e.g. Alamdar Stone Crusher"
              value={form.supplierName}
              onChange={(e) => setF('supplierName', e.target.value)}
            />
          </div>

          {form.rate && (parseFloat(form.receivedQty) > 0 || parseFloat(form.consumedQty) > 0) ? (
            <div style={{ fontSize: 12, color: C.text2, marginTop: -4 }}>
              Line value:{' '}
              <b style={{ color: C.text1 }}>
                ₹{(parseFloat(form.rate) * (parseFloat(form.receivedQty) || parseFloat(form.consumedQty) || 0))
                  .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </b>
            </div>
          ) : null}

          {/* Purpose: why it came in, or what it went into. Both were being
              written as prose into remarks, where nothing can group them. */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Input
              label={parseFloat(form.consumedQty) > 0 ? 'Purpose — what it was used on *' : 'Purpose — what it was brought in for'}
              placeholder={parseFloat(form.consumedQty) > 0
                ? 'e.g. Aeration tank wall shuttering'
                : 'e.g. STP raft pour, Zone 2'}
              value={form.purpose}
              onChange={(e) => setF('purpose', e.target.value)}
            />
            <Select
              label="WBS activity"
              value={form.wbsCode}
              onChange={(e: any) => setF('wbsCode', e.target.value)}
              options={[{ value: '', label: '— none —' }, ...wbsOptions]}
            />
          </div>

          {parseFloat(form.consumedQty) > 0 && !form.purpose.trim() && (
            <div style={{ fontSize: 12, color: C.red, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' }}>
              This entry takes material out of stock. Say what work it was used
              on — the server will not accept consumption without it, because a
              balance that drops with no account of where it went is the first
              thing a client's engineer asks about.
            </div>
          )}

          {/* Papers, structured rather than buried in prose */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Invoice No."
              placeholder="e.g. GSTSI2627/904"
              value={form.invoiceNo}
              onChange={(e) => setF('invoiceNo', e.target.value)}
            />
            <Input
              label="Challan No."
              placeholder="e.g. JK18D3699"
              value={form.challanNo}
              onChange={(e) => setF('challanNo', e.target.value)}
            />
          </div>

          {/* Remarks */}
          <Input
            label="Remarks"
            placeholder="e.g. Mill Test Certificate verified; sound condition"
            value={form.remarks}
            onChange={(e) => setF('remarks', e.target.value)}
          />
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          COMPLETE THE REGISTER

          Rows written before rate, purpose and WBS existed have none of them,
          and the register cannot say what anything cost or what it was for
          until somebody enters it. One row at a time through the edit modal is
          a hundred clicks nobody will make, so the data stays missing and the
          register stays unanswerable.

          Only these three fields are reachable here. A bulk editor that can
          reach quantities or dates is a way to rewrite a signed register in one
          action, which is what the audit trail and the soft delete exist to
          prevent — and the server refuses anything else regardless.
      ───────────────────────────────────────────────────────────── */}
      <Modal
        open={showComplete}
        onClose={() => setShowComplete(false)}
        title="Complete the register"
        width={900}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowComplete(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={completeM.isPending}
              disabled={Object.keys(completeDraft).length === 0}
              onClick={() => {
                const entries = Object.entries(completeDraft).map(([id, d]: any) => ({
                  id,
                  ...(d.rate !== undefined ? { rate: d.rate === '' ? null : parseFloat(d.rate) } : {}),
                  ...(d.purpose !== undefined ? { purpose: d.purpose } : {}),
                  ...(d.wbsCode !== undefined ? { wbsCode: d.wbsCode } : {}),
                }));
                completeM.mutate(entries);
              }}
            >
              Save {Object.keys(completeDraft).length || ''} {Object.keys(completeDraft).length === 1 ? 'entry' : 'entries'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: C.text2, margin: 0 }}>
            These entries are missing a rate, a purpose, or the activity they
            were used on. Until they have them the register cannot say what the
            material cost or where it went, and neither can the assistant.
            Anything you leave blank stays as it is.
          </p>

          <div style={{ maxHeight: 460, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>Material</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 110 }}>Rate ₹</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>Purpose</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', width: 190 }}>WBS activity</th>
                </tr>
              </thead>
              <tbody>
                {incompleteRows.map((r: any) => {
                  const draft = completeDraft[r.id] ?? {};
                  const setDraft = (field: string, value: any) =>
                    setCompleteDraft((d) => ({ ...d, [r.id]: { ...(d[r.id] ?? {}), [field]: value } }));
                  const isIssue = Number(r.consumedQty) > 0;
                  const purposeValue = draft.purpose ?? r.purpose ?? '';
                  // An issue the server will refuse, shown before they press save.
                  const purposeMissing = isIssue && !String(purposeValue).trim();

                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 10px', color: C.text2, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: C.text1 }}>
                        {r.material}
                        {isIssue && (
                          <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, background: '#fffbeb', color: C.amber, padding: '1px 5px', borderRadius: 4 }}>
                            ISSUE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: C.text2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {num(r.receivedQty || r.consumedQty)} {r.unit}
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          type="number" min="0" step="any"
                          placeholder={r.rate ? String(r.rate) : '—'}
                          value={draft.rate ?? (r.rate ?? '')}
                          onChange={(e) => setDraft('rate', e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, textAlign: 'right', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          placeholder={isIssue ? 'What work was it used on? (required)' : 'What was it brought in for?'}
                          value={purposeValue}
                          onChange={(e) => setDraft('purpose', e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${purposeMissing ? C.red : C.border}`, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <select
                          value={draft.wbsCode ?? (r.wbsCode ?? '')}
                          onChange={(e) => setDraft('wbsCode', e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }}
                        >
                          <option value="">— none —</option>
                          {wbsOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                disabled={!editForm.material || (!editForm.receivedQty && !editForm.consumedQty) || (parseFloat(editForm.consumedQty) > 0 && !editForm.purpose?.trim())}
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
                onChange={(e) => handleEditModalCategoryChange(e.target.value)}
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
                <select
                  value={isEditCustomMat ? '__custom__' : editForm.material}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      setIsEditCustomMat(true);
                      setEditForm((f: any) => ({ ...f, material: '' }));
                    } else {
                      setIsEditCustomMat(false);
                      const matched = presetsByCategory(editForm.category).find((p) => p.name === val);
                      setEditForm((f: any) => ({
                        ...f,
                        material: val,
                        unit: matched?.unit || f.unit,
                      }));
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {presetsByCategory(editForm.category).map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                  <option value="__custom__">✍️ Other / Custom Material (Type manually)...</option>
                </select>
                {isEditCustomMat && (
                  <input
                    type="text"
                    placeholder="Enter custom material name manually *"
                    value={editForm.material}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, material: e.target.value }))}
                    autoFocus
                    style={{
                      width: '100%',
                      height: 38,
                      marginTop: 6,
                      padding: '8px 12px',
                      border: `1.5px solid ${C.blue}`,
                      borderRadius: 8,
                      fontSize: 13,
                      background: '#f8faff',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
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
                  {['KG', 'MT', 'Bags', 'Rmt', 'Cu.m', 'Sqm', 'Nos', 'Sets', 'Litres', 'cft'].map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Rate & Supplier */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Rate per unit (₹)"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 420.00"
                value={editForm.rate}
                onChange={(e) => setEF('rate', e.target.value)}
              />
              <Input
                label="Supplier"
                placeholder="e.g. Alamdar Stone Crusher"
                value={editForm.supplierName}
                onChange={(e) => setEF('supplierName', e.target.value)}
              />
            </div>

            {/* Purpose & WBS Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Input
                label={parseFloat(editForm.consumedQty) > 0 ? 'Purpose — what it was used on *' : 'Purpose — what it was brought in for'}
                placeholder={parseFloat(editForm.consumedQty) > 0
                  ? 'e.g. Aeration tank wall shuttering / pipe bedding'
                  : 'e.g. STP raft pour, Zone 2'}
                value={editForm.purpose}
                onChange={(e) => setEF('purpose', e.target.value)}
              />
              <Select
                label="WBS activity"
                value={editForm.wbsCode}
                onChange={(e: any) => setEF('wbsCode', e.target.value)}
                options={[{ value: '', label: '— none —' }, ...wbsOptions]}
              />
            </div>

            {parseFloat(editForm.consumedQty) > 0 && !editForm.purpose?.trim() && (
              <div style={{ fontSize: 12, color: C.red, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' }}>
                This entry takes material out of stock. Say what work it was used
                on — the server will not accept consumption without it, because a
                balance that drops with no account of where it went is the first
                thing a client's engineer asks about.
              </div>
            )}

            {/* Papers / Invoices */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Invoice No."
                placeholder="e.g. GSTSI2627/904"
                value={editForm.invoiceNo}
                onChange={(e) => setEF('invoiceNo', e.target.value)}
              />
              <Input
                label="Challan No."
                placeholder="e.g. JK18D3699"
                value={editForm.challanNo}
                onChange={(e) => setEF('challanNo', e.target.value)}
              />
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
