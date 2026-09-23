const fs = require('fs');
const https = require('https');
const path = require('path');

const logoPath = path.join(__dirname, '../frontend/public/assets/kipl-logo.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');
const targetUrl = 'https://kiplstpsrinagar.com/verify/id/KIPL-DL-SXR-002';

async function makeSvg(colorHex, filename, strokeHex) {
  const url = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=1&format=svg&ecc=H&color=' + colorHex.replace('#', '') + '&data=' + encodeURIComponent(targetUrl);
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/width="(\d+)"\s+height="(\d+)"/);
        const w = match ? parseInt(match[1]) : 574;
        const h = match ? parseInt(match[2]) : 574;
        const cx = w / 2;
        const cy = h / 2;
        const r = w * 0.125;
        const logoW = r * 1.65;
        const logoX = cx - (logoW / 2);
        const logoY = cy - (logoW / 2);

        const badgeSvg = `
	<!-- Center KIPL Emblem Badge -->
	<g id="kipl-emblem-badge">
		<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${strokeHex}" stroke-width="4.5" />
		<image href="data:image/png;base64,${logoBase64}" x="${logoX}" y="${logoY}" width="${logoW}" height="${logoW}" preserveAspectRatio="xMidYMid meet" />
	</g>
</svg>`;
        const finalSvg = data.replace('</svg>', badgeSvg);
        const outPath = path.join(__dirname, '../frontend/public/assets', filename);
        fs.writeFileSync(outPath, finalSvg, 'utf8');
        console.log('Saved', filename, 'size:', fs.statSync(outPath).size);
        resolve();
      });
    }).on('error', reject);
  });
}

async function run() {
  await makeSvg('059669', 'qr-zubair-emerald-logo.svg', '#059669');
  await makeSvg('0a1e28', 'qr-zubair-navy-logo.svg', '#0a1e28');
  await makeSvg('0f172a', 'qr-zubair-black-logo.svg', '#0f172a');
}

run().catch(console.error);
