interface O { value: string; label: string }
interface P extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; options: O[]; placeholder?: string; error?: string
}
export function Select({ label, options, placeholder, error, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {label}
        </label>
      )}
      <select
        {...p}
        style={{
          padding: '10px 13px',
          background: '#ffffff',
          border: '1.5px solid ' + (error ? '#fca5a5' : '#d1d5db'),
          borderRadius: 8, fontSize: 13, color: '#111827',
          outline: 'none', width: '100%', fontFamily: 'inherit',
          cursor: 'pointer', transition: 'border-color 0.15s',
          ...style,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
    </div>
  )
}
