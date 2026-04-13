const fs   = require('fs')
const path = require('path')

const filePath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'compliance', 'CompliancePage.tsx'
)

let src = fs.readFileSync(filePath, 'utf8')

const lines = src.split('\n')
const fixed = lines.map((line, i) => {
  if (!/detail:|title:|evidence:|risk:|note:/.test(line)) return line
  const fixedLine = line
    .replace(/contractor's/g, 'contractor')
    .replace(/UEED's/g, 'UEED')
    .replace(/Bidder's/g, 'Bidder')
    .replace(/bidder's/g, 'bidder')
    .replace(/don't/g, 'do not')
    .replace(/can't/g, 'cannot')
    .replace(/won't/g, 'will not')
    .replace(/doesn't/g, 'does not')
    .replace(/isn't/g, 'is not')
  if (fixedLine !== line) console.log('  Fixed line ' + (i+1))
  return fixedLine
})

fs.writeFileSync(filePath, fixed.join('\n'))
console.log('Done - CompliancePage.tsx apostrophes fixed')
