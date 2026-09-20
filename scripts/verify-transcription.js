// Complete transcription of all 4 bills

// 1. Bill 148-KB-NISHT (Date: 01/08/2026) - Nishat Site - Khakh Bajari @ 17.50
const bill_148 = [
  { date: '2026-07-30', veh: '5509', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
  { date: '2026-07-30', veh: '2439', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
  { date: '2026-07-30', veh: '1005', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
  { date: '2026-07-30', veh: '0011', mat: 'Khak Bajri', qty: 350, rate: 17.50, voucher: '' },
  { date: '2026-07-30', veh: '1471', mat: 'Khak Bajri', qty: 350, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '9360', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '0663', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '8759', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '5509', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '2439', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '9971', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
  { date: '2026-08-01', veh: '9340', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' }
];

// 2. Bill 150 (Date: 11/08/2026) - Shalimar Site - Over Gauge @ 30.00
const bill_150 = [
  { date: '2026-08-04', veh: '9971', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-04', veh: '5509', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '' },
  { date: '2026-08-04', veh: '7704', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-04', veh: '0848', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-04', veh: '0847', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-04', veh: '2439', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '' },
  { date: '2026-08-04', veh: '9340', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-05', veh: '9360', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '01' },
  { date: '2026-08-05', veh: '7704', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '03' },
  { date: '2026-08-05', veh: '9971', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '04' },
  { date: '2026-08-05', veh: '0848', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '07' },
  { date: '2026-08-05', veh: '0847', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '08' },
  { date: '2026-08-05', veh: '5509', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '05' },
  { date: '2026-08-05', veh: '2439', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '06' },
  { date: '2026-08-05', veh: '1471', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 350, rate: 30.00, voucher: '09' },
  { date: '2026-08-05', veh: '0011', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 350, rate: 30.00, voucher: '02' }
];

// 3. Bill 151 (Date: 11/08/2026) - Nishat Site - Dust @ 30.00
const bill_151 = [
  { date: '2026-08-06', veh: '7704', mat: 'Stone Dust / Crushed Sand', qty: 400, rate: 30.00, voucher: '16' },
  { date: '2026-08-06', veh: '5509', mat: 'Stone Dust / Crushed Sand', qty: 400, rate: 30.00, voucher: '13' }
];

// 4. Bill 149 (Date: 11/08/2026) - Nishat Site - Wet Mix (1 trip) & CTSB (48 trips) @ 30.00
// Page 1 (18 trips, 7100 cft, 213000):
const bill_149_p1 = [
  { date: '2026-07-17', veh: '2439', mat: 'Wet Mix Macadam (WMM)', qty: 375, rate: 30.00, voucher: '' },
  { date: '2026-08-06', veh: '0848', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '14' },
  { date: '2026-08-06', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '10' },
  { date: '2026-08-06', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '11' },
  { date: '2026-08-06', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '17' },
  { date: '2026-08-06', veh: '0847', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '12' },
  { date: '2026-08-06', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '15' },
  { date: '2026-08-07', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '20' },
  { date: '2026-08-07', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '19' },
  { date: '2026-08-07', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '18' },
  { date: '2026-08-07', veh: '8759', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '26' },
  { date: '2026-08-07', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '25' },
  { date: '2026-08-07', veh: '1005', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '22' },
  { date: '2026-08-07', veh: '5509', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '21' },
  { date: '2026-08-07', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '24' },
  { date: '2026-08-07', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '23' },
  { date: '2026-08-07', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '27' },
  { date: '2026-08-09', veh: '9886', mat: 'CTSB', qty: 600, rate: 30.00, voucher: '' }
];

// Page 2 (18 trips, 7200 cft, 216000):
const bill_149_p2 = [
  { date: '2026-08-09', veh: '0656', mat: 'CTSB', qty: 600, rate: 30.00, voucher: '' },
  { date: '2026-08-09', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-09', veh: '5509', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-09', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '35' },
  { date: '2026-08-09', veh: '8759', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-09', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '34' },
  { date: '2026-08-09', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '32' },
  { date: '2026-08-09', veh: '0847', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '30' },
  { date: '2026-08-09', veh: '1005', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '36' },
  { date: '2026-08-09', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '31' },
  { date: '2026-08-09', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '41' },
  { date: '2026-08-09', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
  { date: '2026-08-09', veh: '9360', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-10', veh: '0663', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-10', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '44' },
  { date: '2026-08-10', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-10', veh: '0848', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '48' },
  { date: '2026-08-10', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' }
];

// Page 3 (13 trips, 5050 cft, 151500):
const bill_149_p3 = [
  { date: '2026-08-10', veh: '9360', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-10', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-10', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-10', veh: '0847', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '49' },
  { date: '2026-08-11', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '1005', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '0848', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '52' },
  { date: '2026-08-11', veh: '9360', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
  { date: '2026-08-11', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '' }
];

console.log('Bill 148 Qty:', bill_148.reduce((s, r) => s + r.qty, 0), 'Amount:', bill_148.reduce((s, r) => s + r.qty * r.rate, 0));
console.log('Bill 150 Qty:', bill_150.reduce((s, r) => s + r.qty, 0), 'Amount:', bill_150.reduce((s, r) => s + r.qty * r.rate, 0));
console.log('Bill 151 Qty:', bill_151.reduce((s, r) => s + r.qty, 0), 'Amount:', bill_151.reduce((s, r) => s + r.qty * r.rate, 0));
const b149_all = [...bill_149_p1, ...bill_149_p2, ...bill_149_p3];
console.log('Bill 149 Qty:', b149_all.reduce((s, r) => s + r.qty, 0), 'Amount:', b149_all.reduce((s, r) => s + r.qty * r.rate, 0));
console.log('Total Trips across 4 bills:', bill_148.length + bill_150.length + bill_151.length + b149_all.length);
console.log('Grand Total Amount:', 80063 + 186000 + 24000 + 580500);

const allTrips = [
  ...bill_148.map(t => ({ ...t, bill: '148-KB-NISHT', zone: '30 MLD STP Ishbar Nishat' })),
  ...bill_150.map(t => ({ ...t, bill: '150', zone: 'Shalimar Site' })),
  ...bill_151.map(t => ({ ...t, bill: '151', zone: '30 MLD STP Ishbar Nishat' })),
  ...b149_all.map(t => ({ ...t, bill: '149', zone: '30 MLD STP Ishbar Nishat' }))
];

const dateMap = {};
allTrips.forEach(t => {
  if (!dateMap[t.date]) dateMap[t.date] = { count: 0, mats: {} };
  dateMap[t.date].count++;
  if (!dateMap[t.date].mats[t.mat]) dateMap[t.date].mats[t.mat] = 0;
  dateMap[t.date].mats[t.mat] += t.qty;
});

console.log('\n--- DATE-WISE SUMMARY FOR SITE DIARIES ---');
Object.keys(dateMap).sort().forEach(d => {
  console.log(`${d}: ${dateMap[d].count} trips | ${JSON.stringify(dateMap[d].mats)}`);
});
