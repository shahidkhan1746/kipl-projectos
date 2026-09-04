import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CalendarBlank, CaretLeft, CaretRight, X, ArrowCounterClockwise } from '@phosphor-icons/react'
import { toIndianDisplayDate, parseIndianDateToIso, isValidIndianDate } from '../../lib/date'

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string
  error?: string
  hint?: string
  value?: string | number | Date | null
  onChange?: (e: any) => void
  onDateChange?: (isoDate: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Convert JS Day (0=Sun..6=Sat) to Monday-based index (0=Mon..6=Sun)
function getMondayBasedDayIndex(date: Date): number {
  const day = date.getDay()
  return (day + 6) % 7
}

function parseIsoToYMD(val?: string | number | Date | null): { y: number; m: number; d: number } | null {
  if (!val) return null
  if (val instanceof Date && !isNaN(val.getTime())) {
    return { y: val.getFullYear(), m: val.getMonth(), d: val.getDate() }
  }
  const clean = String(val).split('T')[0].trim()
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const y = parseInt(match[1], 10)
    const m = parseInt(match[2], 10) - 1
    const d = parseInt(match[3], 10)
    if (isValidIndianDate(d, m + 1, y)) return { y, m, d }
  }
  // Try Indian format parse
  const indianIso = parseIndianDateToIso(clean)
  if (indianIso) {
    const p = indianIso.split('-').map(Number)
    return { y: p[0], m: p[1] - 1, d: p[2] }
  }
  return null
}

function formatIsoString(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function formatDisplayDate(y: number, m: number, d: number): string {
  return `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`
}

export function DatePicker({
  label,
  error,
  hint,
  value,
  onChange,
  onDateChange,
  name,
  disabled,
  required,
  placeholder = 'DD/MM/YYYY',
  style,
  id,
  min,
  max,
  ...rest
}: DatePickerProps) {
  const parsedValue = parseIsoToYMD(value)
  const [textValue, setTextValue] = useState<string>(() => {
    if (parsedValue) return formatDisplayDate(parsedValue.y, parsedValue.m, parsedValue.d)
    return toIndianDisplayDate(typeof value === 'string' ? value : '')
  })

  // Sync display text whenever prop value changes
  useEffect(() => {
    const p = parseIsoToYMD(value)
    if (p) {
      setTextValue(formatDisplayDate(p.y, p.m, p.d))
    } else if (!value) {
      setTextValue('')
    }
  }, [value])

  const [isOpen, setIsOpen] = useState(false)
  const now = new Date()
  const [viewYear, setViewYear] = useState<number>(() => parsedValue?.y ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue?.m ?? now.getMonth())

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number; openUp: boolean }>({
    top: 0,
    left: 0,
    width: 290,
    openUp: false,
  })

  // Calculate popover positioning relative to viewport and scroll
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const popoverHeight = 350
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < popoverHeight && rect.top > popoverHeight
    const top = openUp
      ? rect.top + window.scrollY - popoverHeight - 4
      : rect.bottom + window.scrollY + 4

    // Keep horizontally within viewport boundaries
    const targetLeft = rect.left + window.scrollX
    const popoverWidth = Math.max(285, Math.min(320, rect.width))
    const maxLeft = window.innerWidth - popoverWidth - 12
    const left = Math.max(12, Math.min(targetLeft, maxLeft))

    setPopoverPos({ top, left, width: popoverWidth, openUp })
  }, [])

  function openPopover() {
    if (disabled) return
    const p = parseIsoToYMD(value)
    if (p) {
      setViewYear(p.y)
      setViewMonth(p.m)
    } else {
      const today = new Date()
      setViewYear(today.getFullYear())
      setViewMonth(today.getMonth())
    }
    updatePosition()
    setIsOpen(true)
  }

  function closePopover() {
    setIsOpen(false)
  }

  // Handle click outside and escape
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        closePopover()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePopover()
    }
    function handleScrollOrResize() {
      if (isOpen) updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen, updatePosition])

  function emitValue(isoDate: string) {
    if (onDateChange) onDateChange(isoDate)
    if (onChange) {
      onChange({
        target: {
          value: isoDate,
          name: name || '',
        },
      })
    }
  }

  function handleSelectDate(y: number, m: number, d: number) {
    const iso = formatIsoString(y, m, d)
    const display = formatDisplayDate(y, m, d)
    setTextValue(display)
    emitValue(iso)
    closePopover()
  }

  function handleToday() {
    const t = new Date()
    handleSelectDate(t.getFullYear(), t.getMonth(), t.getDate())
  }

  function handleClear() {
    setTextValue('')
    emitValue('')
    closePopover()
  }

  // Handle text input with automatic DD/MM/YYYY masking
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    let digits = raw.replace(/\D/g, '').slice(0, 8) // max 8 digits for DDMMYYYY

    // Backspace handling when raw text decreased and previous text had a trailing slash
    const isBackspace = (e.nativeEvent as any)?.inputType === 'deleteContentBackward'
    if (isBackspace && textValue.endsWith('/') && raw.length < textValue.length) {
      digits = digits.slice(0, -1)
    }

    let formatted = ''
    if (digits.length > 0) {
      formatted = digits.slice(0, 2)
      if (digits.length >= 3) {
        formatted += '/' + digits.slice(2, 4)
      }
      if (digits.length >= 5) {
        formatted += '/' + digits.slice(4, 8)
      }
    }
    setTextValue(formatted)

    if (digits.length === 8) {
      const d = parseInt(digits.slice(0, 2), 10)
      const m = parseInt(digits.slice(2, 4), 10)
      const y = parseInt(digits.slice(4, 8), 10)
      if (isValidIndianDate(d, m, y)) {
        const iso = formatIsoString(y, m - 1, d)
        emitValue(iso)
      }
    } else if (digits.length === 0) {
      emitValue('')
    }
  }

  function handleTextBlur() {
    // If textValue is an incomplete or invalid date, either revert to existing value or clear
    const parsed = parseIndianDateToIso(textValue)
    if (parsed) {
      const p = parseIsoToYMD(parsed)
      if (p) setTextValue(formatDisplayDate(p.y, p.m, p.d))
    } else if (!textValue.trim()) {
      setTextValue('')
      emitValue('')
    } else {
      // Revert to original valid value
      if (parsedValue) {
        setTextValue(formatDisplayDate(parsedValue.y, parsedValue.m, parsedValue.d))
      } else {
        setTextValue('')
        emitValue('')
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  // Generate days grid for viewYear and viewMonth
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDayIdx = getMondayBasedDayIndex(firstDay)
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
  const totalSlots = Math.ceil((startDayIdx + daysInCurrentMonth) / 7) * 7

  const todayYMD = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }

  // Years for quick dropdown (1950 - 2050)
  const yearOptions: number[] = []
  for (let yr = 1950; yr <= 2050; yr++) yearOptions.push(yr)

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, position: 'relative' }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>DD/MM/YYYY</span>
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          {...(rest as any)}
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            padding: '10px 38px 10px 13px',
            background: disabled ? '#f8fafc' : '#ffffff',
            border: '1.5px solid ' + (error ? '#fca5a5' : isOpen ? '#2563eb' : '#d1d5db'),
            borderRadius: 8,
            fontSize: 13,
            color: '#111827',
            outline: 'none',
            width: '100%',
            minWidth: 0,
            fontFamily: 'inherit',
            letterSpacing: textValue ? '0.02em' : 'normal',
            boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxSizing: 'border-box',
            ...style,
          }}
          onFocus={() => {
            updatePosition()
          }}
        />

        {/* Calendar Trigger Button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={e => {
            e.preventDefault()
            if (isOpen) closePopover()
            else openPopover()
          }}
          title="Open calendar (DD/MM/YYYY)"
          style={{
            position: 'absolute',
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 'none',
            background: 'transparent',
            borderRadius: 6,
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: isOpen ? '#2563eb' : '#64748b',
          }}
        >
          <CalendarBlank size={17} weight={isOpen ? 'fill' : 'regular'} />
        </button>
      </div>

      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
      {hint && <span style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</span>}

      {/* Floating Indian Calendar Popover (Portal to body to prevent container clipping) */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: popoverPos.top,
              left: popoverPos.left,
              width: popoverPos.width,
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              padding: '12px 14px',
              zIndex: 999999,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Popover Header: Month & Year Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={prevMonth}
                title="Previous Month"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                <CaretLeft size={14} weight="bold" />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                <select
                  value={viewMonth}
                  onChange={e => setViewMonth(parseInt(e.target.value, 10))}
                  style={{
                    padding: '3px 6px',
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: '#fff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={e => setViewYear(parseInt(e.target.value, 10))}
                  style={{
                    padding: '3px 6px',
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: '#fff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {yearOptions.map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                title="Next Month"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>

            {/* Weekday Labels (Monday First) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                marginBottom: 6,
              }}
            >
              {WEEKDAYS.map((day, idx) => (
                <div
                  key={day}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: idx === 6 ? '#ef4444' : '#64748b',
                    padding: '2px 0',
                    textTransform: 'uppercase',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2,
              }}
            >
              {Array.from({ length: totalSlots }).map((_, index) => {
                let cellDay: number
                let cellMonth = viewMonth
                let cellYear = viewYear
                let isCurrentMonth = true

                if (index < startDayIdx) {
                  // Previous month day
                  cellDay = daysInPrevMonth - (startDayIdx - index - 1)
                  cellMonth = viewMonth === 0 ? 11 : viewMonth - 1
                  cellYear = viewMonth === 0 ? viewYear - 1 : viewYear
                  isCurrentMonth = false
                } else if (index >= startDayIdx + daysInCurrentMonth) {
                  // Next month day
                  cellDay = index - (startDayIdx + daysInCurrentMonth) + 1
                  cellMonth = viewMonth === 11 ? 0 : viewMonth + 1
                  cellYear = viewMonth === 11 ? viewYear + 1 : viewYear
                  isCurrentMonth = false
                } else {
                  // Current month day
                  cellDay = index - startDayIdx + 1
                }

                const isSelected =
                  parsedValue &&
                  parsedValue.y === cellYear &&
                  parsedValue.m === cellMonth &&
                  parsedValue.d === cellDay

                const isToday =
                  todayYMD.y === cellYear &&
                  todayYMD.m === cellMonth &&
                  todayYMD.d === cellDay

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectDate(cellYear, cellMonth, cellDay)}
                    style={{
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                      borderRadius: 6,
                      border: isToday && !isSelected ? '1.5px solid #3b82f6' : 'none',
                      background: isSelected ? '#2563eb' : 'transparent',
                      color: isSelected
                        ? '#ffffff'
                        : !isCurrentMonth
                        ? '#cbd5e1'
                        : isToday
                        ? '#2563eb'
                        : '#0f172a',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#f1f5f9'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {cellDay}
                  </button>
                )
              })}
            </div>

            {/* Popover Footer: Quick Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={handleToday}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                Today
              </button>

              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                DD/MM/YYYY
              </span>

              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}