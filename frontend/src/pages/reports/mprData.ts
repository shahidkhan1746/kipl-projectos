export type MprAudience = 'head-office' | 'ueed'

export function reportingPeriod(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid reporting period')
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return { from: `${prefix}-01`, to: `${prefix}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}` }
}

export function datedInPeriod(value: unknown, from: string, to: string) {
  const date = String(value ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= from && date <= to
}

export function billsThrough(bills: any[], to: string) {
  return bills.filter(b => datedInPeriod(b.billDate, '2000-01-01', to))
}

export function displayNumber(value: unknown, suffix = '') {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? 'Not recorded' : `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}${suffix}`
}
