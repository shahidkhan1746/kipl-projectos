// ================================================================
//  KIPL ProjectOS — Fix v3
//  1. Dashboard loading fix (activeProjectId not set)
//  2. Modal centering fix
//  3. Search input white background
//  4. Template buttons styling
//  5. Input label styling
//  Run: node scripts/fix-v3.js
// ================================================================
const fs   = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const SRC  = path.join(ROOT, 'frontend', 'src')
const G = '\x1b[32m', B = '\x1b[34m', NC = '\x1b[0m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)
function w(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c.trimStart(), 'utf8') }

// ── FIX 1: LoginPage — correct projects response path ──────────
info('Fixing LoginPage (projects.data not projects)...')
const loginPath = path.join(SRC, 'pages/auth/LoginPage.tsx')
let login = fs.readFileSync(loginPath, 'utf8')
// Fix the projects response parsing
login = login.replace(
  /if \(Array\.isArray\(projects\) && projects\[0\].*\)/g,
  'if (projects?.data?.[0]?.id || (Array.isArray(projects) && projects[0]?.id))'
)
login = login.replace(
  /setProject\(projects\[0\]\.id\)/g,
  'setProject(projects?.data?.[0]?.id ?? projects[0]?.id)'
)
fs.writeFileSync(loginPath, login)
ok('LoginPage — fixed projects.data[0].id')

// ── FIX 2: Modal — scrollable overlay, centered when fits ──────
info('Fixing Modal...')
w(path.join(SRC, 'components/ui/Modal.tsx'), `
import { X } from '@phosphor-icons/react'

interface P {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 540, footer }: P) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        overflowY: 'auto',
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)',
        /* padding top/bottom so modal has breathing room */
        padding: '40px 20px',
      }}
    >
      {/* Centering wrapper — click outside to close */}
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100%', alignItems: 'flex-start' }}>
        <div
          onClick={e => e.stopPropagation()}
          className="fade-in"
          style={{
            width: '100%',
            maxWidth: width,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 22px', borderBottom: '1.5px solid #f1f5f9',
            background: '#f8f9fc', flexShrink: 0,
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</span>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: '4px', borderRadius: 6,
              display: 'flex', alignItems: 'center', lineHeight: 1,
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 22px' }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              gap: 8, padding: '14px 22px',
              borderTop: '1.5px solid #f1f5f9',
              background: '#f8f9fc', flexShrink: 0,
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
`)
ok('Modal — scrollable overlay, never cuts off')

// ── FIX 3+4+5: Input, Select, Textarea — better labels ─────────
info('Fixing Input/Select/Textarea labels and styles...')

w(path.join(SRC, 'components/ui/Input.tsx'), `
interface P extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}
export function Input({ label, error, hint, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{
          fontSize: 12, fontWeight: 600, color: '#374151',
        }}>
          {label}
        </label>
      )}
      <input
        {...p}
        style={{
          padding: '10px 13px',
          background: '#ffffff',
          border: '1.5px solid ' + (error ? '#fca5a5' : '#d1d5db'),
          borderRadius: 8, fontSize: 13, color: '#111827',
          outline: 'none', width: '100%', fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = '#2563eb'
          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? '#fca5a5' : '#d1d5db'
          e.target.style.boxShadow = 'none'
        }}
      />
      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
      {hint  && <span style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</span>}
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Select.tsx'), `
interface O { value: string; label: string }
interface P extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; options: O[]; placeholder?: string; error?: string
}
export function Select({ label, options, placeholder, error, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {label}
        </label>
      )}
      <select
        {...p}
        style={{
          padding: '10px 13px',
          background: '#ffffff',
          border: '1.5px solid ' + (error ? '#fca5a5' : '#d1d5db'),
          borderRadius: 8, fontSize: 13, color: '#111827',
          outline: 'none', width: '100%', fontFamily: 'inherit',
          cursor: 'pointer', transition: 'border-color 0.15s',
          ...style,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Textarea.tsx'), `
interface P extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}
export function Textarea({ label, error, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {label}
        </label>
      )}
      <textarea
        {...p}
        style={{
          padding: '10px 13px',
          background: '#ffffff',
          border: '1.5px solid ' + (error ? '#fca5a5' : '#d1d5db'),
          borderRadius: 8, fontSize: 13, color: '#111827',
          outline: 'none', width: '100%', fontFamily: 'inherit',
          resize: 'none', lineHeight: 1.6,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = '#2563eb'
          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? '#fca5a5' : '#d1d5db'
          e.target.style.boxShadow = 'none'
        }}
      />
      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
    </div>
  )
}
`)
ok('Input/Select/Textarea — readable labels, white background, focus ring')

// ── FIX 4: Search inputs in LiaisonPage ────────────────────────
info('Fixing search input in LiaisonPage...')
const liaisonPath = path.join(SRC, 'pages/liaison/LiaisonPage.tsx')
let liaison = fs.readFileSync(liaisonPath, 'utf8')

// Replace the search input style to force white background
liaison = liaison.replace(
  /style=\{\{ width: '100%', paddingLeft: 36.*?fontFamily: 'inherit' \}\}/s,
  `style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'inherit' }}`
)

// Replace the status select style
liaison = liaison.replace(
  /style=\{\{ padding: '9px 14px', background: T\.cardBg.*?fontFamily: 'inherit' \}\}/s,
  `style={{ padding: '10px 14px', background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}`
)

fs.writeFileSync(liaisonPath, liaison)
ok('LiaisonPage search input — forced white background')

// ── FIX 5: Template buttons in LettersPage ─────────────────────
info('Fixing template buttons in LettersPage...')
const lettersPath = path.join(SRC, 'pages/liaison/LettersPage.tsx')
let letters = fs.readFileSync(lettersPath, 'utf8')

// Replace the cramped template button style
letters = letters.replace(
  /style=\{\{ fontSize: 11, padding: '4px 10px', border: '1\.5px solid ' \+ T\.border.*?fontWeight: 500 \}\}/g,
  `style={{ fontSize: 12, padding: '6px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#f8f9fc', color: '#374151', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}`
)

fs.writeFileSync(lettersPath, letters)
ok('LettersPage template buttons — proper padding and style')

// ── FIX 6: Dashboard — handle no project + data loading ────────
info('Fixing Dashboard loading state...')
const dashPath = path.join(SRC, 'pages/dashboard/DashboardPage.tsx')
let dash = fs.readFileSync(dashPath, 'utf8')

// Add no-project fallback before the return statement
if (!dash.includes('No project selected')) {
  dash = dash.replace(
    /const pct = Number\(project\?\.progressPct \?\? 0\)/,
    `const pct = Number(project?.progressPct ?? 0)

  if (!activeProjectId) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ fontSize: 40 }}>🏗️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>No project selected</h2>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Please log out and log back in to select a project</p>
      </div>
    )
  }`
  )
  fs.writeFileSync(dashPath, dash)
  ok('Dashboard — no-project fallback state added')
} else {
  ok('Dashboard — already has fallback state')
}

// ── FIX 7: index.css — override browser autofill dark background
info('Adding autofill override to index.css...')
const cssPath = path.join(SRC, 'index.css')
let css = fs.readFileSync(cssPath, 'utf8')
if (!css.includes('autofill')) {
  css += `
/* Force white background on browser autofill */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
  -webkit-text-fill-color: #111827 !important;
  background-color: #ffffff !important;
}
`
  fs.writeFileSync(cssPath, css)
  ok('index.css — browser autofill white background override')
} else {
  ok('index.css — autofill override already present')
}

console.log('\n' + G + '\x1b[1m  All v3 fixes applied!\x1b[0m' + NC + '\n')
console.log('  Key fix: Login now reads projects.data[0].id correctly')
console.log('  → Log out, log back in, dashboard should load properly\n')
