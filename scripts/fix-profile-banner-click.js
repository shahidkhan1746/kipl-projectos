const fs   = require('fs')
const path = require('path')

const SRC = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src'
)

// 1. Add event listener to DataCompletenessModal
const modalPath = path.join(SRC, 'components', 'ui', 'DataCompletenessModal.tsx')
let modal = fs.readFileSync(modalPath, 'utf8')

if (!modal.includes('open-data-modal')) {
  const OLD_EFFECT = `  useEffect(() => {
    const key = \`data_modal_dismissed_\${new Date().toDateString()}_\${user?.id ?? ''}\`
    const wasDismissed = sessionStorage.getItem(key) === 'true'
    if (!wasDismissed && pending.length > 0 && user) {
      const timer = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [pending.length, user])`

  const NEW_EFFECT = `  useEffect(() => {
    const key = \`data_modal_dismissed_\${new Date().toDateString()}_\${user?.id ?? ''}\`
    const wasDismissed = sessionStorage.getItem(key) === 'true'
    if (!wasDismissed && pending.length > 0 && user) {
      const timer = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [pending.length, user])

  // Manual trigger from profile banner
  useEffect(() => {
    function handleForceOpen() {
      const key = \`data_modal_dismissed_\${new Date().toDateString()}_\${user?.id ?? ''}\`
      sessionStorage.removeItem(key)
      setCurrent(0)
      setOpen(true)
    }
    window.addEventListener('open-data-modal', handleForceOpen)
    return () => window.removeEventListener('open-data-modal', handleForceOpen)
  }, [user])`

  if (modal.includes(OLD_EFFECT)) {
    modal = modal.replace(OLD_EFFECT, NEW_EFFECT)
    fs.writeFileSync(modalPath, modal)
    console.log('✅ DataCompletenessModal — force-open event listener added')
  } else {
    console.log('⚠️  DataCompletenessModal — could not find useEffect to patch, appending listener')
    // Append before the closing export
    modal = modal.replace(
      `  function dismiss() {`,
      `  // Manual trigger
  useEffect(() => {
    function handleForceOpen() {
      const key = \`data_modal_dismissed_\${new Date().toDateString()}_\${user?.id ?? ''}\`
      sessionStorage.removeItem(key)
      setCurrent(0)
      setOpen(true)
    }
    window.addEventListener('open-data-modal', handleForceOpen)
    return () => window.removeEventListener('open-data-modal', handleForceOpen)
  }, [user])

  function dismiss() {`
    )
    fs.writeFileSync(modalPath, modal)
    console.log('✅ DataCompletenessModal — listener appended')
  }
} else {
  console.log('⏭  DataCompletenessModal — already has listener')
}

// 2. Fix AppHeader banner to fire the event
const headerPath = path.join(SRC, 'components', 'layout', 'AppHeader.tsx')
let header = fs.readFileSync(headerPath, 'utf8')

if (header.includes("nav('/settings/system')") && header.includes('tap to complete')) {
  header = header.replace(
    `onClick={() => { setShowProfile(false); nav('/settings/system') }}`,
    `onClick={() => { setShowProfile(false); window.dispatchEvent(new Event('open-data-modal')) }}`
  )
  fs.writeFileSync(headerPath, header)
  console.log('✅ AppHeader — banner fires open-data-modal (was pointing to settings)')

} else if (header.includes('tap to complete') && !header.includes('open-data-modal')) {
  // Find the banner div and inject onClick
  header = header.replace(
    `'Project data incomplete — tap to complete'`,
    `'Project data incomplete — tap to complete'`
  )
  // Inject click on the wrapper div
  header = header.replace(
    /(<div style=\{ margin:'10px 12px 0'[^}]*background:'#fffbeb'[^}]*\}>)/,
    `<div onClick={() => { setShowProfile(false); window.dispatchEvent(new Event('open-data-modal')) }} style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>`
  )
  fs.writeFileSync(headerPath, header)
  console.log('✅ AppHeader — banner now fires open-data-modal event')

} else if (header.includes('open-data-modal')) {
  console.log('⏭  AppHeader — already fires open-data-modal')
} else {
  console.log('❌ Could not find banner — paste relevant lines from AppHeader.tsx')
}
