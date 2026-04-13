interface P extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}
export function Textarea({ label, error, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {label}
        </label>
      )}
      <textarea
        {...p}
        style={{
          padding: '10px 13px',
          background: '#ffffff',
          border: '1.5px solid ' + (error ? '#fca5a5' : '#d1d5db'),
          borderRadius: 8, fontSize: 13, color: '#111827',
          outline: 'none', width: '100%', fontFamily: 'inherit',
          resize: 'none', lineHeight: 1.6,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = '#2563eb'
          e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? '#fca5a5' : '#d1d5db'
          e.target.style.boxShadow = 'none'
        }}
      />
      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
    </div>
  )
}
