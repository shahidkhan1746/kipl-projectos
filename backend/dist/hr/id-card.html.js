"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIdCardHtml = buildIdCardHtml;
const LOGO = 'https://kiplstpsrinagar.com/assets/kipl-logo.png';
const NAVY = '#16244f', GREEN = '#4e9a2f';
function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
const ICON = {
    id: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="${GREEN}" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.4"/><line x1="13" y1="10" x2="19" y2="10"/><line x1="13" y1="14" x2="17" y2="14"/></svg>`,
    user: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="${GREEN}" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
    home: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="${GREEN}" stroke-width="2"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`,
};
function commonHead() {
    return `<meta charset="utf-8"><style>
  @page { size:54mm 86mm; margin:0 }
  *{ margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact }
  body{ font-family:Arial,Helvetica,sans-serif; display:flex; flex-wrap:wrap; gap:6mm; padding:6mm; background:#eef1f5 }
  .card{ width:54mm; height:86mm; background:#fff; border-radius:4mm; overflow:hidden; position:relative; box-shadow:0 2mm 6mm rgba(15,23,42,.15) }
  </style>`;
}
function frontTemplate(emp) {
    const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
    const rows = [
        [ICON.id, 'ID No.', emp.empCode ?? ''],
        [ICON.user, 'Name', name],
        [ICON.user, "Father's Name", emp.fatherName ?? ''],
        [ICON.home, 'Address', emp.address ?? ''],
    ];
    const photo = emp.photoUrl
        ? `<img src="${esc(emp.photoUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : '';
    return `<div class="card">
    <div style="height:30mm;background:#fff;padding:3mm 3mm 0;display:flex;gap:2mm;align-items:flex-start">
      <img src="${LOGO}" onerror="this.style.display='none'" style="width:14mm;height:14mm;object-fit:contain">
      <div style="padding-top:0.5mm">
        <div style="font-size:4.6mm;font-weight:800;color:${NAVY};line-height:1.02">KHILARI<br>INFRASTRUCTURE<br>PVT. LTD.</div>
        <div style="border-top:0.4mm solid ${GREEN};margin-top:1mm;padding-top:0.8mm;font-size:2.2mm;color:${NAVY};font-weight:600">Engineers &nbsp;|&nbsp; Contractors &nbsp;|&nbsp; Solutions</div>
      </div>
    </div>
    <div style="position:absolute;top:30mm;left:0;right:0;bottom:12mm;background:linear-gradient(160deg,${NAVY},#101b3c)"></div>
    <div style="position:absolute;top:18mm;left:50%;transform:translateX(-50%);width:24mm;height:24mm;border-radius:50%;background:#fff;border:0.8mm solid ${GREEN};overflow:hidden;z-index:2"></div>
    <div style="position:absolute;top:18.8mm;left:50%;transform:translateX(-50%);width:22.4mm;height:22.4mm;border-radius:50%;overflow:hidden;z-index:3">${photo}</div>
    <div style="position:absolute;top:46mm;left:4mm;right:4mm;z-index:2">
      ${rows.map(r => `<div style="display:flex;align-items:center;gap:2mm;margin-bottom:2.6mm">
        <span style="width:5mm;display:flex;justify-content:center">${r[0]}</span>
        <span style="width:16mm;color:#fff;font-size:2.7mm;font-weight:600">${esc(r[1])}</span>
        <span style="color:#cdd8ea;font-size:2.7mm">:</span>
        <span style="flex:1;color:#fff;font-size:2.7mm;font-weight:700">${esc(r[2])}</span>
      </div>`).join('')}
    </div>
    <div style="position:absolute;bottom:12mm;left:0;right:0;height:1.4mm;background:${GREEN};z-index:2"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:12mm;background:#fff;display:flex;align-items:center;gap:2mm;padding:0 3mm;font-size:1.9mm;color:${NAVY};z-index:2">
      <div style="flex:1"><span style="color:#6b7280">Working in association with</span><br><b>Urban Environmental Engineering Dept (UEED), J&amp;K Govt</b></div>
      <div style="flex:1;border-left:0.3mm solid #e2e8f0;padding-left:2mm"><span style="color:#6b7280">Project funded by</span><br><b>AMRUT Scheme, Govt of India</b></div>
    </div>
  </div>`;
}
function backTemplate(emp) {
    const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
    const qrData = encodeURIComponent(`KIPL|${emp.empCode ?? ''}|${name}`);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${qrData}`;
    const meta = [emp.designation, emp.bloodGroup && ('Blood ' + emp.bloodGroup), emp.phone].filter(Boolean).join('  ·  ');
    const emg = (emp.emergencyName || emp.emergencyPhone) ? `Emergency: ${esc(emp.emergencyName ?? '')}${emp.emergencyPhone ? ' · ' + esc(emp.emergencyPhone) : ''}` : '';
    return `<div class="card">
    <div style="height:16mm;background:${NAVY};display:flex;gap:2mm;align-items:center;padding:0 3mm">
      <img src="${LOGO}" onerror="this.style.display='none'" style="width:11mm;height:11mm;object-fit:contain">
      <div><div style="color:#fff;font-size:3.6mm;font-weight:800;line-height:1">KHILARI<br>INFRASTRUCTURE PVT. LTD.</div>
      <div style="color:${GREEN};font-style:italic;font-size:2.4mm;border-top:0.3mm solid ${GREEN};margin-top:0.8mm;padding-top:0.6mm">We make difference</div></div>
    </div>
    <div style="height:1.4mm;background:${GREEN}"></div>
    <div style="position:absolute;top:17.4mm;bottom:24mm;left:0;right:0;background:linear-gradient(180deg,#eef3f8,#dbe6f2);display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;color:#7d93b3"><div style="font-size:3mm;font-weight:700;letter-spacing:1px">JAMMU &amp; KASHMIR</div><div style="font-size:2.2mm;margin-top:1mm">Dal Lake · Srinagar</div></div>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:24mm;background:${NAVY};display:flex;align-items:center;gap:3mm;padding:0 3mm">
      <div style="width:17mm;height:17mm;background:#fff;border:0.6mm solid ${GREEN};border-radius:1.5mm;padding:1mm"><img src="${qr}" style="width:100%;height:100%"></div>
      <div style="flex:1;color:#c3d4e0;font-size:2.1mm;line-height:1.5">
        <div style="color:#fff;font-weight:700;font-size:2.5mm">${esc(name) || '—'}</div>
        ${meta ? `<div>${esc(meta)}</div>` : ''}
        ${emg ? `<div style="color:#ffb4b4;margin-top:0.6mm">${emg}</div>` : ''}
        <div style="margin-top:0.8mm;color:#8ea6c0">Scan to verify · kiplstpsrinagar.com</div>
      </div>
    </div>
  </div>`;
}
function minimalCard(emp) {
    const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
    const rows = [
        ['ID No.', emp.empCode ?? '—'], ['Department', emp.department ?? '—'],
        ['Phone', emp.phone ?? '—'], ['Blood Group', emp.bloodGroup ?? '—'],
    ];
    const photo = emp.photoUrl ? `<img src="${esc(emp.photoUrl)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b8592;font-size:2.6mm">PHOTO</div>`;
    return `<div class="card">
    <div style="height:16mm;background:linear-gradient(120deg,#0a1e28,#12564a);color:#fff;display:flex;align-items:center;gap:2mm;padding:0 3mm">
      <img src="${LOGO}" onerror="this.style.display='none'" style="width:9mm;height:9mm;object-fit:contain">
      <div><b style="font-size:4mm">KIPL</b><div style="font-size:2mm;color:#9DB4C6">Dal Lake STP · Srinagar</div></div>
    </div>
    <div style="width:26mm;height:30mm;margin:4mm auto 0;border:0.5mm solid ${GREEN};border-radius:2mm;overflow:hidden;background:#eef3f0">${photo}</div>
    <div style="text-align:center;font-size:4.4mm;font-weight:700;color:#0a1e28;margin-top:2.5mm">${esc(name) || '—'}</div>
    <div style="text-align:center;font-size:2.7mm;color:${GREEN};font-weight:600">${esc(emp.designation ?? '')}</div>
    <table style="width:100%;margin-top:2.5mm;padding:0 4mm;border-collapse:collapse">
      ${rows.map(r => `<tr><td style="font-size:2.5mm;color:#6b8592;font-weight:700;padding:.5mm 0;width:16mm">${esc(r[0])}</td><td style="font-size:2.5mm;color:#0f172a">${esc(r[1])}</td></tr>`).join('')}
    </table>
    <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:#0a1e28;color:#9DB4C6;font-size:1.9mm;display:flex;align-items:center;justify-content:center">If found, return to KIPL site office, Nishat</div>
  </div>`;
}
function buildIdCardHtml(emp, style = 'template') {
    const body = style === 'minimal'
        ? minimalCard(emp)
        : frontTemplate(emp) + backTemplate(emp);
    return `<!doctype html><html><head>${commonHead()}</head><body>${body}</body></html>`;
}
//# sourceMappingURL=id-card.html.js.map