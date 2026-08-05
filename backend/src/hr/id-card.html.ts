// Employee ID card HTML — self-contained, viewable/printable, Gotenberg-ready.
// 'template' overlays dynamic data on your artwork (id-front.png / id-back.png);
// 'minimal' is a self-drawn clean card. Card size 54 × 86 mm.
const ASSETS = 'https://kiplstpsrinagar.com/assets'
const LOGO = ASSETS + '/kipl-logo.png'
const GREEN = '#4e9a2f'

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

// ── Overlay coordinates (percent of card). Nudge these to align with the art. ──
const FRONT = {
  photo:  { top: 27.5, left: 50, w: 31 },   // circular photo (centered)
  values: { left: 44, right: 5, size: 2.6, // value text after the ":" labels
    rows: { id: 54.5, name: 60.5, father: 66.5, address: 72.5 } },
}
const BACK = { qr: { left: 9, top: 82.5, w: 18.5 } }

function css(): string {
  return `<style>
  @page{ size:54mm 86mm; margin:0 }
  *{ margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact }
  body{ font-family:Arial,Helvetica,sans-serif; display:flex; flex-wrap:wrap; gap:6mm; padding:6mm; background:#eef1f5 }
  .card{ width:54mm; height:86mm; position:relative; border-radius:4mm; overflow:hidden; background:#fff; background-size:cover; background-position:center; box-shadow:0 2mm 6mm rgba(15,23,42,.15) }
  .ph{ position:absolute; border-radius:50%; object-fit:cover; transform:translateX(-50%) }
  .v{ position:absolute; color:#fff; font-weight:700; line-height:1.05; overflow:hidden }
  .qr{ position:absolute; aspect-ratio:1 }
  </style>`
}

function templateCard(emp: any): string {
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
  const V = FRONT.values
  const val = (top: number, text: string) =>
    `<div class="v" style="top:${top}%; left:${V.left}%; right:${V.right}%; font-size:${V.size}mm">${esc(text)}</div>`
  const photo = emp.photoUrl
    ? `<img class="ph" src="${esc(emp.photoUrl)}" style="top:${FRONT.photo.top}%; left:${FRONT.photo.left}%; width:${FRONT.photo.w}%; aspect-ratio:1">`
    : ''
  const qrData = encodeURIComponent(`KIPL|${emp.empCode ?? ''}|${name}`)
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=0&data=${qrData}`

  return `<div class="card" style="background-image:url('${ASSETS}/id-front.png')">
      ${photo}
      ${val(V.rows.id, emp.empCode ?? '')}
      ${val(V.rows.name, name)}
      ${val(V.rows.father, emp.fatherName ?? '')}
      ${val(V.rows.address, emp.address ?? '')}
    </div>
    <div class="card" style="background-image:url('${ASSETS}/id-back.png')">
      <img class="qr" src="${qr}" style="left:${BACK.qr.left}%; top:${BACK.qr.top}%; width:${BACK.qr.w}%">
    </div>`
}

function minimalCard(emp: any): string {
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
  const rows: [string, string][] = [
    ['ID No.', emp.empCode ?? '—'], ['Department', emp.department ?? '—'],
    ['Phone', emp.phone ?? '—'], ['Blood Group', emp.bloodGroup ?? '—'],
    ['Emergency', (emp.emergencyName || emp.emergencyPhone) ? `${emp.emergencyName ?? ''}${emp.emergencyPhone ? ' · ' + emp.emergencyPhone : ''}` : '—'],
  ]
  const photo = emp.photoUrl
    ? `<img src="${esc(emp.photoUrl)}" style="width:100%;height:100%;object-fit:cover">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b8592;font-size:2.6mm">PHOTO</div>`
  return `<div class="card" style="display:flex;flex-direction:column;border:0.4mm solid #dbe6e0">
    <div style="height:15mm;flex-shrink:0;background:linear-gradient(120deg,#0a1e28,#12564a);color:#fff;display:flex;align-items:center;gap:2mm;padding:0 3mm">
      <img src="${LOGO}" onerror="this.style.display='none'" style="width:9mm;height:9mm;object-fit:contain">
      <div><b style="font-size:4mm">KIPL</b><div style="font-size:2mm;color:#9DB4C6">Dal Lake STP · Srinagar</div></div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;padding:0 4mm">
      <div style="width:24mm;height:28mm;margin:3.5mm auto 0;border:0.5mm solid ${GREEN};border-radius:2mm;overflow:hidden;background:#eef3f0;flex-shrink:0">${photo}</div>
      <div style="text-align:center;font-size:4.2mm;font-weight:700;color:#0a1e28;margin-top:2mm">${esc(name) || '—'}</div>
      <div style="text-align:center;font-size:2.7mm;color:${GREEN};font-weight:600;margin-bottom:1.5mm">${esc(emp.designation ?? '')}</div>
      <table style="width:100%;border-collapse:collapse">
        ${rows.map(r => `<tr><td style="font-size:2.5mm;color:#6b8592;font-weight:700;padding:.6mm 0;width:16mm;vertical-align:top">${esc(r[0])}</td><td style="font-size:2.5mm;color:#0f172a;vertical-align:top">${esc(r[1])}</td></tr>`).join('')}
      </table>
    </div>
    <div style="height:7mm;flex-shrink:0;background:#0a1e28;color:#9DB4C6;font-size:1.9mm;display:flex;align-items:center;justify-content:center">If found, return to KIPL site office, Nishat</div>
  </div>`
}

export function buildIdCardHtml(emp: any, style = 'template'): string {
  const body = style === 'minimal' ? minimalCard(emp) : templateCard(emp)
  return `<!doctype html><html><head><meta charset="utf-8">${css()}</head><body>${body}</body></html>`
}
