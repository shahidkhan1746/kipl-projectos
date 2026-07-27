import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storageApi } from '@/api/storage.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { HardDrives, Cloud, Database, CheckCircle, XCircle, Plugs } from '@phosphor-icons/react'

const C = {
  card:'#fff', border:'#e2e8f0', bg:'#f0f2f5', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540', blueBg:'#eff6ff',
}

type Provider = 'local' | 'cloudinary' | 's3'
const PROVIDERS: { id: Provider; label: string; icon: any; note: string }[] = [
  { id:'cloudinary', label:'Cloudinary',       icon:Cloud,      note:'Image CDN with auto-optimisation' },
  { id:'s3',         label:'S3 / R2 / Supabase', icon:Database,  note:'Any S3-compatible bucket' },
  { id:'local',      label:'Local disk (dev)',  icon:HardDrives, note:'Server disk — not for production' },
]

export default function StorageSettingsPage() {
  const qc = useQueryClient()
  const [provider, setProvider] = useState<Provider>('cloudinary')
  const [test, setTest] = useState<{ success:boolean; message:string } | null>(null)
  const [form, setForm] = useState<any>({
    cloudName:'', cloudApiKey:'', cloudApiSecret:'',
    s3Endpoint:'', s3Region:'auto', s3Bucket:'', s3AccessKey:'', s3SecretKey:'', s3PublicBase:'',
  })

  const { data: cfg } = useQuery({ queryKey:['storage-config'], queryFn:()=>storageApi.getConfig().then(r=>r.data) })

  useEffect(() => {
    if (!cfg) return
    setProvider(cfg.provider ?? 'cloudinary')
    setForm((f:any) => ({
      ...f,
      cloudName: cfg.cloudName ?? '', cloudApiKey: cfg.cloudApiKey ?? '',
      s3Endpoint: cfg.s3Endpoint ?? '', s3Region: cfg.s3Region ?? 'auto', s3Bucket: cfg.s3Bucket ?? '',
      s3AccessKey: cfg.s3AccessKey ?? '', s3PublicBase: cfg.s3PublicBase ?? '',
    }))
  }, [cfg])

  const saveM = useMutation({
    mutationFn: () => storageApi.save({ provider, ...form }),
    onSuccess: () => { setTest(null); qc.invalidateQueries({ queryKey:['storage-config'] }) },
  })
  const testM = useMutation({
    mutationFn: () => storageApi.test(),
    onSuccess: (r: any) => { setTest(r.data); qc.invalidateQueries({ queryKey:['storage-config'] }) },
  })

  const set = (k:string) => (e:any) => setForm((f:any)=>({ ...f, [k]: e.target.value }))
  const secretHint = (isSet:boolean) => isSet ? 'Saved — leave blank to keep' : 'Required'

  return (
    <div style={{ padding:'28px 32px', maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
        <Plugs size={24} color={C.navy} weight="duotone" />
        <h1 style={{ fontSize:22, fontWeight:800, color:C.text1, margin:0 }}>Media Storage</h1>
      </div>
      <p style={{ fontSize:13, color:C.text2, margin:'0 0 22px' }}>
        Where project photos uploaded from the app are stored. Railway & Vercel disks reset on redeploy,
        so choose a cloud provider for production.
      </p>

      {cfg && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, fontSize:13, fontWeight:600,
          color: cfg.isVerified ? C.green : C.amber }}>
          {cfg.isVerified ? <CheckCircle size={18} weight="fill"/> : <XCircle size={18} weight="fill"/>}
          {cfg.isVerified ? `Active: ${cfg.provider} — verified` : `Active: ${cfg.provider} — not yet verified`}
        </div>
      )}

      {/* provider picker */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
        {PROVIDERS.map(p => {
          const on = provider === p.id
          return (
            <button key={p.id} onClick={()=>setProvider(p.id)} style={{
              textAlign:'left', cursor:'pointer', padding:'14px 15px', borderRadius:12,
              border:'2px solid '+(on?C.blue:C.border), background:on?C.blueBg:C.card, transition:'all .15s' }}>
              <p.icon size={22} color={on?C.blue:C.text3} weight="duotone" />
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'8px 0 2px' }}>{p.label}</p>
              <p style={{ fontSize:11, color:C.text3, margin:0 }}>{p.note}</p>
            </button>
          )
        })}
      </div>

      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'22px 24px' }}>
        {provider === 'cloudinary' && (
          <div style={{ display:'grid', gap:14 }}>
            <Input label="Cloud name" value={form.cloudName} onChange={set('cloudName')} placeholder="my-cloud" />
            <Input label="API key" value={form.cloudApiKey} onChange={set('cloudApiKey')} placeholder="123456789012345" />
            <Input label="API secret" type="password" value={form.cloudApiSecret} onChange={set('cloudApiSecret')}
              placeholder="••••••••" hint={secretHint(cfg?.cloudApiSecretSet)} />
          </div>
        )}
        {provider === 's3' && (
          <div style={{ display:'grid', gap:14 }}>
            <Input label="Bucket" value={form.s3Bucket} onChange={set('s3Bucket')} placeholder="kipl-media" />
            <Input label="Endpoint (blank for AWS S3)" value={form.s3Endpoint} onChange={set('s3Endpoint')}
              placeholder="https://<account>.r2.cloudflarestorage.com" hint="R2 / Supabase / MinIO need this" />
            <Input label="Region" value={form.s3Region} onChange={set('s3Region')} placeholder="auto" />
            <Input label="Access key ID" value={form.s3AccessKey} onChange={set('s3AccessKey')} />
            <Input label="Secret access key" type="password" value={form.s3SecretKey} onChange={set('s3SecretKey')}
              placeholder="••••••••" hint={secretHint(cfg?.s3SecretKeySet)} />
            <Input label="Public base URL" value={form.s3PublicBase} onChange={set('s3PublicBase')}
              placeholder="https://cdn.kiplstpsrinagar.com" hint="Where the bucket is publicly served" />
          </div>
        )}
        {provider === 'local' && (
          <p style={{ fontSize:13, color:C.text2, margin:0 }}>
            Files are written to the server's <code>/uploads</code> folder. Fine for local development,
            but they are wiped on every redeploy — switch to Cloudinary or S3 before go-live.
          </p>
        )}

        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          <Button variant="primary" loading={saveM.isPending} onClick={()=>saveM.mutate()}>Save</Button>
          <Button variant="secondary" loading={testM.isPending} onClick={()=>testM.mutate()}>Test connection</Button>
        </div>

        {test && (
          <div style={{ marginTop:16, padding:'11px 14px', borderRadius:10, fontSize:13, fontWeight:600,
            display:'flex', alignItems:'center', gap:8,
            background: test.success ? '#f0fdf4' : '#fef2f2', color: test.success ? C.green : C.red }}>
            {test.success ? <CheckCircle size={17} weight="fill"/> : <XCircle size={17} weight="fill"/>}
            {test.message}
          </div>
        )}
      </div>
    </div>
  )
}
