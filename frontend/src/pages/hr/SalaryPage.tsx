import { pdfApi } from '@/api/pdf.api'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, Plus, CheckCircle, CurrencyInr } from '@phosphor-icons/react'
import { hrApi } from '@/api/hr.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const MONTHS = [
  {value:'1',label:'January'},{value:'2',label:'February'},{value:'3',label:'March'},
  {value:'4',label:'April'},{value:'5',label:'May'},{value:'6',label:'June'},
  {value:'7',label:'July'},{value:'8',label:'August'},{value:'9',label:'September'},
  {value:'10',label:'October'},{value:'11',label:'November'},{value:'12',label:'December'},
]

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  draft:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  approved: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  paid:     { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
}

export default function SalaryPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year,  setYear]  = useState(String(now.getFullYear()))
  const [genModal, setGenModal] = useState(false)
  const [genEmpId, setGenEmpId] = useState('')

  const { data: salaries, isLoading } = useQuery({
    queryKey: ['salary', month, year],
    queryFn:  () => hrApi.salaryList({ month: parseInt(month), year: parseInt(year) }).then(r => r.data),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', activeProjectId],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, status: 'active' }).then(r => r.data),
  })

  const genM = useMutation({
    mutationFn: () => hrApi.generateSalary({ employeeId: genEmpId, month: parseInt(month), year: parseInt(year) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary'] }); setGenModal(false) },
  })

  const approveM = useMutation({
    mutationFn: (id: string) => hrApi.approveSalary(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary'] }),
  })

  const payM = useMutation({
    mutationFn: (id: string) => hrApi.markPaid(id, 'bank_transfer'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary'] }),
  })

  const empOptions = (employees ?? []).map((e: any) => ({
    value: e.id,
    label: `${e.empCode} — ${e.firstName} ${e.lastName ?? ''}`,
  }))

  const monthName = MONTHS.find(m => m.value === month)?.label
  const totalNet  = (salaries ?? []).reduce((s: number, r: any) => s + Number(r.netSalary), 0)

  return (
    <div className='fade-in' style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Salary</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Generate, approve and pay monthly salaries</p>
        </div>
        <Button variant='primary' size='md' icon={<Plus size={15} />} onClick={() => setGenModal(true)}>
          Generate Salary
        </Button>
      </div>

      {/* Month/Year filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Select label='' value={month} onChange={e => setMonth(e.target.value)} options={MONTHS} />
        <Select label='' value={year} onChange={e => setYear(e.target.value)} options={
          [2024,2025,2026,2027].map(y => ({ value: String(y), label: String(y) }))
        } />
        {totalNet > 0 && (
          <div style={{ marginLeft: 'auto', padding: '8px 16px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CurrencyInr size={14} />
            Total Payable: ₹{totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {/* Salary table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1.5px solid #e2e8f0', background: '#f8f9fc' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {monthName} {year} — {(salaries ?? []).length} records
          </h2>
        </div>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        : (salaries ?? []).length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 24px', gap: 10 }}>
            <Receipt size={32} color='#e2e8f0' />
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, fontWeight: 600 }}>No salary records for {monthName} {year}</p>
            <Button variant='secondary' size='sm' icon={<Plus size={13} />} onClick={() => setGenModal(true)}>Generate salary</Button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fc', borderBottom: '1.5px solid #e2e8f0' }}>
                {['Employee','Days','Gross (₹)','PF','ESI','Net Pay (₹)','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(salaries ?? []).map((s: any, i: number) => {
                const emp = (employees ?? []).find((e: any) => e.id === s.employeeId)
                const ss = STATUS_STYLE[s.status] ?? STATUS_STYLE.draft
                return (
                  <tr key={s.id} style={{ borderBottom: i < (salaries ?? []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '13px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{emp ? `${emp.firstName} ${emp.lastName ?? ''}` : s.employeeId}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>{emp?.empCode ?? ''}</p>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: '#475569' }}>{Number(s.daysPresent).toFixed(1)} / {s.workingDays}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>₹{Number(s.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: '#dc2626' }}>₹{Number(s.pfAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: '#dc2626' }}>₹{Number(s.esiAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 800, color: '#059669' }}>₹{Number(s.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color, border: '1.5px solid ' + ss.border }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {s.status === 'draft' && (
                          <Button variant='secondary' size='xs' icon={<CheckCircle size={11} />}
                            onClick={() => approveM.mutate(s.id)} loading={approveM.isPending}>
                            Approve
                          </Button>
                        )}
                        {s.status === 'approved' && (
                          <Button variant='success' size='xs' icon={<CurrencyInr size={11} />}
                            onClick={() => payM.mutate(s.id)} loading={payM.isPending}>
                            Mark Paid
                          </Button>
                        )}
                        {s.status === 'paid' && (
                          <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Paid</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Salary Modal */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title='Generate Salary' width={460}
        footer={<>
          <Button variant='ghost' onClick={() => setGenModal(false)}>Cancel</Button>
          <Button variant='primary' loading={genM.isPending} onClick={() => genM.mutate()} disabled={!genEmpId}>
            Generate
          </Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
            Salary will be calculated based on attendance records for {monthName} {year}.
            PF (12% of basic) and ESI (0.75% if applicable) will be auto-deducted.
          </div>
          <Select label='Select Employee' value={genEmpId} onChange={e => setGenEmpId(e.target.value)}
            options={empOptions} placeholder='Choose employee...' />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label='Month' value={month} onChange={e => setMonth(e.target.value)} options={MONTHS} />
            <Select label='Year' value={year} onChange={e => setYear(e.target.value)}
              options={[2024,2025,2026,2027].map(y => ({ value: String(y), label: String(y) }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}