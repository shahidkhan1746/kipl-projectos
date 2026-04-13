interface P { icon?:React.ReactNode; title:string; sub?:string; action?:React.ReactNode }
export function Empty({ icon, title, sub, action }:P) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'56px 24px', gap:10 }}>
      {icon && <div style={{ color:'#e2e8f0', marginBottom:4 }}>{icon}</div>}
      <p style={{ fontSize:14, fontWeight:600, color:'#94a3b8', margin:0 }}>{title}</p>
      {sub && <p style={{ fontSize:12, color:'#cbd5e1', margin:0 }}>{sub}</p>}
      {action}
    </div>
  )
}
