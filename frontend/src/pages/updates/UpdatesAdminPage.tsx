import { toast } from '@/lib/notify'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updatesApi, type UpdatePhoto, type UpdateVideo } from '@/api/updates.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { UploadSimple, Trash, Plus, ImagesSquare, UsersThree, X, PencilSimple, Sparkle, ArrowCounterClockwise, VideoCamera, LinkSimple, PlayCircle } from '@phosphor-icons/react'
import { convertImageToWebP } from '@/lib/imageToWebp'
import { aiApi } from '@/api/ai.api'

const C = {
  card:'#fff', border:'#e2e8f0', bg:'#f0f2f5', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540', blueBg:'#eff6ff',
}
const CATS = ['milestone','civil','mechanical','electrical','safety','survey','general']
const catOpts = CATS.map(c => ({ value:c, label:c[0].toUpperCase()+c.slice(1) }))

function parseVideoUrl(url: string): { provider: 'youtube' | 'vimeo' | 'external'; embedUrl: string; thumbnail?: string } {
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)
  if (ytMatch && ytMatch[1]) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    }
  }
  const vmMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i)
  if (vmMatch && vmMatch[3]) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vmMatch[3]}`,
    }
  }
  return {
    provider: 'external',
    embedUrl: url,
  }
}

function PhotoPicker({ folder, photos, onChange }:{ folder:'updates'|'team'; photos:UpdatePhoto[]; onChange:(p:UpdatePhoto[])=>void }) {
  const inp = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (e:any) => {
    const rawFiles: File[] = Array.from(e.target.files ?? [])
    if (!rawFiles.length) return
    setBusy(true)
    try {
      const added: UpdatePhoto[] = []
      for (const raw of rawFiles) {
        const f = await convertImageToWebP(raw)
        const r = await updatesApi.uploadPhoto(f, folder)
        added.push({ url: r.data.url, key: r.data.key })
      }
      onChange([...photos, ...added])
    } catch (err:any) { toast.error(err?.response?.data?.message ?? 'Upload failed — check Storage settings.') }
    finally { setBusy(false); if (inp.current) inp.current.value = '' }
  }
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
        {photos.map((p,i) => (
          <div key={p.key+i} style={{ position:'relative', width:74, height:74, borderRadius:8, overflow:'hidden', border:'1px solid '+C.border }}>
            <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <button onClick={()=>onChange(photos.filter((_,j)=>j!==i))} style={{ position:'absolute', top:2, right:2,
              width:18, height:18, borderRadius:'50%', border:'none', background:'rgba(0,0,0,0.6)', color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={11}/></button>
          </div>
        ))}
      </div>
      <input ref={inp} type="file" accept="image/*" multiple onChange={pick} style={{ display:'none' }} />
      <Button variant="secondary" size="sm" loading={busy} icon={<UploadSimple size={14}/>} onClick={()=>inp.current?.click()}>
        {folder==='team' ? 'Upload photo' : 'Add photos'}
      </Button>
    </div>
  )
}

function VideoPicker({ videos, onChange }:{ videos:UpdateVideo[]; onChange:(v:UpdateVideo[])=>void }) {
  const inp = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')

  const pick = async (e:any) => {
    const rawFiles: File[] = Array.from(e.target.files ?? [])
    if (!rawFiles.length) return
    setBusy(true)
    try {
      const added: UpdateVideo[] = []
      for (const raw of rawFiles) {
        if (raw.size > 100 * 1024 * 1024) {
          toast.error(`"${raw.name}" exceeds 100 MB limit.`)
          continue
        }
        const r = await updatesApi.uploadVideo(raw, 'updates')
        added.push({
          url: r.data.url,
          key: r.data.key,
          title: raw.name.replace(/\.[^.]+$/, ''),
          provider: 'upload',
        })
      }
      onChange([...videos, ...added])
      if (added.length > 0) toast.success(`Uploaded ${added.length} video(s)!`)
    } catch (err:any) {
      toast.error(err?.response?.data?.message ?? 'Video upload failed — check Storage settings.')
    } finally {
      setBusy(false)
      if (inp.current) inp.current.value = ''
    }
  }

  const addLink = () => {
    if (!linkUrl.trim()) return
    const parsed = parseVideoUrl(linkUrl.trim())
    const newVideo: UpdateVideo = {
      url: parsed.embedUrl,
      title: linkTitle.trim() || (parsed.provider === 'youtube' ? 'YouTube Video' : 'Video Clip'),
      thumbnail: parsed.thumbnail,
      provider: parsed.provider,
    }
    onChange([...videos, newVideo])
    setLinkUrl('')
    setLinkTitle('')
    setShowUrlModal(false)
    toast.success('Video link added!')
  }

  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:8 }}>
        {videos.map((v, i) => (
          <div key={(v.key || v.url) + i} style={{ position:'relative', width:140, borderRadius:8, overflow:'hidden', border:'1px solid '+C.border, background:'#0b1f28' }}>
            <div style={{ position:'relative', width:'100%', height:78, background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {v.thumbnail ? (
                <img src={v.thumbnail} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : v.provider === 'upload' ? (
                <video src={v.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ color:'#fff', fontSize:11, textAlign:'center', padding:4 }}>{v.provider}</div>
              )}
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <VideoCamera size={24} color="#fff" weight="fill" />
              </div>
            </div>
            <div style={{ padding:'4px 6px', background:'#fff' }}>
              <p style={{ fontSize:11, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:C.text1 }}>
                {v.title || 'Video ' + (i + 1)}
              </p>
              <span style={{ fontSize:9.5, color:C.text3, textTransform:'uppercase' }}>{v.provider || 'video'}</span>
            </div>
            <button
              type="button"
              onClick={() => onChange(videos.filter((_, j) => j !== i))}
              style={{
                position:'absolute', top:2, right:2,
                width:18, height:18, borderRadius:'50%', border:'none', background:'rgba(0,0,0,0.6)', color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'
              }}
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      <input ref={inp} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*" multiple onChange={pick} style={{ display:'none' }} />
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <Button variant="secondary" size="sm" loading={busy} icon={<VideoCamera size={14} />} onClick={() => inp.current?.click()}>
          Upload Video (MP4 / WebM)
        </Button>
        <Button variant="ghost" size="sm" icon={<LinkSimple size={14} />} onClick={() => setShowUrlModal(true)}>
          Add YouTube / Video Link
        </Button>
      </div>

      {showUrlModal && (
        <div style={{
          marginTop:10, padding:12, background:'#f8fafc', border:'1px solid '+C.border, borderRadius:8,
          display:'flex', flexDirection:'column', gap:8
        }}>
          <p style={{ fontSize:12, fontWeight:700, margin:0, color:C.text1 }}>Attach Video URL (YouTube, Vimeo, or MP4 link)</p>
          <Input placeholder="https://www.youtube.com/watch?v=... or direct video URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
          <Input placeholder="Video Title / Caption (e.g. Nishat STP Site Drone Footage)" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowUrlModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={addLink} disabled={!linkUrl.trim()}>Attach Video</Button>
          </div>
        </div>
      )}
    </div>
  )
}

const OVERRIDE_ROLES = ['super_admin', 'admin', 'project_manager']

function UpdatesTab() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canEditRow = (u: any) => (!!user?.id && user.id === u.createdById) || OVERRIDE_ROLES.includes(user?.role ?? '')
  const { data: rows = [] } = useQuery({ queryKey:['pu-list'], queryFn:()=>updatesApi.list().then(r=>r.data) })
  const blank = { date:new Date().toISOString().slice(0,10), title:'', description:'', category:'general', isPublished:true, photos:[] as UpdatePhoto[], videos:[] as UpdateVideo[] }
  const [form, setForm] = useState<any>(blank)
  const [editId, setEditId] = useState<string | null>(null)
  const [aiBusyField, setAiBusyField] = useState<'all' | 'title' | 'description' | null>(null)
  const [lastOriginalDraft, setLastOriginalDraft] = useState<{ title: string; description: string } | null>(null)

  const save = useMutation({
    mutationFn: () => editId ? updatesApi.update(editId, form) : updatesApi.create(form),
    onSuccess: () => { setForm(blank); setEditId(null); setLastOriginalDraft(null); qc.invalidateQueries({ queryKey:['pu-list'] }) },
  })
  const del = useMutation({
    mutationFn: (id:string) => updatesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['pu-list'] }); setEditId(null); setForm(blank); setLastOriginalDraft(null) },
  })
  const set = (k:string) => (e:any) => setForm((f:any)=>({ ...f, [k]: e.target.value }))

  function startEdit(u:any) {
    setEditId(u.id)
    setLastOriginalDraft(null)
    setForm({ date:(u.date||'').slice(0,10), title:u.title||'', description:u.description||'', category:u.category||'general', isPublished:u.isPublished ?? true, photos:u.photos||[], videos:u.videos||[] })
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  async function polishBoth() {
    if (!form.title && !form.description) {
      toast.error('Please enter a draft title or description first.')
      return
    }
    setAiBusyField('all')
    try {
      const system = `You are an expert civil engineering communications editor for Khilari Infrastructure (KIPL) on the Srinagar STP & Sewerage Network project (Dal Lake).
Improve, professionalize, and polish the draft project update for executive stakeholders and the public website.
Preserve all factual equipment names (e.g., Poclain, JCB, VSC, SBR, IPS-1, RMC), dates, and technical details. Do NOT invent fictional facts.
Output ONLY a JSON object in this exact format with no extra text or markdown code fences:
{"title": "Polished concise headline (under 12 words)", "description": "Polished construction-grade narrative in 1-2 concise paragraphs"}`

      const prompt = `Category: ${form.category}\nDate: ${form.date}\nDraft Title: ${form.title || '(not provided)'}\nDraft Description: ${form.description || '(not provided)'}`

      const res = await aiApi.generate(prompt, system)
      let raw = (res.data?.text || '').trim()
      raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()

      const parsed = JSON.parse(raw)
      if (parsed.title || parsed.description) {
        setLastOriginalDraft({ title: form.title, description: form.description })
        setForm((f: any) => ({
          ...f,
          title: parsed.title || f.title,
          description: parsed.description || f.description,
        }))
        toast.success('✨ Title and description polished with AI!')
      }
    } catch (err: any) {
      toast.error('AI polish failed: ' + (err?.response?.data?.message ?? err?.message ?? 'Please try again.'))
    } finally {
      setAiBusyField(null)
    }
  }

  async function polishTitle() {
    if (!form.title) {
      toast.error('Please enter a draft title first.')
      return
    }
    setAiBusyField('title')
    try {
      const system = `You are an expert civil engineering communications editor for KIPL Srinagar STP project. Polish this draft title into a single punchy, professional, construction-grade headline (max 10-12 words). Return ONLY the polished title with no quotes or preamble.`
      const prompt = `Category: ${form.category}\nDraft Title: ${form.title}\nContext/Description: ${form.description || 'None'}`
      const res = await aiApi.generate(prompt, system)
      const polished = (res.data?.text || '').trim().replace(/^"|"$/g, '')
      if (polished) {
        setLastOriginalDraft({ title: form.title, description: form.description })
        setForm((f: any) => ({ ...f, title: polished }))
        toast.success('✨ Title polished with AI!')
      }
    } catch (err: any) {
      toast.error('AI polish failed: ' + (err?.response?.data?.message ?? err?.message))
    } finally {
      setAiBusyField(null)
    }
  }

  async function polishDescription() {
    if (!form.description && !form.title) {
      toast.error('Please enter a draft description or title first.')
      return
    }
    setAiBusyField('description')
    try {
      const system = `You are an expert civil engineering communications editor for KIPL Srinagar STP project (Dal Lake Sewerage Scheme). Polish this project update description into a professional, clear, construction-grade narrative for executive review and public transparency. Fix grammar and flow. Do NOT invent facts or numbers. Return ONLY the polished description text.`
      const prompt = `Category: ${form.category}\nTitle: ${form.title || 'General Update'}\nDraft Description: ${form.description || form.title}`
      const res = await aiApi.generate(prompt, system)
      const polished = (res.data?.text || '').trim()
      if (polished) {
        setLastOriginalDraft({ title: form.title, description: form.description })
        setForm((f: any) => ({ ...f, description: polished }))
        toast.success('✨ Description polished with AI!')
      }
    } catch (err: any) {
      toast.error('AI polish failed: ' + (err?.response?.data?.message ?? err?.message))
    } finally {
      setAiBusyField(null)
    }
  }

  function revertAiPolish() {
    if (lastOriginalDraft) {
      setForm((f: any) => ({
        ...f,
        title: lastOriginalDraft.title,
        description: lastOriginalDraft.description,
      }))
      setLastOriginalDraft(null)
      toast.info('Reverted to original draft.')
    }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:24, alignItems:'start' }}>
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px', display:'grid', gap:13 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.text1, margin:0 }}>{editId ? 'Edit update' : 'New update'}</h3>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {lastOriginalDraft && (
              <button
                type="button"
                onClick={revertAiPolish}
                title="Undo AI changes"
                style={{
                  border:'1px solid #cbd5e1', background:'#f8fafc', color:'#475569',
                  fontSize:11, borderRadius:6, padding:'3px 8px', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:4, fontWeight:600
                }}
              >
                <ArrowCounterClockwise size={12}/> Undo AI
              </button>
            )}
            {editId && <button onClick={()=>{ setEditId(null); setForm(blank); setLastOriginalDraft(null) }} style={{ border:'none', background:'none', color:C.blue, fontSize:12, cursor:'pointer', fontWeight:600 }}>Cancel edit</button>}
          </div>
        </div>

        {/* AI Quick Polish Toolbar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'7px 11px', background:'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
          border:'1px solid #dbeafe', borderRadius:8
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:700, color:'#1e40af' }}>
            <Sparkle size={14} weight="fill" color="#2563eb" />
            <span>AI Text Enhancer</span>
          </div>
          <button
            type="button"
            onClick={polishBoth}
            disabled={(!form.title && !form.description) || !!aiBusyField}
            style={{
              background: '#fff',
              border: '1px solid #bfdbfe',
              color: (!form.title && !form.description) || !!aiBusyField ? '#94a3b8' : '#1d4ed8',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 6,
              cursor: (!form.title && !form.description) || !!aiBusyField ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <Sparkle size={12} weight="fill" />
            {aiBusyField === 'all' ? 'Polishing...' : 'Polish Title & Body'}
          </button>
        </div>

        <Input label="Date" type="date" value={form.date} onChange={set('date')} />

        {/* Title with inline AI button */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Title</label>
            <button
              type="button"
              onClick={polishTitle}
              disabled={!form.title || !!aiBusyField}
              style={{
                border:'none', background:'none',
                color: form.title && !aiBusyField ? '#2563eb' : '#94a3b8',
                fontSize:11, fontWeight:700,
                cursor: form.title && !aiBusyField ? 'pointer' : 'default',
                display:'flex', alignItems:'center', gap:3, padding:'1px 4px'
              }}
            >
              <Sparkle size={12} weight="fill" />
              {aiBusyField === 'title' ? 'Improving...' : 'AI Improve'}
            </button>
          </div>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. KIPL Poclain excavation commenced" />
        </div>

        {/* Description with inline AI button */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Description</label>
            <button
              type="button"
              onClick={polishDescription}
              disabled={(!form.description && !form.title) || !!aiBusyField}
              style={{
                border:'none', background:'none',
                color: (form.description || form.title) && !aiBusyField ? '#2563eb' : '#94a3b8',
                fontSize:11, fontWeight:700,
                cursor: (form.description || form.title) && !aiBusyField ? 'pointer' : 'default',
                display:'flex', alignItems:'center', gap:3, padding:'1px 4px'
              }}
            >
              <Sparkle size={12} weight="fill" />
              {aiBusyField === 'description' ? 'Improving...' : 'AI Improve'}
            </button>
          </div>
          <Textarea value={form.description} onChange={set('description')} rows={4} placeholder="What was done on site…" />
        </div>

        <Select label="Category" options={catOpts} value={form.category} onChange={set('category')} />
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Photos</label>
          <PhotoPicker folder="updates" photos={form.photos} onChange={(photos)=>setForm((f:any)=>({ ...f, photos }))} />
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
            Drone & Site Videos (MP4 / WebM or YouTube / Vimeo Embed)
          </label>
          <VideoPicker videos={form.videos || []} onChange={(videos)=>setForm((f:any)=>({ ...f, videos }))} />
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:C.text2, cursor:'pointer' }}>
          <input type="checkbox" checked={form.isPublished} onChange={e=>setForm((f:any)=>({ ...f, isPublished:e.target.checked }))} style={{ accentColor:C.blue }} />
          Show on public site
        </label>
        <Button variant="primary" loading={save.isPending} icon={editId ? <PencilSimple size={15}/> : <Plus size={15}/>}
          disabled={!form.title || !form.date} onClick={()=>save.mutate()}>{editId ? 'Save changes' : 'Publish update'}</Button>
      </div>

      <div style={{ display:'grid', gap:12 }}>
        {rows.length === 0 && <p style={{ color:C.text3, fontSize:14 }}>No updates yet.</p>}
        {rows.map((u:any) => (
          <div key={u.id} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.blue, background:C.blueBg, padding:'2px 8px', borderRadius:20 }}>{u.category}</span>
                  <span style={{ fontSize:12, color:C.text3 }}>{u.date}</span>
                  {u.createdBy && <span style={{ fontSize:11, color:C.text3 }}>· by {u.createdBy}</span>}
                  {u.videos?.length > 0 && (
                    <span style={{ fontSize:10.5, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', padding:'2px 7px', borderRadius:20, display:'flex', alignItems:'center', gap:3 }}>
                      <VideoCamera size={11} weight="fill"/> {u.videos.length} video{u.videos.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {u.photos?.length > 0 && (
                    <span style={{ fontSize:10.5, fontWeight:600, color:C.text3 }}>· {u.photos.length} photo{u.photos.length > 1 ? 's' : ''}</span>
                  )}
                  {!u.isPublished && <span style={{ fontSize:11, color:C.amber, fontWeight:600 }}>· draft</span>}
                </div>
                <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 3px' }}>{u.title}</p>
                <p style={{ fontSize:12.5, color:C.text2, margin:0 }}>{u.description}</p>
              </div>
              {canEditRow(u) && (
                <div style={{ display:'flex', gap:6, height:'fit-content' }}>
                  <button title="Edit" onClick={()=>startEdit(u)}
                    style={{ border:'none', background:'none', cursor:'pointer', color:C.text2 }}><PencilSimple size={17}/></button>
                  <button title="Delete" onClick={()=>{ if(confirm('Delete this update?')) del.mutate(u.id) }}
                    style={{ border:'none', background:'none', cursor:'pointer', color:C.red }}><Trash size={17}/></button>
                </div>
              )}
            </div>
            {((u.photos?.length > 0) || (u.videos?.length > 0)) && (
              <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
                {u.photos?.map((p:UpdatePhoto,i:number)=>(
                  <img key={'p'+i} src={p.url} alt="" style={{ width:60, height:60, objectFit:'cover', borderRadius:6, border:'1px solid '+C.border }} />
                ))}
                {u.videos?.map((v:UpdateVideo,i:number)=>(
                  <div key={'v'+i} style={{ width:96, height:60, borderRadius:6, overflow:'hidden', position:'relative', background:'#0b1f28', border:'1px solid '+C.border }}>
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      <div style={{ width:'100%', height:'100%', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <VideoCamera size={20} color="#fff" />
                      </div>
                    )}
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <PlayCircle size={20} color="#fff" weight="fill" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamTab() {
  const qc = useQueryClient()
  const { data: rows = [] } = useQuery({ queryKey:['team-all'], queryFn:()=>updatesApi.teamAll().then(r=>r.data) })
  const blank = { name:'', title:'', department:'', bio:'', sortOrder:0, isPublished:true, photoUrl:'', photoKey:'' }
  const [form, setForm] = useState<any>(blank)
  const [editId, setEditId] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => editId ? updatesApi.teamUpdate(editId, form) : updatesApi.teamCreate(form),
    onSuccess: () => { setForm(blank); setEditId(null); qc.invalidateQueries({ queryKey:['team-all'] }) },
  })
  const del = useMutation({
    mutationFn: (id:string) => updatesApi.teamRemove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['team-all'] }); setEditId(null); setForm(blank) },
  })
  const set = (k:string) => (e:any) => setForm((f:any)=>({ ...f, [k]: e.target.value }))
  function startEdit(m:any) {
    setEditId(m.id)
    setForm({ name:m.name||'', title:m.title||'', department:m.department||'', bio:m.bio||'', sortOrder:m.sortOrder??0, isPublished:m.isPublished ?? true, photoUrl:m.photoUrl||'', photoKey:m.photoKey||'' })
    window.scrollTo({ top:0, behavior:'smooth' })
  }
  const photos: UpdatePhoto[] = form.photoUrl ? [{ url:form.photoUrl, key:form.photoKey }] : []

  return (
    <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:24, alignItems:'start' }}>
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px', display:'grid', gap:13 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.text1, margin:0 }}>{editId ? 'Edit member' : 'Add team member'}</h3>
          {editId && <button onClick={()=>{ setEditId(null); setForm(blank) }} style={{ border:'none', background:'none', color:C.blue, fontSize:12, cursor:'pointer', fontWeight:600 }}>Cancel edit</button>}
        </div>
        <Input label="Name" value={form.name} onChange={set('name')} />
        <Input label="Designation" value={form.title} onChange={set('title')} placeholder="Project Manager" />
        <Input label="Department" value={form.department} onChange={set('department')} placeholder="EPC" />
        <Textarea label="Short bio" value={form.bio} onChange={set('bio')} rows={2} />
        <Input label="Sort order" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Photo</label>
          <PhotoPicker folder="team" photos={photos}
            onChange={(p)=>setForm((f:any)=>({ ...f, photoUrl:p[p.length-1]?.url ?? '', photoKey:p[p.length-1]?.key ?? '' }))} />
        </div>
        <Button variant="primary" loading={save.isPending} icon={editId ? <PencilSimple size={15}/> : <Plus size={15}/>} disabled={!form.name} onClick={()=>save.mutate()}>{editId ? 'Save changes' : 'Add member'}</Button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {rows.length === 0 && <p style={{ color:C.text3, fontSize:14 }}>No team members yet.</p>}
        {rows.map((m:any) => (
          <div key={m.id} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px', textAlign:'center', position:'relative' }}>
            <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:4 }}>
              <button title="Edit" onClick={()=>startEdit(m)}
                style={{ border:'none', background:'none', cursor:'pointer', color:C.text2 }}><PencilSimple size={15}/></button>
              <button title="Remove" onClick={()=>{ if(confirm('Remove '+m.name+'?')) del.mutate(m.id) }}
                style={{ border:'none', background:'none', cursor:'pointer', color:C.red }}><Trash size={15}/></button>
            </div>
            <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 10px', overflow:'hidden', background:C.bg, border:'2px solid '+C.border }}>
              {m.photoUrl ? <img src={m.photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:22, fontWeight:700, color:C.text3 }}>{m.name?.charAt(0)}</div>}
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 2px' }}>{m.name}</p>
            <p style={{ fontSize:12, color:C.blue, fontWeight:600, margin:0 }}>{m.title}</p>
            {m.department && <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>{m.department}</p>}
            {!m.isPublished && <p style={{ fontSize:11, color:C.amber, margin:'4px 0 0', fontWeight:600 }}>Hidden</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UpdatesAdminPage() {
  const [tab, setTab] = useState<'updates'|'team'>('updates')
  const Tab = ({ id, icon:Icon, label }:{ id:'updates'|'team'; icon:any; label:string }) => (
    <button onClick={()=>setTab(id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
      border:'none', borderBottom:'2px solid '+(tab===id?C.blue:'transparent'), background:'none', cursor:'pointer',
      fontSize:14, fontWeight:700, color: tab===id?C.blue:C.text3 }}><Icon size={17}/>{label}</button>
  )
  return (
    <div style={{ padding:'26px 30px' }}>
      <h1 style={{ fontSize:22, fontWeight:800, color:C.text1, margin:'0 0 3px' }}>Project Updates</h1>
      <p style={{ fontSize:13, color:C.text2, margin:'0 0 18px' }}>
        Record site progress and manage the team shown on the public website (kiplstpsrinagar.com).
      </p>
      <div style={{ display:'flex', gap:6, borderBottom:'1.5px solid '+C.border, marginBottom:24 }}>
        <Tab id="updates" icon={ImagesSquare} label="Updates & Photos" />
        <Tab id="team" icon={UsersThree} label="Team" />
      </div>
      {tab==='updates' ? <UpdatesTab/> : <TeamTab/>}
    </div>
  )
}
