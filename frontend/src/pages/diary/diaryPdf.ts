import { jsPDF } from 'jspdf'

// Printable daily site-diary sheet (A4 portrait, client-side jsPDF).
const NAVY = '#0a1e28', MUTED = '#6b8592'
const WX: Record<string, string> = { sunny:'Sunny', cloudy:'Cloudy', rainy:'Rainy', foggy:'Foggy', snowy:'Snowy', stormy:'Stormy' }

export function generateDiaryPdf(e: any) {
  const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, H = 297, M = 14, CW = W - 2*M
  const dateStr = new Date(e.date).toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
  let y = 0

  const header = () => {
    pdf.setFillColor(NAVY); pdf.rect(0,0,W,20,'F')
    pdf.setTextColor('#fff'); pdf.setFont('helvetica','bold'); pdf.setFontSize(12)
    pdf.text('SITE DAILY DIARY', M, 9)
    pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9DB4C6')
    pdf.text('Dal Lake Sewerage Scheme — 38.5 MLD STP · Khilari Infrastructure Pvt. Ltd.', M, 15)
    pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor('#fff')
    pdf.text(dateStr, W-M, 9, { align:'right' })
    y = 28
  }
  const footer = () => { pdf.setDrawColor('#dbe6e0'); pdf.line(M,H-12,W-M,H-12); pdf.setFontSize(7); pdf.setTextColor(MUTED); pdf.text('KIPL ProjectOS — site daily diary', M, H-8); pdf.text('Page '+pdf.getNumberOfPages(), W-M, H-8, { align:'right' }) }
  const ensure = (n:number) => { if (y+n > H-16) { footer(); pdf.addPage(); header() } }
  const section = (t:string) => { ensure(11); pdf.setFillColor('#f1f5f9'); pdf.rect(M,y,CW,7,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(NAVY); pdf.text(t.toUpperCase(), M+2, y+5); y+=10 }
  const line = (label:string, val:string) => { ensure(6); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.setTextColor('#334155'); pdf.text(label+':', M, y+3); pdf.setFont('helvetica','normal'); const t = pdf.splitTextToSize(val || '—', CW-42); pdf.text(t, M+42, y+3); y += Math.max(1,t.length)*4.4 + 2 }
  const table = (heads:string[], widths:number[], rows:string[][]) => {
    if (rows.length === 0) { ensure(6); pdf.setFontSize(8); pdf.setTextColor(MUTED); pdf.text('None', M, y+3); y+=7; return }
    ensure(12); pdf.setFillColor(NAVY); pdf.rect(M,y,CW,6.5,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.setTextColor('#fff'); let x=M+1.5; heads.forEach((h,i)=>{ pdf.text(h,x,y+4.4); x+=widths[i] }); y+=6.5
    rows.forEach((r,ri)=>{ if (y+6>H-16){ footer(); pdf.addPage(); header() } if (ri%2===1){ pdf.setFillColor('#f8fafc'); pdf.rect(M,y,CW,6,'F') } pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor('#334155'); let xx=M+1.5; r.forEach((c,i)=>{ pdf.text(pdf.splitTextToSize(String(c??''),widths[i]-2)[0]??'', xx, y+4); xx+=widths[i] }); y+=6 })
    y += 3
  }

  header()
  section('Weather')
  line('Morning / Afternoon', `${WX[e.weatherMorning] ?? e.weatherMorning} / ${WX[e.weatherAfternoon] ?? e.weatherAfternoon}`)
  line('Temp / Rainfall', `${e.tempMin ?? '—'}–${e.tempMax ?? '—'} C · ${e.rainfallMm ?? 0} mm`)
  if (e.workStoppedWeather) line('Work stopped', `Yes — ${e.hoursLost ?? 0} hours lost`)

  section('Labour')
  line('Deployed', `Skilled ${e.labourSkilled ?? 0} · Unskilled ${e.labourUnskilled ?? 0} · Supervisory ${e.labourSupervisory ?? 0} · Total ${e.labourTotal ?? 0}`)

  section('Equipment deployed')
  table(['Type','Nos','Hrs','Remarks'], [70,24,24,66], (e.equipment ?? []).map((q:any)=>[q.type, String(q.count??''), String(q.hours??''), q.remarks??'']))

  section('Work done')
  table(['Zone','Activity','Qty','Unit'], [46,90,24,22], (e.workDone ?? []).map((w:any)=>[w.zone, w.activity, String(w.quantity??''), w.unit??'']))

  section('Materials received')
  table(['Material','Qty','Unit','Trips','Supplier'], [58,24,24,20,56], (e.materialsReceived ?? []).map((m:any)=>[m.material, String(m.quantity??''), m.unit??'', String(m.trips??''), m.supplier??'']))

  section('Visitors')
  table(['Name','Organisation','Purpose'], [56,64,62], (e.visitors ?? []).map((v:any)=>[v.name, v.organisation, v.purpose]))

  section('Notes')
  line('Issues faced', e.issuesFaced)
  line('Instructions', e.instructionsGiven)
  line('Plan for tomorrow', e.nextDayPlan)
  if (e.eotClaim) line('EOT claim', e.eotReason || 'Yes')
  line('Photos attached', String((e.photos ?? []).length))

  // signatures
  ensure(24); y += 6
  pdf.setDrawColor('#cbd5e1'); pdf.line(M,y,M+60,y); pdf.line(W-M-60,y,W-M,y)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('Prepared by: ' + (e.submittedBy ?? '____________'), M, y+5)
  pdf.text('Verified by (EIC): ' + (e.approvedBy ?? '____________'), W-M-60, y+5)

  footer()
  pdf.save(`KIPL-Site-Diary-${String(e.date).split('T')[0]}.pdf`)
}
