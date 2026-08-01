import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, CheckCircle, XCircle, Clock, Users, Warning, ArrowClockwise } from '@phosphor-icons/react'
import { hrApi } from '@/api/hr.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

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

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Attendance</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{todayStr}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type='date' value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '9px 13px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'inherit' }} />
          <Button variant='primary' size='md' icon={<MapPin size={15} />} onClick={() => setMarkModal(true)}>
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Today summary */}
      {today && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {[
            { label: 'Total',    value: today.total,    color: '#2563eb' },
            { label: 'Present',  value: today.present,  color: '#059669' },
            { label: 'Absent',   value: today.absent,   color: today.absent > 0 ? '#dc2626' : '#059669' },
            { label: 'Half Day', value: today.halfDay,  color: '#d97706' },
            { label: 'On Leave', value: today.onLeave,  color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance table for selected date */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1.5px solid #e2e8f0', background: '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Records for {selectedDate}
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
        )}
      </div>

      {/* Absent employees today */}
      {today?.absentEmployees?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #fecaca', overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', background: '#fef2f2', borderBottom: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Warning size={15} color='#dc2626' />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', margin: 0 }}>Not Marked Today ({today.absentEmployees.length})</h2>
          </div>
          <div style={{ padding: '12px 22px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {today.absentEmployees.map((e: any) => (
              <div key={e.id} style={{ padding: '6px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{e.name}</span>
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
            <input type='date' value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: '9px 13px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'inherit' }} />
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
    </div>
    </>
  )
}
