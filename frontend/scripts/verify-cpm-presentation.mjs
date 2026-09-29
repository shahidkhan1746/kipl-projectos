// Local, isolated UI regression check. Every API request is fulfilled with fixtures.
// Usage: node scripts/verify-cpm-presentation.mjs [http://127.0.0.1:5173] [chrome|edge]
// No production credentials, requests, schedule writes or database access.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = process.argv[2] || 'http://127.0.0.1:5173'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Only a local dev server is permitted')
const browserName = process.argv[3] || 'chrome'
const executablePath = browserName === 'edge'
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const output = join(tmpdir(), 'kipl-cpm-presentation')
await mkdir(output, { recursive: true })
const user = { id: 'preview-user', name: 'Design Preview', email: 'preview@example.invalid', role: 'super_admin' }
const project = { id: 'preview-project', name: 'Dal Lake Sewerage Scheme — Design Preview', code: 'PREVIEW', status: 'active', client: 'Project schedule preview', location: 'Srinagar' }
const task = (code, title, start, finish, extra = {}) => ({ id: `task-${code}`, wbsCode: code, title,
  plannedStart: start, plannedEnd: finish, plannedDuration: 90, status: 'not_started',
  progressPct: 0, level: 1, totalFloat: 20, earliestStart: 0, earliestFinish: 90,
  dependencies: [], isMilestone: false, isCritical: false, ...extra })
const tasks = [
  task('0', 'Contract commencement', '2025-11-07', '2025-11-07', { plannedDuration: 0, status: 'completed', progressPct: 100, isMilestone: true }),
  task('1', 'Survey, design & engineering', '2025-11-07', '2026-05-06', { status: 'completed', progressPct: 100, dependencies: [{ code: '0', type: 'FS', lag: 0 }] }),
  task('2', 'STP civil & supporting works', '2026-04-07', '2027-09-30', { status: 'in_progress', progressPct: 35, dependencies: [{ code: '1', type: 'SS', lag: 150 }] }),
  task('2.1', 'Ground improvement & foundations', '2026-04-07', '2026-12-31', { parentId: '2', level: 2, status: 'in_progress', progressPct: 65, dependencies: [{ code: '1', type: 'SS', lag: 150 }] }),
  task('2.2', 'Process units and concrete structures', '2027-01-01', '2027-06-30', { parentId: '2', level: 2, dependencies: [{ code: '2.1', type: 'FS', lag: 0 }] }),
  task('2.3', 'Administration, blower & utility buildings', '2027-03-01', '2027-09-30', { parentId: '2', level: 2, dependencies: [{ code: '2.1', type: 'FS', lag: 60 }] }),
  task('3', 'Sewer network & appurtenant works', '2026-10-01', '2028-03-31', { isCritical: true, totalFloat: 0, dependencies: [{ code: '1', type: 'FS', lag: 0 }] }),
  task('3.1', 'Work-front release & utility coordination', '2026-10-01', '2026-10-01', { parentId: '3', level: 2, status: 'on_hold', isMilestone: true, dependencies: [{ code: '1', type: 'FS', lag: 0 }] }),
  task('3.2', 'Trunk sewers and rising mains', '2026-10-02', '2027-07-31', { parentId: '3', level: 2, isCritical: true, totalFloat: 0, dependencies: [{ code: '3.1', type: 'FS', lag: 0 }] }),
  task('3.3', 'Lateral sewer connections and manholes', '2027-01-01', '2028-01-31', { parentId: '3', level: 2, isCritical: true, totalFloat: 0, dependencies: [{ code: '3.2', type: 'SS', lag: 90 }] }),
  task('3.4', 'Permanent road reinstatement', '2027-05-01', '2028-03-31', { parentId: '3', level: 2, isCritical: true, totalFloat: 0, dependencies: [{ code: '3.3', type: 'SS', lag: 120 }] }),
  task('4', 'E&M, electrical and instrumentation', '2026-10-01', '2028-02-29', { dependencies: [{ code: '2.2', type: 'SS', lag: 0 }] }),
  task('4.1', 'Long-lead equipment procurement / TPI', '2026-10-01', '2027-06-30', { parentId: '4', level: 2, dependencies: [{ code: '1', type: 'FS', lag: 0 }] }),
  task('4.2', 'Erection, electrical and local automation', '2027-07-01', '2028-02-29', { parentId: '4', level: 2, dependencies: [{ code: '4.1', type: 'FS', lag: 0 }, { code: '2.2', type: 'FS', lag: 0 }] }),
  task('5', 'Integrated wet commissioning', '2028-04-01', '2028-04-30', { isCritical: true, totalFloat: 0, dependencies: [{ code: '4.2', type: 'FS', lag: 0 }, { code: '3.4', type: 'FS', lag: 0 }] }),
  task('M1', 'Contract completion milestone', '2028-05-07', '2028-05-07', { plannedDuration: 0, isCritical: true, isMilestone: true, totalFloat: 0, dependencies: [{ code: '5', type: 'FS', lag: 0 }] }),
  task('6', 'Six-month free trial run', '2028-05-08', '2028-11-07', { dependencies: [{ code: 'M1', type: 'FS', lag: 0 }] }),
]
const dashboard = { contractStart: '2025-11-07', contractEnd: '2028-05-07', contractPct: '35', overallProgress: '22', daysRemaining: 500, completed: 2, totalTasks: tasks.length, delayed: 0, inProgress: 2, criticalTasks: 6, milestonesHit: 1, milestones: 3 }
const browser = await chromium.launch({ executablePath, headless: true })
let debugPage
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, acceptDownloads: true })
  let empty = false
  let fixtureTasks = tasks
  const requests = [], errors = []
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return url.origin === new URL(base).origin ? route.continue() : route.abort()
    requests.push({ path: url.pathname, method: route.request().method() })
    let body = []
    if (url.pathname.endsWith('/auth/refresh')) body = { user, access_token: 'local-preview-only', refresh_token: 'local-preview-only' }
    else if (url.pathname.endsWith('/auth/me')) body = user
    else if (url.pathname.endsWith('/projects')) body = [project]
    else if (url.pathname.endsWith('/wbs/dashboard')) body = dashboard
    else if (url.pathname.endsWith('/wbs')) body = empty ? [] : fixtureTasks
    else if (url.pathname.includes('/settings')) body = {}
    else if (url.pathname.includes('/dashboard')) body = {}
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await context.addInitScript(({ user, project }) => {
    localStorage.setItem('kipl-auth', JSON.stringify({ state: { user, activeProjectId: project.id, refreshToken: 'local-preview-only' }, version: 3 }))
    sessionStorage.setItem(`data_modal_dismissed_${new Date().toDateString()}_${user.id}`, 'true')
  }, { user, project })
  const page = await context.newPage()
  debugPage = page
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/wbs`)
  await page.getByRole('button', { name: 'CPM Timeline', exact: true }).click()
  const presentation = page.getByRole('region', { name: 'CPM Timeline presentation', exact: true })
  await presentation.locator('.cpm-table tbody tr').last().waitFor()
  assert.equal(await presentation.locator('.cpm-table tbody tr').count(), tasks.length)
  assert.equal(await page.locator('vite-error-overlay').count(), 0)
  await presentation.scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(output, `${browserName}-programme-desktop.png`), fullPage: true })
  await presentation.locator('.cpm-sheet').screenshot({ path: join(output, `${browserName}-programme-sheet.png`) })
  await presentation.getByRole('button', { name: 'CPM Node Network', exact: true }).click()
  assert.equal(await presentation.locator('svg g[role="button"]').count(), tasks.length)
  await presentation.locator('svg g[role="button"]').first().focus()
  await page.keyboard.press('Enter')
  assert.ok(await presentation.getByRole('heading', { name: 'ACTIVITY 0', exact: true }).isVisible())
  await presentation.locator('.cpm-sheet').screenshot({ path: join(output, `${browserName}-network-sheet.png`) })
  const downloadPromise = page.waitForEvent('download')
  await presentation.getByRole('button', { name: 'Download Node SVG', exact: true }).click()
  const download = await downloadPromise
  const svg = await readFile(await download.path(), 'utf8')
  assert.ok(svg.includes('Activity-on-node CPM network') && svg.includes('xmlns="http://www.w3.org/2000/svg"'))
  assert.ok(!svg.includes('<script'))
  await presentation.getByLabel('Timeline activity scope').selectOption('milestones')
  assert.equal(await presentation.locator('svg g[role="button"]').count(), tasks.filter(t => t.isMilestone).length)
  await presentation.getByLabel('Timeline activity scope').selectOption('all')
  await presentation.getByLabel('Sheet zoom').selectOption('1.25')
  assert.match(await presentation.locator('.cpm-sheet').getAttribute('style'), /1\.25/)
  await presentation.getByRole('button', { name: 'Fit', exact: true }).click()
  // Intercept only the native print dialog, preserving the actual isolated print document.
  await page.evaluate(() => {
    const original = document.createElement.bind(document)
    document.createElement = function (tag, options) {
      const element = original(tag, options)
      if (tag === 'iframe') element.addEventListener('load', () => { element.contentWindow.print = () => {} })
      return element
    }
  })
  await presentation.getByRole('button', { name: 'Print / Save A3 PDF', exact: true }).click()
  const printFrame = page.frameLocator('iframe[title="CPM A3 print preview"]')
  await printFrame.locator('.cpm-sheet').waitFor()
  assert.equal(await printFrame.locator('.cpm-toolbar').count(), 0)
  assert.equal(await printFrame.locator('svg g').count() > 0, true)
  assert.ok(await printFrame.locator('style').textContent().then(text => text.includes('size:A3 landscape')))
  // Render the print document through Chromium's PDF engine to check page size/layout.
  const printHtml = await page.locator('iframe[title="CPM A3 print preview"]').getAttribute('srcdoc')
  const printPage = await context.newPage()
  await printPage.setContent(printHtml)
  await printPage.pdf({ path: join(output, `${browserName}-network-a3.pdf`), preferCSSPageSize: true, printBackground: true })
  await printPage.close()
  await presentation.getByRole('button', { name: 'Gantt / Time Programme', exact: true }).click()
  await presentation.getByRole('button', { name: 'Print / Save A3 PDF', exact: true }).click()
  await printFrame.locator('.cpm-table tbody tr').last().waitFor()
  assert.equal(await printFrame.locator('.cpm-table tbody tr').count(), tasks.length)
  const programmePrint = await context.newPage()
  await programmePrint.setContent(await page.locator('iframe[title="CPM A3 print preview"]').getAttribute('srcdoc'))
  await programmePrint.pdf({ path: join(output, `${browserName}-programme-a3.pdf`), preferCSSPageSize: true, printBackground: true })
  await programmePrint.close()
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await presentation.scrollIntoViewIfNeeded()
    const bounds = await presentation.boundingBox()
    assert.ok(bounds.width <= width && bounds.x >= 0, `Presentation exceeds ${width}px viewport`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Page has horizontal overflow')
    const scroll = presentation.getByRole('region', { name: 'Scrollable A3 programme sheet' })
    assert.ok(await scroll.evaluate(el => el.scrollWidth > el.clientWidth), 'Small screens should scroll the sheet, not shrink text away')
    await scroll.evaluate(el => { el.scrollLeft = 180; el.scrollTop = 120 })
    await page.screenshot({ path: join(output, `${browserName}-programme-${width}.png`), fullPage: true })
  }
  // A long serial network must remain readable on a phone without overflowing
  // the application itself. These are display fixtures, never schedule writes.
  fixtureTasks = Array.from({ length: 30 }, (_, index) => task(`L${index + 1}`, `Long network activity ${index + 1}`, '2026-01-01', '2026-02-01', {
    dependencies: index ? [{ code: `L${index}`, type: 'FS', lag: 0 }] : [],
  }))
  await page.reload()
  await page.getByRole('button', { name: 'CPM Timeline', exact: true }).click()
  await presentation.getByRole('button', { name: 'CPM Node Network', exact: true }).click()
  await presentation.getByLabel('Sheet zoom').selectOption('nodes')
  const card = await presentation.locator('svg g[role="button"] > rect').first().boundingBox()
  assert.ok(card.width >= 179, `Readable mode shrank a node to ${card.width}px`)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Long network overflows the page')
  await presentation.locator('svg g[role="button"]').first().focus()
  await page.keyboard.press('Enter')
  assert.ok(await presentation.getByRole('heading', { name: 'ACTIVITY L1', exact: true }).isVisible())
  await page.screenshot({ path: join(output, `${browserName}-long-network-mobile.png`), fullPage: true })
  await presentation.getByRole('button', { name: 'Gantt / Time Programme', exact: true }).click()
  assert.equal(await presentation.getByLabel('Sheet zoom').inputValue(), 'fit')
  empty = true
  await page.reload()
  await page.getByRole('button', { name: 'CPM Timeline', exact: true }).click()
  await presentation.getByText('No activities to display.', { exact: true }).waitFor()
  assert.equal(await presentation.locator('.cpm-table').count(), 0)
  assert.equal(requests.filter(r => /\/wbs\/(cpm|recalculate|remodel-dependencies|seed)/.test(r.path)).length, 0, 'Presentation must not recalculate or seed')
  assert.equal(requests.filter(r => r.path.includes('/wbs') && r.method !== 'GET').length, 0)
  assert.deepEqual(errors, [], 'Browser runtime errors')
  console.log(JSON.stringify({ browser: browserName, passed: true, rows: tasks.length, viewports: [1600, 768, 390], output, checks: 'both views, keyboard node details, scope, zoom, SVG, isolated A3 print, 30-stage readable network, empty state, no schedule mutations' }, null, 2))
} catch (error) {
  if (debugPage && !debugPage.isClosed()) {
    await debugPage.screenshot({ path: join(output, `${browserName}-failure.png`), fullPage: true })
    console.error('Preview page:', await debugPage.locator('body').innerText().then(text => text.slice(0, 1600)))
  }
  throw error
} finally { await browser.close() }
