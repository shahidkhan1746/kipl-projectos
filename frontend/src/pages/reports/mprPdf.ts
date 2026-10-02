import { jsPDF } from 'jspdf'
import { billsThrough, datedInPeriod, displayNumber, reportingPeriod, type MprAudience } from './mprData'
import type { MprPhoto } from './mprImages'

export interface MprInput {
  audience?: MprAudience; projectId?: string; month: number; year: number; raBillRef?: string
  contractValue?: string | number | null
  logo?: string
  photos?: MprPhoto[]
  wbsDash: any; tasks: any[]; eot: any; diary: any[]; hr: any; raBills: any[]; liaison: any
  notes?: Partial<Record<'summary' | 'lookahead' | 'quality' | 'procurement' | 'staff' | 'decisions' | 'evidence', string>>
}
const NAVY = '#17243b', MUTED = '#59677b'
const money = (v: unknown) => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? 'Not recorded' : `Rs ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const clean = (v: unknown) => String(v ?? 'Not recorded').replace(/[^\x20-\x7E\n]/g, '-')

export function buildMpr(d: MprInput) {
  const internal = d.audience === 'head-office'
  const period = reportingPeriod(d.year, d.month)
  const pdf = new jsPDF({ unit:'mm', format:'a4' })
  const width = 182, left = 14, bottom = 278
  let y = 43
  const header = () => {
    if (d.logo) pdf.addImage(d.logo,'PNG',left,9,19,19)
    pdf.setTextColor(NAVY); pdf.setFont('helvetica','bold'); pdf.setFontSize(12)
    pdf.text('KHILARI INFRASTRUCTURE PVT. LTD.',d.logo ? 38 : left,16)
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(MUTED)
    pdf.text(internal ? 'HEAD OFFICE | PROJECT DELIVERY REVIEW' : 'UEED | MONTHLY PROGRESS AND PROGRAMME',d.logo ? 38 : left,22)
    pdf.text(`${d.year}-${String(d.month).padStart(2,'0')}`,196,30,{align:'right'})
    pdf.setDrawColor('#d4dde6'); pdf.line(left,33,196,33)
    y = 43
  }
  const page = () => { pdf.addPage(); header() }
  const ensure = (height: number) => { if (y + height > bottom) page() }
  const paragraph = (value: unknown) => {
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(MUTED)
    const lines: string[] = pdf.splitTextToSize(clean(value),width)
    for (const line of lines) { ensure(5); pdf.text(line,left,y); y += 5 }
    y += 3
  }
  const section = (title: string) => {
    ensure(40); pdf.setFillColor('#eef2f7'); pdf.rect(left,y-3,width,9,'F')
    pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(NAVY)
    pdf.text(title,left+3,y+3); y += 13
  }
  const table = (heads: string[], widths: number[], rows: unknown[][]) => {
    const head = () => {
      pdf.setFont('helvetica','bold'); pdf.setFontSize(8)
      const cells = heads.map((h,i) => pdf.splitTextToSize(h,widths[i]-4) as string[])
      const height = Math.max(...cells.map(c => c.length))*4+4
      pdf.setFillColor(NAVY); pdf.rect(left,y-3,width,height,'F'); pdf.setTextColor('#ffffff')
      let x = left
      cells.forEach((c,i) => { pdf.text(c,x+2,y+1); x += widths[i] }); y += height
    }
    ensure(25); head()
    const data = rows.length ? rows : [['No records available.', ...heads.slice(1).map(() => '')]]
    for (const row of data) {
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8)
      const cells = heads.map((_,i) => pdf.splitTextToSize(clean(row[i] ?? ''),widths[i]-4) as string[])
      const count = Math.max(...cells.map(c => c.length))
      for (let offset = 0; offset < count;) {
        if (y+9 > bottom) { page(); head() }
        const take = Math.min(count-offset, Math.max(1,Math.floor((bottom-y-4)/4)))
        const height = take*4+4
        pdf.setFillColor('#f4f6f9'); pdf.rect(left,y-3,width,height,'F')
        pdf.setTextColor('#334155'); pdf.setFont('helvetica','normal'); pdf.setFontSize(8)
        let x = left
        cells.forEach((c,i) => { pdf.text(c.slice(offset,offset+take),x+2,y+1); x += widths[i] })
        y += height; offset += take
      }
    }
    y += 7
  }
  const narrative = (title: string, value?: string) => { section(title); paragraph(value?.trim() || 'Not supplied. Complete and verify before issuing the report.') }
  header()
  // A presentation cover separates project identity from detailed data controls.
  pdf.setFont('helvetica','bold'); pdf.setTextColor(NAVY); pdf.setFontSize(30)
  pdf.text(['MONTHLY','PROGRESS REPORT'],left,75)
  pdf.setFontSize(14); pdf.setFont('helvetica','normal'); pdf.setTextColor(MUTED)
  pdf.text(internal ? 'Head-office management review' : 'Client submission / UEED',left,105)
  pdf.setFont('helvetica','bold'); pdf.setTextColor(NAVY); pdf.setFontSize(18)
  pdf.text(['Dal Lake Sewerage Scheme','Uncovered Areas, Kashmir'],left,138)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(11); pdf.setTextColor(MUTED)
  pdf.text(`Reporting period  ${period.from} to ${period.to}`,left,165)
  pdf.text('EPC turnkey works | STP, IPS and sewer network',left,174)
  pdf.setFontSize(9)
  pdf.text(internal ? 'INTERNAL - NOT FOR CLIENT CIRCULATION' : 'DRAFT - FORMAT SUBJECT TO EIC APPROVAL',left,196)
  pdf.text(`Photographic evidence: ${(d.photos ?? []).length} attached images`,left,205)
  pdf.text('Prepared by Khilari Infrastructure Pvt. Ltd.',left,246)
  page()
  section('01 / Document control and reporting basis')
  table(['Item','Recorded basis'],[48,134],[
    ['Project ID',d.projectId], ['Reporting period',`${period.from} to ${period.to}`],
    ['Generated',new Date().toISOString()], ['Revision / approval','Working draft - not certified or approved'],
    ['RA bill reference',d.raBillRef], ['Contract value',money(d.contractValue)],
    ['Capacity / identity','Reconcile 30 / 38.5 MLD and approved contract particulars before issue. No capacity assumed.'],
    ['Programme dates (live)',`${clean(d.wbsDash?.contractStart)} to ${clean(d.wbsDash?.contractEnd)} - verify written commencement / approved programme`],
    ['Source boundary','Diary and bills are period-filtered. WBS, HR, liaison and EOT are current context, not certified month-end snapshots.'],
  ])
  paragraph(internal ? 'Internal management review. Staff contributions and commercial decisions are excluded from the UEED export.' : 'Clause 34: monthly report due by the 5th; EIC format approval required. Clause 23.2: MPR, requisite photographs and tax invoices accompany RA bills. This draft does not establish approval or submission.')
  narrative('02 / Executive summary and work achieved',d.notes?.summary)
  section('03 / Programme and physical progress - CURRENT CONTEXT')
  paragraph(`Live physical progress: ${displayNumber(d.wbsDash?.overallProgress,'%')}. Not certified as at ${period.to}. Schedule variance requires an approved time-phased baseline and period actuals; elapsed time is not planned work.`)
  table(['WBS','Activity / workstream','Planned finish','Live progress','Live status'],[18,77,29,27,31],(d.tasks ?? []).filter(t => Number(t.level) === 1).map(t => [t.wbsCode,t.title,String(t.plannedEnd ?? 'Not recorded').slice(0,10),displayNumber(t.progressPct,'%'),t.status]))
  paragraph('Represent STP, IPS and sewer-network execution as parallel workstreams. Attach measured previous, current-month and cumulative quantities; live percentages cannot replace certified period achievement.')
  section('04 / Billing register - through reporting cutoff')
  const bills = billsThrough(d.raBills ?? [],period.to)
  table(['Bill reference','Bill date','Gross billed','Retention','Net payable'],[32,26,42,40,42],bills.map(b => [b.billNo,String(b.billDate).slice(0,10),money(b.grossAmount),money(b.retentionAmount),money(b.netPayable)]))
  const total = (field: string, rows: any[]) => rows.every(b => b[field] !== null && b[field] !== undefined && b[field] !== '' && Number.isFinite(Number(b[field]))) ? money(rows.reduce((s,b) => s+Number(b[field]),0)) : 'Incomplete amounts - verify register'
  table(['Measure','Value / definition'],[65,117],[
    ['Gross billed through cutoff',total('grossAmount',bills)],
    ['Gross billed in month',total('grossAmount',bills.filter(b => datedInPeriod(b.billDate,period.from,period.to)))],
    ['Net payable through cutoff',`${total('netPayable',bills)} - not proof of receipt`],
    ['Certified / collected / outstanding','Reconcile dated certification and payment records separately. Not inferred from bill totals.'],
    ['Excluded undated bills',String((d.raBills ?? []).filter(b => !datedInPeriod(b.billDate,'2000-01-01','2100-12-31')).length)],
  ])
  paragraph('Bill records can be revised after month-end. Billing is not physical progress; certification and payment are not inferred.')
  section('05 / Period site diary and resources')
  const diary = (d.diary ?? []).filter(e => datedInPeriod(e.date,period.from,period.to))
  table(['Date','Recorded labour','Weather / stoppage','Recorded work items'],[27,32,51,72],diary.map(e => [String(e.date).slice(0,10),displayNumber(e.labourTotal),`${e.weatherMorning ?? 'Not recorded'} / ${e.weatherAfternoon ?? 'Not recorded'}${e.workStoppedWeather ? ' - stopped' : ''}`,Array.isArray(e.workDone) ? JSON.stringify(e.workDone) : 'Not recorded']))
  paragraph('Labour counts are diary-entry observations, not person-days or verified average workforce. Missing dates do not mean zero work.')
  if (internal) {
    paragraph(`Staff on rolls (live): ${displayNumber(d.hr?.totalEmployees)}. Not a month-end staff snapshot.`)
    narrative('Staff contributions and resource deployment',d.notes?.staff)
    narrative('Head-office decisions and commercial review',d.notes?.decisions)
  }
  narrative('Procurement, manufacturing and installation',d.notes?.procurement)
  narrative('Quality, testing and safety',d.notes?.quality)
  section('Approvals and hindrances - CURRENT CONTEXT')
  table(['Type','Description','Recorded delay'],[27,125,30],[
    ...(d.eot?.approvalDelays ?? []).map((e: any) => ['Approval',e.subject ?? e.ref,displayNumber(e.delayDays,' days')]),
    ...(d.eot?.taskDelays ?? []).map((e: any) => ['Task',e.subject ?? e.ref,displayNumber(e.delayDays,' days')]),
  ])
  paragraph(`Live liaison files: ${displayNumber(d.liaison?.total)}. Not a certified period hindrance register. MPR entries do not replace formal notices / EOT applications or grant extensions.`)
  narrative('Next-month measurable targets and recovery actions',d.notes?.lookahead)
  narrative('Evidence register and photograph references',d.notes?.evidence)
  if (d.photos?.length) {
    page(); section('Site photographs / photographic evidence')
    d.photos.forEach((photo,index) => {
      if (index > 0) { page(); section('Site photographs / continued') }
      const top = y
      const scale = Math.min(width/photo.width,155/photo.height)
      const w = photo.width*scale, h = photo.height*scale
      pdf.setFillColor('#f4f6f9'); pdf.rect(left,top,width,157,'F')
      pdf.addImage(photo.dataUrl,'JPEG',left+(width-w)/2,top+(157-h)/2,w,h)
      y += 165
      pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(NAVY)
      pdf.text(`PHOTO ${String(index+1).padStart(2,'0')}`,left,y)
      y += 5
      paragraph(`${photo.date || 'Date not supplied'} | ${photo.location || 'Location not supplied'}\n${photo.caption || 'Caption not supplied'}`)
    })
    page()
  }
  section('Pre-issue review checklist')
  table(['Check','Required action'],[54,128],[
    ['Contract particulars','Verify project identity, capacity, LOA and written contractual dates.'],
    ['Programme / quantities','Attach approved CPM, planned-progress curve and measured period quantities.'],
    ['Photographs',`${(d.photos ?? []).length} images embedded. Verify month-end dates under Clause 17.5 and requisite RA-bill photo sets under Clause 23.2.`],
    ['Financial evidence','Reconcile billing, certification, receipts and tax invoices.'],
    ['Review / approval',internal ? 'Authorised site and head-office review / sign-off.' : 'Contractor review; confirm EIC format approval and record actual submission separately.'],
  ])
  paragraph('Prepared by: __________________  Reviewed by: __________________  Date: __________')
  for (let p = 1; p <= pdf.getNumberOfPages(); p++) {
    pdf.setPage(p); pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(MUTED)
    pdf.text(internal ? 'KIPL ProjectOS | Internal draft' : 'KIPL ProjectOS | Proposed UEED format - not approved',left,289)
    pdf.text(`${p} / ${pdf.getNumberOfPages()}`,196,289,{align:'right'})
  }
  return pdf
}
export async function generateMPR(d: MprInput) {
  const response = await fetch('/assets/kipl-logo.png')
  if (!response.ok) throw new Error('Company logo could not be loaded; please retry.')
  const blob = await response.blob()
  const logo = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read logo')); reader.readAsDataURL(blob) })
  buildMpr({ ...d, logo }).save(`KIPL-MPR-${d.audience ?? 'ueed'}-${d.year}-${String(d.month).padStart(2,'0')}.pdf`)
}
