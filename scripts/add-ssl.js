const fs = require('fs')
const f = 'backend/src/app.module.ts'
let c = fs.readFileSync(f, 'utf8')
if (c.includes('rejectUnauthorized')) {
  console.log('already present')
} else {
  c = c.replace(
    'autoLoadEntities: true,',
    'autoLoadEntities: true,\n        ssl: { rejectUnauthorized: false },\n        extra: { max: 5 },'
  )
  fs.writeFileSync(f, c)
  console.log('SSL added')
}
