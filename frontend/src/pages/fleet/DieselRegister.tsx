import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, DownloadSimple, FilePdf, GasPump, PencilSimple, Plus, Scales, Truck, Warning, X } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/lib/notify'
import { projectsApi } from '@/api/projects.api'
import { fuelApi } from '@/api/fuel.api'
import type { FuelEntryType, FuelEntryWrite, FuelMachine, FuelMachineWrite, FuelRegister, FuelRow } from '@/api/fuel.api'
import { localToday } from '../assets/assetHelpers'
import { burnRate, describeWarning, ENTRY_LABEL, litres, monthLabel, monthRange, registerCsv, registerFileName, renderRegisterPdf, rowParty, rupees, shortDate } from './dieselRegister'
import './DieselRegister.css'

const RECORD = ['super_admin', 'admin', 'project_manager', 'engineer', 'supervisor']
const MANAGE = ['super_admin', 'admin', 'project_manager']

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
  const canRecord = RECORD.includes(role)
  const canManage = MANAGE.includes(role)

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

  return <section className="dz">
    <div className="dz-toolbar">
      <label className="dz-month"><span>Month</span><input type="month" value={month} max={today.slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} /></label>
      <div className="dz-actions">
        {canRecord && <>
          <button className="dz-primary" onClick={() => setForm({ kind: 'issue' })}><ArrowUp size={16} />Issue diesel</button>
          <button onClick={() => setForm({ kind: 'receipt' })}><ArrowDown size={16} />Receive diesel</button>
          <button onClick={() => setForm({ kind: 'adjustment' })}><Scales size={16} />Stock check</button>
        </>}
        {canManage && <button onClick={() => setMachinesOpen(true)}><Truck size={16} />Machines</button>}
        <button onClick={() => download('pdf')} disabled={!reg}><FilePdf size={16} />PDF</button>
        <button onClick={() => download('csv')} disabled={!reg}><DownloadSimple size={16} />Excel</button>
      </div>
    </div>

    {query.isError && <div className="dz-error" role="alert">{message(query.error)} <button onClick={() => query.refetch()}>Retry</button></div>}
    {query.isPending && <div className="dz-empty" role="status">Loading the diesel register…</div>}

    {reg && <>
      <div className="dz-tiles">
        <div className="dz-tile dz-tile-stock"><span>Diesel in stock now</span><strong>{litres(reg.summary.stock.diesel.now)}</strong><small>As of the latest entry</small></div>
        <div className="dz-tile"><span>Received in {monthLabel(month).split(' ')[0]}</span><strong>{litres(reg.summary.totals.diesel.received)}</strong><small>{reg.summary.totals.diesel.receivedAmount ? rupees(reg.summary.totals.diesel.receivedAmount) : 'No rate entered'}</small></div>
        <div className="dz-tile"><span>Issued in {monthLabel(month).split(' ')[0]}</span><strong>{litres(reg.summary.totals.diesel.issued)}</strong><small>{issuedCostText(reg)}</small></div>
        <div className="dz-tile"><span>Month</span><strong className="dz-tile-flow">{litres(reg.summary.stock.diesel.opening)} → {litres(reg.summary.stock.diesel.closing)}</strong><small>Opening → closing{reg.summary.totals.diesel.adjusted ? ` · adjusted ${litres(reg.summary.totals.diesel.adjusted)}` : ''}</small></div>
        {hasPetrol && <div className="dz-tile"><span>Petrol in stock now</span><strong>{litres(reg.summary.stock.petrol.now)}</strong><small>Issued this month {litres(reg.summary.totals.petrol.issued)}</small></div>}
      </div>

      {reg.summary.warnings.length > 0 && <div className="dz-warnings" role="status">
        <Warning size={18} weight="fill" />
        <ul>{reg.summary.warnings.map((w, i) => <li key={i}>{describeWarning(w)}</li>)}</ul>
      </div>}

      <div className="dz-panel">
        <h2>By machine <small>{monthLabel(month)}</small></h2>
        <div className="dz-scroll"><table className="dz-table">
          <thead><tr><th>Machine</th><th>Operator</th><th className="dz-num">Diesel</th><th className="dz-num">Fills</th><th>Consumption</th><th className="dz-num">Last meter</th><th className="dz-num">Cost</th></tr></thead>
          <tbody>{reg.summary.machines.map(m => {
            const rate = burnRate(m)
            return <tr key={m.machineId}>
              <td><strong>{m.name}</strong><span className={`dz-own dz-own-${m.ownership}`}>{m.ownership === 'hired' ? `Hired · ${m.ownerName}` : 'Own'}</span></td>
              <td>{m.operator || '—'}</td>
              <td className="dz-num">{litres(m.litres)}</td>
              <td className="dz-num">{m.fills}</td>
              <td><span className={rate.value === 'Not known' ? 'dz-muted' : ''}>{rate.value}</span><small>{rate.basis}</small></td>
              <td className="dz-num">{m.lastMeter ?? '—'}{m.lastMeter !== null && <small>{m.meterUnit === 'km' ? 'km' : 'hours'}</small>}</td>
              <td className="dz-num">{m.fills ? (m.cost === null ? <span className="dz-muted">Needs rates</span> : rupees(m.cost)) : '—'}</td>
            </tr>
          })}</tbody>
        </table></div>
        {reg.summary.hiredOwners.map(o => <p key={o.ownerName} className="dz-hired"><GasPump size={16} /><span><strong>{litres(o.litres)}</strong> went into {o.ownerName}&apos;s machines ({o.machines.join(', ')}){o.cost ? `, worth ${rupees(o.cost)}` : ''}. Check it against their hire terms and bill.</span></p>)}
      </div>

      <div className="dz-panel">
        <h2>Register <small>{shortDate(reg.from)} to {shortDate(reg.to)}</small></h2>
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
                <td className="dz-num">{out ? '' : litres(r.litres)}</td>
                <td className="dz-num">{out ? litres(Math.abs(r.litres)) : ''}</td>
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
      <p className="dz-footnote">Diesel typed into a Fleet logbook entry is recorded here as an issue, so it is entered once. Costs use the average rate of the purchases entered so far; enter the rate on each purchase to get them.</p>
    </>}

    {form && reg && <EntryForm key={form.row?.id ?? form.kind} kind={form.kind} row={form.row} reg={reg} projectId={projectId} today={today}
      onClose={() => setForm(null)} onSaved={() => { setForm(null); void refresh() }} />}
    {machinesOpen && reg && <MachinesDialog machines={reg.machines} projectId={projectId} onClose={() => setMachinesOpen(false)} onSaved={() => void refresh()} />}
    {voiding && <VoidDialog row={voiding} projectId={projectId} onClose={() => setVoiding(null)} onSaved={() => { setVoiding(null); void refresh() }} />}
  </section>
}

// ─── Forms ─────────────────────────────────────────────────────────────────

const TITLES: Record<FuelEntryType, string> = { issue: 'Issue diesel to a machine', receipt: 'Receive diesel into stock', adjustment: 'Stock check' }

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
  const [rate, setRate] = useState(row?.rate !== null && row?.rate !== undefined ? String(row.rate) : '')
  const [amount, setAmount] = useState(row?.amount !== null && row?.amount !== undefined ? String(row.amount) : '')
  const [supplier, setSupplier] = useState(row?.supplier ?? '')
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
        ...(kind === 'receipt' ? { rate: rate === '' ? null : Number(rate), amount: amount === '' ? null : Number(amount), supplier: supplier.trim() || null, billNo: billNo.trim() || null } : {}),
      }
      return (row ? await fuelApi.update(row.id, body) : await fuelApi.create(body)).data
    },
    onSuccess: saved => {
      toast.success(kind === 'issue' ? `${litres(Math.abs(saved.entry.litres))} issued to ${machine?.name ?? 'the machine'}` : kind === 'receipt' ? `${litres(saved.entry.litres)} received` : 'Stock adjusted')
      for (const w of saved.warnings) toast.error(w.message)
      onSaved()
    },
  })
  const meterMissing = kind === 'issue' && !noMeter && meter === ''
  const blocked = !date || !(litresNum > 0) || (kind === 'issue' && (!machineId || meterMissing || (noMeter && !remarks.trim()))) || (kind === 'adjustment' && !remarks.trim())

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
          <label>Pump or supplier<input value={supplier} maxLength={160} onChange={e => setSupplier(e.target.value)} /></label>
          <label>Bill number<input value={billNo} maxLength={80} onChange={e => setBillNo(e.target.value)} /></label>
        </>}
      </div>
      {kind === 'issue' && <label className="dz-check"><input type="checkbox" checked={noMeter} onChange={e => setNoMeter(e.target.checked)} />Meter not read (say why below)</label>}
      <label>{kind === 'adjustment' ? 'Reason *' : noMeter ? 'Why the meter was not read *' : 'Remarks'}<textarea maxLength={1000} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={kind === 'adjustment' ? 'e.g. Dip check of the drums on 30 Nov' : ''} /></label>
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
