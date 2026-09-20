jest.mock('ai', () => ({ tool: (config: any) => config }));

import { createMaterialTools } from './material.tool'

const row = (o: any) => ({
  projectId: 'P1', date: '2026-09-01', material: 'Cement OPC 53', unit: 'Bags',
  receivedQty: 0, consumedQty: 0, rate: null, amount: null,
  supplierName: null, invoiceNo: null, challanNo: null, purpose: null,
  wbsCode: null, grnId: null, contractorRep: null, ueedRep: null, ...o,
})

const toolsOver = (rows: any[]) => createMaterialTools(
  { getRepository: () => ({ find: async () => rows }) } as any,
  'P1',
)

const run = (t: any, args: any = {}) => (t as any).execute(args)

describe('material_stock_summary', () => {
  const register = [
    row({ material: 'Cement OPC 53', receivedQty: 500, rate: 420, amount: 210000, date: '2026-08-01' }),
    row({ material: 'Cement OPC 53', receivedQty: 300, rate: 440, amount: 132000, date: '2026-09-01' }),
    row({ material: 'Cement OPC 53', consumedQty: 200, date: '2026-09-10' }),
    row({ material: 'Khak Bajri', unit: 'cft', receivedQty: 4200, date: '2025-12-26' }),
  ]

  it('answers how much of each material is on hand', async () => {
    const out = await run(toolsOver(register).material_stock_summary);
    const cement = out.find((r: any) => r.material === 'Cement OPC 53');
    expect(cement.received).toBe(800);
    expect(cement.consumed).toBe(200);
    expect(cement.balance).toBe(600);
  })

  it('answers what it cost', async () => {
    const out = await run(toolsOver(register).material_stock_summary);
    const cement = out.find((r: any) => r.material === 'Cement OPC 53');
    expect(cement.procurementValueInr).toBe(342000);
    expect(cement.averageRateInr).toBe(427.5);
    expect(cement.stockValueInr).toBe(256500);
  })

  // A partial answer presented as a whole one is how a spend figure becomes
  // wrong without anybody noticing.
  it('says how much of the quantity is priced at all', async () => {
    const out = await run(toolsOver(register).material_stock_summary);
    const bajri = out.find((r: any) => r.material === 'Khak Bajri');
    expect(bajri.shareOfQuantityPriced).toBe(0);
    expect(bajri.procurementValueInr).toBe(0);
    expect(bajri.averageRateInr).toBeNull();
  })

  it('never adds quantities in different units together', async () => {
    const out = await run(toolsOver([
      row({ material: 'Khak Bajri', unit: 'cft', receivedQty: 400 }),
      row({ material: 'Khak Bajri', unit: 'KG', receivedQty: 400 }),
    ]).material_stock_summary);
    expect(out).toHaveLength(2);
    expect(out.every((r: any) => r.received === 400)).toBe(true);
    expect(out[0].unitsRecordedForThisMaterial).toEqual(['cft', 'KG']);
  })

  it('folds spelling variants into one material', async () => {
    const out = await run(toolsOver([
      row({ material: 'Khak Bajri', unit: 'cft', receivedQty: 400 }),
      row({ material: ' khak bajri ', unit: 'cft', receivedQty: 400 }),
    ]).material_stock_summary);
    expect(out).toHaveLength(1);
    expect(out[0].received).toBe(800);
  })

  it('filters to one material on a partial name', async () => {
    const out = await run(toolsOver(register).material_stock_summary, { material: 'cement' });
    expect(out.every((r: any) => r.material.includes('Cement'))).toBe(true);
  })

  it('honours a date window', async () => {
    const out = await run(toolsOver(register).material_stock_summary, { from: '2026-09-01' });
    const cement = out.find((r: any) => r.material === 'Cement OPC 53');
    expect(cement.received).toBe(300);
  })

  it('says so rather than returning nothing when there is no match', async () => {
    const out = await run(toolsOver(register).material_stock_summary, { material: 'plutonium' });
    expect(out.note).toContain('plutonium');
  })
})

describe('material_procurement_history', () => {
  const register = [
    row({ receivedQty: 500, rate: 420, amount: 210000, supplierName: 'Sapcon Steels Jammu', invoiceNo: 'GSTSI2627/904', challanNo: 'JK18D3699', purpose: 'STP raft pour' }),
    row({ consumedQty: 100 }),
  ]

  it('returns receipts with supplier, papers and purpose', async () => {
    const out = await run(toolsOver(register).material_procurement_history);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      quantity: 500, rateInr: 420, valueInr: 210000,
      supplier: 'Sapcon Steels Jammu', invoiceNo: 'GSTSI2627/904', purpose: 'STP raft pour',
    });
  })

  it('leaves consumption out of a procurement question', async () => {
    const out = await run(toolsOver(register).material_procurement_history);
    expect(out.every((r: any) => r.quantity > 0)).toBe(true);
    expect(out).toHaveLength(1);
  })

  it('filters by supplier', async () => {
    expect((await run(toolsOver(register).material_procurement_history, { supplier: 'sapcon' }))).toHaveLength(1);
    expect((await run(toolsOver(register).material_procurement_history, { supplier: 'nobody' })).note).toBeDefined();
  })

  it('caps how much it returns', async () => {
    const many = Array.from({ length: 500 }, () => row({ receivedQty: 10, rate: 5 }));
    const out = await run(toolsOver(many).material_procurement_history, { limit: 1000 });
    expect(out.length).toBeLessThanOrEqual(200);
  })
})

describe('material_consumption', () => {
  const register = [
    row({ receivedQty: 500, rate: 420, amount: 210000, date: '2026-08-01' }),
    row({ receivedQty: 300, rate: 440, amount: 132000, date: '2026-09-01' }),
    row({ consumedQty: 200, wbsCode: '2.3', purpose: 'Aeration tank walls', date: '2026-09-10' }),
  ]

  it('says where the material went', async () => {
    const out = await run(toolsOver(register).material_consumption);
    expect(out.entries[0]).toMatchObject({ quantity: 200, wbsCode: '2.3', purpose: 'Aeration tank walls' });
  })

  // Pricing September's issue on September's deliveries alone would value it at
  // whatever happened to arrive that month.
  it('values an issue at the average of every receipt, not the ones in the window', async () => {
    const out = await run(toolsOver(register).material_consumption, { from: '2026-09-05' });
    expect(out.entries[0].valueAtAverageRateInr).toBe(85500); // 200 x 427.50
  })

  it('filters to one WBS activity', async () => {
    expect((await run(toolsOver(register).material_consumption, { wbsCode: '2.3' })).entries).toHaveLength(1);
    expect((await run(toolsOver(register).material_consumption, { wbsCode: '9.9' })).note).toBeDefined();
  })

  it('totals consumption per material', async () => {
    const out = await run(toolsOver(register).material_consumption);
    expect(out.totalQuantityByMaterial).toEqual([{ material: 'Cement OPC 53', quantity: 200 }]);
  })

  // Otherwise the assistant reports "no consumption" as though none happened,
  // when the truth is that none has been entered.
  it('explains an empty result rather than implying nothing was used', async () => {
    const out = await run(toolsOver([row({ receivedQty: 500 })]).material_consumption);
    expect(out.note).toContain('entered in the Material Log');
  })
})
