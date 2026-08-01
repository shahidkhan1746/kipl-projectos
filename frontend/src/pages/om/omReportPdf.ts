import { jsPDF } from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────────
// Monthly O&M Report — plant performance, effluent compliance and breakdown
// register for a month. A4 portrait, client-side via jsPDF.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LIMITS = { outBod:10, outCod:50, outTss:10, outPhMin:6.5, outPhMax:9, outFecalColiform:100, outAmmN:5, outTotalN:10, outTotalP:1 }
const PROJECT = { name:'38.5 MLD SBR STP — Dal Lake Sewerage Scheme, Nishat', client:'J&K UEED / LCMA', contractor:'Khilari Infrastructure Pvt. Ltd.' }
const NAVY = '#0a1e28', MUTED = '#6b8592', GREEN = '#047857', RED = '#b91c1c'
const inr = (n:any) => 'Rs ' + (Number(n)||0).toLocaleString('en-IN', { maximumFractionDigits:0 })

export interface OmReportInput { month:number; year:number; logs:any[]; events:any[] }

export async function generateOmReport(d: OmReportInput) {
  const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, H = 297, M = 14, CW = W - 2*M
  const monthLabel = `${MONTHS[d.month-1]} ${d.year}`
  let y = 0

  const header = () => {
    pdf.setFillColor(NAVY); pdf.rect(0,0,W,20,'F')
    pdf.setTextColor('#fff'); pdf.setFont('helvetica','bold'); pdf.setFontSize(11)
    pdf.text('MONTHLY O&M REPORT', M, 9)
    pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9DB4C6')
    pdf.text(PROJECT.name, M, 15)
    pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor('#fff')
    pdf.text(monthLabel, W-M, 9, { align:'right' })
    y = 28
  }
  const footer = () => {
    pdf.setDrawColor('#dbe6e0'); pdf.line(M,H-12,W-M,H-12)
    pdf.setFontSize(7); pdf.setTextColor(MUTED)
    pdf.text('KIPL ProjectOS — STP O&M performance report', M, H-8)
    pdf.text('Page '+pdf.getNumberOfPages(), W-M, H-8, { align:'right' })
  }
  const ensure = (n:number) => { if (y+n > H-16) { footer(); pdf.addPage(); header() } }
  const section = (t:string) => { ensure(12); pdf.setFillColor('#f1f5f9'); pdf.rect(M,y,CW,7,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(9.5); pdf.setTextColor(NAVY); pdf.text(t.toUpperCase(), M+2, y+5); y += 11 }

  // ── month aggregates ────────────────────────────────────────────────────────
  const logs = d.logs ?? []
  const withEff = logs.filter(l => l.outBod!=null || l.outCod!=null || l.outTss!=null)
  const compliant = withEff.filter(l => (l.breaches ?? []).length === 0).length
  const compliancePct = withEff.length ? Math.round(compliant/withEff.length*100) : null
  const avg = (k:string) => { const v = logs.map(l=>l[k]).filter(x=>x!=null).map(Number); return v.length ? +(v.reduce((s,x)=>s+x,0)/v.length).toFixed(1) : null }
  const sum = (k:string) => logs.reduce((s,l)=>s+(Number(l[k])||0),0)

  const from = `${d.year}-${String(d.month).padStart(2,'0')}-01`
  const to = new Date(d.year, d.month, 0).toISOString().split('T')[0]
  const monthEvents = (d.events ?? []).filter(e => { const s = String(e.startAt).split('T')[0]; return s >= from && s <= to })
  const breakdowns = monthEvents.filter(e => e.type === 'breakdown')
  const penalty = breakdowns.reduce((s,e)=>s+(Number(e.penalty)||0),0)

  // ═══ Page 1 ══════════════════════════════════════════════════════════════════
  header()
  pdf.setFont('helvetica','bold'); pdf.setFontSize(15); pdf.setTextColor(NAVY)
  pdf.text('O&M Performance Report', M, y+3)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(MUTED)
  pdf.text(`Reporting month: ${monthLabel}  ·  ${PROJECT.contractor}`, M, y+9)
  y += 16

  section('Performance summary')
  const cards: [string,string,string][] = [
    ['Effluent compliance', compliancePct!=null ? compliancePct+'%' : '—', compliancePct!=null && compliancePct<95 ? RED : GREEN],
    ['Days logged', String(logs.length), NAVY],
    ['Avg inflow', avg('inflowMld')!=null ? avg('inflowMld')+' MLD' : '—', NAVY],
    ['Avg outflow', avg('outflowMld')!=null ? avg('outflowMld')+' MLD' : '—', NAVY],
    ['Breakdowns', String(breakdowns.length), breakdowns.length ? RED : GREEN],
    ['Penalty exposure', inr(penalty), penalty>0 ? RED : MUTED],
  ]
  const cw = CW/3, ch = 20
  cards.forEach((c,i)=>{ const col=i%3, row=Math.floor(i/3), x=M+col*cw, yy=y+row*(ch+3)
    pdf.setDrawColor('#dbe6e0'); pdf.setFillColor('#f8fafc'); pdf.roundedRect(x,yy,cw-3,ch,2,2,'FD')
    pdf.setFontSize(7); pdf.setTextColor(MUTED); pdf.text(c[0].toUpperCase(), x+3, yy+6)
    pdf.setFont('helvetica','bold'); pdf.setFontSize(13); pdf.setTextColor(c[2]); pdf.text(c[1], x+3, yy+15); pdf.setFont('helvetica','normal') })
  y += Math.ceil(cards.length/3)*(ch+3) + 4

  section('Average effluent vs discharge norms')
  const rows: [string, any, number][] = [
    ['BOD (mg/L)', avg('outBod'), LIMITS.outBod], ['COD (mg/L)', avg('outCod'), LIMITS.outCod],
    ['TSS (mg/L)', avg('outTss'), LIMITS.outTss], ['NH3-N (mg/L)', avg('outAmmN'), LIMITS.outAmmN],
    ['Total N (mg/L)', avg('outTotalN'), LIMITS.outTotalN], ['Total P (mg/L)', avg('outTotalP'), LIMITS.outTotalP],
  ]
  pdf.setFillColor(NAVY); pdf.rect(M,y,CW,7,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); pdf.setTextColor('#fff')
  pdf.text('Parameter', M+2, y+4.7); pdf.text('Average', M+90, y+4.7); pdf.text('Limit', M+130, y+4.7); pdf.text('Result', M+165, y+4.7); y += 7
  rows.forEach((r,i)=>{ const bad = r[1]!=null && r[1] > r[2]
    if (i%2===1){ pdf.setFillColor('#f8fafc'); pdf.rect(M,y,CW,6.5,'F') }
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor('#334155')
    pdf.text(r[0], M+2, y+4.4); pdf.text(r[1]!=null?String(r[1]):'—', M+90, y+4.4); pdf.text('≤ '+r[2], M+130, y+4.4)
    pdf.setTextColor(r[1]==null?MUTED:bad?RED:GREEN); pdf.setFont('helvetica','bold'); pdf.text(r[1]==null?'—':bad?'BREACH':'OK', M+165, y+4.4)
    y += 6.5 })
  y += 6

  section('Utilities & sludge')
  pdf.setFontSize(9); pdf.setTextColor('#334155'); pdf.setFont('helvetica','normal')
  pdf.text(`Power consumed: ${sum('powerKwh').toLocaleString('en-IN')} kWh    ·    DG running: ${sum('dgHours')} hrs    ·    Sludge disposed: ${(+sum('sludgeM3').toFixed(1))} m3`, M, y+3)
  y += 12

  // ═══ Breakdown register ══════════════════════════════════════════════════════
  section('Breakdown & maintenance register')
  if (monthEvents.length === 0) { pdf.setFontSize(8.5); pdf.setTextColor(MUTED); pdf.text('No breakdown or maintenance events this month.', M, y+2); y += 8 }
  else {
    const heads = ['Equipment','Type','Start','Downtime','Status','Penalty']; const widths = [52,26,34,26,22,22]
    const drawHead = () => { pdf.setFillColor(NAVY); pdf.rect(M,y,CW,7,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.setTextColor('#fff'); let x=M+1.5; heads.forEach((h,i)=>{ pdf.text(h,x,y+4.7); x+=widths[i] }); y+=7 }
    ensure(16); drawHead()
    monthEvents.forEach((e,ri)=>{ if (y+6.5>H-16){ footer(); pdf.addPage(); header(); drawHead() }
      if (ri%2===1){ pdf.setFillColor('#f8fafc'); pdf.rect(M,y,CW,6.5,'F') }
      pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor('#334155'); let x=M+1.5
      const cells = [e.equipment, e.type, new Date(e.startAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}), (e.downtimeHours??'—')+'h', e.status, e.penalty>0?inr(e.penalty):'—']
      cells.forEach((c,i)=>{ pdf.setTextColor(i===5 && e.penalty>0 ? RED : '#334155'); pdf.text(pdf.splitTextToSize(String(c),widths[i]-2)[0]??'', x, y+4.4); x+=widths[i] }); y+=6.5 })
    y += 3
    pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.setTextColor(penalty>0?RED:NAVY)
    pdf.text(`Total breakdown penalty exposure this month: ${inr(penalty)} (Rs 15,000/day beyond 48h)`, M, y+2); y += 8
  }

  // certification
  ensure(24); y += 4
  pdf.setDrawColor('#cbd5e1'); pdf.line(M,y,M+60,y); pdf.line(W-M-60,y,W-M,y)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('Plant Manager (Contractor)', M, y+5); pdf.text('Engineer-in-Charge (UEED)', W-M-60, y+5)

  footer()
  pdf.save(`KIPL-OM-Report-${MONTHS[d.month-1]}-${d.year}.pdf`)
}
