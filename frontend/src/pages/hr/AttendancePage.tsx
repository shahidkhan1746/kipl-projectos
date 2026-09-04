import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, CheckCircle, XCircle, Clock, Users, Warning, ArrowClockwise, DownloadSimple, FilePdf, FileText, Calendar } from '@phosphor-icons/react'
import { jsPDF } from 'jspdf'
import { hrApi } from '@/api/hr.api'
import { pdfApi } from '@/api/pdf.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { DatePicker } from '@/components/ui/DatePicker'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/date'

const STATUS_OPTS = [
  { value: 'present',  label: '✓ Present'  },
  { value: 'absent',   label: '✗ Absent'   },
  { value: 'half_day', label: '½ Half Day' },
  { value: 'leave',    label: 'On Leave' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  present:  { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  absent:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  half_day: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  leave:    { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  holiday:  { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
}

export default function AttendancePage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchParams, setSearchParams] = useSearchParams()
  const [btnPulse, setBtnPulse]         = useState(false)
  const [exporting, setExporting]       = useState(false)
  const [exportModal, setExportModal]   = useState(false)
  const [expMonth, setExpMonth]         = useState(new Date().getMonth() + 1)
  const [expYear, setExpYear]           = useState(new Date().getFullYear())
  const markBtnRef                      = useRef<HTMLButtonElement>(null)

  // Sync export month/year when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-')
      if (parts.length >= 2) {
        setExpYear(parseInt(parts[0], 10) || new Date().getFullYear())
        setExpMonth(parseInt(parts[1], 10) || (new Date().getMonth() + 1))
      }
    }
  }, [selectedDate])

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
  }, [searchParams])
  const [markModal, setMarkModal]   = useState(false)
  const [bulkStatus, setBulkStatus] = useState('present')
  const [overrides, setOverrides]   = useState<Record<string, string>>({}) // empId -> status

  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today', activeProjectId],
    queryFn:  () => hrApi.todayAttendance(activeProjectId ?? undefined).then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', activeProjectId],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, status: 'active' }).then(r => r.data),
  })

  const { data: dateRecords, isLoading: dateLoading } = useQuery({
    queryKey: ['attendance-date', selectedDate, activeProjectId],
    queryFn:  () => hrApi.attendance({ date: selectedDate, projectId: activeProjectId }).then(r => r.data),
  })

  const bulkM = useMutation({
    mutationFn: (records: any[]) => hrApi.bulkAttendance(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-today'] })
      qc.invalidateQueries({ queryKey: ['attendance-date'] })
      setMarkModal(false)
      setOverrides({})
    },
  })

  function submitBulk() {
    const all = employees ?? []
    const records = all.map((e: any) => ({
      employeeId: e.id,
      date:       selectedDate,
      status:     overrides[e.id] ?? bulkStatus,
      source:     'manual',
      projectId:  activeProjectId,
    }))
    bulkM.mutate(records)
  }

  // Load image to base64 data URL for jsPDF
  function toDataUrl(url: string): Promise<string | null> {
    return new Promise(resolve => {
      if (!url) return resolve(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          c.getContext('2d')!.drawImage(img, 0, 0)
          resolve(c.toDataURL('image/png', 0.95))
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  async function handleExportDailyPdf() {
    try {
      setExporting(true)
      const records = dateRecords ?? []
      const emps = employees ?? []
      const logoData = await toDataUrl('/assets/kipl-logo.png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, H = 297, M = 12, CW = W - 2 * M
      const proj = 'Dal Lake Sewerage Scheme — 38.5 MLD STP Srinagar'
      const dateFormatted = formatDate(selectedDate)

      let y = 0
      const drawHeader = () => {
        pdf.setFillColor(26, 37, 64)
        pdf.rect(0, 0, W, 20, 'F')

        let textLeft = M
        if (logoData) {
          try {
            pdf.addImage(logoData, 'PNG', M, 3, 14, 14)
            textLeft = M + 17
          } catch {}
        }

        pdf.setTextColor('#ffffff')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.text('DAILY ATTENDANCE REGISTER', textLeft, 8)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor('#94a3b8')
        pdf.text(`M/S Khilari Infrastructure · ${proj}`, textLeft, 14)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor('#60a5fa')
        pdf.text(dateFormatted, W - M, 8, { align: 'right' })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor('#ffffff')
        pdf.text(`Records: ${records.length}`, W - M, 14, { align: 'right' })
        y = 26
      }

      const drawFooter = () => {
        pdf.setDrawColor('#cbd5e1')
        pdf.setLineWidth(0.3)
        pdf.line(M, H - 10, W - M, H - 10)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor('#64748b')
        pdf.text(`KIPL ProjectOS — Daily Attendance (${dateFormatted})`, M, H - 6)
        pdf.text(`Page ${pdf.getNumberOfPages()}`, W - M, H - 6, { align: 'right' })
      }

      drawHeader()

      // Summary
      const total = emps.length || records.length
      const present = records.filter((r: any) => r.status === 'present').length
      const absent = records.filter((r: any) => r.status === 'absent').length
      const halfDay = records.filter((r: any) => r.status === 'half_day').length
      const leave = records.filter((r: any) => r.status === 'leave').length

      pdf.setFillColor(241, 245, 249)
      pdf.rect(M, y, CW, 12, 'F')
      pdf.setDrawColor('#e2e8f0')
      pdf.rect(M, y, CW, 12, 'S')

      const cardW = CW / 5
      const metrics = [
        { label: 'Total', val: total, col: '#2563eb' },
        { label: 'Present', val: present, col: '#059669' },
        { label: 'Absent', val: absent, col: '#dc2626' },
        { label: 'Half Day', val: halfDay, col: '#d97706' },
        { label: 'Leave', val: leave, col: '#7c3aed' },
      ]
      metrics.forEach((m, i) => {
        const cx = M + i * cardW + cardW / 2
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(m.col)
        pdf.text(String(m.val), cx, y + 5.5, { align: 'center' })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.setTextColor('#64748b')
        pdf.text(m.label, cx, y + 9.5, { align: 'center' })
      })
      y += 16

      // Columns
      const cols = [
        { label: '#', w: 10 },
        { label: 'EMP CODE', w: 25 },
        { label: 'EMPLOYEE NAME', w: 55 },
        { label: 'STATUS', w: 26 },
        { label: 'CHECK IN', w: 24 },
        { label: 'CHECK OUT', w: 24 },
        { label: 'HOURS', w: 22 },
      ]

      const drawTableHeader = () => {
        pdf.setFillColor(30, 41, 59)
        pdf.rect(M, y, CW, 7, 'F')
        pdf.setTextColor('#ffffff')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7)
        let cx = M
        cols.forEach(c => {
          pdf.text(c.label, cx + 2, y + 4.8)
          cx += c.w
        })
        y += 7
      }

      drawTableHeader()

      let sno = 1
      for (const r of records) {
        if (y + 6.5 > H - 14) {
          drawFooter()
          pdf.addPage()
          drawHeader()
          drawTableHeader()
        }
        const emp = emps.find((e: any) => e.id === r.employeeId)
        if (sno % 2 === 0) {
          pdf.setFillColor(248, 250, 252)
          pdf.rect(M, y, CW, 6.5, 'F')
        }
        pdf.setDrawColor('#f1f5f9')
        pdf.setLineWidth(0.2)
        pdf.line(M, y + 6.5, M + CW, y + 6.5)

        let cx = M
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor('#64748b')
        pdf.text(String(sno), cx + 2, y + 4.5)
        cx += cols[0].w

        pdf.text(String(emp?.empCode || '—'), cx + 2, y + 4.5)
        cx += cols[1].w

        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor('#0f172a')
        const empName = emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : r.employeeId
        pdf.text(empName.substring(0, 30), cx + 2, y + 4.5)
        cx += cols[2].w

        pdf.setFont('helvetica', 'bold')
        let stColor = '#059669'
        if (r.status === 'absent') stColor = '#dc2626'
        else if (r.status === 'half_day') stColor = '#d97706'
        else if (r.status === 'leave') stColor = '#7c3aed'
        pdf.setTextColor(stColor)
        pdf.text(String(r.status || '').replace(/_/g, ' ').toUpperCase(), cx + 2, y + 4.5)
        cx += cols[3].w

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor('#334155')
        const checkIn = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
        pdf.text(checkIn, cx + 2, y + 4.5)
        cx += cols[4].w

        const checkOut = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
        pdf.text(checkOut, cx + 2, y + 4.5)
        cx += cols[5].w

        const hrs = r.hoursWorked ? Number(r.hoursWorked).toFixed(1) + 'h' : '—'
        pdf.text(hrs, cx + 2, y + 4.5)

        y += 6.5
        sno++
      }

      if (records.length === 0) {
        pdf.setFillColor('#ffffff')
        pdf.rect(M, y, CW, 14, 'F')
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor('#64748b')
        pdf.text('No attendance records marked for this date.', W / 2, y + 8, { align: 'center' })
      }

      drawFooter()
      pdf.save(`Daily_Attendance_${selectedDate}.pdf`)
      toast.success('Daily attendance report downloaded')
      setExportModal(false)
    } catch (err: any) {
      console.error('Export daily failed', err)
      toast.error('Failed to download daily attendance report')
    } finally {
      setExporting(false)
    }
  }

  function handleExportDailyCsv() {
    try {
      const records = dateRecords ?? []
      const emps = employees ?? []
      const header = ['Emp Code', 'Employee Name', 'Department', 'Designation', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'GPS Verified', 'Source']
      const rows = [
        [`KIPL ProjectOS — Daily Attendance (${formatDate(selectedDate)})`],
        [`Project: Dal Lake Sewerage Scheme (38.5 MLD STP Srinagar)`],
        [],
        header,
      ]
      for (const r of records) {
        const emp = emps.find((e: any) => e.id === r.employeeId)
        rows.push([
          emp?.empCode || '',
          `"${(emp?.firstName || '') + ' ' + (emp?.lastName || '')}"`,
          `"${emp?.department || ''}"`,
          `"${emp?.designation || ''}"`,
          (r.status || '').toUpperCase(),
          r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
          r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
          r.hoursWorked ? String(r.hoursWorked) : '—',
          r.geoVerified ? 'YES' : 'NO',
          r.source || 'manual',
        ])
      }
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Daily_Attendance_${selectedDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Daily attendance CSV downloaded')
      setExportModal(false)
    } catch (e: any) {
      toast.error('Failed to export daily CSV')
    }
  }

  async function handleExportMonthlyPdf() {
    try {
      setExporting(true)
      const year = Number(expYear) || new Date().getFullYear()
      const month = Number(expMonth) || (new Date().getMonth() + 1)
      const res = await hrApi.attendance({ year, month, projectId: activeProjectId })
      const records = Array.isArray(res.data) ? res.data : []
      const emps = employees ?? []
      const logoData = await toDataUrl('/assets/kipl-logo.png')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = 297, H = 210, M = 10, CW = W - 2 * M
      const daysInMonth = new Date(year, month, 0).getDate()
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' })
      const proj = 'Dal Lake Sewerage Scheme — 38.5 MLD STP Srinagar'

      const employeeRecords = new Map<string, any[]>()
      for (const r of records) {
        if (!employeeRecords.has(r.employeeId)) employeeRecords.set(r.employeeId, [])
        employeeRecords.get(r.employeeId)!.push(r)
      }

      const codeW = 22
      const nameW = 45
      const sumColW = 7
      const totalDaysW = CW - codeW - nameW - (sumColW * 4)
      const dayW = totalDaysW / daysInMonth
      const rowH = 6.0
      let y = 0

      const drawHeader = () => {
        pdf.setFillColor(26, 37, 64)
        pdf.rect(0, 0, W, 19, 'F')

        let textLeft = M
        if (logoData) {
          try {
            pdf.addImage(logoData, 'PNG', M, 2.5, 14, 14)
            textLeft = M + 17
          } catch {}
        }

        pdf.setTextColor('#ffffff')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.text('M/S KHILARI INFRASTRUCTURE PVT. LTD.', textLeft, 7.5)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor('#94a3b8')
        pdf.text(`Project: ${proj}`, textLeft, 13.5)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor('#60a5fa')
        pdf.text(`MONTHLY ATTENDANCE REGISTER — ${monthName.toUpperCase()} ${year}`, W - M, 7.5, { align: 'right' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor('#ffffff')
        pdf.text(`Staff Strength: ${emps.length} | Days in Month: ${daysInMonth}`, W - M, 13.5, { align: 'right' })

        y = 24

        // Table Header
        pdf.setFillColor(30, 41, 59)
        pdf.rect(M, y, CW, 7, 'F')
        pdf.setTextColor('#ffffff')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(6.5)

        let curX = M
        pdf.text('EMP CODE', curX + 1.5, y + 4.5)
        curX += codeW

        pdf.text('EMPLOYEE NAME', curX + 1.5, y + 4.5)
        curX += nameW

        for (let d = 1; d <= daysInMonth; d++) {
          pdf.text(String(d), curX + dayW / 2, y + 4.5, { align: 'center' })
          curX += dayW
        }

        pdf.text('P', curX + sumColW / 2, y + 4.5, { align: 'center' })
        curX += sumColW
        pdf.text('A', curX + sumColW / 2, y + 4.5, { align: 'center' })
        curX += sumColW
        pdf.text('H', curX + sumColW / 2, y + 4.5, { align: 'center' })
        curX += sumColW
        pdf.text('L', curX + sumColW / 2, y + 4.5, { align: 'center' })

        pdf.setDrawColor('#475569')
        pdf.setLineWidth(0.2)
        curX = M + codeW
        pdf.line(curX, y, curX, y + 7)
        curX += nameW
        pdf.line(curX, y, curX, y + 7)
        for (let d = 1; d <= daysInMonth; d++) {
          curX += dayW
          pdf.line(curX, y, curX, y + 7)
        }
        for (let s = 0; s < 3; s++) {
          curX += sumColW
          pdf.line(curX, y, curX, y + 7)
        }

        y += 7
      }

      const drawFooter = () => {
        pdf.setDrawColor('#cbd5e1')
        pdf.setLineWidth(0.3)
        pdf.line(M, H - 9, W - M, H - 9)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.setTextColor('#64748b')
        pdf.text(`KIPL ProjectOS — Dal Lake Sewerage Scheme · Monthly Attendance (${monthName} ${year})`, M, H - 5)
        pdf.text(`Page ${pdf.getNumberOfPages()}`, W - M, H - 5, { align: 'right' })
      }

      drawHeader()

      let rowIdx = 0
      for (const emp of emps) {
        if (y + rowH > H - 12) {
          drawFooter()
          pdf.addPage()
          drawHeader()
        }

        const eRecords = employeeRecords.get(emp.id) || []
        const dayMap = new Map<number, string>()
        let p = 0, a = 0, h = 0, l = 0

        for (const r of eRecords) {
          const match = String(r.date).match(/^\d{4}-\d{2}-(\d{2})/)
          const day = match ? parseInt(match[1], 10) : new Date(r.date).getDate()
          let mark = ''
          if (r.status === 'present') { mark = 'P'; p++ }
          else if (r.status === 'absent') { mark = 'A'; a++ }
          else if (r.status === 'half_day') { mark = 'H'; h++ }
          else if (r.status === 'leave') { mark = 'L'; l++ }
          else if (r.status === 'holiday') { mark = 'HO' }
          dayMap.set(day, mark)
        }

        if (rowIdx % 2 === 1) {
          pdf.setFillColor(248, 250, 252)
          pdf.rect(M, y, CW, rowH, 'F')
        }

        pdf.setDrawColor('#e2e8f0')
        pdf.setLineWidth(0.15)
        pdf.rect(M, y, CW, rowH, 'S')

        let curX = M
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6)
        pdf.setTextColor('#64748b')
        pdf.text(String(emp.empCode || '—'), curX + 1.5, y + 4.2)
        curX += codeW
        pdf.line(curX, y, curX, y + rowH)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(6.5)
        pdf.setTextColor('#0f172a')
        const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.empCode || '—'
        pdf.text(empName.substring(0, 26), curX + 1.5, y + 4.2)
        curX += nameW
        pdf.line(curX, y, curX, y + rowH)

        pdf.setFontSize(6)
        for (let d = 1; d <= daysInMonth; d++) {
          const mark = dayMap.get(d) || '—'
          if (mark === 'P') {
            pdf.setTextColor('#059669')
            pdf.setFont('helvetica', 'bold')
          } else if (mark === 'A') {
            pdf.setTextColor('#dc2626')
            pdf.setFont('helvetica', 'bold')
          } else if (mark === 'H') {
            pdf.setTextColor('#d97706')
            pdf.setFont('helvetica', 'bold')
          } else if (mark === 'L') {
            pdf.setTextColor('#7c3aed')
            pdf.setFont('helvetica', 'bold')
          } else {
            pdf.setTextColor('#cbd5e1')
            pdf.setFont('helvetica', 'normal')
          }
          pdf.text(mark, curX + dayW / 2, y + 4.2, { align: 'center' })
          curX += dayW
          pdf.line(curX, y, curX, y + rowH)
        }

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(6.5)

        pdf.setTextColor('#059669')
        pdf.text(String(p), curX + sumColW / 2, y + 4.2, { align: 'center' })
        curX += sumColW
        pdf.line(curX, y, curX, y + rowH)

        pdf.setTextColor('#dc2626')
        pdf.text(String(a), curX + sumColW / 2, y + 4.2, { align: 'center' })
        curX += sumColW
        pdf.line(curX, y, curX, y + rowH)

        pdf.setTextColor('#d97706')
        pdf.text(String(h), curX + sumColW / 2, y + 4.2, { align: 'center' })
        curX += sumColW
        pdf.line(curX, y, curX, y + rowH)

        pdf.setTextColor('#7c3aed')
        pdf.text(String(l), curX + sumColW / 2, y + 4.2, { align: 'center' })

        y += rowH
        rowIdx++
      }

      if (emps.length === 0) {
        pdf.setFillColor('#ffffff')
        pdf.rect(M, y, CW, 12, 'F')
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor('#64748b')
        pdf.text('No active employees found for this month.', W / 2, y + 7, { align: 'center' })
      }

      drawFooter()
      pdf.save(`Monthly_Attendance_${monthName}_${year}.pdf`)
      toast.success('Monthly attendance PDF downloaded')
      setExportModal(false)
    } catch (err: any) {
      console.error('Export Monthly PDF failed', err)
      toast.error('Failed to download monthly attendance PDF')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportMonthlyCsv() {
    try {
      setExporting(true)
      const year = Number(expYear) || new Date().getFullYear()
      const month = Number(expMonth) || (new Date().getMonth() + 1)
      const res = await hrApi.attendance({ year, month, projectId: activeProjectId })
      const records = Array.isArray(res.data) ? res.data : []
      const emps = employees ?? []
      
      const daysInMonth = new Date(year, month, 0).getDate()
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' })
      
      const header = ['Emp Code', 'Employee Name', 'Department', 'Designation']
      for (let d = 1; d <= daysInMonth; d++) {
        header.push(String(d))
      }
      header.push('Present (P)', 'Absent (A)', 'Half Day (H)', 'Leave (L)', 'Total Present Days')
      
      const rows: string[][] = [
        [`KIPL ProjectOS — Monthly Attendance Muster Roll (${monthName} ${year})`],
        [`Project: Dal Lake Sewerage Scheme (38.5 MLD STP Srinagar)`],
        [],
        header,
      ]
      
      const employeeRecords = new Map<string, any[]>()
      for (const r of records) {
        if (!employeeRecords.has(r.employeeId)) employeeRecords.set(r.employeeId, [])
        employeeRecords.get(r.employeeId)!.push(r)
      }
      
      for (const emp of emps) {
        const eRecords = employeeRecords.get(emp.id) || []
        const dayMap = new Map<number, string>()
        let p = 0, a = 0, h = 0, l = 0
        
        for (const r of eRecords) {
          const match = String(r.date).match(/^\d{4}-\d{2}-(\d{2})/)
          const day = match ? parseInt(match[1], 10) : new Date(r.date).getDate()
          let mark = ''
          if (r.status === 'present') { mark = 'P'; p++ }
          else if (r.status === 'absent') { mark = 'A'; a++ }
          else if (r.status === 'half_day') { mark = 'H'; h++ }
          else if (r.status === 'leave') { mark = 'L'; l++ }
          else if (r.status === 'holiday') { mark = 'HO' }
          dayMap.set(day, mark)
        }
        
        const row = [
          emp.empCode || '',
          `"${(emp.firstName || '') + ' ' + (emp.lastName || '')}"`,
          `"${emp.department || ''}"`,
          `"${emp.designation || ''}"`,
        ]
        
        for (let d = 1; d <= daysInMonth; d++) {
          row.push(dayMap.get(d) || '-')
        }
        
        const totalPresentDays = (p + (h * 0.5)).toFixed(1)
        row.push(String(p), String(a), String(h), String(l), totalPresentDays)
        rows.push(row)
      }
      
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Monthly_Attendance_${year}_${String(month).padStart(2, '0')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Monthly attendance CSV downloaded')
      setExportModal(false)
    } catch (e: any) {
      toast.error('Failed to export monthly CSV')
    } finally {
      setExporting(false)
    }
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const allEmployees = employees ?? []
  const records = dateRecords ?? []

  const markedEmpIds = new Set(records.map((r: any) => r.employeeId))
  const notMarkedEmployees = allEmployees.filter((e: any) => !markedEmpIds.has(e.id))

  const totalCount = allEmployees.length || today?.total || 0
  const presentCount = records.filter((r: any) => r.status === 'present').length
  const halfDayCount = records.filter((r: any) => r.status === 'half_day').length
  const onLeaveCount = records.filter((r: any) => r.status === 'leave').length
  const explicitAbsentCount = records.filter((r: any) => r.status === 'absent').length
  const absentCount = explicitAbsentCount + notMarkedEmployees.length

  const summary = {
    total: totalCount,
    present: presentCount,
    absent: absentCount,
    halfDay: halfDayCount,
    onLeave: onLeaveCount,
  }

  const selectedDateFormatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const pulseStyle: React.CSSProperties = btnPulse ? {
    boxShadow: '0 0 0 4px rgba(37,99,235,0.3), 0 0 0 8px rgba(37,99,235,0.15)',
    animation: 'kipl-pulse 0.6s ease-in-out infinite alternate',
    transform: 'scale(1.04)',
  } : {}

  return (
    <>
    <style>{`@keyframes kipl-pulse {
      from { box-shadow: 0 0 0 4px rgba(37,99,235,0.3); }
      to   { box-shadow: 0 0 0 10px rgba(37,99,235,0.05); }
    }`}</style>
    <div className='fade-in' style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Attendance</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{selectedDateFormatted}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: 170 }}><DatePicker value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
          <Button variant='secondary' size='md' icon={<DownloadSimple size={15} />} onClick={() => setExportModal(true)}>
            Export Data
          </Button>
          <Button variant='primary' size='md' icon={<MapPin size={15} />} onClick={() => setMarkModal(true)}>
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Attendance Summary Cards for Selected Date */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total',    value: summary.total,    color: '#2563eb' },
          { label: 'Present',  value: summary.present,  color: '#059669' },
          { label: 'Absent',   value: summary.absent,   color: summary.absent > 0 ? '#dc2626' : '#059669' },
          { label: 'Half Day', value: summary.halfDay,  color: '#d97706' },
          { label: 'On Leave', value: summary.onLeave,  color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance table for selected date */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1.5px solid #e2e8f0', background: '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Records for {formatDate(selectedDate)}
          </h2>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{(dateRecords ?? []).length} records</span>
        </div>
        {dateLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        : (dateRecords ?? []).length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 10 }}>
            <MapPin size={32} color='#e2e8f0' />
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, fontWeight: 600 }}>No attendance marked for this date</p>
            <Button variant='secondary' size='sm' onClick={() => setMarkModal(true)} icon={<MapPin size={13} />}>Mark attendance</Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#f8f9fc', borderBottom: '1.5px solid #e2e8f0' }}>
                  {['Employee', 'Status', 'Check In', 'Check Out', 'Hours', 'GPS Verified', 'Source'].map(h => (
                    <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dateRecords ?? []).map((r: any, i: number) => {
                  const emp = (employees ?? []).find((e: any) => e.id === r.employeeId)
                  const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.absent
                  return (
                    <tr key={r.id} style={{ borderBottom: i < (dateRecords ?? []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{emp ? `${emp.firstName} ${emp.lastName ?? ''}` : r.employeeId}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>{emp?.empCode ?? ''}</p>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color, border: '1.5px solid ' + ss.border }}>
                          {r.status.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#475569' }}>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#475569' }}>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#475569' }}>{r.hoursWorked ? Number(r.hoursWorked).toFixed(1) + 'h' : '—'}</td>
                      <td style={{ padding: '12px 18px' }}>
                        {r.geoVerified
                          ? <span style={{ color: '#059669', fontSize: 12, fontWeight: 600 }}>✓ Yes</span>
                          : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{r.source}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unmarked employees for selected date */}
      {notMarkedEmployees.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #fecaca', overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', background: '#fef2f2', borderBottom: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Warning size={15} color='#dc2626' />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', margin: 0 }}>
              {isToday ? `Not Marked Today (${notMarkedEmployees.length})` : `Not Marked for ${selectedDate} (${notMarkedEmployees.length})`}
            </h2>
          </div>
          <div style={{ padding: '12px 22px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {notMarkedEmployees.map((e: any) => (
              <div key={e.id} style={{ padding: '6px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{e.firstName} {e.lastName ?? ''}</span>
                <span style={{ color: '#94a3b8', marginLeft: 6 }}>{e.designation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      <Modal open={markModal} onClose={() => setMarkModal(false)} title='Mark Attendance' width={680}
        footer={<>
          <Button variant='ghost' onClick={() => setMarkModal(false)}>Cancel</Button>
          <Button variant='primary' loading={bulkM.isPending} onClick={submitBulk} icon={<CheckCircle size={14} />}>
            Save Attendance
          </Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 170 }}><DatePicker value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
            <Select label='' value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} options={STATUS_OPTS} />
            <button onClick={() => setOverrides({})} style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowClockwise size={13} /> Reset all
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Default status is <strong>{bulkStatus}</strong>. Click individual rows to override.</p>
          <div style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden', border: '1.5px solid #e2e8f0', borderRadius: 10 }}>
            {(employees ?? []).map((emp: any, i: number) => {
              const st = overrides[emp.id] ?? bulkStatus
              const ss = STATUS_STYLE[st] ?? STATUS_STYLE.present
              return (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < (employees ?? []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{emp.firstName} {emp.lastName ?? ''}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{emp.empCode} · {emp.designation}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STATUS_OPTS.map(opt => (
                      <button key={opt.value} onClick={() => setOverrides(o => ({ ...o, [emp.id]: opt.value }))}
                        style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.1s',
                          background: st === opt.value ? (STATUS_STYLE[opt.value]?.bg ?? '#f8f9fc') : '#fff',
                          color: st === opt.value ? (STATUS_STYLE[opt.value]?.color ?? '#374151') : '#94a3b8',
                          borderColor: st === opt.value ? (STATUS_STYLE[opt.value]?.border ?? '#e2e8f0') : '#e2e8f0',
                        }}>
                        {opt.value === 'present' ? 'P' : opt.value === 'absent' ? 'A' : opt.value === 'half_day' ? '½' : 'L'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
      {/* Export Modal */}
      {exportModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className='zoom-in modal-panel' role="dialog" aria-modal="true" aria-label="Export attendance data" style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', width: 480, maxWidth: '100%', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1.5px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DownloadSimple size={20} weight='bold' />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Export Attendance Data</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Download formal Muster Roll PDF or Excel/CSV records</p>
              </div>
            </div>

            {/* Monthly Export Section */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={16} color='#2563eb' /> Monthly Muster Roll
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={expMonth}
                    onChange={e => setExpMonth(Number(e.target.value))}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff', color: '#0f172a', outline: 'none' }}>
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={expYear}
                    onChange={e => setExpYear(Number(e.target.value))}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid #cbd5e1', fontSize: 12, fontWeight: 600, background: '#fff', color: '#0f172a', outline: 'none' }}>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Button
                  variant='primary'
                  size='sm'
                  onClick={handleExportMonthlyPdf}
                  loading={exporting}
                  icon={<FilePdf size={15} weight='bold' />}
                  style={{ justifyContent: 'center' }}>
                  Download PDF
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleExportMonthlyCsv}
                  loading={exporting}
                  icon={<FileText size={15} weight='bold' />}
                  style={{ justifyContent: 'center' }}>
                  Download Excel / CSV
                </Button>
              </div>
            </div>

            {/* Daily Export Section */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color='#059669' /> Daily Report ({formatDate(selectedDate)})
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{(dateRecords ?? []).length} records</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleExportDailyPdf}
                  loading={exporting}
                  icon={<FilePdf size={15} />}
                  style={{ justifyContent: 'center' }}>
                  Daily PDF
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleExportDailyCsv}
                  loading={exporting}
                  icon={<FileText size={15} />}
                  style={{ justifyContent: 'center' }}>
                  Daily CSV
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant='ghost' size='sm' onClick={() => setExportModal(false)} disabled={exporting}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  )
}
