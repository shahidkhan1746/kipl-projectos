/**
 * Indian Date Formatting Utility
 * Standardizes all date displays across KIPL ProjectOS to Indian style: DD/MM/YYYY or DD MMM YYYY.
 */

export function formatIndianDate(
  dateInput: string | number | Date | null | undefined,
  options?: {
    separator?: '/' | '-' | '.'
    showMonthName?: boolean
    shortMonth?: boolean
    withDayName?: boolean
  }
): string {
  if (!dateInput) return '—'

  let d: Date
  if (dateInput instanceof Date) {
    d = dateInput
  } else if (typeof dateInput === 'string') {
    // If string is already in YYYY-MM-DD or ISO format
    const clean = dateInput.trim()
    if (!clean) return '—'
    
    // Quick parse for YYYY-MM-DD without UTC timezone offset shift
    const ymdMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10)
      const month = parseInt(ymdMatch[2], 10) - 1
      const day = parseInt(ymdMatch[3], 10)
      d = new Date(year, month, day)
    } else {
      d = new Date(clean)
    }
  } else {
    d = new Date(dateInput)
  }

  if (isNaN(d.getTime())) return String(dateInput)

  const day = String(d.getDate()).padStart(2, '0')
  const monthNum = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  if (options?.showMonthName) {
    const monthName = d.toLocaleDateString('en-IN', {
      month: options.shortMonth ? 'short' : 'long',
    })
    if (options?.withDayName) {
      const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' })
      return `${weekday}, ${day} ${monthName} ${year}`
    }
    return `${day} ${monthName} ${year}`
  }

  const sep = options?.separator ?? '/'
  return `${day}${sep}${monthNum}${sep}${year}`
}

/**
 * Standard DD/MM/YYYY formatting
 * e.g. '2026-07-27' -> '27/07/2026'
 */
export function formatDate(dateInput: any): string {
  return formatIndianDate(dateInput, { separator: '/' })
}

/**
 * DD-MM-YYYY formatting
 * e.g. '2026-07-27' -> '27-07-2026'
 */
export function formatDateDash(dateInput: any): string {
  return formatIndianDate(dateInput, { separator: '-' })
}

/**
 * Readable Indian date with month name
 * e.g. '2026-07-27' -> '27 Jul 2026'
 */
export function formatDateReadable(dateInput: any): string {
  return formatIndianDate(dateInput, { showMonthName: true, shortMonth: true })
}

/**
 * Full Indian date with weekday
 * e.g. '2026-07-27' -> 'Mon, 27 Jul 2026'
 */
export function formatDateFull(dateInput: any): string {
  return formatIndianDate(dateInput, { showMonthName: true, shortMonth: true, withDayName: true })
}

/**
 * Converts ISO string 'YYYY-MM-DD' or timestamp to Indian 'DD/MM/YYYY'
 */
export function toIndianDisplayDate(isoDateStr?: string | null): string {
  if (!isoDateStr) return ''
  const clean = String(isoDateStr).split('T')[0].trim()
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const [, y, m, d] = match
    return `${d}/${m}/${y}`
  }
  return ''
}

/**
 * Checks if day, month, year represents a real calendar date
 */
export function isValidIndianDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2150) return false
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

/**
 * Converts Indian 'DD/MM/YYYY' or 'DD-MM-YYYY' to ISO 'YYYY-MM-DD'
 */
export function parseIndianDateToIso(indianDateStr?: string | null): string | null {
  if (!indianDateStr) return null
  const cleaned = indianDateStr.trim().replace(/[^0-9/.-]/g, '')
  const parts = cleaned.split(/[/.-]/)
  if (parts.length === 3) {
    const [d, m, y] = parts
    const day = parseInt(d, 10)
    const month = parseInt(m, 10)
    const year = parseInt(y, 10)
    if (isValidIndianDate(day, month, year)) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  return null
}

