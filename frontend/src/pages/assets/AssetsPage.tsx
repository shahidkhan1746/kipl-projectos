import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Package, Plus, MagnifyingGlass, DownloadSimple, ArrowRight, ClockCounterClockwise, FilePdf, Printer, Funnel, X } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/lib/notify'
import { ACQUISITIONS, assetsApi, CATEGORIES, CONDITIONS, STATUSES } from '@/api/assets.api'
import { projectsApi } from '@/api/projects.api'
import type { AssetAction, AssetFilters, AssetScope, OfficeAsset } from '@/api/assets.api'
import { ACTION_LABELS, assetActions, csvCell, localToday, safeAssetLink } from './assetHelpers'
import { AssetEditor } from './AssetEditor'
import { describeOrigin, hasRegistration, locationSuggestions, sourceSuggestions } from './assetForm'
import { buildRegisterModel, fetchAllAssets, loadLogo, registerFileName, renderRegisterPdf } from './assetRegisterPdf'
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
  const userName = useAuthStore(s => s.user?.name ?? '')
  return projectId ? <ProjectAssets key={projectId} projectId={projectId} role={role} userName={userName} /> : <div className="assets-page"><h1>Assets & Inventory</h1><p>Select a project to open its office asset register.</p></div>
}

type FilterKey = 'search' | 'category' | 'status' | 'acquisition' | 'sourceSite' | 'location' | 'condition'
type Filters = Record<FilterKey, string>
const NO_FILTERS: Filters = { search: '', category: '', status: '', acquisition: '', sourceSite: '', location: '', condition: '' }
/** How an asset came, as a filter. Legacy assets have their own list, so they are not an option here. */
const PROJECT_ORIGINS = { purchased: ACQUISITIONS.purchased, purchased_used: ACQUISITIONS.purchased_used, transferred: ACQUISITIONS.transferred, unrecorded: 'Not recorded' }
const TABS: { scope: AssetScope; label: string; note: string }[] = [
  { scope: 'project', label: 'This project', note: 'Everything bought for or transferred to this project. Legacy assets from earlier projects are listed separately.' },
  { scope: 'legacy', label: 'Legacy assets', note: 'Assets carried over from an earlier project, kept apart from this project\'s own register.' },
]
/** The options for a filter, keeping the chosen one even if no asset has it any more. */
const withCurrent = (values: string[] | undefined, current: string) => current && !(values ?? []).includes(current) ? [current, ...(values ?? [])] : values ?? []

function ProjectAssets({ projectId, role, userName }: { projectId: string; role: string; userName: string }) {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const scope: AssetScope = params.get('list') === 'legacy' ? 'legacy' : 'project'
  // Filters and page belong to the list they were set on; another list starts clean.
  const [view, setView] = useState({ scope, filters: NO_FILTERS, page: 1 })
  const { filters, page } = view.scope === scope ? view : { filters: NO_FILTERS, page: 1 }
  const [draftSearch, setDraftSearch] = useState('')
  const setFilter = (key: FilterKey, value: string) => setView({ scope, filters: { ...filters, [key]: value }, page: 1 })
  const setPage = (next: number) => setView({ scope, filters, page: next })
  const clearFilters = () => { setView({ scope, filters: NO_FILTERS, page: 1 }); setDraftSearch('') }
  const openList = (next: AssetScope) => {
    if (next === scope) return
    setDraftSearch('')
    setParams(p => { const q = new URLSearchParams(p); if (next === 'legacy') q.set('list', 'legacy'); else q.delete('list'); return q })
  }
  const [selected, setSelected] = useState<OfficeAsset | null>(null)
  const [editor, setEditor] = useState<OfficeAsset | 'new' | null>(null)
  const canWrite = WRITERS.includes(role)
  const isLegacy = scope === 'legacy'
  const apiFilters: AssetFilters = { scope, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
  const filtered = Object.values(filters).some(Boolean)
  const query = useQuery({ queryKey: ['office-assets', projectId, apiFilters, page], queryFn: () => assetsApi.list(projectId, { ...apiFilters, page }).then(r => r.data) })
  // Tab totals stay on screen while the other list loads.
  const [tabCounts, setTabCounts] = useState<Record<AssetScope, number> | null>(null)
  useEffect(() => { if (query.data?.scopeCounts) setTabCounts(query.data.scopeCounts) }, [query.data])
  const facets = query.data?.facets
  const refresh = () => qc.invalidateQueries({ queryKey: ['office-assets', projectId] })
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId).then(r => r.data as { name?: string }), staleTime: 10 * 60_000 })
  const [pdfBusy, setPdfBusy] = useState<'download' | 'print' | null>(null)
  /** The whole list for the current tab and filters, not just this page, as a PDF. */
  const buildPdf = async () => {
    const [assets, logo] = await Promise.all([
      fetchAllAssets(p => assetsApi.list(projectId, { ...apiFilters, page: p }).then(r => r.data)),
      loadLogo(),
    ])
    return renderRegisterPdf(buildRegisterModel(assets, apiFilters), { projectName: project.data?.name || 'Asset register', generatedBy: userName || undefined, logo })
  }
  const fileName = () => registerFileName(undefined, scope)
  const downloadPdf = async () => {
    setPdfBusy('download')
    try { (await buildPdf()).save(fileName()) }
    catch (error) { toast.error(message(error)) }
    finally { setPdfBusy(null) }
  }
  const printPdf = async () => {
    // Open the tab inside the click, before any waiting, so the browser does not block it.
    const tab = window.open('', '_blank')
    setPdfBusy('print')
    try {
      const pdf = await buildPdf()
      if (tab) { pdf.autoPrint(); tab.location.href = String(pdf.output('bloburl')) }
      else { pdf.save(fileName()); toast.success('Pop-ups are blocked, so the PDF was downloaded. Open it to print.') }
    } catch (error) { tab?.close(); toast.error(message(error)) }
    finally { setPdfBusy(null) }
  }
  const exportPage = () => {
    const rows = query.data?.items ?? []
    const csv = [['Asset tag', 'Name', 'Category', 'Status', 'Condition', 'Location', 'Custodian', 'Serial number', 'Came from', 'Purchase date', 'Purchase cost INR', 'Warranty until'], ...rows.map(a => [a.assetTag, a.name, CATEGORIES[a.category], STATUSES[a.status], CONDITIONS[a.condition], a.location, a.assignedTo, a.serialNumber, describeOrigin(a.acquisition, a.sourceSite), a.purchaseDate, a.purchaseCost, a.warrantyUntil])].map(row => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `${isLegacy ? 'legacy-' : ''}asset-register-page-${page}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const tabKeys = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const next = isLegacy ? 'project' : 'legacy'
    openList(next)
    requestAnimationFrame(() => document.getElementById(`assets-tab-${next}`)?.focus())
  }
  const select = (key: FilterKey, label: string, empty: string, options: [string, string][]) =>
    <label><span className="assets-sr-only">{label}</span><select aria-label={label} className={filters[key] ? 'is-active' : undefined} value={filters[key]} onChange={e => setFilter(key, e.target.value)}><option value="">{empty}</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
  const pairs = (values: string[]) => values.map(v => [v, v] as [string, string])
  const sourceSites = withCurrent(facets?.sourceSites, filters.sourceSite)
  const register = canWrite && <button className="assets-primary" onClick={() => setEditor('new')}><Plus size={18} />{isLegacy ? 'Register legacy asset' : 'Register asset'}</button>
  return <section className="assets-page">
    <header className="assets-heading"><div><div className="assets-eyebrow">OFFICE & COMPANY PROPERTY</div><h1>Assets & Inventory</h1><p>Know what you own, where it is, and who is responsible.</p></div><div className="assets-actions"><button onClick={downloadPdf} disabled={!query.data?.total || !!pdfBusy}><FilePdf size={17} />{pdfBusy === 'download' ? 'Preparing PDF…' : 'Download PDF'}</button><button onClick={printPdf} disabled={!query.data?.total || !!pdfBusy}><Printer size={17} />{pdfBusy === 'print' ? 'Preparing…' : 'Print'}</button><button onClick={exportPage} disabled={!query.data?.items.length}><DownloadSimple size={17} />Export this page</button>{register}</div></header>
    <div className="assets-context"><Package size={21} /><span>Furniture, computers, printers, vehicles, plant & machinery, instruments and equipment. One record per tagged asset—not consumable stock.</span><Link to="/material-register">Material register <ArrowRight /></Link></div>
    <div className="assets-tabs" role="tablist" aria-label="Asset lists">{TABS.map(t => <button key={t.scope} id={`assets-tab-${t.scope}`} role="tab" aria-selected={scope === t.scope} aria-controls="assets-list" tabIndex={scope === t.scope ? 0 : -1} onClick={() => openList(t.scope)} onKeyDown={tabKeys}>{t.scope === 'legacy' && <ClockCounterClockwise size={16} />}{t.label}{tabCounts && <span className="assets-tab-count">{tabCounts[t.scope]}</span>}</button>)}</div>
    <div id="assets-list" role="tabpanel" aria-labelledby={`assets-tab-${scope}`}>
    <p className="assets-tab-note">{TABS.find(t => t.scope === scope)!.note}</p>
    {query.isError && <div role="alert" className="assets-error">{message(query.error)} <button onClick={() => query.refetch()}>Retry</button></div>}
    {query.data && <div className="assets-stats">{Object.entries(STATUSES).map(([key, label]) => <button key={key} aria-pressed={filters.status === key} onClick={() => setFilter('status', filters.status === key ? '' : key)}><span>{label}</span><strong>{query.data.counts[key as keyof typeof STATUSES] ?? 0}</strong><small>{isLegacy ? 'Legacy assets' : 'This project'}</small></button>)}</div>}
    <div className="assets-panel"><form className="assets-filters" onSubmit={e => { e.preventDefault(); setFilter('search', draftSearch.trim()) }}>
      <div className="assets-search-row"><label className="assets-search"><span className="assets-sr-only">Search assets</span><MagnifyingGlass size={18} /><input placeholder={isLegacy ? 'Search tag, name, serial, location or earlier project…' : 'Search tag, name, serial, custodian or location…'} value={draftSearch} onChange={e => setDraftSearch(e.target.value)} maxLength={120} /></label><button type="submit">Search</button></div>
      <div className="assets-filter-row"><span className="assets-filter-label"><Funnel size={15} />Filter</span>
        {select('category', 'Category', 'All categories', Object.entries(CATEGORIES))}
        {select('status', 'Asset status', 'All statuses', Object.entries(STATUSES))}
        {!isLegacy && select('acquisition', 'How it came', 'Any origin', Object.entries(PROJECT_ORIGINS))}
        {(sourceSites.length > 0) && select('sourceSite', isLegacy ? 'Earlier project' : 'Transferred from', isLegacy ? 'All earlier projects' : 'Any source site', pairs(sourceSites))}
        {select('location', 'Location', 'All locations', pairs(withCurrent(facets?.locations, filters.location)))}
        {select('condition', 'Condition', 'Any condition', Object.entries(CONDITIONS))}
        {filtered && <button type="button" className="assets-clear" onClick={clearFilters}><X size={14} />Clear filters</button>}
      </div></form>
      {query.isPending ? <div className="assets-empty" role="status">Loading the asset register…</div> : query.data?.items.length ? <div className="assets-table-scroll"><table><thead><tr>{['Asset', 'Category', 'Location / custodian', isLegacy ? 'Earlier project' : 'Came from', 'Status', 'Purchase cost', 'Warranty', ''].map((label, i) => <th key={i} scope="col">{label}</th>)}</tr></thead><tbody>{query.data.items.map(asset => <tr key={asset.id}><td><button className="assets-text-button" onClick={() => setSelected(asset)}>{asset.name}</button><small>{asset.assetTag}{asset.serialNumber ? ` · ${asset.serialNumber}` : ''}</small></td><td>{CATEGORIES[asset.category]}<small>{[asset.brand, asset.model].filter(Boolean).join(' · ') || CONDITIONS[asset.condition]}</small></td><td>{asset.location}<small>{asset.assignedTo || 'No employee assigned'}</small></td><td>{isLegacy ? asset.sourceSite || 'Not recorded' : describeOrigin(asset.acquisition, asset.sourceSite) || 'Not recorded'}</td><td><Status value={asset.status} /></td><td>{money(asset.purchaseCost)}</td><td>{date(asset.warrantyUntil)}{asset.warrantyUntil && asset.warrantyUntil < localToday() && <small className="assets-warning">Expired</small>}</td><td><button aria-label={`View ${asset.assetTag}`} onClick={() => setSelected(asset)}>View <ArrowRight /></button></td></tr>)}</tbody></table></div>
        : !query.isError && (filtered
          ? <div className="assets-empty"><Package size={38} /><h2>No matching assets</h2><p>Nothing in {isLegacy ? 'the legacy list' : "this project's register"} matches these filters.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
          : isLegacy
            ? <div className="assets-empty"><ClockCounterClockwise size={38} /><h2>No legacy assets recorded</h2><p>Assets carried over from an earlier project are listed here, apart from this project&apos;s own register.</p>{register}</div>
            : <div className="assets-empty"><Package size={38} /><h2>Start your office asset register</h2><p>Register each chair, desk, computer or vehicle with its own asset tag.</p>{canWrite && <button className="assets-primary" onClick={() => setEditor('new')}>Register your first asset</button>}</div>)}
      {query.data && <footer className="assets-pagination"><span>{query.data.total} matching {isLegacy ? 'legacy ' : ''}asset{query.data.total === 1 ? '' : 's'} · Page {page} of {Math.max(1, Math.ceil(query.data.total / 25))}</span><div><button disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)}>Previous</button><button disabled={page * 25 >= query.data.total || query.isFetching} onClick={() => setPage(page + 1)}>Next</button></div></footer>}
    </div>
    </div>
    <p className="assets-footnote">Purchase cost is recorded acquisition cost, not depreciated book value. Transfers in this release are between locations within the selected project. Document and photo fields accept existing secure links.</p>
    {editor && <AssetEditor key={editor === 'new' ? 'new' : editor.id} projectId={projectId} asset={editor === 'new' ? null : editor} locations={facets?.locations ?? locationSuggestions(query.data?.items ?? [])} sources={facets?.sourceSites ?? sourceSuggestions(query.data?.items ?? [])}
      preset={editor === 'new' && isLegacy ? { acquisition: 'legacy' } : undefined}
      onClose={() => setEditor(null)}
      onCreated={() => { void refresh() }}
      onUpdated={asset => { setEditor(null); if (selected?.id === asset.id) setSelected(asset); void refresh() }}
      onView={asset => { setEditor(null); setSelected(asset) }} />}
    {selected && !editor && <AssetDetails key={selected.id} asset={selected} role={role} onClose={() => setSelected(null)} onEdit={() => setEditor(selected)} onChanged={asset => { setSelected(asset); void refresh() }} />}
  </section>
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
    <dl className="asset-detail-grid">{[['Location', asset.location], ['Custodian', asset.assignedTo || 'Not assigned'], ['Brand / model', [asset.brand, asset.model].filter(Boolean).join(' ') || 'Not recorded'], ['Serial number', asset.serialNumber || 'Not recorded'], ['Purchase cost', money(asset.purchaseCost)], ['Purchase date', date(asset.purchaseDate)], ['Supplier', asset.supplier || 'Not recorded'], ['Invoice', asset.invoiceNumber || 'Not recorded'], ['Warranty until', date(asset.warrantyUntil)], ['Last verified', date(asset.lastVerified)], [asset.category === 'instrument' ? 'Next calibration due' : 'Next service due', date(asset.serviceDue)], ['Came from', describeOrigin(asset.acquisition, asset.sourceSite) || 'Not recorded'], ...(hasRegistration(asset.category) ? [['Registration', asset.registrationNumber || 'Not recorded'], ['Insurance until', date(asset.insuranceUntil)]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {asset.notes && <p className="asset-notes">{asset.notes}</p>}<div className="asset-reference-links">{safeAssetLink(asset.documentUrl) && <a target="_blank" rel="noopener noreferrer" href={safeAssetLink(asset.documentUrl)!}>Open document ↗</a>}{safeAssetLink(asset.photoUrl) && <a target="_blank" rel="noopener noreferrer" href={safeAssetLink(asset.photoUrl)!}>Open photo ↗</a>}{hasRegistration(asset.category) && ['super_admin', 'admin', 'project_manager', 'engineer', 'supervisor'].includes(role) && <Link to="/fleet">Open Fleet operational logs →</Link>}</div>
    {canWrite && asset.status !== 'disposed' && <form className="asset-form asset-event-form" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><h3>Record a lifecycle event</h3><p>Events keep who, when and why. Transfer changes the location within this project; it does not move consumable stock.</p><fieldset disabled={mutation.isPending}><div className="asset-fields"><label>Action *<select aria-label="Lifecycle action" required value={action} onChange={e => { setAction(e.target.value as AssetAction); mutation.reset() }}><option value="">Choose an action</option>{assetActions(asset, DISPOSERS.includes(role)).map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}</select></label><label>Event date *<input type="date" required max={localToday()} value={eventDate} onChange={e => setEventDate(e.target.value)} /></label>{action === 'assign' && <label>Employee custodian *<select required value={employeeId} onChange={e => setEmployeeId(e.target.value)} disabled={employees.isPending || employees.isError}><option value="">{employees.isPending ? 'Loading employees…' : 'Choose an employee'}</option>{employees.data?.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.empCode}</option>)}</select></label>}{action === 'transfer' && <label>Destination location *<input required maxLength={200} value={location} onChange={e => setLocation(e.target.value)} /></label>}</div><label>Reason / handover / verification note *<textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label></fieldset>{action === 'assign' && employees.isError && <div role="alert" className="assets-error">Could not load custodians. <button type="button" onClick={() => employees.refetch()}>Retry</button></div>}{action === 'assign' && employees.data?.length === 0 && <p>No active employees are assigned to this project. Add or update the employee in HR first.</p>}{action === 'dispose' && <p className="assets-warning">Disposal is permanent in this register. Return assigned assets first. Include the approval or disposal reference in your note.</p>}{mutation.isError && <div role="alert" className="assets-error">{message(mutation.error)}</div>}<button className="assets-primary" disabled={!action || mutation.isPending || (action === 'assign' && !employeeId)}>{mutation.isPending ? 'Recording…' : 'Record event'}</button></form>}
    <h3 className="asset-history-title"><ClockCounterClockwise size={19} />Activity history</h3><p className="assets-footnote">Latest 100 events by recording time. Event dates can differ from the date recorded.</p>{history.isPending && <p role="status">Loading history…</p>}{history.isError && <div className="assets-error" role="alert">Could not load history. <button onClick={() => history.refetch()}>Retry</button></div>}<ol className="asset-history">{history.data?.map(event => <li key={event.id}><strong>{ACTION_LABELS[event.action as AssetAction] || event.action.replace(/_/g, ' ')}</strong><span>{event.eventDate} · {event.actorName}</span><p>{event.reason}</p>{event.before && <small>{(['status', 'location', 'assignedTo', 'condition', 'purchaseCost'] as const).filter(k => event.before?.[k] !== event.after[k]).map(k => `${k}: ${event.before?.[k] ?? '—'} → ${event.after[k] ?? '—'}`).join(' · ')}</small>}<small>Recorded {new Date(event.createdAt).toLocaleString()}</small></li>)}</ol>
  </div></Modal>
}
