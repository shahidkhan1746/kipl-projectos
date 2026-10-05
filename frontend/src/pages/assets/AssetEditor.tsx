import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Armchair, Desktop, Laptop, Printer, Truck, Briefcase, Package, MapPin, Tag,
  CaretDown, CheckCircle, Copy, WarningCircle, ArrowRight,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/lib/notify'
import { assetsApi, CATEGORIES, CONDITIONS } from '@/api/assets.api'
import type { AssetCategory, OfficeAsset } from '@/api/assets.api'
import { localToday } from './assetHelpers'
import {
  addYears, describeChanges, displayDate, FIELD_LABELS, formatRupees, initialValues, NAME_EXAMPLES,
  parseRupees, showsSerial, toPayload, validateAsset,
} from './assetForm'
import type { AssetField, AssetFormValues } from './assetForm'
import './AssetEditor.css'

const CATEGORY_ICONS: Record<AssetCategory, Icon> = {
  furniture: Armchair, computer: Desktop, laptop: Laptop, printer: Printer,
  vehicle: Truck, office_equipment: Briefcase, other: Package,
}
const SHORT_CATEGORY: Record<AssetCategory, string> = {
  furniture: 'Furniture', computer: 'Desktop', laptop: 'Laptop', printer: 'Printer',
  vehicle: 'Vehicle', office_equipment: 'Equipment', other: 'Other',
}
const PURCHASE_FIELDS: AssetField[] = ['supplier', 'invoiceNumber', 'purchaseDate', 'purchaseCost', 'warrantyUntil', 'serviceDue']
const REFERENCE_FIELDS: AssetField[] = ['documentUrl', 'photoUrl', 'notes']

function serverMessage(error: unknown): string {
  const e = error as { response?: { data?: { message?: string | string[] } } }
  const text = e?.response?.data?.message
  return Array.isArray(text) ? text.join('. ') : text || 'The asset could not be saved. Check your connection and try again.'
}

interface Props {
  projectId: string
  asset: OfficeAsset | null
  /** Locations already used in this register, offered as suggestions. */
  locations: string[]
  onClose: () => void
  /** A new asset was registered. The editor stays open on its success screen. */
  onCreated: (asset: OfficeAsset) => void
  /** An existing asset was corrected. */
  onUpdated: (asset: OfficeAsset) => void
  onView: (asset: OfficeAsset) => void
}

export function AssetEditor({ projectId, asset, locations, onClose, onCreated, onUpdated, onView }: Props) {
  const mode = asset ? 'edit' : 'create'
  const uid = useId()
  const formId = `${uid}-asset-form`
  const id = (field: string) => `${uid}-${field}`
  const [original, setOriginal] = useState(() => initialValues(asset))
  const [values, setValues] = useState<AssetFormValues>(original)
  const [touched, setTouched] = useState<Partial<Record<AssetField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [created, setCreated] = useState<OfficeAsset | null>(null)
  const hasAny = (fields: AssetField[], v: AssetFormValues) => fields.some(f => v[f].trim() !== '')
  const [openPurchase, setOpenPurchase] = useState(() => hasAny(PURCHASE_FIELDS, original))
  const [openReferences, setOpenReferences] = useState(() => hasAny(REFERENCE_FIELDS, original))
  const nameRef = useRef<HTMLInputElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const serverRef = useRef<HTMLDivElement>(null)

  const errors = useMemo(() => validateAsset(values, mode), [values, mode])
  const changes = useMemo(() => (asset ? describeChanges(original, values) : []), [asset, original, values])
  const dirty = useMemo(() => (Object.keys(values) as AssetField[]).some(k => values[k] !== original[k]), [values, original])
  const visibleError = (field: AssetField) => (submitted || touched[field] ? errors[field] : undefined)

  const set = <K extends AssetField>(field: K, value: AssetFormValues[K]) => setValues(old => ({ ...old, [field]: value }))
  const blur = (field: AssetField) => () => setTouched(old => ({ ...old, [field]: true }))

  useEffect(() => { if (!asset) nameRef.current?.focus() }, [asset])

  const mutation = useMutation({
    mutationFn: async () => {
      const body = toPayload(values, projectId, asset)
      return (asset ? await assetsApi.update(asset.id, body) : await assetsApi.create(body)).data
    },
    onSuccess: saved => {
      if (asset) { toast.success(`${saved.assetTag} updated`); onUpdated(saved); return }
      setCreated(saved)
      onCreated(saved)
    },
    onError: () => requestAnimationFrame(() => serverRef.current?.focus()),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const problems = Object.keys(errors) as AssetField[]
    if (problems.length) {
      if (problems.some(f => PURCHASE_FIELDS.includes(f))) setOpenPurchase(true)
      if (problems.some(f => REFERENCE_FIELDS.includes(f))) setOpenReferences(true)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    if (asset && !changes.length) return
    mutation.mutate()
  }

  function focusField(field: AssetField) {
    if (PURCHASE_FIELDS.includes(field)) setOpenPurchase(true)
    if (REFERENCE_FIELDS.includes(field)) setOpenReferences(true)
    requestAnimationFrame(() => document.getElementById(id(field))?.focus())
  }

  function requestClose() {
    if (mutation.isPending) return
    if (dirty && !created) { setConfirmDiscard(true); return }
    onClose()
  }

  function registerAnother() {
    const next = initialValues(null, { category: values.category, location: values.location })
    setOriginal(next); setValues(next); setTouched({}); setSubmitted(false)
    setCreated(null); setOpenPurchase(false); setOpenReferences(false); mutation.reset()
    requestAnimationFrame(() => nameRef.current?.focus())
  }

  // ─── Field helpers ────────────────────────────────────────────────────────
  const describedBy = (field: AssetField, hint?: boolean) =>
    [hint ? id(`${field}-hint`) : '', visibleError(field) ? id(`${field}-error`) : ''].filter(Boolean).join(' ') || undefined
  const fieldError = (field: AssetField) =>
    visibleError(field) ? <p className="ae-error" id={id(`${field}-error`)}><WarningCircle size={14} weight="fill" aria-hidden />{visibleError(field)}</p> : null
  const text = (field: AssetField, label: string, opts: { required?: boolean; maxLength?: number; placeholder?: string; type?: string; hint?: string; list?: string; after?: React.ReactNode } = {}) => (
    <div className="ae-field">
      <label htmlFor={id(field)}>{label}{opts.required && <span className="ae-req" aria-hidden> *</span>}</label>
      <input
        id={id(field)} ref={field === 'name' ? nameRef : undefined}
        type={opts.type ?? 'text'} value={values[field]} maxLength={opts.maxLength ?? 200}
        placeholder={opts.placeholder} list={opts.list} required={opts.required}
        aria-invalid={!!visibleError(field)} aria-describedby={describedBy(field, !!opts.hint)}
        max={opts.type === 'date' && field === 'purchaseDate' ? localToday() : undefined}
        onChange={e => { const value = e.target.value; setValues(old => ({ ...old, [field]: value })) }} onBlur={blur(field)}
      />
      {opts.hint && <p className="ae-hint" id={id(`${field}-hint`)}>{opts.hint}</p>}
      {fieldError(field)}
      {opts.after}
    </div>
  )

  const errorList = (Object.keys(errors) as AssetField[]).filter(f => errors[f])
  const cost = values.purchaseCost.trim() ? parseRupees(values.purchaseCost) : NaN
  const vehicle = values.category === 'vehicle'
  const purchaseSummary = [
    !Number.isNaN(cost) && formatRupees(cost), values.supplier.trim(),
    values.purchaseDate && `bought ${displayDate(values.purchaseDate)}`,
    values.warrantyUntil && `warranty to ${displayDate(values.warrantyUntil)}`,
  ].filter(Boolean).join(' · ')
  const referenceSummary = [values.documentUrl.trim() && 'document', values.photoUrl.trim() && 'photo', values.notes.trim() && 'notes'].filter(Boolean).join(', ')

  // ─── Success ──────────────────────────────────────────────────────────────
  if (created) {
    const copyTag = async () => {
      try { await navigator.clipboard.writeText(created.assetTag); toast.success('Tag copied') }
      catch { toast.error('Copy failed. Select the tag and copy it manually.') }
    }
    return (
      <Modal open title="Asset registered" width={560} onClose={onClose} footer={
        <div className="ae-footer">
          <button type="button" className="ae-btn" onClick={registerAnother}>Register another</button>
          <span className="ae-footer-spacer" />
          <button type="button" className="ae-btn" onClick={() => onView(created)}>View asset <ArrowRight size={14} aria-hidden /></button>
          <button type="button" className="ae-btn ae-btn-primary" onClick={onClose}>Done</button>
        </div>
      }>
        <div className="ae-success" role="status">
          <CheckCircle size={44} weight="fill" className="ae-success-icon" aria-hidden />
          <p className="ae-success-lead">{created.name} is on the register.</p>
          <div className="ae-tag-plate">
            <span className="ae-tag-label">Permanent asset tag</span>
            <strong className="ae-tag-value">{created.assetTag}</strong>
            <button type="button" className="ae-btn ae-btn-small" onClick={copyTag}><Copy size={14} aria-hidden />Copy</button>
          </div>
          <p className="ae-hint">Write this tag on the item or stick a printed label on it. Audits and handovers find the asset by this tag.</p>
          <dl className="ae-success-facts">
            <div><dt>Category</dt><dd>{CATEGORIES[created.category]}</dd></div>
            <div><dt>Location</dt><dd>{created.location}</dd></div>
            <div><dt>Condition</dt><dd>{CONDITIONS[created.condition]}</dd></div>
          </dl>
          <p className="ae-hint">“Register another” keeps the category and location, for entering several similar items in a row.</p>
        </div>
      </Modal>
    )
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  const footer = confirmDiscard ? (
    <div className="ae-footer ae-footer-confirm" role="alert">
      <span>Discard what you've entered?</span>
      <span className="ae-footer-spacer" />
      <button type="button" className="ae-btn" onClick={() => setConfirmDiscard(false)} autoFocus>Keep editing</button>
      <button type="button" className="ae-btn ae-btn-danger" onClick={onClose}>Discard</button>
    </div>
  ) : (
    <div className="ae-footer">
      <span className="ae-footer-note">
        {asset && !changes.length ? 'No changes yet' : <><span className="ae-req">*</span> Required</>}
      </span>
      <span className="ae-footer-spacer" />
      <button type="button" className="ae-btn" onClick={requestClose} disabled={mutation.isPending}>Cancel</button>
      <button type="submit" form={formId} className="ae-btn ae-btn-primary" disabled={mutation.isPending || (!!asset && !changes.length)}>
        {mutation.isPending ? 'Saving…' : asset ? 'Save changes' : 'Register asset'}
      </button>
    </div>
  )

  return (
    <Modal open title={asset ? `Edit ${asset.name}` : 'Register an asset'} width={720} onClose={requestClose} footer={footer}>
      <form id={formId} className="ae-form" onSubmit={submit} noValidate>
        <div className="ae-tagline">
          <Tag size={16} aria-hidden />
          {asset
            ? <span>Tag <strong>{asset.assetTag}</strong> · permanent</span>
            : <span>A permanent tag such as <strong>KIPL-AST-000123</strong> is issued when you register.</span>}
        </div>

        {submitted && errorList.length > 0 && (
          <div className="ae-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby={id('summary-title')}>
            <p id={id('summary-title')}><WarningCircle size={16} weight="fill" aria-hidden />Fix {errorList.length === 1 ? 'this' : `these ${errorList.length}`} before saving</p>
            <ul>{errorList.map(f => <li key={f}><button type="button" onClick={() => focusField(f)}>{FIELD_LABELS[f]}: {errors[f]}</button></li>)}</ul>
          </div>
        )}

        <fieldset disabled={mutation.isPending} className="ae-section">
          <legend className="ae-section-title">What is it?</legend>
          <div className="ae-tiles" role="radiogroup" aria-label="Category">
            {(Object.keys(CATEGORIES) as AssetCategory[]).map(key => {
              const CategoryIcon = CATEGORY_ICONS[key]
              return (
                <label key={key} className={`ae-tile${values.category === key ? ' is-selected' : ''}`} title={CATEGORIES[key]}>
                  <input type="radio" name={id('category')} value={key} checked={values.category === key} onChange={() => set('category', key)} aria-label={CATEGORIES[key]} />
                  <CategoryIcon size={22} weight={values.category === key ? 'fill' : 'regular'} aria-hidden />
                  <span>{SHORT_CATEGORY[key]}</span>
                </label>
              )
            })}
          </div>
          {text('name', 'Asset name', { required: true, placeholder: NAME_EXAMPLES[values.category] })}
          <div className="ae-grid">
            {text('brand', 'Brand', { maxLength: 120 })}
            {text('model', 'Model', { maxLength: 120 })}
            {showsSerial(values.category, values.serialNumber) && text('serialNumber', vehicle ? 'Chassis / serial number' : 'Serial number', { maxLength: 150 })}
            {vehicle && text('registrationNumber', 'Registration number', { maxLength: 60, placeholder: 'e.g. JK01AB1234' })}
            {vehicle && text('insuranceUntil', 'Insurance valid until', { type: 'date' })}
          </div>
        </fieldset>

        <fieldset disabled={mutation.isPending} className="ae-section">
          <legend className="ae-section-title">Where is it, and what state is it in?</legend>
          {asset ? (
            <div className="ae-readonly">
              <MapPin size={18} aria-hidden />
              <div><span className="ae-readonly-label">Location</span><strong>{asset.location}</strong>
                <p className="ae-hint">To move it, record a <em>Transfer location</em> event on the asset page, so the move stays in its history.</p></div>
            </div>
          ) : (
            <>
              {text('location', 'Office / room / location', { required: true, placeholder: 'e.g. Site office, Nishat', list: id('locations'), hint: locations.length ? 'Pick an existing location to keep the spelling consistent, or type a new one.' : undefined })}
              <datalist id={id('locations')}>{locations.map(l => <option key={l} value={l} />)}</datalist>
            </>
          )}
          <div className="ae-field">
            <span className="ae-label" id={id('condition-label')}>Condition <span className="ae-req" aria-hidden>*</span></span>
            <div className="ae-segments" role="radiogroup" aria-labelledby={id('condition-label')}>
              {(Object.keys(CONDITIONS) as OfficeAsset['condition'][]).map(key => (
                <label key={key} className={`ae-segment ae-cond-${key}${values.condition === key ? ' is-selected' : ''}`}>
                  <input type="radio" name={id('condition')} value={key} checked={values.condition === key} onChange={() => set('condition', key)} />
                  <span className="ae-dot" aria-hidden />{CONDITIONS[key]}
                </label>
              ))}
            </div>
            {values.condition === 'unserviceable' && <p className="ae-hint">Unserviceable items cannot be assigned to staff until repaired.</p>}
          </div>
        </fieldset>

        <Disclosure title="Purchase & warranty" summary={purchaseSummary || 'Optional — supplier, invoice, cost, warranty and service dates'} open={openPurchase} onToggle={() => setOpenPurchase(o => !o)} id={id('purchase')} disabled={mutation.isPending}>
          <div className="ae-grid">
            {text('supplier', 'Supplier')}
            {text('invoiceNumber', 'Invoice number', { maxLength: 100 })}
            {text('purchaseDate', 'Purchase date', { type: 'date' })}
            <div className="ae-field">
              <label htmlFor={id('purchaseCost')}>Purchase cost</label>
              <div className="ae-money">
                <span aria-hidden>₹</span>
                <input id={id('purchaseCost')} inputMode="decimal" value={values.purchaseCost} placeholder="0"
                  aria-invalid={!!visibleError('purchaseCost')} aria-describedby={describedBy('purchaseCost', true)}
                  onChange={e => set('purchaseCost', e.target.value)} onBlur={blur('purchaseCost')} />
              </div>
              <p className="ae-hint" id={id('purchaseCost-hint')}>{!Number.isNaN(cost) ? `${formatRupees(cost)} — acquisition cost, not book value` : 'Acquisition cost, not book value'}</p>
              {fieldError('purchaseCost')}
            </div>
            {text('warrantyUntil', 'Warranty until', {
              type: 'date',
              after: values.purchaseDate ? (
                <div className="ae-chips" role="group" aria-label="Set warranty from the purchase date">
                  <span className="ae-hint">From purchase:</span>
                  {[1, 2, 3].map(y => <button type="button" key={y} className="ae-chip" aria-label={`Warranty ${y} year${y > 1 ? 's' : ''} from purchase`} onClick={() => { set('warrantyUntil', addYears(values.purchaseDate, y)); setTouched(t => ({ ...t, warrantyUntil: true })) }}>+{y} yr</button>)}
                </div>
              ) : undefined,
            })}
            {text('serviceDue', 'Next service due', { type: 'date' })}
          </div>
        </Disclosure>

        <Disclosure title="Documents & notes" summary={referenceSummary ? `Added: ${referenceSummary}` : 'Optional — invoice or warranty link, photo link, notes'} open={openReferences} onToggle={() => setOpenReferences(o => !o)} id={id('references')} disabled={mutation.isPending}>
          {text('documentUrl', 'Invoice / warranty document link', { type: 'url', maxLength: 2000, placeholder: 'https://', hint: 'A Google Drive or OneDrive link works. Make sure your team can open it.' })}
          {text('photoUrl', 'Photo link', { type: 'url', maxLength: 2000, placeholder: 'https://' })}
          <div className="ae-field">
            <label htmlFor={id('notes')}>Notes</label>
            <textarea id={id('notes')} maxLength={4000} value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything a custodian or auditor should know" />
          </div>
        </Disclosure>

        {asset && (
          <fieldset disabled={mutation.isPending} className="ae-section ae-review">
            <legend className="ae-section-title">Review your changes</legend>
            {changes.length ? (
              <ul className="ae-changes">
                {changes.map(c => <li key={c.field}><span>{c.label}</span><span className="ae-from">{c.from}</span><ArrowRight size={12} aria-hidden /><span className="ae-to">{c.to}</span></li>)}
              </ul>
            ) : <p className="ae-hint">Nothing has changed yet. Edit a field above and it will be listed here.</p>}
            <div className="ae-field">
              <label htmlFor={id('reason')}>Reason for the correction <span className="ae-req" aria-hidden>*</span></label>
              <textarea id={id('reason')} required maxLength={1000} value={values.reason} placeholder="e.g. Serial number was mistyped at registration"
                aria-invalid={!!visibleError('reason')} aria-describedby={describedBy('reason', true)}
                onChange={e => set('reason', e.target.value)} onBlur={blur('reason')} />
              <p className="ae-hint" id={id('reason-hint')}>Saved in the asset's history with your name and today's date.</p>
              {fieldError('reason')}
            </div>
          </fieldset>
        )}

        {mutation.isError && (
          <div className="ae-server-error" role="alert" tabIndex={-1} ref={serverRef}>
            <WarningCircle size={18} weight="fill" aria-hidden />
            <div><strong>Not saved.</strong> {serverMessage(mutation.error)}</div>
          </div>
        )}
      </form>
    </Modal>
  )
}

function Disclosure({ title, summary, open, onToggle, id, disabled, children }: { title: string; summary: string; open: boolean; onToggle: () => void; id: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <fieldset disabled={disabled} className={`ae-section ae-disclosure${open ? ' is-open' : ''}`}>
      <legend className="ae-visually-hidden">{title}</legend>
      <button type="button" className="ae-disclosure-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle}>
        <span className="ae-section-title">{title}</span>
        <span className="ae-disclosure-summary">{summary}</span>
        <CaretDown size={16} className="ae-caret" aria-hidden />
      </button>
      <div id={`${id}-panel`} hidden={!open} className="ae-disclosure-panel">{children}</div>
    </fieldset>
  )
}
