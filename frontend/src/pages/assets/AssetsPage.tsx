import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, Plus, MagnifyingGlass, DownloadSimple, ArrowRight, ClockCounterClockwise } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/lib/notify'
import { assetsApi, CATEGORIES, CONDITIONS, STATUSES } from '@/api/assets.api'
import type { AssetAction, AssetWrite, OfficeAsset } from '@/api/assets.api'
import { ACTION_LABELS, assetActions, csvCell, localToday, safeAssetLink } from './assetHelpers'
import './AssetsPage.css'

const WRITERS = ['super_admin', 'admin', 'project_manager', 'accounts', 'accountant', 'hr_officer']
const DISPOSERS = ['super_admin', 'admin', 'project_manager']
function message(error: unknown): string {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string }
  const text = e?.response?.data?.message
  return Array.isArray(text) ? text.join('. ') : text || 'The asset service could not complete this request. Please try again.'
}
const date = (value?: string | null) => value ? value.slice(0, 10) : 'Not recorded'
const money = (value: OfficeAsset['purchaseCost']) => value === null ? 'Not recorded' : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const Status = ({ value }: { value: OfficeAsset['status'] }) => <span className={`asset-status asset-status-${value}`}>{STATUSES[value]}</span>

export default function AssetsPage() {
  const projectId = useAuthStore(s => s.activeProjectId)
  const role = useAuthStore(s => s.user?.role ?? '')
  return projectId ? <ProjectAssets key={projectId} projectId={projectId} role={role} /> : <div className="assets-page"><h1>Assets & Inventory</h1><p>Select a project to open its office asset register.</p></div>
}

function ProjectAssets({ projectId, role }: { projectId: string; role: string }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [draftSearch, setDraftSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<OfficeAsset | null>(null)
  const [editor, setEditor] = useState<OfficeAsset | 'new' | null>(null)
  const canWrite = WRITERS.includes(role)
  const query = useQuery({ queryKey: ['office-assets', projectId, search, category, status, page], queryFn: () => assetsApi.list(projectId, { search: search || undefined, category: category || undefined, status: status || undefined, page }).then(r => r.data) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['office-assets', projectId] })
  const exportPage = () => {
    const rows = query.data?.items ?? []
    const csv = [['Asset tag', 'Name', 'Category', 'Status', 'Condition', 'Location', 'Custodian', 'Serial number', 'Purchase date', 'Purchase cost INR', 'Warranty until'], ...rows.map(a => [a.assetTag, a.name, CATEGORIES[a.category], STATUSES[a.status], CONDITIONS[a.condition], a.location, a.assignedTo, a.serialNumber, a.purchaseDate, a.purchaseCost, a.warrantyUntil])].map(row => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `asset-register-page-${page}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="assets-page">
    <header className="assets-heading"><div><div className="assets-eyebrow">OFFICE & COMPANY PROPERTY</div><h1>Assets & Inventory</h1><p>Know what you own, where it is, and who is responsible.</p></div><div className="assets-actions"><button onClick={exportPage} disabled={!query.data?.items.length}><DownloadSimple size={17} />Export this page</button>{canWrite && <button className="assets-primary" onClick={() => setEditor('new')}><Plus size={18} />Register asset</button>}</div></header>
    <div className="assets-context"><Package size={21} /><span>Furniture, computers, laptops, printers, vehicles and equipment. One record per tagged asset—not consumable stock.</span><Link to="/material-register">Material register <ArrowRight /></Link></div>
    {query.isError && <div role="alert" className="assets-error">{message(query.error)} <button onClick={() => query.refetch()}>Retry</button></div>}
    {query.data && <div className="assets-stats">{Object.entries(STATUSES).map(([key, label]) => <button key={key} aria-pressed={status === key} onClick={() => { setStatus(status === key ? '' : key); setPage(1) }}><span>{label}</span><strong>{query.data.counts[key as keyof typeof STATUSES] ?? 0}</strong><small>In selected project</small></button>)}</div>}
    <div className="assets-panel"><form className="assets-filters" onSubmit={e => { e.preventDefault(); setSearch(draftSearch); setPage(1) }}><label className="assets-search"><span className="assets-sr-only">Search assets</span><MagnifyingGlass size={18} /><input placeholder="Search tag, name, serial, custodian or location…" value={draftSearch} onChange={e => setDraftSearch(e.target.value)} maxLength={120} /></label><button type="submit">Search</button><label><span className="assets-sr-only">Category</span><select aria-label="Category" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}><option value="">All categories</option>{Object.entries(CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span className="assets-sr-only">Asset status</span><select aria-label="Asset status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{Object.entries(STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></form>
      {query.isPending ? <div className="assets-empty" role="status">Loading the asset register…</div> : query.data?.items.length ? <div className="assets-table-scroll"><table><thead><tr>{['Asset', 'Category', 'Location / custodian', 'Status', 'Purchase cost', 'Warranty', ''].map((label, i) => <th key={i} scope="col">{label}</th>)}</tr></thead><tbody>{query.data.items.map(asset => <tr key={asset.id}><td><button className="assets-text-button" onClick={() => setSelected(asset)}>{asset.name}</button><small>{asset.assetTag}{asset.serialNumber ? ` · ${asset.serialNumber}` : ''}</small></td><td>{CATEGORIES[asset.category]}<small>{[asset.brand, asset.model].filter(Boolean).join(' · ') || CONDITIONS[asset.condition]}</small></td><td>{asset.location}<small>{asset.assignedTo || 'No employee assigned'}</small></td><td><Status value={asset.status} /></td><td>{money(asset.purchaseCost)}</td><td>{date(asset.warrantyUntil)}{asset.warrantyUntil && asset.warrantyUntil < localToday() && <small className="assets-warning">Expired</small>}</td><td><button aria-label={`View ${asset.assetTag}`} onClick={() => setSelected(asset)}>View <ArrowRight /></button></td></tr>)}</tbody></table></div> : !query.isError && <div className="assets-empty"><Package size={38} /><h2>{search || category || status ? 'No matching assets' : 'Start your office asset register'}</h2><p>{search || category || status ? 'Change your search or filters.' : 'Register each chair, desk, computer or vehicle with its own asset tag. No sample records will be inserted.'}</p>{canWrite && !search && !category && !status && <button className="assets-primary" onClick={() => setEditor('new')}>Register your first asset</button>}</div>}
      {query.data && <footer className="assets-pagination"><span>{query.data.total} matching assets · Page {page} of {Math.max(1, Math.ceil(query.data.total / 25))}</span><div><button disabled={page <= 1 || query.isFetching} onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={page * 25 >= query.data.total || query.isFetching} onClick={() => setPage(p => p + 1)}>Next</button></div></footer>}
    </div>
    <p className="assets-footnote">Purchase cost is recorded acquisition cost, not depreciated book value. Transfers in this release are between locations within the selected project. Document and photo fields accept existing secure links.</p>
    {editor && <AssetEditor key={editor === 'new' ? 'new' : editor.id} projectId={projectId} asset={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSaved={asset => { setEditor(null); if (selected?.id === asset.id) setSelected(asset); void refresh() }} />}
    {selected && !editor && <AssetDetails key={selected.id} asset={selected} role={role} onClose={() => setSelected(null)} onEdit={() => setEditor(selected)} onChanged={asset => { setSelected(asset); void refresh() }} />}
  </section>
}

const OPTIONAL_FIELDS = ['brand', 'model', 'serialNumber', 'supplier', 'invoiceNumber', 'purchaseDate', 'purchaseCost', 'warrantyUntil', 'registrationNumber', 'insuranceUntil', 'serviceDue', 'documentUrl', 'photoUrl', 'notes'] as const
function AssetEditor({ projectId, asset, onClose, onSaved }: { projectId: string; asset: OfficeAsset | null; onClose: () => void; onSaved: (a: OfficeAsset) => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries([['assetTag', asset?.assetTag ?? ''], ['name', asset?.name ?? ''], ['category', asset?.category ?? 'furniture'], ['condition', asset?.condition ?? 'good'], ['location', asset?.location ?? ''], ['reason', ''], ...OPTIONAL_FIELDS.map(key => [key, String(asset?.[key] ?? '')])]))
  const set = (key: string, value: string) => setForm(old => ({ ...old, [key]: value }))
  const mutation = useMutation({ mutationFn: async () => {
    const data: AssetWrite = { projectId, assetTag: form.assetTag.trim(), name: form.name.trim(), category: form.category as OfficeAsset['category'], condition: form.condition as OfficeAsset['condition'], location: form.location.trim(), version: asset?.version, reason: form.reason }
    const optional = Object.fromEntries(OPTIONAL_FIELDS.map(key => [key, form[key].trim() || null]))
    Object.assign(data, optional, { purchaseCost: form.purchaseCost.trim() ? Number(form.purchaseCost) : null })
    return (asset ? await assetsApi.update(asset.id, data) : await assetsApi.create(data)).data
  }, onSuccess: data => { toast.success(asset ? 'Asset details updated' : 'Asset registered'); onSaved(data) } })
  const input = (key: string, label: string, type = 'text', required = false, maxLength = 200) => <label key={key}>{label}{required ? ' *' : ''}<input aria-label={label} type={type} value={form[key]} required={required} maxLength={maxLength} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} pattern={key === 'assetTag' ? '[A-Za-z0-9][A-Za-z0-9._/\-]*' : undefined} readOnly={key === 'location' && !!asset} onChange={e => set(key, e.target.value)} /></label>
  return <Modal open title={asset ? `Edit ${asset.assetTag}` : 'Register office asset'} width={780} onClose={() => { if (!mutation.isPending) onClose() }}>
    <form className="asset-form" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><p>One record per physical asset. Required fields are marked *. Use a unique tag such as OFC-LAP-001.</p>
      {mutation.isError && <div className="assets-error" role="alert">{message(mutation.error)}</div>}
      <fieldset disabled={mutation.isPending}><legend>Identity & location</legend><div className="asset-fields">{input('assetTag', 'Asset tag', 'text', true, 60)}{input('name', 'Asset name', 'text', true)}<label>Category *<select aria-label="Asset category" value={form.category} onChange={e => set('category', e.target.value)}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>Condition *<select value={form.condition} onChange={e => set('condition', e.target.value)}>{Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>{input('location', asset ? 'Location (use Transfer to move)' : 'Office / room / location', 'text', true)}{input('serialNumber', 'Serial number', 'text', false, 150)}{input('brand', 'Brand', 'text', false, 120)}{input('model', 'Model', 'text', false, 120)}</div></fieldset>
      <fieldset disabled={mutation.isPending}><legend>Purchase & upkeep</legend><div className="asset-fields">{input('supplier', 'Supplier')}{input('invoiceNumber', 'Invoice number', 'text', false, 100)}{input('purchaseDate', 'Purchase date', 'date')}{input('purchaseCost', 'Purchase cost (INR)', 'number')}{input('warrantyUntil', 'Warranty until', 'date')}{input('serviceDue', 'Next service due', 'date')}{form.category === 'vehicle' && <>{input('registrationNumber', 'Vehicle registration', 'text', false, 60)}{input('insuranceUntil', 'Insurance until', 'date')}</>}</div></fieldset>
      <fieldset disabled={mutation.isPending}><legend>References & notes</legend><div className="asset-fields">{input('documentUrl', 'Invoice / warranty document link (HTTPS)', 'url', false, 2000)}{input('photoUrl', 'Photo link (HTTPS)', 'url', false, 2000)}</div><label>Notes<textarea maxLength={4000} value={form.notes} onChange={e => set('notes', e.target.value)} /></label>{asset && <label>Reason for correction *<textarea required maxLength={1000} value={form.reason} onChange={e => set('reason', e.target.value)} /></label>}</fieldset>
      <div className="asset-form-footer"><button type="button" disabled={mutation.isPending} onClick={onClose}>Cancel</button><button className="assets-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : asset ? 'Save changes' : 'Register asset'}</button></div>
    </form>
  </Modal>
}

function AssetDetails({ asset, role, onClose, onEdit, onChanged }: { asset: OfficeAsset; role: string; onClose: () => void; onEdit: () => void; onChanged: (a: OfficeAsset) => void }) {
  const qc = useQueryClient()
  const [action, setAction] = useState<AssetAction | ''>('')
  const [reason, setReason] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState(localToday)
  const canWrite = WRITERS.includes(role)
  const history = useQuery({ queryKey: ['asset-history', asset.projectId, asset.id], queryFn: () => assetsApi.history(asset.id, asset.projectId).then(r => r.data) })
  const employees = useQuery({ queryKey: ['asset-custodians', asset.projectId], queryFn: () => assetsApi.custodians(asset.projectId).then(r => r.data), enabled: action === 'assign' })
  const mutation = useMutation({ mutationFn: async () => { if (!action) throw new Error('Select an action'); return (await assetsApi.action(asset.id, { projectId: asset.projectId, version: asset.version, action, reason, eventDate, employeeId: action === 'assign' ? employeeId : undefined, location: action === 'transfer' ? location : undefined })).data }, onSuccess: data => { onChanged(data); setAction(''); setReason(''); setEmployeeId(''); setLocation(''); void qc.invalidateQueries({ queryKey: ['asset-history', asset.projectId, asset.id] }); toast.success('Asset history updated') } })
  return <Modal open title={`${asset.assetTag} · ${asset.name}`} width={800} onClose={() => { if (!mutation.isPending) onClose() }}><div className="asset-details">
    <div className="asset-detail-top"><Status value={asset.status} /><span>{CATEGORIES[asset.category]} · {CONDITIONS[asset.condition]}</span>{canWrite && asset.status !== 'disposed' && <button disabled={mutation.isPending} onClick={onEdit}>Edit details</button>}</div>
    <dl className="asset-detail-grid">{[['Location', asset.location], ['Custodian', asset.assignedTo || 'Not assigned'], ['Brand / model', [asset.brand, asset.model].filter(Boolean).join(' ') || 'Not recorded'], ['Serial number', asset.serialNumber || 'Not recorded'], ['Purchase cost', money(asset.purchaseCost)], ['Purchase date', date(asset.purchaseDate)], ['Supplier', asset.supplier || 'Not recorded'], ['Invoice', asset.invoiceNumber || 'Not recorded'], ['Warranty until', date(asset.warrantyUntil)], ['Last verified', date(asset.lastVerified)], ['Next service due', date(asset.serviceDue)], ...(asset.category === 'vehicle' ? [['Vehicle registration', asset.registrationNumber || 'Not recorded'], ['Insurance until', date(asset.insuranceUntil)]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {asset.notes && <p className="asset-notes">{asset.notes}</p>}<div className="asset-reference-links">{safeAssetLink(asset.documentUrl) && <a target="_blank" rel="noopener noreferrer" href={safeAssetLink(asset.documentUrl)!}>Open document ↗</a>}{safeAssetLink(asset.photoUrl) && <a target="_blank" rel="noopener noreferrer" href={safeAssetLink(asset.photoUrl)!}>Open photo ↗</a>}{asset.category === 'vehicle' && ['super_admin', 'admin', 'project_manager', 'engineer', 'supervisor'].includes(role) && <Link to="/fleet">Open Fleet operational logs →</Link>}</div>
    {canWrite && asset.status !== 'disposed' && <form className="asset-form asset-event-form" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><h3>Record a lifecycle event</h3><p>Events keep who, when and why. Transfer changes the location within this project; it does not move consumable stock.</p><fieldset disabled={mutation.isPending}><div className="asset-fields"><label>Action *<select aria-label="Lifecycle action" required value={action} onChange={e => { setAction(e.target.value as AssetAction); mutation.reset() }}><option value="">Choose an action</option>{assetActions(asset, DISPOSERS.includes(role)).map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}</select></label><label>Event date *<input type="date" required max={localToday()} value={eventDate} onChange={e => setEventDate(e.target.value)} /></label>{action === 'assign' && <label>Employee custodian *<select required value={employeeId} onChange={e => setEmployeeId(e.target.value)} disabled={employees.isPending || employees.isError}><option value="">{employees.isPending ? 'Loading employees…' : 'Choose an employee'}</option>{employees.data?.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.empCode}</option>)}</select></label>}{action === 'transfer' && <label>Destination location *<input required maxLength={200} value={location} onChange={e => setLocation(e.target.value)} /></label>}</div><label>Reason / handover / verification note *<textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label></fieldset>{action === 'assign' && employees.isError && <div role="alert" className="assets-error">Could not load custodians. <button type="button" onClick={() => employees.refetch()}>Retry</button></div>}{action === 'assign' && employees.data?.length === 0 && <p>No active employees are assigned to this project. Add or update the employee in HR first.</p>}{action === 'dispose' && <p className="assets-warning">Disposal is permanent in this register. Return assigned assets first. Include the approval or disposal reference in your note.</p>}{mutation.isError && <div role="alert" className="assets-error">{message(mutation.error)}</div>}<button className="assets-primary" disabled={!action || mutation.isPending || (action === 'assign' && !employeeId)}>{mutation.isPending ? 'Recording…' : 'Record event'}</button></form>}
    <h3 className="asset-history-title"><ClockCounterClockwise size={19} />Activity history</h3><p className="assets-footnote">Latest 100 events by recording time. Event dates can differ from the date recorded.</p>{history.isPending && <p role="status">Loading history…</p>}{history.isError && <div className="assets-error" role="alert">Could not load history. <button onClick={() => history.refetch()}>Retry</button></div>}<ol className="asset-history">{history.data?.map(event => <li key={event.id}><strong>{ACTION_LABELS[event.action as AssetAction] || event.action.replace(/_/g, ' ')}</strong><span>{event.eventDate} · {event.actorName}</span><p>{event.reason}</p>{event.before && <small>{(['status', 'location', 'assignedTo', 'condition', 'purchaseCost'] as const).filter(k => event.before?.[k] !== event.after[k]).map(k => `${k}: ${event.before?.[k] ?? '—'} → ${event.after[k] ?? '—'}`).join(' · ')}</small>}<small>Recorded {new Date(event.createdAt).toLocaleString()}</small></li>)}</ol>
  </div></Modal>
}
