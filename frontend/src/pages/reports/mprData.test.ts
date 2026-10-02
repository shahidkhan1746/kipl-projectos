import { describe, expect, it } from 'vitest'
import { billsThrough, displayNumber, reportingPeriod } from './mprData'
import { buildMpr, type MprInput } from './mprPdf'

const input: MprInput = { month:9, year:2026, projectId:'test-project', wbsDash:{}, tasks:[], eot:null, diary:[], hr:null, raBills:[], liaison:null }
describe('MPR reporting boundaries', () => {
  it('includes the final calendar day without timezone conversion', () => {
    expect(reportingPeriod(2026,9)).toEqual({ from:'2026-09-01', to:'2026-09-30' })
    expect(reportingPeriod(2028,2).to).toBe('2028-02-29')
    expect(reportingPeriod(2026,12).to).toBe('2026-12-31')
  })
  it('rejects invalid periods', () => { expect(() => reportingPeriod(2026,13)).toThrow() })
  it('excludes future and undated bills, includes cutoff-day bills', () => {
    expect(billsThrough([{billDate:'2026-09-30'},{billDate:'2026-10-01'},{billDate:null}], '2026-09-30')).toEqual([{billDate:'2026-09-30'}])
  })
  it('distinguishes absent numbers from genuine zero', () => {
    expect(displayNumber(undefined,'%')).toBe('Not recorded')
    expect(displayNumber(0,'%')).toBe('0%')
  })
})
describe('audience-specific PDF exports', () => {
  it('does not include internal commentary in client exports', () => {
    const pdf = buildMpr({ ...input, audience:'ueed', notes:{staff:'SECRETSTAFF',decisions:'SECRETCOMMERCIAL'} }).output()
    expect(pdf).not.toContain('SECRETSTAFF')
    expect(pdf).not.toContain('SECRETCOMMERCIAL')
    expect(pdf).toContain('FORMAT SUBJECT TO EIC APPROVAL')
    expect(pdf).toContain('Clause 23.2')
    expect(pdf).not.toContain('Clause 23.3')
  })
  it('includes internal sections only in the head-office report', () => {
    expect(buildMpr({ ...input, audience:'head-office', notes:{staff:'STAFFDELIVERABLE'} }).output()).toContain('STAFFDELIVERABLE')
  })
  it('retains the end of exceptionally long text across pages', () => {
    const pdf = buildMpr({ ...input, tasks:[{level:1,title:'Long activity '.repeat(600)+'ENDMARKER'}] })
    expect(pdf.getNumberOfPages()).toBeGreaterThan(4)
    expect(pdf.output()).toContain('ENDMARKER')
  })
})
