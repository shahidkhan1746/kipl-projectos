interface P { label:string; value:string|number; sub?:string; color?:string; icon?:React.ReactNode }
export function StatCard({ label, value, sub, color='#2563eb', icon }:P) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8' }}>{label}</span>
        {icon && <span style={{ color, opacity:0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'monospace', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>{sub}</div>}
    </div>
  )
}
