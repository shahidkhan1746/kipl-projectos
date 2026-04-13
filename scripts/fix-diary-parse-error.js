const fs   = require('fs')
const path = require('path')

const diaryPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'diary', 'DiaryPage.tsx'
)

let src = fs.readFileSync(diaryPath, 'utf8')

// ── Remove the broken style block + fragment wrapper we injected ──────────────
// The issue: template literal with > inside <style>{`...`}</style> breaks JSX parser

// Fix 1: Remove the broken wrapper we added
src = src.replace(
  /const pulseStyle = btnPulse \? \{[\s\S]*?\} : \{\}\s*\n\s*return \(\s*\n\s*<>\s*\n\s*<style>\{`@keyframes kipl-pulse \{[\s\S]*?\}`\}<\/style>/,
  `const pulseStyle: React.CSSProperties = btnPulse ? {
    outline: '3px solid #2563eb',
    outlineOffset: '3px',
    transform: 'scale(1.03)',
    transition: 'all 0.3s',
  } : { transition: 'all 0.3s' }

  return (`
)

// Fix 2: Remove the closing </> we added before last )
src = src.replace(/\n\s*<\/>\s*\n\s*\)\s*\n\}[\s]*$/, '\n  )\n}\n')

fs.writeFileSync(diaryPath, src)
console.log('✅ DiaryPage.tsx — parse error fixed')
console.log('   Replaced broken <style> tag with simple outline-based pulse')
console.log('   Pulse: blue outline + slight scale on the New Entry button')
