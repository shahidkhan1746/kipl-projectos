import { toast } from '@/lib/notify'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updatesApi, type UpdatePhoto } from '@/api/updates.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { UploadSimple, Trash, Plus, ImagesSquare, UsersThree, X, PencilSimple } from '@phosphor-icons/react'

const C = {
  card:'#fff', border:'#e2e8f0', bg:'#f0f2f5', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540', blueBg:'#eff6ff',
}
const CATS = ['milestone','civil','mechanical','electrical','safety','survey','general']
const catOpts = CATS.map(c => ({ value:c, label:c[0].toUpperCase()+c.slice(1) }))

function PhotoPicker({ folder, photos, onChange }:{ folder:'updates'|'team'; photos:UpdatePhoto[]; onChange:(p:UpdatePhoto[])=>void }) {
  const inp = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (e:any) => {
    const files: File[] = Array.from(e.target.files ?? [])
    if (!files.length) return
    setBusy(true)
    try {
      const added: UpdatePhoto[] = []
      for (const f of files) {
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

const OVERRIDE_ROLES = ['super_admin', 'admin', 'project_manager']

function UpdatesTab() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canEditRow = (u: any) => (!!user?.id && user.id === u.createdById) || OVERRIDE_ROLES.includes(user?.role ?? '')
  const { data: rows = [] } = useQuery({ queryKey:['pu-list'], queryFn:()=>updatesApi.list().then(r=>r.data) })
  const blank = { date:new Date().toISOString().slice(0,10), title:'', description:'', category:'general', isPublished:true, photos:[] as UpdatePhoto[] }
  const [form, setForm] = useState<any>(blank)
  const [editId, setEditId] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => editId ? updatesApi.update(editId, form) : updatesApi.create(form),
    onSuccess: () => { setForm(blank); setEditId(null); qc.invalidateQueries({ queryKey:['pu-list'] }) },
  })
  const del = useMutation({
    mutationFn: (id:string) => updatesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['pu-list'] }); setEditId(null); setForm(blank) },
  })
  const set = (k:string) => (e:any) => setForm((f:any)=>({ ...f, [k]: e.target.value }))
  function startEdit(u:any) {
    setEditId(u.id)
    setForm({ date:(u.date||'').slice(0,10), title:u.title||'', description:u.description||'', category:u.category||'general', isPublished:u.isPublished ?? true, photos:u.photos||[] })
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:24, alignItems:'start' }}>
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px', display:'grid', gap:13 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:C.text1, margin:0 }}>{editId ? 'Edit update' : 'New update'}</h3>
          {editId && <button onClick={()=>{ setEditId(null); setForm(blank) }} style={{ border:'none', background:'none', color:C.blue, fontSize:12, cursor:'pointer', fontWeight:600 }}>Cancel edit</button>}
        </div>
        <Input label="Date" type="date" value={form.date} onChange={set('date')} />
        <Input label="Title" value={form.title} onChange={set('title')} placeholder="Decanter installation — Basin R1" />
        <Textarea label="Description" value={form.description} onChange={set('description')} rows={3} placeholder="What was done…" />
        <Select label="Category" options={catOpts} value={form.category} onChange={set('category')} />
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Photos</label>
          <PhotoPicker folder="updates" photos={form.photos} onChange={(photos)=>setForm((f:any)=>({ ...f, photos }))} />
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
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.blue, background:C.blueBg, padding:'2px 8px', borderRadius:20 }}>{u.category}</span>
                  <span style={{ fontSize:12, color:C.text3 }}>{u.date}</span>
                  {u.createdBy && <span style={{ fontSize:11, color:C.text3 }}>· by {u.createdBy}</span>}
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
            {u.photos?.length > 0 && (
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                {u.photos.map((p:UpdatePhoto,i:number)=>(
                  <img key={i} src={p.url} alt="" style={{ width:60, height:60, objectFit:'cover', borderRadius:6, border:'1px solid '+C.border }} />
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
