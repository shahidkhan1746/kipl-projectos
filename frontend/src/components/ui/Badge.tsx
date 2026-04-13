const MAP: Record<string,{bg:string;color:string;border:string}> = {
  draft:        {bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0'},
  submitted:    {bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
  under_review: {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  approved:     {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  rejected:     {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  returned:     {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  closed:       {bg:'#f8fafc', color:'#94a3b8', border:'#e2e8f0'},
  dispatched:   {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  generated:    {bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe'},
  pending:      {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  paid:         {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  low:          {bg:'#f8fafc', color:'#94a3b8', border:'#e2e8f0'},
  medium:       {bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
  high:         {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  urgent:       {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  noc:          {bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe'},
  approval:     {bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
  drawing:      {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  estimate:     {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  report:       {bg:'#f8fafc', color:'#64748b', border:'#e2e8f0'},
  letter:       {bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe'},
  clearance:    {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  active:       {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  other:        {bg:'#f8fafc', color:'#64748b', border:'#e2e8f0'},
}
const F = {bg:'#f8fafc', color:'#64748b', border:'#e2e8f0'}

export function Badge({ value, size='sm' }: { value?:string; size?:'xs'|'sm' }) {
  if (!value) return null
  const k = value.toLowerCase().replace(/[\s-]/g,'_')
  const s = MAP[k] ?? F
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding: size==='xs' ? '2px 8px' : '3px 10px',
      borderRadius:999,
      fontSize: size==='xs' ? 10 : 11,
      fontWeight:600,
      letterSpacing:'0.03em',
      whiteSpace:'nowrap',
      background:s.bg, color:s.color,
      border:'1.5px solid '+s.border,
    }}>
      {value.replace(/_/g,' ')}
    </span>
  )
}
