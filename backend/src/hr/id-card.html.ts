// Employee ID card as a self-contained HTML document. Rendered directly in the
// browser (viewable/printable) or converted to PDF by Gotenberg. Portrait
// 54 × 86 mm lanyard card.
const LOGO = 'https://kiplstpsrinagar.com/assets/kipl-logo.png'

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

export function buildIdCardHtml(emp: any): string {
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
  const doj = emp.dateOfJoining ? String(emp.dateOfJoining).split('T')[0] : '—'
  const rows: [string, string][] = [
    ['ID No.', emp.empCode ?? '—'],
    ['Department', emp.department ?? '—'],
    ['Phone', emp.phone ?? '—'],
    ['Blood Group', emp.bloodGroup ?? '—'],
    ['Date of Joining', doj],
  ]
  const photo = emp.photoUrl
    ? `<img class="photo" src="${esc(emp.photoUrl)}" alt="">`
    : `<div class="photo ph">PHOTO</div>`
  const emergency = (emp.emergencyName || emp.emergencyPhone)
    ? `<div class="emg"><b>Emergency:</b> ${esc(emp.emergencyName ?? '')}${emp.emergencyPhone ? ' · ' + esc(emp.emergencyPhone) : ''}</div>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: 54mm 86mm; margin: 0 }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact }
  body { font-family: Arial, Helvetica, sans-serif; }
  .card { width:54mm; height:86mm; overflow:hidden; position:relative; background:#fff; border:0.4mm solid #dbe6e0; border-radius:3mm; }
  .head { height:16mm; background:linear-gradient(120deg,#0a1e28,#0e3a3a 70%,#12564a); color:#fff; display:flex; align-items:center; gap:2mm; padding:0 3mm; }
  .head img { width:9mm; height:9mm; object-fit:contain; }
  .brand b { font-size:4mm; letter-spacing:.2px; display:block; line-height:1.1 }
  .brand span { font-size:2.1mm; color:#9DB4C6; display:block }
  .brand .p { font-size:2mm; color:#2FB98C }
  .photo { display:block; width:26mm; height:30mm; object-fit:cover; border:0.5mm solid #2FB98C; border-radius:2mm; margin:4mm auto 0; }
  .photo.ph { display:flex; align-items:center; justify-content:center; background:#eef3f0; color:#6b8592; font-size:2.6mm; letter-spacing:1px }
  .name { text-align:center; font-size:4.6mm; font-weight:700; color:#0a1e28; margin-top:2.5mm; padding:0 2mm; line-height:1.1 }
  .desig { text-align:center; font-size:2.8mm; color:#12564a; font-weight:600; margin-top:0.6mm }
  table { width:100%; margin-top:2.5mm; padding:0 4mm; border-collapse:collapse; }
  td { font-size:2.5mm; padding:0.5mm 0; vertical-align:top }
  td.k { color:#6b8592; font-weight:700; width:16mm }
  td.v { color:#0f172a }
  .emg { margin:1.5mm 4mm 0; font-size:2.3mm; color:#b91c1c; background:#fef2f2; border:0.3mm solid #fecaca; border-radius:1.5mm; padding:1mm 1.5mm }
  .foot { position:absolute; bottom:0; left:0; right:0; height:9mm; background:#0a1e28; color:#9DB4C6; font-size:1.9mm; display:flex; align-items:center; justify-content:space-between; padding:0 3mm; }
  .sig { text-align:center; color:#c3d4e0 }
  .sig .l { border-top:0.3mm solid #3b5563; width:18mm; margin-bottom:0.6mm }
</style></head>
<body>
  <div class="card">
    <div class="head">
      <img src="${LOGO}" onerror="this.style.display='none'">
      <div class="brand"><b>KIPL</b><span>Khilari Infrastructure Pvt. Ltd.</span><span class="p">Dal Lake STP · Nishat, Srinagar</span></div>
    </div>
    ${photo}
    <div class="name">${esc(name) || '—'}</div>
    <div class="desig">${esc(emp.designation ?? '—')}</div>
    <table>${rows.map(r => `<tr><td class="k">${esc(r[0])}</td><td class="v">${esc(r[1])}</td></tr>`).join('')}</table>
    ${emergency}
    <div class="foot">
      <span>If found, return to KIPL site office</span>
      <span class="sig"><div class="l"></div>Signatory</span>
    </div>
  </div>
</body></html>`
}
