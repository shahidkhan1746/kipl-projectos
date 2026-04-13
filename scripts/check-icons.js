const fs = require('fs')
const path = require('path')

// Check what icons are currently used successfully across the codebase
const pagesDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src')

function findFiles(dir, ext) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) results = results.concat(findFiles(fullPath, ext))
    else if (file.endsWith(ext)) results.push(fullPath)
  })
  return results
}

const files = findFiles(pagesDir, '.tsx')
const iconImports = new Set()

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8')
  const matches = content.matchAll(/from '@phosphor-icons\/react'/g)
  for (const match of matches) {
    // Find the import line
    const start = content.lastIndexOf('import {', match.index)
    const end = content.indexOf('}', start)
    const icons = content.slice(start + 8, end).split(',').map(i => i.trim()).filter(Boolean)
    icons.forEach(i => iconImports.add(i))
  }
})

console.log('✅ Icons used across your project (these definitely work):')
console.log([...iconImports].sort().join(', '))
