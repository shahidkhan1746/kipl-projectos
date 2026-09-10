import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi } from '@/api/hr.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a',
  text2:'#475569', text3:'#94a3b8', blue:'#2563eb',
  green:'#059669', amber:'#d97706', red:'#dc2626',
}

const TYPES = [
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'earned', label: 'Earned' },
  { value: 'unpaid', label: 'Unpaid' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg:'#fffbeb', color: C.amber },
  approved: { bg:'#ecfdf5', color: C.green },
  rejected: { bg:'#fef2f2', color: C.red },
}

export default function LeavePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const canManage = ['super_admin', 'admin', 'project_manager', 'hr_officer'].includes(user?.role ?? '')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ leaveType: 'casual', fromDate: '', toDate: '', reason: '' })

  const { data: meEmp } = useQuery({
    queryKey: ['me-employee'],
    queryFn: () => hrApi.meEmployee().then(r => r.data),
  })

  const { data: leaves, isLoading, isError, refetch } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => hrApi.leaves({}).then(r => r.data),
  })

  const applyM = useMutation({
    mutationFn: () => hrApi.applyLeave({
      employeeId: meEmp?.id,
      leaveType: form.leaveType,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      setOpen(false)
      setForm({ leaveType: 'casual', fromDate: '', toDate: '', reason: '' })
    },
  })

  const approveM = useMutation({
    mutationFn: (id: string) => hrApi.approveLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  })
  const rejectM = useMutation({
    mutationFn: (id: string) => hrApi.rejectLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  })

  const list = Array.isArray(leaves) ? leaves : []

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="responsive-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: 0 }}>Leave</h1>
          <p style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>Apply for leave and track approvals</p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)} disabled={!meEmp?.id}>Apply for leave</Button>
      </div>

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
      {isError && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: C.red, fontSize: 13 }}>
          Could not load leave records.{' '}
          <button onClick={() => refetch()} style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: C.text3, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12 }}>
          No leave applications yet.
        </div>
      )}

      {list.length > 0 && (
        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fc', borderBottom: `1.5px solid ${C.border}` }}>
                  {['Type', 'From', 'To', 'Reason', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.text3, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((row: any) => {
                  const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.pending
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, textTransform: 'capitalize' }}>{row.leaveType}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{row.fromDate}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{row.toDate}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: C.text2 }}>{row.reason || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: st.bg, color: st.color, textTransform: 'capitalize' }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {canManage && row.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => approveM.mutate(row.id)} style={{ fontSize: 12, fontWeight: 600, color: C.green, background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                            <button onClick={() => rejectM.mutate(row.id)} style={{ fontSize: 12, fontWeight: 600, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for leave">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!meEmp?.id && (
            <p style={{ fontSize: 13, color: C.red, margin: 0 }}>
              No employee record is linked to this login. Ask HR to link your account before applying.
            </p>
          )}
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>
            Type
            <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}` }}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <DatePicker label="From" value={form.fromDate} onDateChange={v => setForm(f => ({ ...f, fromDate: v }))} />
          <DatePicker label="To" value={form.toDate} onDateChange={v => setForm(f => ({ ...f, toDate: v }))} />
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>
            Reason
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 8, border: `1.5px solid ${C.border}` }} />
          </label>
          {applyM.isError && <p style={{ fontSize: 13, color: C.red, margin: 0 }}>Could not submit. Check the dates and try again.</p>}
          <Button
            variant="primary"
            onClick={() => applyM.mutate()}
            disabled={!meEmp?.id || !form.fromDate || !form.toDate || applyM.isPending}
          >
            {applyM.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
