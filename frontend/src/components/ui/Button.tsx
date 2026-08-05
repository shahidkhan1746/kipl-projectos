import { Spinner } from './Spinner'
type V = 'primary'|'secondary'|'ghost'|'danger'|'success'
const VS:Record<V,React.CSSProperties> = {
  primary:   {background:'#2563eb',color:'#fff',border:'1.5px solid #2563eb',boxShadow:'0 1px 2px rgba(37,99,235,0.3)'},
  secondary: {background:'#fff',color:'#374151',border:'1.5px solid #e2e8f0'},
  ghost:     {background:'transparent',color:'#6b7280',border:'1.5px solid transparent'},
  danger:    {background:'#fef2f2',color:'#b91c1c',border:'1.5px solid #fecaca'},
  success:   {background:'#ecfdf5',color:'#047857',border:'1.5px solid #a7f3d0'},
}
const SS:Record<string,React.CSSProperties> = {
  xs:{padding:'5px 10px',fontSize:11,borderRadius:6,gap:4},
  sm:{padding:'7px 14px',fontSize:12,borderRadius:8,gap:6},
  md:{padding:'10px 20px',fontSize:13,borderRadius:8,gap:8},
}
interface P extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?:V; size?:'xs'|'sm'|'md'; loading?:boolean; icon?:React.ReactNode }
export function Button({ variant='secondary', size='sm', loading, icon, children, style, disabled, ...p }:P) {
  return (
    <button {...p} disabled={disabled||loading} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:600, cursor:disabled||loading?'not-allowed':'pointer', opacity:disabled||loading?0.5:1, transition:'all 0.15s', fontFamily:'inherit', ...VS[variant], ...SS[size||'sm'], ...style }}>
      {loading ? <Spinner size={13} /> : icon}
      {children}
    </button>
  )
}
