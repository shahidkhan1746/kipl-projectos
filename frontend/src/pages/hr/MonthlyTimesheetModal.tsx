import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DownloadSimple, Printer, PaperPlaneTilt, CheckCircle, FileText } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { hrApi } from '@/api/hr.api'
import { toast } from '@/lib/notify'
import { generateMonthlyTimesheetPdf, type MonthlyTimesheetDay } from './monthlyTimesheetPdf'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

interface MonthlyTimesheetModalProps {
  open: boolean
  onClose: () => void
  initialMonth: number
  initialYear: number
  initialEmployeeId?: string
  employees: any[]
  meEmp?: any
  activeProjectId?: string | null
  activeProjectName?: string
}

export function MonthlyTimesheetModal({
  open,
  onClose,
  initialMonth,
  initialYear,
  initialEmployeeId,
  employees,
  meEmp,
  activeProjectId,
  activeProjectName,
}: MonthlyTimesheetModalProps) {
  const qc = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth)
  const [selectedYear, setSelectedYear] = useState<number>(initialYear)
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || meEmp?.id || '')
  const [projectName, setProjectName] = useState<string>(
    activeProjectName || 'Sewerage Scheme Dal Lake (Uncovered Areas)'
  )
  const [departmentName, setDepartmentName] = useState<string>(
    'Urban Environment & Engineering Department, Srinagar'
  )
  const [days, setDays] = useState<MonthlyTimesheetDay[]>([])
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Sync state if props change when opening
  useEffect(() => {
    if (open) {
      setSelectedMonth(initialMonth)
      setSelectedYear(initialYear)
      if (initialEmployeeId) {
        setSelectedEmpId(initialEmployeeId)
      } else if (meEmp?.id && !selectedEmpId) {
        setSelectedEmpId(meEmp.id)
      }
      if (activeProjectName) {
        setProjectName(activeProjectName)
      }
    }
  }, [open, initialMonth, initialYear, initialEmployeeId, meEmp?.id, activeProjectName])

  // Fetch timesheets for selected month & employee
  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['monthly-timesheet-proforma', selectedMonth, selectedYear, selectedEmpId, activeProjectId],
    queryFn: async () => {
      const res = await hrApi.timesheets({
        month: selectedMonth + 1,
        year: selectedYear,
        employeeId: selectedEmpId || undefined,
        projectId: activeProjectId || undefined,
      })
      return res.data || []
    },
    enabled: open && !!selectedEmpId,
  })

  // Selected employee object & name
  const currentEmp = employees.find((e: any) => e.id === selectedEmpId) || meEmp
  const employeeName = currentEmp
    ? `${currentEmp.firstName || ''} ${currentEmp.lastName || ''}`.trim() || currentEmp.name || 'Shahid'
    : 'Shahid'

  // Build the full 1..N days array when timesheets or month/year changes
  useEffect(() => {
    if (!open) return
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const tsByDate = new Map<string, any>()
    timesheets.forEach((ts: any) => {
      const dStr = typeof ts.date === 'string' ? ts.date.split('T')[0] : ''
      if (dStr) tsByDate.set(dStr, ts)
    })

    const builtDays: MonthlyTimesheetDay[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dayNumStr = String(d).padStart(2, '0')
      const monthNumStr = String(selectedMonth + 1).padStart(2, '0')
      const fullDate = `${selectedYear}-${monthNumStr}-${dayNumStr}`
      const dateObj = new Date(selectedYear, selectedMonth, d)
      const isSunday = dateObj.getDay() === 0
      const dateStr = `${d}-${MONTH_SHORT[selectedMonth]}-${selectedYear}`

      const ts = tsByDate.get(fullDate)
      let activity = ''
      let status = 'draft'

      if (ts) {
        activity = ts.workDoneSummary || ts.activities?.[0]?.activity || (isSunday ? 'Sunday' : '')
        status = ts.status || 'draft'
      } else if (isSunday) {
        activity = 'Sunday'
        status = 'approved'
      }

      builtDays.push({
        day: d,
        dateStr,
        fullDate,
        activity,
        isSunday,
        isHoliday: isSunday,
        status,
      })
    }

    setDays(builtDays)
  }, [timesheets, selectedMonth, selectedYear, open])

  // Update activity text for a day inline
  const updateDayActivity = (dayIndex: number, text: string) => {
    setDays((prev) => {
      const copy = [...prev]
      copy[dayIndex] = { ...copy[dayIndex], activity: text }
      return copy
    })
  }

  // Download high-resolution vector PDF
  const handleDownloadPdf = async () => {
    try {
      await generateMonthlyTimesheetPdf({
        companyName: 'KHILARI INFRASTRUCTURE PVT. LTD.',
        title: 'MONTHLY TIME SHEET',
        project: projectName,
        department: departmentName,
        monthLabel: `${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
        employeeName,
        days,
      })
      toast.success('Monthly Time Sheet PDF downloaded successfully')
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + (err?.message || 'Unknown error'))
    }
  }

  // Print Proforma using clean print window
  const handlePrint = () => {
    const printArea = document.getElementById('monthly-timesheet-print-area')
    if (!printArea) {
      toast.error('Could not locate printable preview')
      return
    }

    const printWin = window.open('', '_blank', 'width=920,height=800')
    if (!printWin) {
      toast.error('Please allow popups to open the print view')
      return
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Time Sheet - ${employeeName} (${MONTH_NAMES[selectedMonth]} ${selectedYear})</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 14mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11px;
              line-height: 1.4;
            }
            .print-container { width: 100%; max-width: 800px; margin: 0 auto; }
            .header-banner { display: flex; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1; }
            .header-logo { height: 44px; width: 44px; object-fit: contain; }
            .header-text { text-align: center; flex: 1; padding-right: 44px; }
            .company-name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
            .sheet-title { font-size: 11.5px; font-weight: 700; color: #1e40af; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
            .divider { height: 1px; background: #cbd5e1; margin-bottom: 8px; }
            .meta-grid { display: flex; flex-direction: column; gap: 4px; font-size: 11px; margin-bottom: 12px; }
            .meta-row { display: flex; justify-content: space-between; gap: 16px; }
            .meta-item { display: flex; gap: 6px; }
            .meta-label { font-weight: 700; color: #0f172a; min-width: 90px; }
            .meta-value { color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
            th {
              background: #0f172a;
              color: #ffffff;
              font-weight: 700;
              text-align: left;
              padding: 6px 10px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border: 1px solid #0f172a;
            }
            td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              vertical-align: top;
            }
            td.date-col { width: 110px; font-weight: 700; color: #0f172a; white-space: nowrap; }
            tr.sunday td { background: #f8fafc; font-weight: 700; color: #64748b; }
            .signatures-block {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 36px;
              page-break-inside: avoid;
            }
            .sig-col { border-top: 1px solid #94a3b8; padding-top: 8px; }
            .sig-title { font-weight: 700; font-size: 10.5px; color: #0f172a; margin: 0 0 3px; }
            .sig-sub { font-size: 9.5px; color: #64748b; margin: 0; }
            .footer-note {
              margin-top: 24px;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printArea.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWin.document.close()
  }

  // Submit all draft days to the backend
  const handleSubmitMonth = async () => {
    if (!selectedEmpId) {
      toast.error('Please select an employee first')
      return
    }

    setSubmitting(true)
    let submittedCount = 0

    try {
      for (const item of days) {
        if (!item.activity || item.activity.trim() === '—') continue
        // Submit if status is draft or not yet recorded
        if (item.status === 'draft') {
          const activities = item.isSunday
            ? [{ time: '—', activity: 'Sunday', location: '—', category: 'Other' }]
            : [{ time: '09:30', activity: item.activity, location: 'Head Office', category: 'Administrative Work' }]

          await hrApi.submitTimesheet({
            employeeId: selectedEmpId,
            date: item.fullDate,
            projectId: activeProjectId || undefined,
            attendanceStatus: item.isSunday ? 'holiday' : 'present',
            workDoneSummary: item.activity,
            activities,
          })
          submittedCount++
        }
      }

      await qc.invalidateQueries({ queryKey: ['timesheets'] })
      await qc.invalidateQueries({ queryKey: ['monthly-timesheet-proforma'] })
      toast.success(
        submittedCount > 0
          ? `Submitted ${submittedCount} daily log${submittedCount > 1 ? 's' : ''} for review`
          : 'All working days for this month are already recorded'
      )
    } catch (err: any) {
      toast.error('Failed to submit monthly timesheet: ' + (err?.message || 'Server error'))
    } finally {
      setSubmitting(false)
    }
  }

  const workingDaysCount = days.filter((d) => !d.isSunday && d.activity && d.activity !== '—').length
  const sundaysCount = days.filter((d) => d.isSunday).length
  const totalDays = days.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Monthly Time Sheet — Official Proforma"
      width={880}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              <strong>{workingDaysCount}</strong> working days · <strong>{sundaysCount}</strong> Sundays (Total:{' '}
              {totalDays})
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              size="md"
              icon={<Printer size={16} />}
              onClick={handlePrint}
              disabled={isLoading || days.length === 0}
            >
              Print Proforma
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<DownloadSimple size={16} />}
              onClick={handleDownloadPdf}
              disabled={isLoading || days.length === 0}
            >
              Download PDF
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<PaperPlaneTilt size={16} />}
              loading={submitting}
              onClick={handleSubmitMonth}
              disabled={isLoading || days.length === 0}
            >
              Submit Month Logs
            </Button>
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Controls Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            padding: '12px 14px',
            background: '#f8fafc',
            borderRadius: 10,
            border: '1.5px solid #e2e8f0',
          }}
        >
          {/* Month Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              MONTH
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              YEAR
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
              }}
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              EMPLOYEE
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
              }}
            >
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName ?? ''} ({e.empCode})
                </option>
              ))}
              {employees.length === 0 && meEmp && (
                <option value={meEmp.id}>
                  {meEmp.firstName} {meEmp.lastName} ({meEmp.empCode})
                </option>
              )}
            </select>
          </div>

          {/* Project Name (Editable) */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              PROJECT TITLE
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1.5px solid #cbd5e1',
                fontSize: 12,
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Proforma Sheet Document Preview Container */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            padding: 24,
            maxHeight: '52vh',
            overflowY: 'auto',
          }}
        >
          {/* Printable Element Target */}
          <div id="monthly-timesheet-print-area">
            {/* Header Block with Left-aligned Logo */}
            <div
              className="header-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: '1px solid #cbd5e1',
              }}
            >
              <img
                src="/assets/kipl-logo.png"
                alt="KIPL Logo"
                className="header-logo"
                style={{ height: 44, width: 44, objectFit: 'contain' }}
              />
              <div className="header-text" style={{ textAlign: 'center', flex: 1, paddingRight: 44 }}>
                <h2
                  className="company-name"
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 2px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  KHILARI INFRASTRUCTURE PVT. LTD.
                </h2>
                <h3
                  className="sheet-title"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#1e40af',
                    margin: 0,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  MONTHLY TIME SHEET
                </h3>
              </div>
            </div>

              <div
                className="meta-grid"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  textAlign: 'left',
                  fontSize: 12,
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  className="meta-row"
                  style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
                >
                  <div className="meta-item" style={{ display: 'flex', gap: 6 }}>
                    <span className="meta-label" style={{ fontWeight: 700, color: '#0f172a' }}>
                      Project:
                    </span>
                    <span className="meta-value" style={{ color: '#334155' }}>
                      {projectName}
                    </span>
                  </div>
                  <div className="meta-item" style={{ display: 'flex', gap: 6 }}>
                    <span className="meta-label" style={{ fontWeight: 700, color: '#0f172a' }}>
                      Month:
                    </span>
                    <span className="meta-value" style={{ color: '#334155', fontWeight: 600 }}>
                      {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </span>
                  </div>
                </div>

                <div
                  className="meta-row"
                  style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
                >
                  <div className="meta-item" style={{ display: 'flex', gap: 6 }}>
                    <span className="meta-label" style={{ fontWeight: 700, color: '#0f172a' }}>
                      Department:
                    </span>
                    <span className="meta-value" style={{ color: '#334155' }}>
                      {departmentName}
                    </span>
                  </div>
                  <div className="meta-item" style={{ display: 'flex', gap: 6 }}>
                    <span className="meta-label" style={{ fontWeight: 700, color: '#0f172a' }}>
                      Employee Name:
                    </span>
                    <span className="meta-value" style={{ color: '#334155', fontWeight: 700 }}>
                      {employeeName}
                    </span>
                  </div>
                </div>
              </div>

            {/* Table */}
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 36, color: '#64748b' }}>
                Loading month activities...
              </div>
            ) : days.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                <FileText size={32} />
                <p>No calendar data available</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#fff' }}>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '120px',
                        border: '1px solid #0f172a',
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '1px solid #0f172a',
                      }}
                    >
                      Site Activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d, idx) => (
                    <tr
                      key={d.fullDate}
                      className={d.isSunday ? 'sunday' : ''}
                      style={{
                        background: d.isSunday ? '#f8fafc' : idx % 2 === 1 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td
                        className="date-col"
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          color: d.isSunday ? '#64748b' : '#0f172a',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                          fontSize: 11,
                        }}
                      >
                        {d.dateStr}
                      </td>
                      <td
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #cbd5e1',
                          verticalAlign: 'middle',
                        }}
                      >
                        {d.isSunday ? (
                          <div
                            style={{
                              padding: '4px 6px',
                              fontWeight: 700,
                              color: '#64748b',
                              fontSize: 11,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>Sunday</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={d.activity}
                            onChange={(e) => updateDayActivity(idx, e.target.value)}
                            placeholder="Enter site activity..."
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              border: '1px solid transparent',
                              borderRadius: 4,
                              background: 'transparent',
                              fontSize: 11.5,
                              color: '#1e293b',
                              outline: 'none',
                              fontFamily: 'inherit',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.border = '1px solid #2563eb'
                              e.currentTarget.style.background = '#ffffff'
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.border = '1px solid transparent'
                              e.currentTarget.style.background = 'transparent'
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Signature Blocks (Employee & Project Manager) */}
            <div
              className="signatures-block"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 40,
                marginTop: 36,
                paddingTop: 10,
              }}
            >
              <div className="sig-col" style={{ borderTop: '1.5px solid #94a3b8', paddingTop: 8 }}>
                <p className="sig-title" style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>
                  Employee Signature
                </p>
                <p className="sig-sub" style={{ fontSize: 10, color: '#64748b', margin: 0 }}>
                  {employeeName}
                </p>
              </div>

              <div className="sig-col" style={{ borderTop: '1.5px solid #94a3b8', paddingTop: 8 }}>
                <p className="sig-title" style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>
                  Project Manager / In-Charge
                </p>
                <p className="sig-sub" style={{ fontSize: 10, color: '#64748b', margin: 0 }}>
                  Khilari Infrastructure Pvt. Ltd.
                </p>
              </div>
            </div>

            {/* Footer Note */}
            <div
              className="footer-note"
              style={{
                marginTop: 20,
                paddingTop: 8,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9,
                color: '#94a3b8',
              }}
            >
              <span>KIPL ProjectOS — Official EPC Monthly Timesheet Proforma</span>
              <span>
                Generated for {MONTH_NAMES[selectedMonth]} {selectedYear} · Dal Lake STP
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
