import { useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, Bank, ChartLineUp, DownloadSimple, Drop, FilePdf, GasPump, Gauge, Handshake, ListBullets, PencilSimple, Plus, Receipt, Scales, ShoppingCart, Truck, User, Warning, X } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/lib/notify'
import { projectsApi } from '@/api/projects.api'
import { fuelApi } from '@/api/fuel.api'
import { PAYMENT_MODES } from '@/api/fuel.api'
import type { FuelEntryType, FuelEntryWrite, FuelMachine, FuelMachineWrite, FuelRegister, FuelRow, FuelSupplier, MachineUse, PaymentMode, PumpAccount, PumpLine } from '@/api/fuel.api'
import { localToday } from '../assets/assetHelpers'
import { burnRate, coverLevel, coverText, dailySeries, describeWarning, ENTRY_LABEL, litres, monthLabel, monthRange, perLitre, PUMP_KIND_LABEL, pumpStatusText, registerCsv, registerFileName, renderRegisterPdf, rowParty, rupees, shortDate } from './dieselRegister'
import type { CoverLevel } from './dieselRegister'
import { AdvanceTrend, StockGauge, StockTrend } from './DieselCharts'
import './DieselRegister.css'

const RECORD = ['super_admin', 'admin', 'project_manager', 'engineer', 'supervisor']
const MANAGE = ['super_admin', 'admin', 'project_manager']
/** Money paid to the pump, and its price: managers and accounts, not the site. */
const PAY = ['super_admin', 'admin', 'project_manager', 'accounts', 'accountant']

function message(error: unknown) {
  const e = error as { response?: { data?: { message?: string | string[] } } }
  const m = e?.response?.data?.message
  return Array.isArray(m) ? m.join('. ') : m || 'The diesel register could not be reached. Try again.'
}

/** What the month's issues cost, and how much of them that covers: a partial figure must not read as the whole. */
function issuedCostText(reg: FuelRegister) {
  const t = reg.summary.totals.diesel
  if (!t.issuedCost) return t.issued ? 'Cost needs purchase rates' : 'Nothing issued'
  if (t.issuedPricedLitres >= t.issued) return `${rupees(t.issuedCost)} at the average rate`
  return `${rupees(t.issuedCost)} for ${litres(t.issuedPricedLitres)}; the rest needs rates`
}

export function DieselRegister({ projectId, role, userName }: { projectId: string; role: string; userName: string }) {
  const qc = useQueryClient()
  const today = localToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const { from, to } = monthRange(month, today)
  const [form, setForm] = useState<{ kind: FuelEntryType; row?: FuelRow } | null>(null)
  const [machinesOpen, setMachinesOpen] = useState(false)
  const [voiding, setVoiding] = useState<FuelRow | null>(null)
  const [paying, setPaying] = useState(false)
  const [rating, setRating] = useState(false)
  const [voidingPump, setVoidingPump] = useState<PumpLine | null>(null)
  const canRecord = RECORD.includes(role)
  const canManage = MANAGE.includes(role)
  const canPay = PAY.includes(role)

  const query = useQuery({ queryKey: ['fuel-register', projectId, from, to], queryFn: () => fuelApi.register(projectId, from, to).then(r => r.data) })
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId).then(r => r.data as { name?: string }), staleTime: 10 * 60_000 })
  const refresh = () => qc.invalidateQueries({ queryKey: ['fuel-register', projectId] })
  const reg = query.data
  const machines = useMemo(() => new Map((reg?.machines ?? []).map(m => [m.id, m])), [reg])
  const hasPetrol = !!reg && (reg.machines.some(m => m.fuelType === 'petrol') || reg.entries.some(e => e.fuelType === 'petrol') || reg.summary.stock.petrol.now !== 0)

  const download = (kind: 'pdf' | 'csv') => {
    if (!reg) return
    if (kind === 'pdf') {
      renderRegisterPdf(reg, { projectName: project.data?.name || 'Dal Lake Sewerage Scheme', month, generatedBy: userName || undefined }).save(registerFileName(month, 'pdf'))
      return
    }
    const url = URL.createObjectURL(new Blob(['﻿', registerCsv(reg)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = registerFileName(month, 'csv'); a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const cover = reg?.summary.cover?.diesel ?? { dailyAverage: null, daysOfCover: null, windowDays: 0 }
  const level = coverLevel(cover.daysOfCover)
  const hiredLitres = reg?.summary.hiredOwners.reduce((sum, o) => sum + o.litres, 0) ?? 0
  const monthIssued = reg?.summary.totals.diesel.issued ?? 0
  const monthName = monthLabel(month).split(' ')[0]

  return <section className="dz">
    <div className="dz-toolbar">
      <label className="dz-month"><span>Month</span><input type="month" value={month} max={today.slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} /></label>
      <div className="dz-actions">
        {canRecord && <>
          <button className="dz-primary" onClick={() => setForm({ kind: 'issue' })}><ArrowUp size={16} weight="bold" />Issue diesel</button>
          <button className="dz-success" onClick={() => setForm({ kind: 'receipt' })}><ShoppingCart size={16} weight="bold" />Purchase diesel</button>
          <button onClick={() => setForm({ kind: 'adjustment' })}><Scales size={16} />Stock check</button>
        </>}
        {canManage && <button onClick={() => setMachinesOpen(true)}><Truck size={16} />Machines</button>}
        <button onClick={() => download('pdf')} disabled={!reg}><FilePdf size={16} />PDF</button>
        <button onClick={() => download('csv')} disabled={!reg}><DownloadSimple size={16} />Excel</button>
      </div>
    </div>

    {query.isError && <div className="dz-error" role="alert">{message(query.error)} <button onClick={() => query.refetch()}>Retry</button></div>}
    {query.isPending && <div className="dz-hero dz-hero-loading" role="status"><span className="dz-spinner" />Loading the diesel register…</div>}

    {reg && <>
      <div className="dz-hero">
        <span className="dz-orb dz-orb-a" aria-hidden="true" /><span className="dz-orb dz-orb-b" aria-hidden="true" /><span className="dz-orb dz-orb-c" aria-hidden="true" />
        <div className="dz-glass dz-gauge-card">
          <div className="dz-gauge-head">
            <span className="dz-eyebrow"><GasPump size={14} weight="fill" />Diesel in stock</span>
            <span className={`dz-level dz-level-${level}`}><span className="dz-level-dot" />{LEVEL_TEXT[level]}</span>
          </div>
          <StockGauge litres={reg.summary.stock.diesel.now} days={cover.daysOfCover} dailyAverage={cover.dailyAverage} />
          <p className="dz-cover-text">{coverText(cover, reg.today)}</p>
        </div>
        <div className="dz-hero-side">
          <div className="dz-hero-title">
            <span className="dz-eyebrow">{monthLabel(month)}</span>
            <h2>Diesel register</h2>
            <p>{litres(reg.summary.stock.diesel.opening)} brought forward, {litres(reg.summary.stock.diesel.closing)} at the end of the period{reg.summary.totals.diesel.adjusted ? `, adjusted by ${litres(reg.summary.totals.diesel.adjusted)}` : ''}.</p>
          </div>
          <div className="dz-stats">
            <HeroStat tone="green" icon={<ShoppingCart size={18} weight="duotone" />} label="Purchased" value={litres(reg.summary.totals.diesel.received)}
              sub={reg.summary.totals.diesel.receivedAmount ? rupees(reg.summary.totals.diesel.receivedAmount) : 'No rate entered'} />
            <HeroStat tone="amber" icon={<ArrowUp size={18} weight="duotone" />} label="Issued" value={litres(monthIssued)} sub={issuedCostText(reg)} />
            <HeroStat tone="blue" icon={<Gauge size={18} weight="duotone" />} label="Average per day" value={cover.dailyAverage === null ? '—' : litres(cover.dailyAverage)}
              sub={cover.windowDays ? `Over the last ${cover.windowDays} day${cover.windowDays === 1 ? '' : 's'}` : 'Nothing recorded yet'} />
            <HeroStat tone="violet" icon={<Handshake size={18} weight="duotone" />} label="Into hired machines" value={litres(hiredLitres)}
              sub={reg.summary.hiredOwners.length ? reg.summary.hiredOwners.map(o => o.ownerName).join(', ') : 'None this month'} />
            {hasPetrol && <HeroStat tone="cyan" icon={<Drop size={18} weight="duotone" />} label="Petrol in stock" value={litres(reg.summary.stock.petrol.now)} sub={`Issued in ${monthName}: ${litres(reg.summary.totals.petrol.issued)}`} />}
          </div>
        </div>
      </div>

      {reg.summary.warnings.length > 0 && <div className="dz-warnings" role="status">
        <span className="dz-warn-icon"><Warning size={18} weight="fill" /></span>
        <ul>{reg.summary.warnings.map((w, i) => <li key={i}>{describeWarning(w)}</li>)}</ul>
      </div>}

      {reg.pump && <PumpPanel pump={reg.pump} canPay={canPay} onPay={() => setPaying(true)} onRate={() => setRating(true)} onVoid={setVoidingPump} />}

      <div className="dz-panel dz-trend">
        <h2><ChartLineUp size={18} weight="duotone" />Stock through {monthName} <small>End-of-day balance, with each day&apos;s purchases and issues</small></h2>
        <StockTrend days={dailySeries(reg)} />
      </div>

      <div className="dz-panel dz-panel-machines">
        <h2><Truck size={18} weight="duotone" />By machine <small>{monthLabel(month)}</small></h2>
        <div className="dz-mgrid">
          {reg.summary.machines.map(m => <MachineCard key={m.machineId} m={m} share={monthIssued ? m.litres / monthIssued : 0} />)}
        </div>
        {reg.summary.hiredOwners.map(o => <p key={o.ownerName} className="dz-hired"><Handshake size={18} weight="duotone" /><span><strong>{litres(o.litres)}</strong> went into {o.ownerName}&apos;s machines ({o.machines.join(', ')}){o.cost ? `, worth ${rupees(o.cost)}` : ''}. Check it against their hire terms and bill.</span></p>)}
      </div>

      <div className="dz-panel">
        <h2><ListBullets size={18} weight="duotone" />Register <small>{shortDate(reg.from)} to {shortDate(reg.to)}</small></h2>
        <div className="dz-scroll"><table className="dz-table dz-register">
          <thead><tr><th>Date</th><th>Entry</th><th>Machine / supplier</th><th>Operator</th><th className="dz-num">In</th><th className="dz-num">Out</th><th className="dz-num">Balance</th><th className="dz-num">Meter</th><th className="dz-num">₹</th><th>By</th>{canManage && <th />}</tr></thead>
          <tbody>
            <tr className="dz-bf"><td colSpan={6}>Brought forward</td><td className="dz-num">{litres(reg.summary.stock.diesel.opening)}</td><td colSpan={canManage ? 4 : 3} /></tr>
            {reg.entries.map(r => {
              const out = r.entryType === 'issue' || r.litres < 0
              return <tr key={r.id} className={`dz-row-${r.entryType}${r.balance < 0 ? ' dz-negative' : ''}`}>
                <td className="dz-nowrap">{shortDate(r.date)}</td>
                <td><span className={`dz-kind dz-kind-${r.entryType}`}>{ENTRY_LABEL[r.entryType]}</span>{r.fuelType === 'petrol' && <small>Petrol</small>}</td>
                <td>{rowParty(r, machines)}{r.fleetLogId && <small>From the Fleet logbook</small>}{r.entryType !== 'adjustment' && r.remarks && !r.fleetLogId && <small>{r.remarks}</small>}</td>
                <td>{r.operator || '—'}</td>
                <td className="dz-num dz-in">{out ? '' : litres(r.litres)}</td>
                <td className="dz-num dz-out">{out ? litres(Math.abs(r.litres)) : ''}</td>
                <td className="dz-num dz-balance">{litres(r.balance)}</td>
                <td className="dz-num">{r.meterReading ?? ''}</td>
                <td className="dz-num">{r.amount !== null ? rupees(r.amount) : r.cost !== null ? <span title="At the average purchase rate">{rupees(r.cost)}</span> : ''}</td>
                <td>{r.recordedByName || '—'}</td>
                {canManage && <td className="dz-nowrap dz-row-actions">
                  {!r.fleetLogId && <button aria-label="Edit entry" title="Edit" onClick={() => setForm({ kind: r.entryType, row: r })}><PencilSimple size={15} /></button>}
                  <button aria-label="Void entry" title="Void" onClick={() => setVoiding(r)}><X size={15} /></button>
                </td>}
              </tr>
            })}
            {!reg.entries.length && <tr><td colSpan={canManage ? 11 : 10} className="dz-empty-row">No diesel moved in {monthLabel(month)}.</td></tr>}
          </tbody>
        </table></div>
        {reg.voided.length > 0 && <details className="dz-voided"><summary>{reg.voided.length} voided entr{reg.voided.length === 1 ? 'y' : 'ies'} this month</summary>
          <ul>{reg.voided.map(v => <li key={v.id}>{shortDate(v.date)} · {ENTRY_LABEL[v.entryType]} {litres(Math.abs(v.litres))} · voided by {v.voidedByName || 'the system'}: {v.voidReason}</li>)}</ul>
        </details>}
      </div>
      <p className="dz-footnote">Diesel typed into a Fleet logbook entry is recorded here as an issue, so it is entered once. Costs use the average rate of the purchases entered so far; enter the rate on each purchase to get them. Days left are worked out from the litres issued per day over the last {cover.windowDays || 14} days.</p>
    </>}

    {form && reg && <EntryForm key={form.row?.id ?? form.kind} kind={form.kind} row={form.row} reg={reg} projectId={projectId} today={today}
      onClose={() => setForm(null)} onSaved={() => { setForm(null); void refresh() }} />}
    {machinesOpen && reg && <MachinesDialog machines={reg.machines} projectId={projectId} onClose={() => setMachinesOpen(false)} onSaved={() => void refresh()} />}
    {voiding && <VoidDialog row={voiding} projectId={projectId} onClose={() => setVoiding(null)} onSaved={() => { setVoiding(null); void refresh() }} />}
    {paying && reg?.pump && <PaymentDialog pump={reg.pump} projectId={projectId} today={today} onClose={() => setPaying(false)} onSaved={() => { setPaying(false); void refresh() }} />}
    {rating && reg?.pump && <RateDialog supplier={reg.suppliers.find(x => x.id === reg.pump!.supplier.id)!} projectId={projectId} onClose={() => setRating(false)} onSaved={() => { setRating(false); void refresh() }} />}
    {voidingPump && <VoidPumpDialog line={voidingPump} projectId={projectId} onClose={() => setVoidingPump(null)} onSaved={() => { setVoidingPump(null); void refresh() }} />}
  </section>
}

const LEVEL_TEXT: Record<CoverLevel, string> = { low: 'Buy diesel now', watch: 'Running low', good: 'Healthy', unknown: 'No recent issues' }

function HeroStat({ tone, icon, label, value, sub }: { tone: string; icon: ReactNode; label: string; value: string; sub: string }) {
  return <div className={`dz-glass dz-stat dz-tone-${tone}`}>
    <span className="dz-stat-icon">{icon}</span>
    <span className="dz-stat-label">{label}</span>
    <strong className="dz-stat-value">{value}</strong>
    <small className="dz-stat-sub">{sub}</small>
  </div>
}

/** A card that leans towards the pointer, with a sheen that follows it. Still under reduced motion. */
function TiltCard({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 11).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`)
  }
  const leave = () => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }
  return <div ref={ref} className={`dz-tilt ${className}`} onMouseMove={move} onMouseLeave={leave}>{children}</div>
}

function MachineCard({ m, share }: { m: MachineUse; share: number }) {
  const rate = burnRate(m)
  return <TiltCard className={`dz-mcard dz-mcard-${m.ownership}${m.fills ? '' : ' is-idle'}`}>
    <div className="dz-mcard-head dz-depth">
      <div><strong>{m.name}</strong><span className={`dz-chip dz-chip-${m.ownership}`}>{m.ownership === 'hired' ? `Hired · ${m.ownerName}` : 'Own'}</span></div>
      <span className="dz-mcard-icon"><Truck size={20} weight="duotone" /></span>
    </div>
    <p className="dz-mcard-operator dz-depth"><User size={13} weight="bold" />{m.operator || 'No regular operator'}</p>
    <div className="dz-mcard-litres dz-depth-2"><strong>{litres(m.litres)}</strong><span>{m.fills} fill{m.fills === 1 ? '' : 's'} this month</span></div>
    <div className="dz-share dz-depth" title={`${Math.round(share * 100)}% of the month's diesel`}><span style={{ width: `${Math.min(100, Math.round(share * 100))}%` }} /></div>
    <dl className="dz-mcard-stats dz-depth">
      <div><dt>Burn</dt><dd className={rate.value === 'Not known' ? 'dz-muted' : ''}>{rate.value}</dd></div>
      <div><dt>Last meter</dt><dd>{m.lastMeter === null ? '—' : `${m.lastMeter} ${m.meterUnit === 'km' ? 'km' : 'h'}`}</dd></div>
      <div><dt>Cost</dt><dd>{m.fills ? (m.cost === null ? <span className="dz-muted">Needs rates</span> : rupees(m.cost)) : '—'}</dd></div>
    </dl>
    <small className="dz-mcard-basis dz-depth">{rate.basis}</small>
  </TiltCard>
}

// ─── The pump account ──────────────────────────────────────────────────────

/**
 * The advance with the filling station: a fuel card with what is left and how
 * much diesel that buys, the totals, and every payment and delivery with the
 * balance after it. The card's meter is the share of everything paid that is
 * still unused.
 */
function PumpPanel({ pump, canPay, onPay, onRate, onVoid }: { pump: PumpAccount; canPay: boolean; onPay: () => void; onRate: () => void; onVoid: (l: PumpLine) => void }) {
  const [all, setAll] = useState(false)
  const newestFirst = [...pump.lines].reverse()
  const shown = all ? newestFirst : newestFirst.slice(0, 6)
  const unused = pump.paid > 0 ? Math.max(0, Math.min(1, pump.balance / pump.paid)) : 0
  const payments = pump.lines.filter(l => l.kind === 'payment').length
  const state = pump.warning ?? 'ok'
  const rate = pump.supplier.rate
  return <div className="dz-panel dz-pump">
    <h2>
      <GasPump size={18} weight="duotone" />Pump account <small>Advance with {pump.supplier.name}, all payments and diesel to date</small>
      {canPay && <span className="dz-panel-actions">
        <button onClick={onRate} title="Change the pump's price per litre">{rate ? `₹${perLitre(rate)} a litre` : 'Set the rate'}</button>
        <button className="dz-success" onClick={onPay}><Plus size={15} weight="bold" />Record payment</button>
      </span>}
    </h2>
    <div className="dz-pump-grid">
      <TiltCard className={`dz-fuelcard dz-fuelcard-${state}`}>
        <span className="dz-fuelcard-chip dz-depth" aria-hidden="true" />
        <div className="dz-fuelcard-top dz-depth"><span>Advance left</span><GasPump size={22} weight="duotone" /></div>
        <strong className="dz-fuelcard-balance dz-depth-2">{pump.balance < 0 ? '−' : ''}{rupees(Math.abs(pump.balance))}</strong>
        <p className="dz-fuelcard-sub dz-depth">{pumpStatusText(pump)}</p>
        <div className="dz-fuelcard-meter dz-depth" title={`${Math.round(unused * 100)}% of everything paid is still unused`}><span style={{ width: `${Math.round(unused * 100)}%` }} /></div>
        <div className="dz-fuelcard-foot dz-depth"><span>{pump.supplier.name}</span><span>{pump.balanceLitres !== null ? `${litres(pump.balanceLitres)} paid for` : ''}</span></div>
      </TiltCard>
      <div className="dz-pump-side">
      <div className="dz-pump-stats">
        <PumpStat icon={<Bank size={18} weight="duotone" />} tone="green" label="Paid to the pump" value={rupees(pump.paid)} sub={`${payments} payment${payments === 1 ? '' : 's'}`} />
        <PumpStat icon={<Drop size={18} weight="duotone" />} tone="amber" label="Diesel taken" value={litres(pump.litresTaken)} sub={`Worth ${rupees(pump.taken)}`} />
        <PumpStat icon={<Receipt size={18} weight="duotone" />} tone="blue" label="Last payment" value={pump.lastPayment ? rupees(pump.lastPayment.amount) : '—'}
          sub={pump.lastPayment ? [shortDate(pump.lastPayment.date), pump.lastPayment.mode, pump.lastPayment.reference].filter(Boolean).join(' · ') : 'None yet'} />
      </div>
      {pump.lines.length > 1 && <div className="dz-pump-trend">
        <span>Advance left over time<small>below the line, the pump was giving credit</small></span>
        <AdvanceTrend lines={pump.lines} />
      </div>}
      </div>
    </div>
    {pump.warning && <p className={`dz-pump-alert dz-pump-alert-${pump.warning}`} role="status"><Warning size={16} weight="fill" />{pumpStatusText(pump)}</p>}
    <div className="dz-scroll"><table className="dz-table dz-pump-ledger">
      <thead><tr><th>Date</th><th>Entry</th><th>Reference</th><th className="dz-num">Litres</th><th className="dz-num">Paid in</th><th className="dz-num">Taken</th><th className="dz-num">Advance left</th>{canPay && <th />}</tr></thead>
      <tbody>
        {shown.map(l => <tr key={`${l.kind}-${l.id}`} className={`dz-pl-${l.kind}${l.balance < 0 ? ' dz-negative' : ''}`}>
          <td className="dz-nowrap">{shortDate(l.date)}</td>
          <td><span className={`dz-kind dz-kind-pump-${l.kind}`}>{PUMP_KIND_LABEL[l.kind]}</span>{l.remarks && <small>{l.remarks}</small>}</td>
          <td>{[l.mode, l.reference ? (l.kind === 'payment' ? l.reference : `Receipt ${l.reference}`) : null].filter(Boolean).join(' · ') || '—'}</td>
          <td className="dz-num">{l.litres !== null ? litres(l.litres) : ''}</td>
          <td className="dz-num dz-in">{l.kind === 'payment' ? rupees(l.amount) : ''}</td>
          <td className="dz-num dz-out">{l.kind === 'payment' ? '' : <>{rupees(l.amount)}{l.estimated && <small title="No bill amount: valued at the pump's rate">at the pump rate</small>}</>}</td>
          <td className="dz-num dz-balance">{l.balance < 0 ? '−' : ''}{rupees(Math.abs(l.balance))}</td>
          {canPay && <td className="dz-row-actions">{l.kind !== 'purchase' && <button aria-label="Void" title="Void" onClick={() => onVoid(l)}><X size={15} /></button>}</td>}
        </tr>)}
      </tbody>
    </table></div>
    {pump.lines.length > 6 && <button className="dz-linkbtn" onClick={() => setAll(v => !v)}>{all ? 'Show the latest only' : `Show all ${pump.lines.length} lines`}</button>}
  </div>
}

function PumpStat({ icon, tone, label, value, sub }: { icon: ReactNode; tone: string; label: string; value: string; sub: string }) {
  return <div className={`dz-pstat dz-tone-${tone}`}>
    <span className="dz-stat-icon">{icon}</span>
    <span className="dz-pstat-label">{label}</span>
    <strong className="dz-pstat-value">{value}</strong>
    <small className="dz-pstat-sub">{sub}</small>
  </div>
}

function PaymentDialog({ pump, projectId, today, onClose, onSaved }: { pump: PumpAccount; projectId: string; today: string; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<PaymentMode | ''>('NEFT')
  const [reference, setReference] = useState('')
  const [remarks, setRemarks] = useState('')
  const value = Number(amount)
  const mutation = useMutation({
    mutationFn: async () => (await fuelApi.createPayment({ projectId, supplierId: pump.supplier.id, date, amount: value, mode: mode || null, reference: reference.trim() || null, remarks: remarks.trim() || null })).data,
    onSuccess: saved => {
      toast.success(`${rupees(value)} paid to ${pump.supplier.name}`)
      for (const w of saved.warnings) toast.error(w.message)
      onSaved()
    },
  })
  const blocked = !date || !(value > 0)
  return <Modal open title={`Payment to ${pump.supplier.name}`} width={520} onClose={() => { if (!mutation.isPending) onClose() }}
    footer={<div className="dz-form-footer"><button type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</button><button type="submit" form="dz-payment" className="dz-success" disabled={blocked || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save payment'}</button></div>}>
    <form id="dz-payment" className="dz-form" onSubmit={e => { e.preventDefault(); if (!blocked) mutation.mutate() }}>
      <div className="dz-grid">
        <label>Date *<input type="date" required max={today} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Amount (₹) *<input inputMode="decimal" type="number" min="1" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label>Paid by<select value={mode} onChange={e => setMode(e.target.value as PaymentMode | '')}>{PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}<option value="">Not known</option></select></label>
        <label>{mode === 'Cheque' ? 'Cheque number' : 'Bank reference'}<input value={reference} maxLength={80} onChange={e => setReference(e.target.value)} placeholder={mode === 'Cheque' ? '' : 'e.g. 814629437'} /></label>
      </div>
      <label>Remarks<textarea maxLength={1000} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Advance for December" /></label>
      {value > 0 && <p className="dz-note">The advance goes from {rupees(pump.balance)} to {rupees(pump.balance + value)}{pump.supplier.rate ? `, about ${litres(Math.floor((pump.balance + value) / pump.supplier.rate))} of diesel at ₹${perLitre(pump.supplier.rate)}` : ''}.</p>}
      {mutation.isError && <div className="dz-error" role="alert">{message(mutation.error)}</div>}
    </form>
  </Modal>
}

function RateDialog({ supplier, projectId, onClose, onSaved }: { supplier: FuelSupplier; projectId: string; onClose: () => void; onSaved: () => void }) {
  const [rate, setRate] = useState(supplier.rate !== null ? String(supplier.rate) : '')
  const value = Number(rate)
  const mutation = useMutation({
    mutationFn: () => fuelApi.updateSupplier(supplier.id, { projectId, name: supplier.name, rate: value }),
    onSuccess: () => { toast.success(`${supplier.name}: ₹${perLitre(value)} a litre from now`); onSaved() },
  })
  return <Modal open title={`${supplier.name}: price per litre`} width={440} onClose={() => { if (!mutation.isPending) onClose() }}
    footer={<div className="dz-form-footer"><button onClick={onClose} disabled={mutation.isPending}>Cancel</button><button className="dz-primary" disabled={!(value > 0) || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save rate'}</button></div>}>
    <div className="dz-form">
      <label>Rate (₹ per litre) *<input inputMode="decimal" type="number" min="1" step="0.01" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <p className="dz-note">New purchases from the pump are priced at this unless a bill rate is entered. Purchases already entered keep their price.</p>
      {mutation.isError && <div className="dz-error" role="alert">{message(mutation.error)}</div>}
    </div>
  </Modal>
}

function VoidPumpDialog({ line, projectId, onClose, onSaved }: { line: PumpLine; projectId: string; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('')
  const mutation = useMutation({ mutationFn: () => fuelApi.voidPayment(line.id, projectId, reason.trim()), onSuccess: () => { toast.success('Voided'); onSaved() } })
  return <Modal open title={line.kind === 'payment' ? 'Void this payment' : 'Void this delivery'} width={480} onClose={() => { if (!mutation.isPending) onClose() }}
    footer={<div className="dz-form-footer"><button onClick={onClose} disabled={mutation.isPending}>Keep it</button><button className="dz-danger" disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Voiding…' : 'Void'}</button></div>}>
    <div className="dz-form">
      <p className="dz-note">{shortDate(line.date)} · {PUMP_KIND_LABEL[line.kind]} {rupees(line.amount)}{line.reference ? ` · ${line.reference}` : ''}. It stays on record with your reason and no longer counts in the advance.</p>
      <label>Reason *<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Entered twice" /></label>
      {mutation.isError && <div className="dz-error" role="alert">{message(mutation.error)}</div>}
    </div>
  </Modal>
}

// ─── Forms ─────────────────────────────────────────────────────────────────

const TITLES: Record<FuelEntryType, string> = { issue: 'Issue diesel to a machine', receipt: 'Record a diesel purchase', adjustment: 'Stock check' }

function EntryForm({ kind, row, reg, projectId, today, onClose, onSaved }: { kind: FuelEntryType; row?: FuelRow; reg: FuelRegister; projectId: string; today: string; onClose: () => void; onSaved: () => void }) {
  const active = reg.machines.filter(m => m.active || m.id === row?.machineId)
  const [date, setDate] = useState(row?.date ?? today)
  const [machineId, setMachineId] = useState(row?.machineId ?? '')
  const machine = active.find(m => m.id === machineId)
  const [operator, setOperator] = useState(row?.operator ?? '')
  const [qty, setQty] = useState(row ? String(Math.abs(row.litres)) : '')
  const [direction, setDirection] = useState<'more' | 'less'>(row && row.litres < 0 ? 'less' : 'more')
  const [meter, setMeter] = useState(row?.meterReading !== null && row?.meterReading !== undefined ? String(row.meterReading) : '')
  const [noMeter, setNoMeter] = useState(!!row && kind === 'issue' && row.meterReading === null)
  // Purchases come from a listed supplier (the default pump unless changed), or one typed in.
  const listed = reg.suppliers.filter(x => x.active || x.id === row?.supplierId)
  const fallback = listed.find(x => x.isDefault)?.id ?? (listed[0]?.id ?? 'other')
  const [supplierChoice, setSupplierChoice] = useState<string>(row ? (row.supplierId ?? (row.supplier ? 'other' : fallback)) : fallback)
  const chosen = listed.find(x => x.id === supplierChoice) ?? null
  const [supplier, setSupplier] = useState(row && !row.supplierId ? row.supplier ?? '' : '')
  const [rate, setRate] = useState(row ? (row.rate !== null ? String(row.rate) : '') : kind === 'receipt' && listed.find(x => x.id === fallback)?.rate ? String(listed.find(x => x.id === fallback)!.rate) : '')
  const pickSupplier = (id: string) => {
    const next = listed.find(x => x.id === id)
    // Follow the supplier's price unless a different one was typed for this bill.
    if (!row && (rate === '' || Number(rate) === chosen?.rate)) setRate(next?.rate ? String(next.rate) : '')
    setSupplierChoice(id)
  }
  const [amount, setAmount] = useState(row?.amount !== null && row?.amount !== undefined ? String(row.amount) : '')
  const [billNo, setBillNo] = useState(row?.billNo ?? '')
  const [remarks, setRemarks] = useState(row?.remarks ?? '')
  const unit = machine?.meterUnit === 'km' ? 'Odometer (km)' : 'Hour meter (hours)'
  const litresNum = Number(qty)
  const autoAmount = kind === 'receipt' && rate && qty && !amount ? Math.round(Number(rate) * litresNum) : null

  const mutation = useMutation({
    mutationFn: async () => {
      const body: FuelEntryWrite = {
        projectId, entryType: kind, date, fuelType: machine?.fuelType ?? 'diesel',
        litres: kind === 'adjustment' && direction === 'less' ? -litresNum : litresNum,
        remarks: remarks.trim() || null,
        ...(kind === 'issue' ? { machineId, operator: operator.trim() || null, meterReading: noMeter || meter === '' ? null : Number(meter) } : {}),
        ...(kind === 'receipt' ? {
          rate: rate === '' ? null : Number(rate), amount: amount === '' ? null : Number(amount), billNo: billNo.trim() || null,
          supplierId: chosen?.id ?? null, supplier: chosen ? null : supplier.trim() || null,
        } : {}),
      }
      return (row ? await fuelApi.update(row.id, body) : await fuelApi.create(body)).data
    },
    onSuccess: saved => {
      toast.success(kind === 'issue' ? `${litres(Math.abs(saved.entry.litres))} issued to ${machine?.name ?? 'the machine'}` : kind === 'receipt' ? `${litres(saved.entry.litres)} purchased` : 'Stock adjusted')
      for (const w of saved.warnings) toast.error(w.message)
      onSaved()
    },
  })
  const meterMissing = kind === 'issue' && !noMeter && meter === ''
  // "Other" with no name would quietly become the default pump on the server.
  const blocked = !date || !(litresNum > 0) || (kind === 'issue' && (!machineId || meterMissing || (noMeter && !remarks.trim()))) || (kind === 'adjustment' && !remarks.trim())
    || (kind === 'receipt' && !chosen && !supplier.trim())
  const billValue = amount ? Number(amount) : rate && qty ? Number(rate) * litresNum : null
  const fromAdvance = kind === 'receipt' && chosen && reg.pump?.supplier.id === chosen.id ? reg.pump : null
  const advanceAfter = fromAdvance && billValue !== null ? fromAdvance.balance + (row?.supplierId === chosen?.id ? (row?.amount ?? 0) : 0) - billValue : null

  return <Modal open title={row ? `Edit: ${TITLES[kind].toLowerCase()}` : TITLES[kind]} width={560} onClose={() => { if (!mutation.isPending) onClose() }}
    footer={<div className="dz-form-footer"><button type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</button><button type="submit" form="dz-entry" className="dz-primary" disabled={blocked || mutation.isPending}>{mutation.isPending ? 'Saving…' : row ? 'Save changes' : 'Save'}</button></div>}>
    <form id="dz-entry" className="dz-form" onSubmit={e => { e.preventDefault(); if (!blocked) mutation.mutate() }}>
      {kind === 'issue' && <fieldset className="dz-machines" aria-label="Machine">
        <legend>Machine *</legend>
        <div>{active.map(m => <label key={m.id} className={machineId === m.id ? 'is-on' : ''}>
          <input type="radio" name="machine" value={m.id} checked={machineId === m.id} onChange={() => { setMachineId(m.id); if (!row) setOperator(m.operator ?? '') }} />
          <strong>{m.name}</strong><small>{m.ownership === 'hired' ? `Hired · ${m.ownerName}` : `Own${m.operator ? ` · ${m.operator}` : ''}`}</small>
        </label>)}</div>
      </fieldset>}
      <div className="dz-grid">
        <label>Date *<input type="date" required max={today} value={date} onChange={e => setDate(e.target.value)} /></label>
        {kind === 'adjustment' && <label>Stock found<select value={direction} onChange={e => setDirection(e.target.value as 'more' | 'less')}><option value="more">More than the register</option><option value="less">Less than the register</option></select></label>}
        <label>{kind === 'adjustment' ? 'By how many litres *' : 'Litres *'}<input inputMode="decimal" type="number" min="0.1" step="0.1" required value={qty} onChange={e => setQty(e.target.value)} /></label>
        {kind === 'issue' && <>
          <label>Operator<input value={operator} maxLength={120} onChange={e => setOperator(e.target.value)} placeholder={machine?.operator ?? 'Who took the diesel'} /></label>
          <label>{unit} {noMeter ? '' : '*'}<input inputMode="decimal" type="number" min="0" step="0.1" value={meter} disabled={noMeter} onChange={e => setMeter(e.target.value)} placeholder={machine ? 'Reading when filled' : 'Choose the machine first'} /></label>
        </>}
        {kind === 'receipt' && <>
          <label>Rate (₹ per litre)<input inputMode="decimal" type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} /></label>
          <label>Bill amount (₹)<input inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={autoAmount ? `${autoAmount.toLocaleString('en-IN')} from the rate` : ''} /></label>
          <label>Pump or supplier{listed.length > 0
            ? <select value={supplierChoice} onChange={e => pickSupplier(e.target.value)}>
                {listed.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                <option value="other">Another supplier…</option>
              </select>
            : <input value={supplier} maxLength={160} onChange={e => setSupplier(e.target.value)} />}</label>
          <label>Bill or receipt number<input value={billNo} maxLength={80} onChange={e => setBillNo(e.target.value)} /></label>
          {listed.length > 0 && !chosen && <label className="dz-span2">Supplier name *<input value={supplier} maxLength={160} onChange={e => setSupplier(e.target.value)} placeholder="Not paid from any advance" /></label>}
        </>}
      </div>
      {kind === 'issue' && <label className="dz-check"><input type="checkbox" checked={noMeter} onChange={e => setNoMeter(e.target.checked)} />Meter not read (say why below)</label>}
      <label>{kind === 'adjustment' ? 'Reason *' : noMeter ? 'Why the meter was not read *' : 'Remarks'}<textarea maxLength={1000} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={kind === 'adjustment' ? 'e.g. Dip check of the drums on 30 Nov' : ''} /></label>
      {fromAdvance && <p className={`dz-note${advanceAfter !== null && advanceAfter < 0 ? ' dz-note-warn' : ''}`}>
        Paid from the advance with {fromAdvance.supplier.name}: {rupees(fromAdvance.balance)} left now
        {advanceAfter !== null ? (advanceAfter < 0 ? `, ${rupees(-advanceAfter)} short after this bill. The pump would be giving credit.` : `, ${rupees(advanceAfter)} after this bill.`) : '.'}
      </p>}
      {kind === 'issue' && machine?.ownership === 'hired' && <p className="dz-note">{machine.name} is hired from {machine.ownerName}. This diesel will be listed against their machines for checking against their bill.</p>}
      {mutation.isError && <div className="dz-error" role="alert">{message(mutation.error)}</div>}
    </form>
  </Modal>
}

function VoidDialog({ row, projectId, onClose, onSaved }: { row: FuelRow; projectId: string; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('')
  const mutation = useMutation({ mutationFn: () => fuelApi.void(row.id, projectId, reason.trim()), onSuccess: () => { toast.success('Entry voided'); onSaved() } })
  return <Modal open title="Void this entry" width={480} onClose={() => { if (!mutation.isPending) onClose() }}
    footer={<div className="dz-form-footer"><button onClick={onClose} disabled={mutation.isPending}>Keep it</button><button className="dz-danger" disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Voiding…' : 'Void entry'}</button></div>}>
    <div className="dz-form">
      <p className="dz-note">{shortDate(row.date)} · {ENTRY_LABEL[row.entryType]} {litres(Math.abs(row.litres))}. A voided entry stays on record with your reason; it no longer counts in the stock.{row.fleetLogId ? ' It came from a Fleet logbook entry; that entry is not changed.' : ''}</p>
      <label>Reason *<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Entered twice" /></label>
      {mutation.isError && <div className="dz-error" role="alert">{message(mutation.error)}</div>}
    </div>
  </Modal>
}

const BLANK_MACHINE = (projectId: string): FuelMachineWrite => ({ projectId, name: '', kind: '', ownership: 'owned', ownerName: '', operator: '', fuelType: 'diesel', meterUnit: 'hours', logbookNames: '', active: true })

function MachinesDialog({ machines, projectId, onClose, onSaved }: { machines: FuelMachine[]; projectId: string; onClose: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState<{ id: string | null; values: FuelMachineWrite } | null>(null)
  const set = <K extends keyof FuelMachineWrite>(k: K, v: FuelMachineWrite[K]) => setEditing(e => e && { ...e, values: { ...e.values, [k]: v } })
  const mutation = useMutation({
    mutationFn: async () => {
      const v = editing!.values
      const body = { ...v, name: v.name.trim(), ownerName: v.ownership === 'hired' ? v.ownerName?.trim() || null : null, kind: v.kind?.trim() || null, operator: v.operator?.trim() || null, logbookNames: v.logbookNames?.trim() || null }
      return editing!.id ? fuelApi.updateMachine(editing!.id, body) : fuelApi.createMachine(body)
    },
    onSuccess: () => { toast.success('Machine saved'); setEditing(null); onSaved() },
  })
  const v = editing?.values
  return <Modal open title={editing ? (editing.id ? `Edit ${editing.values.name}` : 'Add a machine') : 'Machines that take diesel'} width={620} onClose={() => { if (!mutation.isPending) onClose() }}
    footer={editing
      ? <div className="dz-form-footer"><button onClick={() => setEditing(null)} disabled={mutation.isPending}>Back</button><button className="dz-primary" disabled={!v?.name.trim() || (v.ownership === 'hired' && !v.ownerName?.trim()) || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save machine'}</button></div>
      : <div className="dz-form-footer"><button onClick={onClose}>Close</button><button className="dz-primary" onClick={() => setEditing({ id: null, values: BLANK_MACHINE(projectId) })}><Plus size={15} />Add machine</button></div>}>
    {!editing ? <ul className="dz-machine-list">{machines.map(m => <li key={m.id} className={m.active ? '' : 'is-off'}>
      <div><strong>{m.name}</strong><small>{[m.ownership === 'hired' ? `Hired from ${m.ownerName}` : 'Own', m.operator && `Operator ${m.operator}`, m.fuelType === 'petrol' ? 'Petrol' : 'Diesel', m.meterUnit === 'km' ? 'Odometer' : 'Hour meter', !m.active && 'No longer on site'].filter(Boolean).join(' · ')}</small>
        {m.logbookNames && <small>Logbook names: {m.logbookNames}</small>}</div>
      <button onClick={() => setEditing({ id: m.id, values: { projectId, name: m.name, kind: m.kind ?? '', ownership: m.ownership, ownerName: m.ownerName ?? '', assetId: m.assetId, operator: m.operator ?? '', fuelType: m.fuelType, meterUnit: m.meterUnit, logbookNames: m.logbookNames ?? '', active: m.active } })}>Edit</button>
    </li>)}</ul>
      : <div className="dz-form">
        <div className="dz-grid">
          <label>Name *<input value={v!.name} maxLength={120} onChange={e => set('name', e.target.value)} placeholder="e.g. Sany excavator" /></label>
          <label>Type<input value={v!.kind ?? ''} maxLength={60} onChange={e => set('kind', e.target.value)} placeholder="Excavator, Roller, DG set…" /></label>
          <label>Ownership<select value={v!.ownership} onChange={e => set('ownership', e.target.value as 'owned' | 'hired')}><option value="owned">Our own</option><option value="hired">Hired</option></select></label>
          {v!.ownership === 'hired' && <label>Hired from *<input value={v!.ownerName ?? ''} maxLength={160} onChange={e => set('ownerName', e.target.value)} placeholder="e.g. Wani Infra" /></label>}
          <label>Regular operator<input value={v!.operator ?? ''} maxLength={120} onChange={e => set('operator', e.target.value)} /></label>
          <label>Fuel<select value={v!.fuelType} onChange={e => set('fuelType', e.target.value as 'diesel' | 'petrol')}><option value="diesel">Diesel</option><option value="petrol">Petrol</option></select></label>
          <label>Meter<select value={v!.meterUnit} onChange={e => set('meterUnit', e.target.value as 'hours' | 'km')}><option value="hours">Hour meter</option><option value="km">Odometer (km)</option></select></label>
        </div>
        <label>Names used in the Fleet logbook<input value={v!.logbookNames ?? ''} maxLength={300} onChange={e => set('logbookNames', e.target.value)} placeholder="e.g. PC210, Poclain" /><small>Comma-separated. Diesel entered in the logbook under any of these names is put against this machine.</small></label>
        {editing.id && <label className="dz-check"><input type="checkbox" checked={!v!.active} onChange={e => set('active', !e.target.checked)} />No longer on site (kept for its history)</label>}
        {mutation.isError && <div className="dz-error" role="alert">{message(mutation.error)}</div>}
      </div>}
  </Modal>
}
