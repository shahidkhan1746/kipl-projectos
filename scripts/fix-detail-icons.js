const fs = require('fs')
const path = require('path')

const filePath = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'hr', 'EmployeeDetailPage.tsx')

let src = fs.readFileSync(filePath, 'utf8')

// Fix 1: Replace Bank icon import with Wallet (safer across phosphor versions)
src = src.replace(
  `import { ArrowLeft, PencilSimple, User, Phone, Bank } from '@phosphor-icons/react'`,
  `import { ArrowLeft, PencilSimple, UserCircle, Phone, Wallet } from '@phosphor-icons/react'`
)

// Fix 2: Replace <Bank ...> usage with <Wallet ...>
src = src.replace(/<Bank size={16} color={C\.blue} weight="bold" \/>/g, '<Wallet size={16} color={C.blue} weight="bold" />')

// Fix 3: Replace <User ...> usage with <UserCircle ...>
src = src.replace(/<User size={16} color={C\.blue} weight="bold" \/>/g, '<UserCircle size={16} color={C.blue} weight="bold" />')

fs.writeFileSync(filePath, src, 'utf8')
console.log('✅ Icon imports fixed — Bank → Wallet, User → UserCircle')
console.log('   These are guaranteed to exist in all phosphor-icons versions.')
