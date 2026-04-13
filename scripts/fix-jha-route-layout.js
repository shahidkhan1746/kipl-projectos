const fs   = require('fs')
const path = require('path')

const appPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'App.tsx'
)

let src = fs.readFileSync(appPath, 'utf8')

// Remove the wrongly placed route outside the layout
src = src.replace(
  `        <Route path="/jha" element={<JHAPage />} />\n        </Routes>`,
  `        </Routes>`
)

// Add it inside the layout, after /qa
src = src.replace(
  `          <Route path='qa'                  element={<QaPage />} />`,
  `          <Route path='qa'                  element={<QaPage />} />\n          <Route path='jha'                 element={<JHAPage />} />`
)

fs.writeFileSync(appPath, src)
console.log('✅ /jha route moved inside AppLayout guard')
console.log('   Was: outside <Guard><AppLayout /> (no sidebar/header)')
console.log('   Now: inside  <Guard><AppLayout /> (full layout)')
