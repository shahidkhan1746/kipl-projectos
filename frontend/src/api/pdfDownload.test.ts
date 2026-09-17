import { describe, it, expect } from 'vitest'
import { readErrorBody, describeDownloadFailure, looksLikePdf } from './pdfDownload'

const blob = (text: string) => new Blob([text], { type: 'application/json' })
const failure = (status: number, data: unknown) => ({ response: { status, data } })

describe('readErrorBody', () => {
  it('reads the message out of an unparsed blob, which is what axios hands back', async () => {
    const body = blob(JSON.stringify({ statusCode: 404, message: 'Salary record not found' }))
    expect(await readErrorBody(body)).toBe('Salary record not found')
  })

  it('reads a validation array from a blob', async () => {
    const body = blob(JSON.stringify({ message: ['date is required', 'and more'] }))
    expect(await readErrorBody(body)).toBe('date is required')
  })

  it('flags an HTML body, which means something other than the API answered', async () => {
    expect(await readErrorBody(blob('<!DOCTYPE html><html></html>')))
      .toBe('the reply was an HTML page, not a PDF')
  })

  it('reads an already-parsed object too', async () => {
    expect(await readErrorBody({ message: 'Employee not found' })).toBe('Employee not found')
  })

  it('reads a plain JSON string body', async () => {
    expect(await readErrorBody(JSON.stringify({ message: 'nope' }))).toBe('nope')
  })

  it('is nothing when the body says nothing usable', async () => {
    expect(await readErrorBody(null)).toBeNull()
    expect(await readErrorBody(undefined)).toBeNull()
    expect(await readErrorBody(blob(''))).toBeNull()
    expect(await readErrorBody(blob('not json at all'))).toBeNull()
    expect(await readErrorBody(blob(JSON.stringify({ statusCode: 500 })))).toBeNull()
  })

  it('clips a body long enough to be a stack trace', async () => {
    const said = await readErrorBody(blob(JSON.stringify({ message: 'x'.repeat(400) })))
    expect(said).toHaveLength(201)
  })
})

describe('describeDownloadFailure', () => {
  it('joins the status to what the server said', async () => {
    const said = await describeDownloadFailure(
      failure(404, blob(JSON.stringify({ message: 'Salary record not found' }))),
    )
    expect(said).toContain('404')
    expect(said).toContain('Salary record not found')
  })

  // The failure actually reported: the route exists here and not on the server
  // answering, because the API is running an older build.
  it('names a bare 404 as a possible stale backend rather than leaving it blank', async () => {
    const said = await describeDownloadFailure(failure(404, blob('')))
    expect(said).toContain('older build')
  })

  it('does not blame the build when the server explained itself', async () => {
    const said = await describeDownloadFailure(
      failure(404, blob(JSON.stringify({ message: 'Salary record not found' }))),
    )
    expect(said).not.toContain('older build')
  })

  it('describes a failure that never got a response', async () => {
    expect(await describeDownloadFailure({ code: 'ECONNABORTED' })).toContain('no response')
  })

  it('describes a server error', async () => {
    expect(await describeDownloadFailure(failure(500, blob('')))).toContain('500')
  })
})

describe('looksLikePdf', () => {
  it('accepts the PDF content type, with or without parameters', () => {
    expect(looksLikePdf('application/pdf')).toBe(true)
    expect(looksLikePdf('application/pdf; charset=binary')).toBe(true)
    expect(looksLikePdf('APPLICATION/PDF')).toBe(true)
  })

  it('rejects what a catch-all route answers with', () => {
    expect(looksLikePdf('text/html; charset=utf-8')).toBe(false)
    expect(looksLikePdf('application/json')).toBe(false)
  })

  it('rejects a missing or non-string header rather than assuming', () => {
    expect(looksLikePdf(undefined)).toBe(false)
    expect(looksLikePdf(null)).toBe(false)
    expect(looksLikePdf(123)).toBe(false)
  })
})
