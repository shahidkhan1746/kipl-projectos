// Isolated UI smoke test: all APIs mocked; no production requests or writes.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const browserName = process.argv[2] || 'chrome'
const base = 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true, executablePath: browserName === 'edge' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const user = { id: 'preview-user', name: 'Preview', email: 'preview@example.invalid', role: 'super_admin' }
const project = { id: 'preview-project', name: 'Office preview', code: 'PREVIEW', status: 'active' }
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  let items = []
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return url.origin === base ? route.continue() : route.abort()
    let data = []
    if (url.pathname.endsWith('/health')) data = { service: 'kipl-projectos-api', status: 'ok' }
    else if (url.pathname.endsWith('/auth/refresh')) data = { user, access_token: 'local-preview-only', refresh_token: 'local-preview-only' }
    else if (url.pathname.endsWith('/auth/me')) data = user
    else if (url.pathname.endsWith('/projects')) data = [project]
    else if (url.pathname.endsWith('/assets')) {
      if (route.request().method() === 'POST') {
        data = { ...route.request().postDataJSON(), id: 'preview-asset', assetTag: 'KIPL-AST-000001', status: 'available', version: 1, createdAt: new Date().toISOString() }
        items.push(data)
      } else data = { items, total: items.length, page: 1, pageSize: 25, counts: { available: items.length } }
    } else if (url.pathname.includes('/settings') || url.pathname.includes('/dashboard')) data = {}
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
  await context.addInitScript(({ user, project }) => {
    localStorage.setItem('kipl-auth', JSON.stringify({ state: { user, activeProjectId: project.id, refreshToken: 'local-preview-only' }, version: 3 }))
    sessionStorage.setItem(`data_modal_dismissed_${new Date().toDateString()}_${user.id}`, 'true')
  }, { user, project })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/assets`)
  await page.getByRole('heading', { name: 'Start your office asset register' }).waitFor()
  await page.getByRole('button', { name: 'Register your first asset' }).click()
  // Submitting empty shows the problems beside their fields, and sends nothing.
  await page.getByRole('dialog').getByRole('button', { name: 'Register asset', exact: true }).click()
  await page.getByText('Give the asset a name staff will recognise.').first().waitFor()
  assert.equal(items.length, 0)
  await page.getByRole('radio', { name: 'Laptop', exact: true }).check({ force: true })
  await page.getByLabel('Asset name').fill('Office laptop')
  await page.getByLabel('Office / room / location').fill('Office A')
  await page.getByRole('dialog').getByRole('button', { name: 'Register asset', exact: true }).click()
  // The success screen shows the permanent tag the server issued.
  await page.getByText('KIPL-AST-000001').first().waitFor()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'View KIPL-AST-000001' }).waitFor()
  assert.equal(items.length, 1)
  await page.screenshot({ path: join(tmpdir(), `assets-${browserName}-desktop.png`), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Page must not overflow horizontally')
  await page.getByRole('button', { name: 'Register asset', exact: true }).click()
  await page.getByLabel('Asset name').waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile form must fit viewport')
  await page.screenshot({ path: join(tmpdir(), `assets-${browserName}-mobile.png`), fullPage: true })
  assert.equal(await page.locator('vite-error-overlay').count(), 0)
  assert.deepEqual(errors, [])
  console.log(`${browserName}: empty state, register, list, desktop/mobile layout and runtime-error checks passed`)
} finally { await browser.close() }
