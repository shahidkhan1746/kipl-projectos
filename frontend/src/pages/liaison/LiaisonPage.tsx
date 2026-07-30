import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, MagnifyingGlass, CheckCircle, XCircle, Warning, CaretRight, FunnelSimple, PencilSimple } from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { wbsApi } from '@/api/wbs.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'

const FT = [
  {value:'approval',label:'Approval'},{value:'noc',label:'NOC'},
  {value:'drawing',label:'Drawing Approval'},{value:'vetting',label:'Vetting'},
  {value:'estimate',label:'Estimate'},{value:'report',label:'Inspection Report'},
  {value:'letter',label:'Letter'},{value:'clearance',label:'Clearance'},{value:'other',label:'Other'},
]
const DEPTS = [
  {value:'LCMA',label:'LCMA'},{value:'UEED',label:'UEED'},{value:'NIT',label:'NIT'},
  {value:'SMC',label:'SMC'},{value:'Traffic Police',label:'Traffic Police'},{value:'Forest Dept',label:'Forest Dept'},
  {value:'DC Office',label:'DC Office'},{value:'PWD',label:'PWD'},{value:'Other',label:'Other'},
]
const PRI = [{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'urgent',label:'Urgent'}]
const STATUSES = [
  {value:'draft',label:'Draft'},{value:'submitted',label:'Submitted'},{value:'under_review',label:'Under Review'},
  {value:'approved',label:'Approved'},{value:'returned',label:'Returned'},{value:'rejected',label:'Rejected'},{value:'closed',label:'Closed'},
]
const EDIT_ROLES = ['super_admin','project_manager','liaison_officer']
const CHAINS: Record<string,string[]> = {
  approval:['JE','AEE','XEN','SE'], noc:['JE','AEE','XEN'], drawing:['JE','XEN'],
  vetting:['AEE','XEN','SE'], estimate:['AEE','XEN','SE'], report:['XEN'], letter:['XEN'],
  clearance:['JE','AEE','XEN','SE'], other:['JE','AEE','XEN','SE'],
}
const BLK = { subject:'', fileType:'noc', priority:'medium', department:'LCMA', dueDate:'', remarks:'' }

const T = {
  pageBg:'#f0f2f5', cardBg:'#fff', cardBg2:'#f8f9fc',
  border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb',
}

export default function LiaisonPage() {
  const { activeProjectId, user } = useAuthStore()
  const canEdit = EDIT_ROLES.includes(user?.role ?? '')
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [sel, setSel]           = useState<any>(null)
  const [approveM, setApproveM] = useState<any>(null)
  const [form, setForm]         = useState(BLK)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)

  const { data: dash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn: () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: fd, isLoading } = useQuery({
    queryKey: ['liaison-files', activeProjectId, status],
    queryFn: () => liaisonApi.files({ projectId: activeProjectId, status: status || undefined, limit: 100 }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: detail } = useQuery({
    queryKey: ['liaison-file', sel?.id],
    queryFn: () => liaisonApi.file(sel!.id).then(r => r.data),
    enabled: !!sel,
  })

  // WBS tasks/milestones for the "gates which task" link in the EOT tracker
  const { data: wbsTasks } = useQuery({
    queryKey: ['wbs-for-liaison', activeProjectId],
    queryFn: () => wbsApi.list(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const wbsOptions = [
    { value: '', label: '— none —' },
    ...((wbsTasks ?? []).map((t: any) => ({ value: t.wbsCode, label: `${t.wbsCode} — ${t.title}` }))),
  ]

  // Deep link from dashboard: /liaison?file=<id> auto-opens that file
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const fid = searchParams.get('file')
    if (fid && fd?.files?.length) {
      const f = fd.files.find((x: any) => x.id === fid)
      if (f) { setSel(f); setSearchParams({}, { replace: true }) }
    }
  }, [searchParams, fd])

  const createM = useMutation({
    mutationFn: (d: any) => liaisonApi.createFile({ ...d, projectId: activeProjectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['liaison-files'] }); qc.invalidateQueries({ queryKey: ['liaison-dash'] }); setShowNew(false); setForm(BLK) },
  })

  const invalidateFiles = () => {
    qc.invalidateQueries({ queryKey: ['liaison-files'] })
    qc.invalidateQueries({ queryKey: ['liaison-file', sel?.id] })
    qc.invalidateQueries({ queryKey: ['liaison-dash'] })
  }

  const approveM2 = useMutation({
    mutationFn: ({ id, action, remarks }: any) => liaisonApi.approveFile(id, { action, remarks }),
    onSuccess: () => { invalidateFiles(); setApproveM(null) },
  })

  const editM = useMutation({
    mutationFn: (d: any) => liaisonApi.updateFile(sel.id, d),
    onSuccess: () => { invalidateFiles(); setShowEdit(false) },
  })
  const closeM = useMutation({
    mutationFn: () => liaisonApi.closeFile(sel.id),
    onSuccess: () => invalidateFiles(),
  })
  function openEdit() {
    setEditForm({
      subject: detail.subject ?? '', fileType: detail.fileType ?? 'noc', department: detail.department ?? 'LCMA',
      priority: detail.priority ?? 'medium', currentStatus: detail.currentStatus ?? 'draft',
      dueDate: detail.dueDate?.split('T')[0] ?? '', remarks: detail.remarks ?? '',
      expectedDate: detail.expectedDate?.split('T')[0] ?? '', actualDate: detail.actualDate?.split('T')[0] ?? '',
      isEotGround: detail.isEotGround ?? false, eotReason: detail.eotReason ?? '',
      linkedWbsCode: detail.linkedWbsCode ?? '',
    })
    setShowEdit(true)
  }

  const today = new Date().toISOString().split('T')[0]
  const files = (fd?.files ?? []).filter((f: any) =>
    !search || f.subject?.toLowerCase().includes(search.toLowerCase()) || f.fileNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const statItems = [
    { label: 'Total', value: dash?.total ?? 0, color: T.blue },
    { label: 'Under Review', value: dash?.by_status?.under_review ?? 0, color: '#d97706' },
    { label: 'Approved', value: dash?.by_status?.approved ?? 0, color: '#059669' },
    { label: 'Returned', value: dash?.by_status?.returned ?? 0, color: '#dc2626' },
    { label: 'Overdue', value: dash?.overdue ?? 0, color: '#dc2626' },
    { label: 'Urgent', value: dash?.urgent ?? 0, color: '#7c3aed' },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text1, margin: '0 0 5px', letterSpacing: '-0.02em' }}>Liaison Files</h1>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>Track government approvals, NOCs and clearances</p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setShowNew(true)}>
          New File
        </Button>
      </div>

      {/* Stat pills */}
      {dash && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {statItems.map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: '1.5px solid ' + T.border, borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: 12, color: T.text3, fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <MagnifyingGlass style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3 }} size={15} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files, reference numbers..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: '10px 14px', background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="">All status</option>
          {['draft','submitted','under_review','approved','rejected','returned','closed'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: T.text3, padding: '0 4px' }}>{files.length} files</span>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* File list */}
        <div style={{ flex: 1, background: T.cardBg, borderRadius: 16, border: '1.5px solid ' + T.border, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', minHeight: 420 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}><Spinner /></div>
          ) : files.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12 }}>
              <FileText size={32} color="#e2e8f0" />
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text3, margin: 0 }}>No liaison files</p>
              <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>Create your first liaison file to get started</p>
              <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>Create</Button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px 90px 110px 100px', padding: '11px 20px', background: T.cardBg2, borderBottom: '1.5px solid ' + T.border }}>
                {['Ref No.', 'Subject', 'Department', 'Priority', 'Status', 'Due Date'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
              </div>
              {files.map((f: any, i: number) => {
                const overdue = f.dueDate && f.dueDate < today && !['approved','closed'].includes(f.currentStatus)
                const isSelected = sel?.id === f.id
                return (
                  <div key={f.id} onClick={() => setSel(f)} style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 100px 90px 110px 100px',
                    padding: '13px 20px', cursor: 'pointer', alignItems: 'center',
                    borderBottom: i < files.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: isSelected ? '#f0f6ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid ' + T.blue : '3px solid transparent',
                    transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8faff' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: 'monospace' }}>{f.fileNumber ?? 'DRAFT'}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: T.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subject}</p>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{f.department ?? '—'}</div>
                    <div><Badge value={f.priority} size="xs" /></div>
                    <div><Badge value={f.currentStatus} size="xs" /></div>
                    <div style={{ fontSize: 11, color: overdue ? '#dc2626' : T.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {overdue && <Warning size={12} color="#dc2626" />}
                      {f.dueDate ?? '—'}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Detail panel */}
        {sel && detail && (
          <div style={{ width: 280, flexShrink: 0, background: T.cardBg, border: '1.5px solid ' + T.border, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '16px 18px', background: T.cardBg2, borderBottom: '1.5px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: 'monospace' }}>{detail.fileNumber ?? 'DRAFT'}</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, margin: '4px 0 8px', lineHeight: 1.4 }}>{detail.subject}</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Badge value={detail.currentStatus} size="xs" />
                  <Badge value={detail.priority} size="xs" />
                  <Badge value={detail.fileType} size="xs" />
                </div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, fontSize: 16, padding: 2, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f1f5f9' }}>
              {[
                ['Department', detail.department],
                ['Current Holder', detail.currentHolder?.name],
                ['Due Date', detail.dueDate],
                ['Initiated By', detail.initiatedBy?.name],
              ].filter(([,v]) => v).map(([l, v]) => (
                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: T.text3, fontWeight: 500 }}>{l}</span>
                  <span style={{ color: T.text1, fontWeight: 600, textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v as string}</span>
                </div>
              ))}
              {detail.remarks && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: T.pageBg, borderRadius: 6, fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{detail.remarks}</div>
              )}
            </div>

            {(detail.expectedDate || Number(detail.delayDays) > 0 || detail.isEotGround) && (
              <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f1f5f9' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Delay / EOT</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {Number(detail.delayDays) > 0
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 9px' }}>{detail.delayDays} day delay</span>
                    : <span style={{ fontSize: 12, fontWeight: 600, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '3px 9px' }}>On schedule</span>}
                  {detail.isEotGround && <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 9px' }}>EOT ground</span>}
                  {detail.linkedWbsCode && <span style={{ fontSize: 11, color: T.text2 }}>gates <b style={{ color: T.text1 }}>{detail.linkedWbsCode}</b></span>}
                </div>
                {(detail.expectedDate || detail.actualDate) && (
                  <p style={{ fontSize: 11, color: T.text3, margin: '8px 0 0' }}>
                    Expected {detail.expectedDate?.split('T')[0] ?? '—'} · Actual {detail.actualDate?.split('T')[0] ?? 'pending'}
                  </p>
                )}
                {detail.eotReason && <p style={{ fontSize: 11, color: T.text2, margin: '6px 0 0', fontStyle: 'italic' }}>{detail.eotReason}</p>}
              </div>
            )}

            <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Approval Chain</div>
              {detail.approvalSteps?.map((step: any) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: step.status === 'approved' ? '#ecfdf5' : step.status === 'rejected' ? '#fef2f2' : '#f1f5f9',
                    color: step.status === 'approved' ? '#047857' : step.status === 'rejected' ? '#b91c1c' : T.text3,
                    border: '1.5px solid ' + (step.status === 'approved' ? '#a7f3d0' : step.status === 'rejected' ? '#fecaca' : T.border),
                  }}>{step.stepOrder}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{step.approverRole}</span>
                    {step.approver && <span style={{ fontSize: 11, color: T.text3 }}> · {step.approver.name}</span>}
                  </div>
                  {step.status !== 'pending' && <Badge value={step.status} size="xs" />}
                </div>
              ))}
            </div>

            {canEdit && (
              <div style={{ padding: '14px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" icon={<PencilSimple size={13} />} onClick={openEdit}>Edit</Button>
                {['draft', 'submitted', 'returned'].includes(detail.currentStatus) && (
                  <Button variant="primary" size="sm" icon={<CaretRight size={13} />} loading={editM.isPending}
                    onClick={() => editM.mutate({ currentStatus: 'under_review' })}>Submit for Approval</Button>
                )}
                {detail.currentStatus === 'under_review' && (
                  <>
                    <Button variant="success" size="sm" icon={<CheckCircle size={13} />} onClick={() => setApproveM({ action: 'approved', remarks: '' })}>Approve</Button>
                    <Button variant="danger" size="sm" icon={<XCircle size={13} />} onClick={() => setApproveM({ action: 'rejected', remarks: '' })}>Reject</Button>
                  </>
                )}
                {detail.currentStatus !== 'closed' && (
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm('Close this file?')) closeM.mutate() }}>Close</Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New File Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Liaison File" width={560}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate(form)} disabled={!form.subject}>Create File</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="File Type" value={form.fileType} onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))} options={FT} />
            <Select label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} options={DEPTS} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="NOC for drain crossing at Nishat road..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} options={PRI} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Textarea label="Remarks (optional)" value={form.remarks} rows={2} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Any additional context..." />
          {form.fileType && (
            <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Approval chain: </span>
              {(CHAINS[form.fileType] ?? CHAINS.other).map((r, i, arr) => (
                <span key={r}><span style={{ color: T.blue, fontWeight: 700 }}>{r}</span>{i < arr.length - 1 && <span style={{ color: T.text3 }}> → </span>}</span>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit File Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Liaison File" width={560}
        footer={<>
          <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button variant="primary" loading={editM.isPending} onClick={() => editM.mutate(editForm)} disabled={!editForm?.subject}>Save Changes</Button>
        </>}>
        {editForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="File Type" value={editForm.fileType} onChange={e => setEditForm((f: any) => ({ ...f, fileType: e.target.value }))} options={FT} />
              <Select label="Department" value={editForm.department} onChange={e => setEditForm((f: any) => ({ ...f, department: e.target.value }))} options={DEPTS} />
            </div>
            <Input label="Subject" value={editForm.subject} onChange={e => setEditForm((f: any) => ({ ...f, subject: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Select label="Priority" value={editForm.priority} onChange={e => setEditForm((f: any) => ({ ...f, priority: e.target.value }))} options={PRI} />
              <Select label="Status" value={editForm.currentStatus} onChange={e => setEditForm((f: any) => ({ ...f, currentStatus: e.target.value }))} options={STATUSES} />
              <Input label="Due Date" type="date" value={editForm.dueDate} onChange={e => setEditForm((f: any) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <Textarea label="Remarks" rows={2} value={editForm.remarks} onChange={e => setEditForm((f: any) => ({ ...f, remarks: e.target.value }))} />

            {/* ── Delay / EOT tracking ─────────────────────────────────── */}
            <div style={{ borderTop: '1px solid ' + T.border, paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Warning size={15} color="#d97706" weight="fill" />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>Delay &amp; EOT Tracking</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Expected Date" type="date" value={editForm.expectedDate}
                  onChange={e => setEditForm((f: any) => ({ ...f, expectedDate: e.target.value }))} />
                <Input label="Actual Date" type="date" value={editForm.actualDate}
                  onChange={e => setEditForm((f: any) => ({ ...f, actualDate: e.target.value }))} />
              </div>
              {editForm.expectedDate && (() => {
                const base = editForm.actualDate || today
                const d = Math.max(0, Math.round((new Date(base).getTime() - new Date(editForm.expectedDate).getTime()) / 86400000))
                return (
                  <p style={{ fontSize: 12, margin: '8px 0 0', color: d > 0 ? '#b91c1c' : '#059669', fontWeight: 600 }}>
                    {d > 0 ? `Delay: ${d} day${d === 1 ? '' : 's'}${editForm.actualDate ? '' : ' and counting'}` : 'On schedule'}
                  </p>
                )
              })()}
              <div style={{ marginTop: 12 }}>
                <Select label="Gates which WBS task / milestone (for schedule impact)"
                  value={editForm.linkedWbsCode}
                  onChange={e => setEditForm((f: any) => ({ ...f, linkedWbsCode: e.target.value }))}
                  options={wbsOptions} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: 13, color: T.text1 }}>
                <input type="checkbox" checked={!!editForm.isEotGround}
                  onChange={e => setEditForm((f: any) => ({ ...f, isEotGround: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                Flag this delay as a ground for an Extension-of-Time (EOT) claim
              </label>
              {editForm.isEotGround && (
                <div style={{ marginTop: 10 }}>
                  <Textarea label="EOT justification" rows={2} value={editForm.eotReason}
                    onChange={e => setEditForm((f: any) => ({ ...f, eotReason: e.target.value }))}
                    placeholder="e.g. Design vetting held at NIT 47 days beyond SLA, delaying network start." />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal open={!!approveM} onClose={() => setApproveM(null)}
        title={approveM?.action === 'approved' ? 'Approve File' : 'Reject File'} width={460}
        footer={<>
          <Button variant="ghost" onClick={() => setApproveM(null)}>Cancel</Button>
          <Button variant={approveM?.action === 'approved' ? 'success' : 'danger'} loading={approveM2.isPending}
            onClick={() => approveM2.mutate({ id: sel?.id, action: approveM?.action, remarks: approveM?.remarks })}>
            Confirm {approveM?.action === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '12px 14px', background: T.cardBg2, border: '1.5px solid ' + T.border, borderRadius: 8, fontSize: 13, color: T.text2 }}>{sel?.subject}</div>
          <Textarea label="Remarks (optional)" rows={3} value={approveM?.remarks ?? ''} onChange={e => setApproveM((a: any) => a ? { ...a, remarks: e.target.value } : null)} placeholder="Notes about this decision..." />
        </div>
      </Modal>
    </div>
  )
}
