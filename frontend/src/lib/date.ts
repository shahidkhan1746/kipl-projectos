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
