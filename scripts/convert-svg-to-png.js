const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '../frontend/node_modules/playwright-core'));

async function convert() {
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

  const convertFile = async (name) => {
    const svgPath = path.join(__dirname, '../frontend/public/assets', `${name}.svg`);
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:40px;background:#ffffff;display:flex;align-items:center;justify-content:center;">${svgContent}</body></html>`);
    const svgEl = await page.$('svg');
    const outPub = path.join(__dirname, '../frontend/public/assets', `${name}.png`);
    const outArt = path.join('C:/Users/DELL/.gemini/antigravity/brain/24aed300-35bc-4ec3-9189-e299fcf9aa3e', `${name}.png`);
    await svgEl.screenshot({ path: outPub });
    await svgEl.screenshot({ path: outArt });
    console.log(`Rendered ${name}.png (size: ${fs.statSync(outPub).size} bytes)`);
  };

  await convertFile('qr-zubair-emerald-logo');
  await convertFile('qr-zubair-navy-logo');
  await convertFile('qr-zubair-black-logo');

  await browser.close();
}

convert().catch(console.error);
