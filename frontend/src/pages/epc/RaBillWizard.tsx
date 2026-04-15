// ============================================================
//  KIPL ProjectOS — RA Bill Wizard (Enhanced)
//  Dal Lake Sewerage Scheme, 38.5 MLD STP
//  Allotment: CE/UEED/PS/01 OF 2025-26
// ============================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import axios from 'axios';

// ── Types ────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  label: string;
  stdPct: number;
  billedPct: number;
  checked: boolean;
}

export interface BoqItem {
  id: string;
  part: 'A' | 'B';
  sno: number;
  name: string;
  subName?: string;
  estimatedCost: number | null;   // in Crores
  estimatedQty: number | null;
  qtyUnit?: string;
  hasQty: boolean;
  scheduleKey: string;
}

export interface LineItemState {
  quotedCost: string;
  measuredQty: string;
  milestones: Milestone[];
  expanded: boolean;
  savedToBoq: boolean;
}

export interface BillHeader {
  billNo: string;
  billDate: string;
  allotmentNo: string;
  allotmentDate: string;
  clientRef: string;
  remarks: string;
}

// ── Payment Schedule Library ─────────────────────────────────

const SCHEDULE: Record<string, Omit<Milestone, 'billedPct' | 'checked'>[]> = {
  pipes: [
    { id: 's1', label: 'Survey of Design', stdPct: 3 },
    { id: 's2', label: 'Vetting of Design', stdPct: 2 },
    { id: 's3', label: 'Providing & Laying of Pipes (incl. backfill & temp. surface reinstatement)', stdPct: 55 },
    { id: 's4', label: 'Sectional Flow Testing', stdPct: 10 },
    { id: 's5', label: 'Permanent Surface Reinstatement of Roads/Lanes', stdPct: 20 },
    { id: 's6', label: 'Testing, Commissioning & Successful Trial Run', stdPct: 5 },
    { id: 's7', label: 'O&M – 5 Years', stdPct: 5 },
  ],
  manholes: [
    { id: 'm1', label: 'Survey & Vetting of Design', stdPct: 5 },
    { id: 'm2', label: 'Construction of RCC Manholes / Inspection Chambers (incl. backfill)', stdPct: 65 },
    { id: 'm3', label: 'Permanent Surface Reinstatement', stdPct: 20 },
    { id: 'm4', label: 'Testing, Commissioning & Successful Trial Run', stdPct: 5 },
    { id: 'm5', label: 'O&M – 5 Years', stdPct: 5 },
  ],
  drop: [
    { id: 'd1', label: 'Survey & Vetting of Design', stdPct: 5 },
    { id: 'd2', label: 'Construction of Drop Arrangements (incl. backfill)', stdPct: 65 },
    { id: 'd3', label: 'Permanent Surface Reinstatement', stdPct: 20 },
    { id: 'd4', label: 'Testing, Commissioning & Successful Trial Run', stdPct: 5 },
    { id: 'd5', label: 'O&M – 5 Years', stdPct: 5 },
  ],
  masonry: [
    { id: 'mc1', label: 'Survey & Vetting of Design', stdPct: 5 },
    { id: 'mc2', label: 'Construction of Masonry Chamber (incl. backfill)', stdPct: 30 },
    { id: 'mc3', label: 'Providing & Laying of Sewer Pipes (incl. surface reinstatement)', stdPct: 35 },
    { id: 'mc4', label: 'Permanent Surface Reinstatement of Roads/Lanes', stdPct: 20 },
    { id: 'mc5', label: 'Testing, Commissioning & Successful Trial Run', stdPct: 5 },
    { id: 'mc6', label: 'O&M – 5 Years', stdPct: 5 },
  ],
  civil: [
    { id: 'c1', label: 'Survey of Design', stdPct: 3 },
    { id: 'c2', label: 'Vetting of Design', stdPct: 2 },
    { id: 'c3', label: 'Building Work upto Plinth Level / 25% Civil Completion', stdPct: 20 },
    { id: 'c4', label: '60% Completion of Building Work / Civil Structure', stdPct: 30 },
    { id: 'c5', label: 'Complete Finishing of Building & Civil Works (as per approved drawings)', stdPct: 30 },
    { id: 'c6', label: 'Testing & Commissioning of STP/IPS', stdPct: 5 },
    { id: 'c7', label: 'After Issuance of Completion Certificate by UEED', stdPct: 5 },
    { id: 'c8', label: 'O&M – 5 Years', stdPct: 5 },
  ],
  em: [
    { id: 'e1', label: 'Delivery of E&M Components at Site (after TPI at Factory — QAP approved)', stdPct: 40 },
    { id: 'e2', label: 'Installation, Erection & Testing of E&M Components at Site', stdPct: 25 },
    { id: 'e3', label: 'Commissioning of E&M Components at Site', stdPct: 10 },
    { id: 'e4', label: 'Successful Completion of 6-Month Free Trial Run', stdPct: 10 },
    { id: 'e5', label: 'Successful Completion of Defect Liability Period', stdPct: 10 },
    { id: 'e6', label: 'O&M – 5 Years', stdPct: 5 },
  ],
};

// ── BOQ Master (mirrors DB seed data) ───────────────────────

export const BOQ_ITEMS: BoqItem[] = [
  // ── PART A: Sewer Network ──
  {
    id: 'pipes', part: 'A', sno: 1,
    name: 'Laying of Sewer & Appurtenant Works',
    subName: 'Survey, Design, Providing & Laying of Sewerage Network (RCC NP3 Pipes of All Dia incl. DI, HDPE)',
    estimatedCost: 196.74, estimatedQty: 189.1, qtyUnit: 'km', hasQty: true, scheduleKey: 'pipes',
  },
  {
    id: 'manholes', part: 'A', sno: 2,
    name: 'Manholes of Different Sizes & Depths',
    subName: 'Construction of RCC Manholes / Inspection Chambers as per BoQ',
    estimatedCost: null, estimatedQty: null, qtyUnit: 'nos', hasQty: true, scheduleKey: 'manholes',
  },
  {
    id: 'drop', part: 'A', sno: 3,
    name: 'Drop Arrangement of Different Dia',
    subName: 'Construction of Drop Arrangements in Manholes / Inspection Chambers',
    estimatedCost: null, estimatedQty: null, qtyUnit: 'nos', hasQty: true, scheduleKey: 'drop',
  },
  {
    id: 'masonry', part: 'A', sno: 4,
    name: 'Construction of Masonry Chambers of Different Sizes',
    estimatedCost: null, estimatedQty: null, qtyUnit: 'nos', hasQty: true, scheduleKey: 'masonry',
  },
  // ── PART B: Turnkey Works ──
  {
    id: 'stp_civil', part: 'B', sno: 1,
    name: 'STP Civil Works (38.5 MLD)',
    subName: 'Survey, Design, Engineering, Construction of STP incl. Reuse Pump Station, Admin-cum-Lab Block (min. 450 sqm), Primary/Secondary/Tertiary Treatment',
    estimatedCost: 20.4, hasQty: false, scheduleKey: 'civil',
  },
  {
    id: 'ips_civil', part: 'B', sno: 2,
    name: 'IPS / MPS Civil Works – All Stations (IPS-1 to IPS-9)',
    subName: 'Survey, Design & Construction of Sewage Pumping Stations with Coarse Screen Channel on Turnkey Basis',
    estimatedCost: 8.86, hasQty: false, scheduleKey: 'civil',
  },
  {
    id: 'em', part: 'B', sno: 3,
    name: 'Electro-Mechanical Works – STP + All IPS/MPS',
    subName: 'Supply, Erection, Testing & Commissioning of all E&M Equipment for STP and all Intermediate Pumping Stations',
    estimatedCost: null, hasQty: false, scheduleKey: 'em',
  },
];

const LOA_DISCOUNT = 0.05904; // 5.904% below advertised

// ── Helpers ──────────────────────────────────────────────────

function buildMilestones(scheduleKey: string): Milestone[] {
  return (SCHEDULE[scheduleKey] || []).map(m => ({
    ...m,
    // Pre-check Survey & Vetting milestones (RA-1 pattern)
    checked: ['s1', 's2', 'c1', 'c2'].includes(m.id),
    billedPct: m.stdPct,
  }));
}

function buildInitialState(): Record<string, LineItemState> {
  return Object.fromEntries(
    BOQ_ITEMS.map(item => [
      item.id,
      {
        quotedCost: item.estimatedCost
          ? ((item.estimatedCost * (1 - LOA_DISCOUNT)).toFixed(5))
          : '',
        measuredQty: item.hasQty ? (item.estimatedQty?.toString() ?? '') : '',
        milestones: buildMilestones(item.scheduleKey),
        expanded: ['pipes', 'stp_civil', 'ips_civil'].includes(item.id),
        savedToBoq: !!item.estimatedCost,
      },
    ])
  );
}

function calcLineAmount(item: BoqItem, state: LineItemState): number {
  const quoted = parseFloat(state.quotedCost);
  if (!quoted || quoted <= 0) return 0;

  let base = quoted;
  if (item.hasQty) {
    const measured = parseFloat(state.measuredQty);
    const estimated = item.estimatedQty;
    if (!isNaN(measured) && estimated && estimated > 0) {
      base = quoted * (measured / estimated);
    }
  }

  return state.milestones
    .filter(m => m.checked)
    .reduce((sum, m) => sum + base * (m.billedPct / 100), 0);
}

function numberToWords(n: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const cr = Math.floor(n);
  const lacs = Math.floor((n % 1) * 100);
  let words = '';
  if (cr >= 100) words += a[Math.floor(cr / 100)] + ' Hundred ';
  const t = cr % 100;
  if (t < 20) words += a[t];
  else words += b[Math.floor(t / 10)] + (t % 10 ? ' ' + a[t % 10] : '');
  if (cr > 0) words += ' Crore';
  if (lacs > 0) words += ' & ' + (lacs < 20 ? a[lacs] : b[Math.floor(lacs / 10)] + (lacs % 10 ? ' ' + a[lacs % 10] : '')) + ' Lacs';
  return words.trim() + ' Only';
}

// ── Sub-Components ───────────────────────────────────────────

interface FieldProps { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; badge?: string; readOnly?: boolean; }
const Field: React.FC<FieldProps> = ({ label, value, onChange, type = 'text', placeholder, badge, readOnly }) => (
  <div className="mb-3">
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
      {label}
      {badge && <span className="ml-2 text-xs bg-teal-900 text-teal-300 px-2 py-0.5 rounded font-mono normal-case tracking-normal">{badge}</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1
        ${readOnly ? 'border-teal-800 text-teal-300 cursor-default' : 'border-gray-700 text-amber-300 focus:ring-amber-500 focus:border-amber-500'}`}
    />
  </div>
);

interface AmountDisplayProps { label: string; amount: number; highlight?: boolean; }
const AmountDisplay: React.FC<AmountDisplayProps> = ({ label, amount, highlight }) => (
  <div className={`flex justify-between items-center py-1 px-2 rounded ${highlight ? 'bg-amber-900/30' : ''}`}>
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`font-mono text-sm font-bold ${highlight ? 'text-amber-300' : 'text-green-400'}`}>
      ₹{amount.toFixed(2)} Cr
    </span>
  </div>
);

// ── Line Item Card ───────────────────────────────────────────

interface LineItemCardProps {
  item: BoqItem;
  state: LineItemState;
  onChange: (id: string, patch: Partial<LineItemState>) => void;
  onSaveQuotedRate: (id: string, rate: string) => void;
}

const LineItemCard: React.FC<LineItemCardProps> = ({ item, state, onChange, onSaveQuotedRate }) => {
  const amount = calcLineAmount(item, state);
  const checkedCount = state.milestones.filter(m => m.checked).length;

  const toggleMilestone = (mId: string) => {
    const milestones = state.milestones.map(m =>
      m.id === mId ? { ...m, checked: !m.checked } : m
    );
    onChange(item.id, { milestones });
  };

  const updateBilledPct = (mId: string, val: string) => {
    const milestones = state.milestones.map(m =>
      m.id === mId ? { ...m, billedPct: parseFloat(val) || 0 } : m
    );
    onChange(item.id, { milestones });
  };

  const quoted = parseFloat(state.quotedCost) || 0;
  const measured = parseFloat(state.measuredQty) || 0;
  const base = item.hasQty && item.estimatedQty
    ? quoted * (measured / item.estimatedQty)
    : quoted;

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-4">
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-900 cursor-pointer select-none"
        onClick={() => onChange(item.id, { expanded: !state.expanded })}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500">
            {item.part}-{item.sno.toString().padStart(2, '0')}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-200">{item.name}</p>
            {item.subName && <p className="text-xs text-gray-500 mt-0.5 max-w-lg">{item.subName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">{checkedCount} milestone{checkedCount !== 1 ? 's' : ''}</p>
            <p className={`font-mono text-sm font-bold ${amount > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
              {amount > 0 ? `₹${amount.toFixed(4)} Cr` : '—'}
            </p>
          </div>
          <span className="text-gray-600 text-lg">{state.expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded Content */}
      {state.expanded && (
        <div className="p-4 bg-gray-950 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

            {/* Estimated Cost (from BOQ) */}
            <Field
              label="Estimated Cost (BOQ)"
              value={item.estimatedCost !== null ? item.estimatedCost.toFixed(5) : 'Not seeded'}
              onChange={() => {}}
              readOnly
              badge="AUTO"
            />

            {/* Quoted Rate (LOA) */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Quoted Rate (LOA)
                {state.savedToBoq && (
                  <span className="ml-2 text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded font-mono normal-case">SAVED</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.00001"
                  value={state.quotedCost}
                  onChange={e => onChange(item.id, { quotedCost: e.target.value, savedToBoq: false })}
                  placeholder="Enter quoted rate (₹ Cr)"
                  className="flex-1 bg-gray-900 border border-amber-700 rounded px-3 py-2 text-sm font-mono text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={() => onSaveQuotedRate(item.id, state.quotedCost)}
                  className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 text-xs rounded font-semibold transition-colors"
                  title="Save quoted rate to BOQ database"
                >
                  SAVE → BOQ
                </button>
              </div>
              {item.estimatedCost && state.quotedCost && (
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Discount: {(((item.estimatedCost - parseFloat(state.quotedCost)) / item.estimatedCost) * 100).toFixed(3)}% below estimated
                </p>
              )}
            </div>

            {/* Measured Qty (Part A only) */}
            {item.hasQty ? (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <Field
                    label={`Est. Qty (${item.qtyUnit})`}
                    value={item.estimatedQty?.toString() ?? ''}
                    onChange={() => {}}
                    readOnly
                    badge="BOQ"
                  />
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Measured Qty ({item.qtyUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={state.measuredQty}
                      onChange={e => onChange(item.id, { measuredQty: e.target.value })}
                      placeholder="Field measurement"
                      className="w-full bg-gray-900 border border-amber-700 rounded px-3 py-2 text-sm font-mono text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
                {item.estimatedQty && state.measuredQty && (
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Qty Ratio: {(parseFloat(state.measuredQty) / item.estimatedQty).toFixed(4)}×
                    &nbsp;|&nbsp; Base for billing: ₹{base.toFixed(4)} Cr
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Billing Basis</label>
                <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-gray-400 font-mono">
                  Lumpsum — no qty ratio applied
                  <br />Base = Quoted Rate = ₹{quoted.toFixed(4)} Cr
                </div>
              </div>
            )}
          </div>

          {/* Milestone Table */}
          <div className="mt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Milestones (Payment Schedule — select milestones for this bill)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-gray-500 w-8">✓</th>
                    <th className="text-left py-2 px-2 text-gray-500">Milestone Description</th>
                    <th className="text-right py-2 px-2 text-gray-500 w-20">Std %</th>
                    <th className="text-right py-2 px-2 text-gray-500 w-24">Billed %</th>
                    <th className="text-right py-2 px-2 text-gray-500 w-32">Amount (₹ Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.milestones.map(m => {
                    const mAmt = m.checked ? base * (m.billedPct / 100) : 0;
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-gray-900 ${m.checked ? 'bg-gray-900/50' : ''}`}
                      >
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            checked={m.checked}
                            onChange={() => toggleMilestone(m.id)}
                            className="accent-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className={`py-2 px-2 font-mono ${m.checked ? 'text-gray-200' : 'text-gray-600'}`}>
                          {m.label}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-500 font-mono">{m.stdPct}%</td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={m.billedPct}
                            onChange={e => updateBilledPct(m.id, e.target.value)}
                            disabled={!m.checked}
                            className={`w-20 text-right bg-transparent border-b py-0.5 font-mono text-xs focus:outline-none
                              ${m.checked
                                ? m.billedPct !== m.stdPct
                                  ? 'border-orange-500 text-orange-300'
                                  : 'border-gray-700 text-amber-300'
                                : 'border-gray-800 text-gray-700 cursor-not-allowed'
                              }`}
                          />
                          <span className={`ml-0.5 ${m.checked ? 'text-gray-400' : 'text-gray-700'}`}>%</span>
                          {m.checked && m.billedPct !== m.stdPct && (
                            <span className="ml-1 text-orange-400" title="Partial billing (differs from standard)">⚠</span>
                          )}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${m.checked && mAmt > 0 ? 'text-green-400' : 'text-gray-700'}`}>
                          {m.checked && mAmt > 0 ? mAmt.toFixed(4) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-amber-800">
                    <td colSpan={4} className="py-2 px-2 text-right text-xs font-semibold text-gray-400">
                      Line Item Total →
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-amber-400">
                      ₹{amount.toFixed(4)} Cr
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Step Components ──────────────────────────────────────────

const StepHeader: React.FC<{ header: BillHeader; onChange: (h: BillHeader) => void }> = ({ header, onChange }) => {
  const set = (k: keyof BillHeader) => (v: string) => onChange({ ...header, [k]: v });
  return (
    <div>
      <h2 className="text-lg font-bold text-amber-400 mb-4 font-mono">Bill Header — Identification</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Bill No." value={header.billNo} onChange={set('billNo')} placeholder="RA-1" />
        <Field label="Bill Date" value={header.billDate} onChange={set('billDate')} type="date" />
        <Field label="Client Ref / Endorsement" value={header.clientRef} onChange={set('clientRef')} placeholder="CE/UEED/PS/2929-42" />
        <Field label="Allotment No." value={header.allotmentNo} onChange={set('allotmentNo')} badge="AUTO" readOnly />
        <Field label="Allotment Date" value={header.allotmentDate} onChange={set('allotmentDate')} badge="AUTO" readOnly />
        <div />
        <div className="md:col-span-3">
          <Field label="Subject / Remarks" value={header.remarks} onChange={set('remarks')} placeholder="e.g., Survey & Vetting of Design for Sewer Network and STP/IPS Works" />
        </div>
      </div>
      <div className="mt-4 p-3 bg-gray-900 border border-gray-800 rounded text-xs font-mono text-gray-400">
        <p><span className="text-teal-400">Package:</span> Survey, Design and Execution of Sewerage Scheme for Dal Lake Uncovered Areas – Pollution Abatement of Dal Lake, Kashmir (J&K) on EPC Fixed-Cost Turnkey Basis including O&M for 5 Years</p>
        <p className="mt-1"><span className="text-teal-400">Contractor:</span> M/S Khilari Infrastructure Pvt. Ltd., 101–105, Prabhat Centre Annex, Sector-1A, C.B.D Belapur, Navi Mumbai – 400 614</p>
        <p className="mt-1"><span className="text-teal-400">Allotted Cost:</span> ₹279.99 Cr (5.904% below advertised ₹297.56 Cr)</p>
      </div>
    </div>
  );
};

const StepPartA: React.FC<{
  itemStates: Record<string, LineItemState>;
  onChange: (id: string, p: Partial<LineItemState>) => void;
  onSave: (id: string, rate: string) => void;
}> = ({ itemStates, onChange, onSave }) => {
  const partAItems = BOQ_ITEMS.filter(i => i.part === 'A');
  const total = partAItems.reduce((s, i) => s + calcLineAmount(i, itemStates[i.id]), 0);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-amber-400 font-mono">Part A — Sewer Network & Appurtenant Works</h2>
        <div className="text-right">
          <p className="text-xs text-gray-500">Part A Total</p>
          <p className="font-mono font-bold text-amber-400 text-lg">₹{total.toFixed(4)} Cr</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">Bidders will be paid per metre. Qty ratio = Measured Qty ÷ Estimated Qty is applied to Quoted Rate before multiplying by Milestone %.</p>
      {partAItems.map(item => (
        <LineItemCard key={item.id} item={item} state={itemStates[item.id]} onChange={onChange} onSaveQuotedRate={onSave} />
      ))}
    </div>
  );
};

const StepPartB: React.FC<{
  itemStates: Record<string, LineItemState>;
  onChange: (id: string, p: Partial<LineItemState>) => void;
  onSave: (id: string, rate: string) => void;
}> = ({ itemStates, onChange, onSave }) => {
  const partBItems = BOQ_ITEMS.filter(i => i.part === 'B');
  const total = partBItems.reduce((s, i) => s + calcLineAmount(i, itemStates[i.id]), 0);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-amber-400 font-mono">Part B — Turnkey Works (STP / IPS / E&M)</h2>
        <div className="text-right">
          <p className="text-xs text-gray-500">Part B Total</p>
          <p className="font-mono font-bold text-amber-400 text-lg">₹{total.toFixed(4)} Cr</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">Lumpsum items — no qty ratio. Amount = Quoted Rate × Milestone %. Civil: 5/20/30/30/5/5/5% | E&M: 40/25/10/10/10/5%</p>
      {partBItems.map(item => (
        <LineItemCard key={item.id} item={item} state={itemStates[item.id]} onChange={onChange} onSaveQuotedRate={onSave} />
      ))}
    </div>
  );
};

const StepSummary: React.FC<{
  header: BillHeader;
  itemStates: Record<string, LineItemState>;
  onGeneratePDF: () => void;
}> = ({ header, itemStates, onGeneratePDF }) => {
  const lineAmounts = BOQ_ITEMS.map(i => ({ item: i, amount: calcLineAmount(i, itemStates[i.id]) }));
  const partATotal = lineAmounts.filter(x => x.item.part === 'A').reduce((s, x) => s + x.amount, 0);
  const partBTotal = lineAmounts.filter(x => x.item.part === 'B').reduce((s, x) => s + x.amount, 0);
  const grandTotal = partATotal + partBTotal;
  const activeMilestones = BOQ_ITEMS.flatMap(item =>
    itemStates[item.id].milestones
      .filter(m => m.checked)
      .map(m => ({ item, m, amount: (item.hasQty && item.estimatedQty
        ? (parseFloat(itemStates[item.id].quotedCost) || 0) * (parseFloat(itemStates[item.id].measuredQty) || 0) / item.estimatedQty
        : (parseFloat(itemStates[item.id].quotedCost) || 0)) * (m.billedPct / 100) }))
  ).filter(x => x.amount > 0);

  return (
    <div>
      <h2 className="text-lg font-bold text-amber-400 mb-4 font-mono">Bill Summary — Review & Generate</h2>

      {/* Bill Header Info */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-xs font-mono">
        {[
          ['Bill No.', header.billNo],
          ['Bill Date', header.billDate],
          ['Allotment No.', header.allotmentNo],
          ['Client Ref.', header.clientRef || '—'],
          ['Part A Total', `₹${partATotal.toFixed(4)} Cr`],
          ['Part B Total', `₹${partBTotal.toFixed(4)} Cr`],
        ].map(([k, v]) => (
          <div key={k} className="bg-gray-900 border border-gray-800 rounded p-2">
            <p className="text-gray-500 text-xs mb-0.5">{k}</p>
            <p className={`font-semibold ${k.includes('Total') ? 'text-green-400' : 'text-gray-200'}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Line-by-line breakdown */}
      <div className="border border-gray-800 rounded overflow-hidden mb-6">
        <table className="w-full text-xs">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left py-2 px-3 text-gray-400">S.No.</th>
              <th className="text-left py-2 px-3 text-gray-400">Component</th>
              <th className="text-right py-2 px-3 text-gray-400">Est. Cost (Cr)</th>
              <th className="text-right py-2 px-3 text-gray-400">Quoted (Cr)</th>
              <th className="text-right py-2 px-3 text-gray-400">Milestone</th>
              <th className="text-right py-2 px-3 text-gray-400">Work Done (Cr)</th>
            </tr>
          </thead>
          <tbody>
            {activeMilestones.map((x, i) => (
              <tr key={i} className="border-t border-gray-900">
                <td className="py-2 px-3 text-gray-500 font-mono">{x.item.part}-{x.item.sno.toString().padStart(2,'0')}</td>
                <td className="py-2 px-3 text-gray-300">{x.item.name}</td>
                <td className="py-2 px-3 text-right text-teal-400 font-mono">{x.item.estimatedCost?.toFixed(2) ?? '—'}</td>
                <td className="py-2 px-3 text-right text-amber-400 font-mono">{parseFloat(itemStates[x.item.id].quotedCost)?.toFixed(5) ?? '—'}</td>
                <td className="py-2 px-3 text-right text-gray-400">
                  <span className="bg-gray-800 px-2 py-0.5 rounded text-xs">{x.m.label.split('(')[0].trim()} @{x.m.billedPct}%</span>
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-green-400">{x.amount.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-900 border-t-2 border-amber-800">
            <tr>
              <td colSpan={5} className="py-3 px-3 text-right font-bold text-gray-300">GRAND TOTAL</td>
              <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 text-base">₹{grandTotal.toFixed(4)} Cr</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amount in words */}
      <div className="bg-gray-900 border border-amber-800 rounded p-3 mb-6">
        <p className="text-xs text-gray-500 mb-1">Total Amount in Words</p>
        <p className="font-mono text-amber-300 font-semibold text-sm">
          Rs. {numberToWords(grandTotal)}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          (₹{grandTotal.toFixed(4)} Crores — Rounded to ₹{Math.round(grandTotal * 100) / 100} Cr)
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onGeneratePDF}
          className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-amber-100 font-bold rounded-lg transition-colors text-sm"
        >
          ⬇ Generate PDF (Landscape A4)
        </button>
        <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm">
          Save Draft
        </button>
      </div>
    </div>
  );
};

// ── Wizard Steps Config ──────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Header', icon: '📋' },
  { id: 2, label: 'Part A — Sewer', icon: '🔧' },
  { id: 3, label: 'Part B — Turnkey', icon: '🏗️' },
  { id: 4, label: 'Summary', icon: '📊' },
];

// ── Main Wizard Component ─────────────────────────────────────

const RaBillWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [header, setHeader] = useState<BillHeader>({
    billNo: 'RA-1',
    billDate: new Date().toISOString().split('T')[0],
    allotmentNo: 'CE/UEED/PS/01 OF 2025-26',
    allotmentDate: '2025-11-07',
    clientRef: 'CE/UEED/PS/2929-42 dated 07-11-2025',
    remarks: '',
  });
  const [itemStates, setItemStates] = useState<Record<string, LineItemState>>(buildInitialState);
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

  const updateItem = useCallback((id: string, patch: Partial<LineItemState>) => {
    setItemStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  // Save quoted rate back to BOQ database
  const saveQuotedRateToBoq = useCallback(async (id: string, rate: string) => {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed <= 0) return;
    try {
      setSaveStatus(s => ({ ...s, [id]: 'saving' }));
      await axios.patch(`/api/boq-items/${id}`, { quotedCost: parsed });
      setItemStates(prev => ({ ...prev, [id]: { ...prev[id], savedToBoq: true } }));
      setSaveStatus(s => ({ ...s, [id]: 'saved' }));
      setTimeout(() => setSaveStatus(s => ({ ...s, [id]: '' })), 3000);
    } catch (err) {
      setSaveStatus(s => ({ ...s, [id]: 'error' }));
      console.error('Failed to save quoted rate:', err);
    }
  }, []);

  const handleGeneratePDF = useCallback(async () => {
    try {
      const payload = {
        header,
        items: BOQ_ITEMS.map(item => ({
          ...item,
          state: itemStates[item.id],
          amount: calcLineAmount(item, itemStates[item.id]),
        })),
      };
      const res = await axios.post('/api/ra-bill/generate-pdf', payload, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `KIPL_${header.billNo}_${header.billDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  }, [header, itemStates]);

  const grandTotal = useMemo(() =>
    BOQ_ITEMS.reduce((s, i) => s + calcLineAmount(i, itemStates[i.id]), 0),
    [itemStates]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top Bar */}
      <div className="border-b border-gray-800 px-6 py-3 bg-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded text-gray-950 font-bold text-sm flex items-center justify-center">K</div>
          <div>
            <p className="text-sm font-bold text-gray-200">KIPL ProjectOS</p>
            <p className="text-xs text-gray-500">RA Bill Wizard — Dal Lake 38.5 MLD STP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Running Total</p>
          <p className="font-mono font-bold text-amber-400">₹{grandTotal.toFixed(4)} Cr</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {STEPS.map(s => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors relative
              ${step === s.id
                ? 'text-amber-400 border-b-2 border-amber-400 bg-gray-950'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            <span className="mr-1">{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto p-6">
        {step === 1 && <StepHeader header={header} onChange={setHeader} />}
        {step === 2 && <StepPartA itemStates={itemStates} onChange={updateItem} onSave={saveQuotedRateToBoq} />}
        {step === 3 && <StepPartB itemStates={itemStates} onChange={updateItem} onSave={saveQuotedRateToBoq} />}
        {step === 4 && <StepSummary header={header} itemStates={itemStates} onGeneratePDF={handleGeneratePDF} />}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-6 py-2 border border-gray-700 rounded text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => setStep(s => Math.min(4, s + 1))}
            disabled={step === 4}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm text-amber-100 font-semibold disabled:opacity-30 transition-colors"
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
};

export default RaBillWizard;
export { BOQ_ITEMS, SCHEDULE, calcLineAmount, buildInitialState, numberToWords };
