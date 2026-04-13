const fs   = require('fs')
const path = require('path')

const appPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'App.tsx'
)

let src = fs.readFileSync(appPath, 'utf8')

// Find the /qa route and add /jha before it
const targets = [
  `<Route path="/qa"`,
  `<Route path='/qa'`,
  `path="/qa"`,
  `path='/qa'`,
]

let patched = false
for (const t of targets) {
  if (src.includes(t) && !src.includes('path="/jha"') && !src.includes("path='/jha'")) {
    src = src.replace(t, `<Route path="/jha" element={<JHAPage />} />\n          ` + t)
    patched = true
    console.log('✅ /jha route added before /qa route')
    break
  }
}

if (!patched && (src.includes('path="/jha"') || src.includes("path='/jha'"))) {
  console.log('⏭  /jha route already exists')
} else if (!patched) {
  // Fallback — find any Route and add before closing Routes tag
  src = src.replace(
    '</Routes>',
    `  <Route path="/jha" element={<JHAPage />} />\n        </Routes>`
  )
  console.log('✅ /jha route added via fallback before </Routes>')
}

fs.writeFileSync(appPath, src)

// Verify
const verify = fs.readFileSync(appPath, 'utf8')
if (verify.includes('/jha')) {
  console.log('✓ Verified — /jha route is in App.tsx')
} else {
  console.log('❌ Still not found — paste your App.tsx routes section')
}
