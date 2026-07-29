import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Envelope, Plus, PaperPlaneTilt, Printer, Eye } from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'

const TMPL: Record<string,string> = {
  reminder: "With reference to our earlier communication, we wish to bring to your kind notice that the above-mentioned permission/NOC/approval is still pending with your office.\n\nWe request you to kindly expedite the matter at the earliest, as further delay is adversely affecting our project progress.\n\nWe hope for your prompt and favourable action.",
  covering: "With reference to the above subject, we are hereby submitting the following documents for your kind consideration:\n\n1. [Document Name] — [No. of copies]\n2. [Document Name] — [No. of copies]\n\nWe request you to kindly review the enclosed documents and accord the necessary approval at the earliest.",
  reply: "With reference to your letter dated ___________ regarding the above subject, we wish to submit our reply as under:\n\n[State your reply clearly and point-wise]\n\nWe trust this clarifies the matter to your satisfaction.",
  noc: "We are executing the above-mentioned work on behalf of LCMA/UEED, Srinagar. We require No Objection Certificate (NOC) from your department for [describe work].\n\nAll restoration works shall be carried out to your satisfaction at our own cost.",
}
const BLK = { subject:'', toName:'', toOrganization:'LCMA', toEmail:'', body:'', date: new Date().toISOString().split('T')[0] }
const T = { pageBg:'#f0f2f5', cardBg:'#fff', cardBg2:'#f8f9fc', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb' }

export default function LettersPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [showNew, setShowNew]   = useState(false)
  const [preview, setPreview]   = useState<any>(null)
  const [sendM, setSendM]       = useState<any>(null)
  const [sendF, setSendF]       = useState({ toEmail:'', subject:'', bodyNote:'' })
  const [form, setForm]         = useState(BLK)

  const { data: letters, isLoading } = useQuery({
    queryKey: ['letters', activeProjectId],
    queryFn: () => liaisonApi.letters({ projectId: activeProjectId }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: gStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => liaisonApi.gmailStatus().then(r => r.data),
  })

  const createM = useMutation({
    mutationFn: (d: any) => liaisonApi.createLetter({ ...d, projectId: activeProjectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowNew(false); setForm(BLK) },
  })

  const sendM2 = useMutation({
    mutationFn: ({ id, d }: any) => liaisonApi.sendLetter(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setSendM(null) },
  })

  function print(l: any) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write('<html><head><title>' + l.letterNumber + '</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:40px;color:#111;line-height:1.7}.co{font-size:18px;font-weight:bold;color:#2563eb}.body{white-space:pre-wrap;line-height:1.9}</style></head><body><div style="border-bottom:3px solid #2563eb;padding-bottom:8px;margin-bottom:18px"><div class="co">Khilari Infrastructure Pvt. Ltd.</div><div style="font-size:11px;color:#555">Srinagar, J&K</div></div><div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11px"><div><b>Ref:</b> ' + l.letterNumber + '</div><div><b>Date:</b> ' + l.date + '</div></div><div style="margin-bottom:12px"><b>To,</b><br>' + (l.toName ?? '') + '<br>' + (l.toOrganization ?? '') + '</div><div style="font-weight:bold;margin-bottom:10px"><u>Sub:</u> ' + l.subject + '</div><hr style="border:none;border-top:1px solid #ddd;margin:10px 0"><div style="margin-bottom:10px">Respected Sir/Madam,</div><div class="body">' + l.body + '</div><div style="margin-top:40px">Yours faithfully,<br><br><br><b>' + (l.signedBy?.name ?? user?.name) + '</b></div></body></html>')
    win.document.close(); win.print()
  }

  const list = Array.isArray(letters) ? letters : []

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text1, margin: '0 0 5px', letterSpacing: '-0.02em' }}>Official Letters</h1>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>Draft and send letters to LCMA, UEED and government departments</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!gStatus?.configured && (
            <div style={{ padding: '7px 14px', borderRadius: 8, background: '#fffbeb', border: '1.5px solid #fde68a', color: '#b45309', fontSize: 12, fontWeight: 500 }}>
              Gmail not connected
            </div>
          )}
          <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setShowNew(true)}>Draft Letter</Button>
        </div>
      </div>

      <div style={{ background: T.cardBg, borderRadius: 16, border: '1.5px solid ' + T.border, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0' }}><Spinner /></div>
        ) : list.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12 }}>
            <Envelope size={32} color="#e2e8f0" />
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text3, margin: 0 }}>No letters drafted yet</p>
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>Draft first letter</Button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.cardBg2, borderBottom: '1.5px solid ' + T.border }}>
                {['Ref No.','Date','To','Subject','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((l: any, i: number) => (
                <tr key={l.id} style={{ borderBottom: i < list.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '13px 20px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: T.blue, whiteSpace: 'nowrap' }}>{l.letterNumber ?? '—'}</td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: T.text2, whiteSpace: 'nowrap' }}>{l.date}</td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: T.text2, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.toOrganization ?? '—'}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: T.text1, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subject}</td>
                  <td style={{ padding: '13px 20px' }}><Badge value={l.status} size="xs" /></td>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button onClick={() => setPreview(l)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: T.text3, borderRadius: 6, display: 'flex' }} title="Preview"><Eye size={14} /></button>
                      <button onClick={() => print(l)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: T.text3, borderRadius: 6, display: 'flex' }} title="Print"><Printer size={14} /></button>
                      <a href={liaisonApi.pdfUrl(l.id)} target="_blank" rel="noreferrer" style={{ padding: '5px 7px', fontSize: 10, fontWeight: 600, color: T.text3, borderRadius: 6, background: 'none' }}>PDF</a>
                      <button onClick={() => { setSendM(l); setSendF({ toEmail: l.toEmail ?? '', subject: 'Ref: ' + l.letterNumber + ' — ' + l.subject, bodyNote: '' }) }}
                        style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex', color: l.status === 'dispatched' ? '#059669' : T.blue }} title="Send via Gmail">
                        <PaperPlaneTilt size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Draft Letter Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Draft Official Letter" width={680}
        footer={<><Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button><Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate(form)} disabled={!form.subject || !form.body}>Save Letter</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="To (Name)" value={form.toName} onChange={e => setForm(f => ({ ...f, toName: e.target.value }))} placeholder="Executive Engineer" />
            <Input label="Organisation" value={form.toOrganization} onChange={e => setForm(f => ({ ...f, toOrganization: e.target.value }))} placeholder="LCMA, UEED..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Email (for Gmail)" type="email" value={form.toEmail} onChange={e => setForm(f => ({ ...f, toEmail: e.target.value }))} placeholder="officer@jkgov.in" />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Request for NOC / Approval..." />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Body</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['Reminder','reminder'],['Covering','covering'],['Reply','reply'],['NOC Request','noc']].map(([l,k]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, body: TMPL[k] }))}
                    style={{ fontSize: 12, padding: '6px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#f8f9fc', color: '#374151', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Textarea rows={10} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Type letter body here, or click a template above..." />
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.letterNumber ?? 'Letter Preview'} width={680}
        footer={<div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <Button variant="secondary" icon={<Printer size={13} />} onClick={() => print(preview)}>Print</Button>
          <Button variant="secondary" icon={<PaperPlaneTilt size={13} />} onClick={() => { setSendM(preview); setPreview(null); setSendF({ toEmail: preview?.toEmail ?? '', subject: 'Ref: ' + preview?.letterNumber, bodyNote: '' }) }}>Send</Button>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
        </div>}>
        {preview && (
          <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', border: '1.5px solid ' + T.border, fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', lineHeight: 1.7 }}>
            <div style={{ borderBottom: '3px solid #2563eb', paddingBottom: 8, marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2563eb' }}>Khilari Infrastructure Pvt. Ltd.</div>
              <div style={{ fontSize: 11, color: '#555' }}>Srinagar, Jammu & Kashmir</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
              <div><b>Ref No.:</b> {preview.letterNumber}</div>
              <div><b>Date:</b> {preview.date}</div>
            </div>
            <div style={{ marginBottom: 14 }}><b>To,</b><br />{preview.toName}<br />{preview.toOrganization}</div>
            <div style={{ fontWeight: 'bold', marginBottom: 10 }}><u>Sub:</u> {preview.subject}</div>
            <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '10px 0' }} />
            <div style={{ marginBottom: 10 }}>Respected Sir/Madam,</div>
            <div style={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{preview.body}</div>
            <div style={{ marginTop: 40 }}>Yours faithfully,<br /><br /><br />
              <b>{preview.signedBy?.name ?? user?.name}</b><br />
              <span style={{ color: '#555' }}>Authorised Signatory, Khilari Infrastructure Pvt. Ltd.</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Modal */}
      <Modal open={!!sendM} onClose={() => setSendM(null)} title="Send Letter via Gmail" width={480}
        footer={<><Button variant="ghost" onClick={() => setSendM(null)}>Cancel</Button><Button variant="primary" loading={sendM2.isPending} icon={<PaperPlaneTilt size={13} />} onClick={() => sendM2.mutate({ id: sendM?.id, d: sendF })} disabled={!sendF.toEmail}>Send Email</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!gStatus?.configured && (
            <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#b45309' }}>
              Gmail not connected. Visit /api/v1/gmail/auth to authorise.
            </div>
          )}
          <div style={{ padding: '10px 14px', background: T.cardBg2, border: '1.5px solid ' + T.border, borderRadius: 8, fontSize: 13, color: T.text2 }}>
            <b>Letter:</b> {sendM?.letterNumber} — {sendM?.subject}
          </div>
          <Input label="Recipient Email" type="email" value={sendF.toEmail} onChange={e => setSendF(f => ({ ...f, toEmail: e.target.value }))} placeholder="officer@jkgov.in" />
          <Input label="Email Subject" value={sendF.subject} onChange={e => setSendF(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Covering Note (optional)" rows={3} value={sendF.bodyNote} onChange={e => setSendF(f => ({ ...f, bodyNote: e.target.value }))} placeholder="Brief note before the PDF attachment..." />
          <p style={{ fontSize: 11, color: T.text3 }}>The letter PDF will be generated and attached automatically.</p>
        </div>
      </Modal>
    </div>
  )
}
