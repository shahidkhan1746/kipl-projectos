import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import { MaterialRegister } from '../../material-register/material-register.entity';
import { materialKey, canonicalMaterialName } from '../../material-register/material-key';
import { valueOf } from '../../material-register/valuation';

/**
 * Material stock, procurement and consumption, for the assistant.
 *
 * There was no materials tool at all. The assistant could be asked about
 * vendors, accounting, WBS and the site diary, and had no way to answer "how
 * much cement have we taken in", let alone at what cost — the register held
 * quantities with no rates, and the rates sat on purchase orders with nothing
 * joining them.
 *
 * Everything here reads the register, which is the signed Clause 55 record, so
 * the assistant's answer and the client's register are the same numbers.
 */

const rows = (dataSource: DataSource, projectId: string) =>
  dataSource.getRepository(MaterialRegister).find({
    where: projectId ? { projectId } : {},
    order: { date: 'DESC' },
  });

/** Quantities in different units are never added. See material-register. */
interface UnitBucket {
  unit: string
  rows: MaterialRegister[]
}

function groupByMaterialAndUnit(all: MaterialRegister[]) {
  const out = new Map<string, { display: string; units: Map<string, UnitBucket> }>();
  for (const r of all) {
    const key = materialKey(r.material);
    let entry = out.get(key);
    if (!entry) {
      entry = { display: canonicalMaterialName(r.material), units: new Map() };
      out.set(key, entry);
    }
    const unit = (r.unit ?? '').trim() || 'unspecified';
    const bucket = entry.units.get(unit) ?? { unit, rows: [] };
    bucket.rows.push(r);
    entry.units.set(unit, bucket);
  }
  return out;
}

const sum = (list: MaterialRegister[], field: 'receivedQty' | 'consumedQty') =>
  +list.reduce((t, r) => t + (Number(r[field]) || 0), 0).toFixed(3);

const inRange = (r: MaterialRegister, from?: string, to?: string) =>
  (!from || String(r.date) >= from) && (!to || String(r.date) <= to);

export const createMaterialTools = (dataSource: DataSource, projectId: string) => ({
  material_stock_summary: tool(<any>{
    description:
      'Stock position for every material on the project: quantity received, consumed and remaining, ' +
      'with procurement value and weighted average rate where rates are recorded. ' +
      'Use for "how much cement do we have", "what have we spent on steel", "what is our stock worth".',
    parameters: z.object({
      material: z.string().optional().describe('Limit to one material, e.g. "Khak Bajri". Partial names match.'),
      from: z.string().optional().describe('Start date, YYYY-MM-DD.'),
      to: z.string().optional().describe('End date, YYYY-MM-DD.'),
    }),
    execute: async (args: any) => {
      const wanted = (args?.material || '').trim().toLowerCase();
      const all = (await rows(dataSource, projectId)).filter(r => inRange(r, args?.from, args?.to));
      const grouped = groupByMaterialAndUnit(all);

      const result: any[] = [];
      for (const entry of grouped.values()) {
        if (wanted && !entry.display.toLowerCase().includes(wanted)) continue;
        for (const bucket of entry.units.values()) {
          const received = sum(bucket.rows, 'receivedQty');
          const consumed = sum(bucket.rows, 'consumedQty');
          const valuation = valueOf(bucket.rows);
          result.push({
            material: entry.display,
            unit: bucket.unit,
            received,
            consumed,
            balance: +(received - consumed).toFixed(3),
            movements: bucket.rows.length,
            procurementValueInr: valuation.receivedValue,
            averageRateInr: valuation.averageRate,
            consumedValueInr: valuation.consumedValue,
            stockValueInr: valuation.stockValue,
            // Stated so the assistant can qualify a partial answer instead of
            // presenting a third of the deliveries as the whole spend.
            shareOfQuantityPriced: valuation.rateCoverage,
            quantityWithNoRate: valuation.unvaluedQty,
            unitsRecordedForThisMaterial: [...entry.units.keys()],
          });
        }
      }
      if (!result.length) {
        return { note: wanted ? `No register entries for a material matching "${args.material}".` : 'The material register is empty for this project.' };
      }
      return result.sort((a, b) => b.procurementValueInr - a.procurementValueInr);
    },
  }),

  material_procurement_history: tool(<any>{
    description:
      'Individual material receipts: date, quantity, rate, value, supplier, invoice and challan, and what it was brought in for. ' +
      'Use for "when did we receive steel and from whom", "show me all cement deliveries in August".',
    parameters: z.object({
      material: z.string().optional().describe('Limit to one material. Partial names match.'),
      supplier: z.string().optional().describe('Limit to one supplier. Partial names match.'),
      from: z.string().optional().describe('Start date, YYYY-MM-DD.'),
      to: z.string().optional().describe('End date, YYYY-MM-DD.'),
      limit: z.number().optional().default(50),
    }),
    execute: async (args: any) => {
      const wanted = (args?.material || '').trim().toLowerCase();
      const supplier = (args?.supplier || '').trim().toLowerCase();
      const all = await rows(dataSource, projectId);
      const receipts = all
        .filter(r => Number(r.receivedQty) > 0)
        .filter(r => inRange(r, args?.from, args?.to))
        .filter(r => !wanted || String(r.material).toLowerCase().includes(wanted))
        .filter(r => !supplier || String(r.supplierName ?? '').toLowerCase().includes(supplier))
        .slice(0, Math.min(Number(args?.limit) || 50, 200));

      if (!receipts.length) return { note: 'No receipts match those filters.' };

      return receipts.map(r => ({
        date: r.date,
        material: r.material,
        quantity: Number(r.receivedQty),
        unit: r.unit,
        rateInr: r.rate == null ? null : Number(r.rate),
        valueInr: r.amount == null ? null : Number(r.amount),
        supplier: r.supplierName,
        invoiceNo: r.invoiceNo,
        challanNo: r.challanNo,
        purpose: r.purpose,
        receivedAgainstGrn: r.grnId ? true : false,
        contractorRep: r.contractorRep,
        clientRep: r.ueedRep,
      }));
    },
  }),

  material_consumption: tool(<any>{
    description:
      'Material consumption: what was issued, when, against which WBS activity and for what purpose, with its value at the weighted average rate. ' +
      'Use for "where did the cement go", "what have we consumed against WBS 2.3", "how much steel was used in September".',
    parameters: z.object({
      material: z.string().optional().describe('Limit to one material. Partial names match.'),
      wbsCode: z.string().optional().describe('Limit to one WBS activity, e.g. "2.3".'),
      from: z.string().optional().describe('Start date, YYYY-MM-DD.'),
      to: z.string().optional().describe('End date, YYYY-MM-DD.'),
    }),
    execute: async (args: any) => {
      const wanted = (args?.material || '').trim().toLowerCase();
      const wbs = (args?.wbsCode || '').trim().toLowerCase();
      const all = await rows(dataSource, projectId);

      // Average rate comes from ALL receipts of the material, not only those in
      // the window: a bag issued in September was bought earlier, and pricing
      // it on September's deliveries alone would value it at whatever happened
      // to arrive that month.
      const ratesByMaterial = new Map<string, number | null>();
      for (const [key, entry] of groupByMaterialAndUnit(all)) {
        const biggest = [...entry.units.values()].sort((a, b) => b.rows.length - a.rows.length)[0];
        ratesByMaterial.set(key, biggest ? valueOf(biggest.rows).averageRate : null);
      }

      const issues = all
        .filter(r => Number(r.consumedQty) > 0)
        .filter(r => inRange(r, args?.from, args?.to))
        .filter(r => !wanted || String(r.material).toLowerCase().includes(wanted))
        .filter(r => !wbs || String(r.wbsCode ?? '').toLowerCase().includes(wbs));

      if (!issues.length) {
        return {
          note: 'No consumption is recorded for those filters. Material consumption is entered in the Material Log; if nothing is recorded, stock will read as fully on hand.',
        };
      }

      const rate = (r: MaterialRegister) => ratesByMaterial.get(materialKey(r.material)) ?? null;
      return {
        entries: issues.map(r => ({
          date: r.date,
          material: r.material,
          quantity: Number(r.consumedQty),
          unit: r.unit,
          wbsCode: r.wbsCode,
          purpose: r.purpose,
          valueAtAverageRateInr: rate(r) == null ? null : +(Number(r.consumedQty) * rate(r)!).toFixed(2),
        })),
        totalQuantityByMaterial: [...new Set(issues.map(r => canonicalMaterialName(r.material)))].map(name => ({
          material: name,
          quantity: sum(issues.filter(r => materialKey(r.material) === materialKey(name)), 'consumedQty'),
        })),
      };
    },
  }),
});
