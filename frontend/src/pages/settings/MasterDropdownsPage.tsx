import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/notify';
import {
  Package,
  Ruler,
  Truck,
  MapPin,
  Buildings,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react';
import { masterDataApi, type MasterDropdownOption } from '@/api/masterData.api';
import { MATERIAL_CATEGORIES } from '@/lib/materialCatalog';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

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
};

const DROPDOWN_TABS = [
  { id: 'material', label: 'Materials Catalog', icon: Package },
  { id: 'unit', label: 'Units of Measurement', icon: Ruler },
  { id: 'equipment_type', label: 'Equipment & Plant', icon: Truck },
  { id: 'site_zone', label: 'Site Zones & Locations', icon: MapPin },
  { id: 'stakeholder', label: 'Stakeholders & Agencies', icon: Buildings },
];

export default function MasterDropdownsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('material');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('all');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<MasterDropdownOption | null>(null);

  const [form, setForm] = useState<{
    label: string;
    value: string;
    category: string;
    unit: string;
    spec: string;
    aliases: string;
    displayOrder: number;
    isActive: boolean;
  }>({
    label: '',
    value: '',
    category: 'aggregate_sand',
    unit: 'Cu.m',
    spec: '',
    aliases: '',
    displayOrder: 0,
    isActive: true,
  });

  // Query options for current tab
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['master-dropdowns-list', activeTab, catFilter, searchTerm],
    queryFn: () =>
      masterDataApi
        .list({
          type: activeTab,
          category: activeTab === 'material' && catFilter !== 'all' ? catFilter : undefined,
          search: searchTerm || undefined,
          activeOnly: false,
        })
        .then((r) => r.data),
  });

  // Query units for material unit dropdown selector
  const { data: unitOptions = [] } = useQuery({
    queryKey: ['master-dropdowns-units'],
    queryFn: () =>
      masterDataApi.list({ type: 'unit', activeOnly: true }).then((r) => r.data),
  });

  // Create Mutation
  const createM = useMutation({
    mutationFn: (payload: any) => masterDataApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-dropdowns-list'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-grouped'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-units'] });
      setShowModal(false);
      resetForm();
      toast.success('Option added successfully');
    },
    onError: (e: any) =>
      toast.error('Failed to add option: ' + (e?.response?.data?.message || e?.message)),
  });

  // Update Mutation
  const updateM = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      masterDataApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-dropdowns-list'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-grouped'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-units'] });
      setShowModal(false);
      setEditItem(null);
      resetForm();
      toast.success('Option updated successfully');
    },
    onError: (e: any) =>
      toast.error('Failed to update option: ' + (e?.response?.data?.message || e?.message)),
  });

  // Toggle Active Mutation
  const toggleM = useMutation({
    mutationFn: (id: string) => masterDataApi.toggleActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-dropdowns-list'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-grouped'] });
      toast.success('Status updated');
    },
  });

  // Delete Mutation
  const deleteM = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) =>
      masterDataApi.remove(id, hard),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-dropdowns-list'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-grouped'] });
      qc.invalidateQueries({ queryKey: ['master-dropdowns-units'] });
      toast.success('Option removed');
    },
    onError: (e: any) =>
      toast.error('Failed to remove: ' + (e?.response?.data?.message || e?.message)),
  });

  function resetForm() {
    setForm({
      label: '',
      value: '',
      category: 'aggregate_sand',
      unit: 'Cu.m',
      spec: '',
      aliases: '',
      displayOrder: 0,
      isActive: true,
    });
  }

  function handleOpenAdd() {
    setEditItem(null);
    resetForm();
    if (activeTab === 'material') {
      setForm((f) => ({ ...f, category: catFilter !== 'all' ? catFilter : 'aggregate_sand' }));
    }
    setShowModal(true);
  }

  function handleOpenEdit(opt: MasterDropdownOption) {
    setEditItem(opt);
    const aliasArr = (opt.metadata?.aliases as string[]) || [];
    setForm({
      label: opt.label,
      value: opt.value,
      category: opt.category || 'other',
      unit: opt.unit || 'Nos',
      spec: opt.spec || '',
      aliases: aliasArr.join(', '),
      displayOrder: opt.displayOrder || 0,
      isActive: opt.isActive,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.value.trim()) {
      toast.error('Value/Name is required');
      return;
    }

    const aliases = form.aliases
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const payload: any = {
      dropdownType: activeTab,
      label: form.label.trim() || form.value.trim(),
      value: form.value.trim(),
      category: activeTab === 'material' ? form.category : undefined,
      unit: activeTab === 'material' ? form.unit : undefined,
      spec: activeTab === 'material' ? form.spec.trim() : undefined,
      metadata: { aliases },
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };

    if (editItem) {
      updateM.mutate({ id: editItem.id, payload });
    } else {
      createM.mutate(payload);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          background: C.card,
          border: '1.5px solid ' + C.border,
          borderRadius: 14,
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: '0 0 4px' }}>
            Master Data &amp; Dropdown Manager
          </h1>
          <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
            Configure and manage system dropdown lists in one central place. Values immediately
            update across Site Diary, Material Register, and Procurement.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} weight="bold" />
          Add Option
        </Button>
      </div>

      {/* Segmented Type Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid ' + C.border,
        }}
      >
        {DROPDOWN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: isActive ? `3px solid ${C.blue}` : '3px solid transparent',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? C.blue : C.text2,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Controls Bar */}
      <div
        style={{
          background: C.card,
          border: '1.5px solid ' + C.border,
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8fafc',
              border: '1px solid ' + C.border,
              borderRadius: 8,
              padding: '6px 12px',
              width: '100%',
              maxWidth: 360,
            }}
          >
            <MagnifyingGlass size={16} color={C.text3} />
            <input
              type="text"
              placeholder={`Search ${activeTab.replace('_', ' ')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                width: '100%',
                color: C.text1,
              }}
            />
          </div>

          {activeTab === 'material' && (
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid ' + C.border,
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                background: '#fff',
                color: C.text1,
              }}
            >
              <option value="all">All Categories</option>
              {Object.entries(MATERIAL_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.shortLabel}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: C.text2 }}>
          {options.length} {options.length === 1 ? 'option' : 'options'}
        </div>
      </div>

      {/* Options Table */}
      <div
        style={{
          background: C.card,
          border: '1.5px solid ' + C.border,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.text3, fontSize: 14 }}>
            Loading dropdown options...
          </div>
        ) : options.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text1, margin: '0 0 6px' }}>
              No options found
            </h3>
            <p style={{ fontSize: 13, color: C.text3, margin: '0 0 16px' }}>
              {searchTerm
                ? 'Try adjusting your search query'
                : 'Get started by adding your first dropdown option'}
            </p>
            <Button variant="primary" onClick={handleOpenAdd}>
              + Add Option
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1.5px solid ' + C.border,
                    textAlign: 'left',
                    color: C.text3,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 18px' }}>Option Name / Value</th>
                  {activeTab === 'material' && <th style={{ padding: '12px 18px' }}>Category</th>}
                  {activeTab === 'material' && <th style={{ padding: '12px 18px' }}>Standard Unit</th>}
                  {activeTab === 'material' && <th style={{ padding: '12px 18px' }}>Specification</th>}
                  <th style={{ padding: '12px 18px', width: 100 }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {options.map((opt, idx) => {
                  const aliases = (opt.metadata?.aliases as string[]) || [];
                  return (
                    <tr
                      key={opt.id}
                      style={{
                        borderBottom: idx !== options.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: opt.isActive ? '#fff' : '#fcfcfc',
                        opacity: opt.isActive ? 1 : 0.65,
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: C.text1 }}>{opt.label}</div>
                        {opt.label !== opt.value && (
                          <div style={{ fontSize: 11, color: C.text3 }}>Value: {opt.value}</div>
                        )}
                        {aliases.length > 0 && (
                          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                            Aliases: {aliases.join(', ')}
                          </div>
                        )}
                      </td>

                      {activeTab === 'material' && (
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: C.text2,
                            }}
                          >
                            {MATERIAL_CATEGORIES[opt.category as keyof typeof MATERIAL_CATEGORIES]
                              ?.shortLabel || opt.category || 'Other'}
                          </span>
                        </td>
                      )}

                      {activeTab === 'material' && (
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: C.blue }}>
                          {opt.unit || '—'}
                        </td>
                      )}

                      {activeTab === 'material' && (
                        <td
                          style={{
                            padding: '14px 18px',
                            color: C.text2,
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={opt.spec || ''}
                        >
                          {opt.spec || <span style={{ color: C.text3 }}>None</span>}
                        </td>
                      )}

                      <td style={{ padding: '14px 18px' }}>
                        <button
                          onClick={() => toggleM.mutate(opt.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: opt.isActive ? C.greenBg : C.redBg,
                            color: opt.isActive ? C.green : C.red,
                          }}
                          title="Click to toggle active/inactive"
                        >
                          {opt.isActive ? (
                            <>
                              <CheckCircle size={12} weight="bold" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle size={12} weight="bold" /> Inactive
                            </>
                          )}
                        </button>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleOpenEdit(opt)}
                            style={{
                              border: '1px solid ' + C.border,
                              background: '#fff',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: C.text2,
                            }}
                            title="Edit"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove "${opt.label}"?`)) {
                                deleteM.mutate({ id: opt.id, hard: true });
                              }
                            }}
                            style={{
                              border: '1px solid #fecaca',
                              background: '#fff',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: C.red,
                            }}
                            title="Delete"
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

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? `Edit Dropdown Option` : `Add Dropdown Option`}
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createM.isPending || updateM.isPending}
              onClick={handleSave}
            >
              {editItem ? 'Save Changes' : 'Create Option'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeTab === 'material' ? (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                  Material Name / Specification *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 63mm Downgrade, Khak Bajri, TMT SAIL BARS 20MM"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value, label: e.target.value }))}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid ' + C.border,
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '8px 12px',
                      border: '1.5px solid ' + C.border,
                      borderRadius: 8,
                      fontSize: 13,
                      outline: 'none',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    {Object.entries(MATERIAL_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                    Standard Unit *
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '8px 12px',
                      border: '1.5px solid ' + C.border,
                      borderRadius: 8,
                      fontSize: 13,
                      outline: 'none',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    {unitOptions.length > 0 ? (
                      unitOptions.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Cu.m">Cu.m</option>
                        <option value="MT">MT</option>
                        <option value="KG">KG</option>
                        <option value="Nos">Nos</option>
                        <option value="Bags">Bags</option>
                        <option value="Rmt">Rmt</option>
                        <option value="Litres">Litres</option>
                        <option value="Trip">Trip</option>
                        <option value="Sets">Sets</option>
                        <option value="Sqm">Sqm</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                  Technical / IS Specification (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fe500D TMT, IS 1786 or IS 383 graded"
                  value={form.spec}
                  onChange={(e) => setForm((f) => ({ ...f, spec: e.target.value }))}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid ' + C.border,
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                  Common Aliases / Search Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 63 mm downgrade, 63mm d/g, subbase"
                  value={form.aliases}
                  onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid ' + C.border,
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                  Option Name / Display Label *
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${activeTab.replace('_', ' ')}...`}
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value, value: e.target.value }))}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid ' + C.border,
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, display: 'block', marginBottom: 4 }}>
                  Short Value (Defaults to Display Label)
                </label>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 12px',
                    border: '1.5px solid ' + C.border,
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="isActiveCheck" style={{ fontSize: 13, fontWeight: 500, color: C.text1, cursor: 'pointer' }}>
              Active (Visible in dropdowns across the application)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
