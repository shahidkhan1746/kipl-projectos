const fs   = require('fs')
const path = require('path')

const BASE = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src')

// ── 1. DiaryPage — ?action=new scrolls to + pulses the "New Entry" button ─────
const diaryPath = path.join(BASE, 'pages', 'diary', 'DiaryPage.tsx')
let diary = fs.readFileSync(diaryPath, 'utf8')

// Add useRef to imports if not present
if (!diary.includes('useRef')) {
  diary = diary.replace(
    `import { useState, useEffect } from 'react'`,
    `import { useState, useEffect, useRef } from 'react'`
  )
  console.log('✅ DiaryPage — added useRef import')
}

// Add useSearchParams import if not already there
if (!diary.includes('useSearchParams')) {
  diary = diary.replace(
    `import { useState, useEffect, useRef } from 'react'`,
    `import { useState, useEffect, useRef } from 'react'\nimport { useSearchParams } from 'react-router-dom'`
  )
  console.log('✅ DiaryPage — added useSearchParams import')
}

// Add ref declaration + deep link effect after existing state
if (!diary.includes('newEntryBtnRef')) {
  diary = diary.replace(
    `  const [autoFilled, setAutoFilled]   = useState(false)`,
    `  const [autoFilled, setAutoFilled]   = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [btnPulse, setBtnPulse]         = useState(false)
  const newEntryBtnRef                  = useRef<HTMLButtonElement>(null)

  // Deep link: /diary?action=new
  // Scrolls to + pulses the New Entry button instead of opening modal
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setSearchParams({})
      setTimeout(() => {
        newEntryBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setBtnPulse(true)
        setTimeout(() => setBtnPulse(false), 2500)
      }, 400)
    }
  }, [searchParams])`
  )
  console.log('✅ DiaryPage — deep link state + effect added')
}

// Add pulse CSS to the page (inject into existing style block or add new one)
if (!diary.includes('@keyframes kipl-pulse')) {
  diary = diary.replace(
    `  return (`,
    `  const pulseStyle = btnPulse ? {
    boxShadow: '0 0 0 4px rgba(37,99,235,0.3), 0 0 0 8px rgba(37,99,235,0.15)',
    animation: 'kipl-pulse 0.6s ease-in-out infinite alternate',
    transform: 'scale(1.04)',
  } : {}

  return (
    <>
    <style>{\`@keyframes kipl-pulse {
      from { box-shadow: 0 0 0 4px rgba(37,99,235,0.3); }
      to   { box-shadow: 0 0 0 10px rgba(37,99,235,0.05); }
    }\`}</style>`
  )

  // Close the fragment — add </> before last )
  diary = diary.replace(/(\n\s*\)\s*\n}[\s]*)$/, '\n    </>\n  )\n}\n')
  console.log('✅ DiaryPage — pulse keyframe + wrapper added')
}

// Attach ref and pulse style to the "New Entry — Today" button
if (!diary.includes('newEntryBtnRef') || !diary.includes('pulseStyle')) {
  diary = diary.replace(
    `        <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => { setShowNew(true); setStep('weather') }}>
          New Entry — Today
        </Button>`,
    `        <Button variant="primary" size="md" icon={<Plus size={15}/>}
          ref={newEntryBtnRef}
          style={pulseStyle}
          onClick={() => { setShowNew(true); setStep('weather') }}>
          New Entry — Today
        </Button>`
  )
  console.log('✅ DiaryPage — New Entry button has ref + pulse style')
}

fs.writeFileSync(diaryPath, diary)

// ── 2. AttendancePage — ?action=mark scrolls to + pulses mark button ──────────
const attPath = path.join(BASE, 'pages', 'hr', 'AttendancePage.tsx')
let att = fs.readFileSync(attPath, 'utf8')

if (!att.includes('useRef')) {
  att = att.replace(
    `import { useState } from 'react'`,
    `import { useState, useEffect, useRef } from 'react'`
  )
  console.log('✅ AttendancePage — added useRef, useEffect imports')
}

if (!att.includes('useSearchParams')) {
  att = att.replace(
    `import { useState, useEffect, useRef } from 'react'`,
    `import { useState, useEffect, useRef } from 'react'\nimport { useSearchParams } from 'react-router-dom'`
  )
  console.log('✅ AttendancePage — added useSearchParams import')
}

if (!att.includes('markBtnRef')) {
  att = att.replace(
    `  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])`,
    `  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchParams, setSearchParams] = useSearchParams()
  const [btnPulse, setBtnPulse]         = useState(false)
  const markBtnRef                      = useRef<HTMLButtonElement>(null)

  // Deep link: /hr/attendance?action=mark
  // Scrolls to + pulses the Mark Attendance button
  useEffect(() => {
    if (searchParams.get('action') === 'mark') {
      setSearchParams({})
      setTimeout(() => {
        markBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setBtnPulse(true)
        setTimeout(() => setBtnPulse(false), 2500)
      }, 400)
    }
  }, [searchParams])`
  )
  console.log('✅ AttendancePage — deep link state + effect added')
}

// Add pulse style to attendance page
if (!att.includes('@keyframes kipl-pulse')) {
  att = att.replace(
    `  return (`,
    `  const pulseStyle: React.CSSProperties = btnPulse ? {
    boxShadow: '0 0 0 4px rgba(37,99,235,0.3), 0 0 0 8px rgba(37,99,235,0.15)',
    animation: 'kipl-pulse 0.6s ease-in-out infinite alternate',
    transform: 'scale(1.04)',
  } : {}

  return (
    <>
    <style>{\`@keyframes kipl-pulse {
      from { box-shadow: 0 0 0 4px rgba(37,99,235,0.3); }
      to   { box-shadow: 0 0 0 10px rgba(37,99,235,0.05); }
    }\`}</style>`
  )
  att = att.replace(/(\n\s*\)\s*\n}[\s]*)$/, '\n    </>\n  )\n}\n')
  console.log('✅ AttendancePage — pulse keyframe + wrapper added')
}

// Find the "Mark Attendance" button and attach ref + pulse
// It's likely a Button or button that opens setMarkModal(true)
if (!att.includes('markBtnRef')) {
  att = att.replace(
    /(<[Bb]utton[^>]*)(onClick=\{[^}]*setMarkModal\(true\)[^}]*\})/,
    `$1ref={markBtnRef} style={pulseStyle} $2`
  )
  console.log('✅ AttendancePage — Mark button has ref + pulse style')
}

fs.writeFileSync(attPath, att)

// ── 3. TasksPage — ?taskId=xxx highlights that card ───────────────────────────
const tasksPath = path.join(BASE, 'pages', 'tasks', 'TasksPage.tsx')
let tasks = fs.readFileSync(tasksPath, 'utf8')

if (!tasks.includes('useRef')) {
  tasks = tasks.replace(
    `import { useState } from 'react'`,
    `import { useState, useEffect, useRef } from 'react'`
  )
}

if (!tasks.includes('useSearchParams')) {
  tasks = tasks.replace(
    `import { useState, useEffect, useRef } from 'react'`,
    `import { useState, useEffect, useRef } from 'react'\nimport { useSearchParams } from 'react-router-dom'`
  )
}

if (!tasks.includes('highlightTaskId')) {
  tasks = tasks.replace(
    `  const [view, setView]         = useState<View>('kanban')`,
    `  const [view, setView]         = useState<View>('kanban')
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null)

  // Deep link: /tasks?taskId=xxx → highlight that task card for 3 seconds
  // Deep link: /tasks?action=new → open new task modal
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    const action = searchParams.get('action')
    if (taskId) {
      setHighlightTaskId(taskId)
      setSearchParams({})
      // Scroll to the highlighted card
      setTimeout(() => {
        const el = document.getElementById('task-card-' + taskId)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 400)
      // Clear highlight after 3s
      setTimeout(() => setHighlightTaskId(null), 3000)
    }
    if (action === 'new') {
      setShowNew(true)
      setSearchParams({})
    }
  }, [searchParams])`
  )
  console.log('✅ TasksPage — highlightTaskId deep link added')
}

// Add highlight style to task cards — find the card rendering and add id + highlight border
// The kanban cards likely have a key={task.id}, we add id="task-card-{id}" and conditional border
if (!tasks.includes('task-card-')) {
  // Find task card in kanban — look for style with borderRadius and the task map
  tasks = tasks.replace(
    /key=\{(task|t|item)\.id\}\s+style=\{\{([^}]+borderRadius[^}]+)\}\}/,
    (match, varName, styles) => {
      return `key={${varName}.id}
                id={"task-card-" + ${varName}.id}
                style={{${styles},
                  border: highlightTaskId === ${varName}.id
                    ? '2px solid #2563eb'
                    : undefined,
                  boxShadow: highlightTaskId === ${varName}.id
                    ? '0 0 0 4px rgba(37,99,235,0.2)'
                    : undefined,
                  transition: 'box-shadow 0.3s, border 0.3s',
                }}`
    }
  )
  console.log('✅ TasksPage — task cards have id + highlight border')
}

fs.writeFileSync(tasksPath, tasks)

// ── 4. Update AppHeader — remove ?action=new from diary/attendance routes ──────
const headerPath = path.join(BASE, 'components', 'layout', 'AppHeader.tsx')
let header = fs.readFileSync(headerPath, 'utf8')

// Diary: keep ?action=new — the page now handles it by scrolling to button (not opening modal)
// Attendance: keep ?action=mark — same
// These are correct now — the PAGES handle the params gracefully

// Update the notification body text to be more actionable
header = header.replace(
  `"Today's Site Diary Not Filed"`,
  `'📋 Today\\'s Site Diary Not Filed'`
)
header = header.replace(
  `"Today's Diary in Draft"`,
  `'📝 Today\\'s Diary in Draft — Click to file'`
)
header = header.replace(
  `"Attendance Not Marked Today"`,
  `'🧑‍💼 Attendance Not Marked Today'`
)

fs.writeFileSync(headerPath, header)
console.log('✅ AppHeader — notification labels updated')

console.log('\n' + '─'.repeat(60))
console.log('🎉 Deep links complete — NO MODALS, proper page navigation:')
console.log('')
console.log('  /diary?action=new')
console.log('    → Page loads → "New Entry — Today" button pulses blue for 2.5s')
console.log('    → Scrolls into view so user sees exactly what to click')
console.log('')
console.log('  /hr/attendance?action=mark')
console.log('    → Page loads → "Mark Attendance" button pulses blue for 2.5s')
console.log('    → Scrolls into view')
console.log('')
console.log('  /tasks?taskId=XXXX')
console.log('    → Page loads → That specific task card glows blue border for 3s')
console.log('    → Scrolls to it on kanban board')
console.log('')
console.log('  Pulse animation: blue glow that breathes in/out — impossible to miss')
