import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  QrCode, DownloadSimple, ArrowSquareOut, Copy, Check,
  Sparkle, ShieldCheck, Palette, Image as ImageIcon
} from '@phosphor-icons/react'
import { downloadQrCode, renderBrandedQrToCanvas } from '@/lib/qrDownload'
import { toast } from '@/lib/notify'

interface QrCodeModalProps {
  open: boolean
  onClose: () => void
  employee: {
    empCode: string
    firstName?: string
    lastName?: string
    designation?: string
    department?: string
  } | null
}

const COLOR_PRESETS = [
  { label: 'KIPL Emerald', hex: '#059669', bg: '#ecfdf5', text: '#065f46' },
  { label: 'KIPL Navy', hex: '#0a1e28', bg: '#f1f5f9', text: '#0a1e28' },
  { label: 'Ocean Blue', hex: '#2563eb', bg: '#eff6ff', text: '#1e40af' },
  { label: 'Classic Noir', hex: '#000000', bg: '#f8fafc', text: '#0f172a' },
]

export function QrCodeModal({ open, onClose, employee }: QrCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#059669')
  const [withLogo, setWithLogo] = useState(true)
  const [rendering, setRendering] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const empCode = employee?.empCode || ''
  const fullName = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim() || 'Employee'
  const verifyUrl = `https://kiplstpsrinagar.com/verify/id/${encodeURIComponent(empCode)}`

  // Render live preview on canvas whenever color or logo toggle changes
  useEffect(() => {
    if (!open || !empCode || !canvasRef.current) return
    let active = true

    const draw = async () => {
      setRendering(true)
      try {
        if (canvasRef.current) {
          await renderBrandedQrToCanvas(canvasRef.current, empCode, {
            color: selectedColor,
            withLogo,
            size: 400
          })
        }
      } catch (err) {
        console.error('Failed to draw canvas QR:', err)
      } finally {
        if (active) setRendering(false)
      }
    }

    draw()
    return () => { active = false }
  }, [open, empCode, selectedColor, withLogo])

  if (!employee) return null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    toast.success('Verification link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async (format: 'png' | 'svg', size: number) => {
    setDownloading(true)
    try {
      await downloadQrCode(empCode, {
        format,
        size,
        color: selectedColor,
        withLogo
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Download Custom Branded QR Code"
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#2563eb',
              textDecoration: 'none'
            }}
          >
            <ArrowSquareOut size={14} />
            <span>Open Verification Portal</span>
          </a>
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: selectedColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, transition: 'background 0.2s' }}>
            {employee.firstName?.[0] || 'K'}{employee.lastName?.[0] || 'I'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fullName}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              {employee.designation || 'Personnel'} · <span style={{ fontFamily: 'monospace', fontWeight: 700, color: selectedColor }}>{empCode}</span>
            </p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <ShieldCheck size={14} weight="fill" /> Active
          </span>
        </div>

        {/* Live Canvas Preview */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 18,
          background: selectedColor === '#059669' ? '#f0fdf4' : selectedColor === '#0a1e28' ? '#f1f5f9' : '#f8fafc',
          borderRadius: 14, border: `1.5px dashed ${selectedColor}50`, transition: 'all 0.2s'
        }}>
          <div style={{
            background: '#fff', padding: 12, borderRadius: 14,
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)', display: 'inline-flex', position: 'relative'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: 190,
                height: 190,
                display: 'block',
                borderRadius: 6,
                opacity: rendering ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            />
            {rendering && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: selectedColor }}>Rendering...</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {withLogo ? 'Official Branded QR Code' : 'Custom Colored QR Code'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', maxWidth: 380, wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {verifyUrl}
            </p>
          </div>

          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              fontSize: 11, fontWeight: 600, borderRadius: 6, background: '#fff',
              border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer'
            }}
          >
            {copied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Portal URL'}</span>
          </button>
        </div>

        {/* Customization Options Bar */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Logo Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/assets/kipl-logo.png" alt="KIPL" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Embed KIPL Logo Badge in Center</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>High error correction (ecc=H) maintains 100% scannability</p>
              </div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={withLogo}
                onChange={e => setWithLogo(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: selectedColor, cursor: 'pointer' }}
              />
            </label>
          </div>

          {/* Color Palettes */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Palette size={14} color="#64748b" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select QR Color Theme
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {COLOR_PRESETS.map(p => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setSelectedColor(p.hex)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                    borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: selectedColor === p.hex ? p.bg : '#fff',
                    border: `1.5px solid ${selectedColor === p.hex ? p.hex : '#cbd5e1'}`,
                    color: p.text
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.hex }} />
                  <span>{p.label}</span>
                </button>
              ))}

              {/* Custom Color Input */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '3px 8px' }}>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                  title="Pick Custom Color"
                />
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>
                  {selectedColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Download Options */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Download Options
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => handleDownload('png', 1200)}
              disabled={downloading}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px',
                borderRadius: 10, border: `1.5px solid ${selectedColor}`, background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <DownloadSimple size={16} color={selectedColor} weight="bold" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Ultra-HD PNG (1200px)</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Print-ready with {withLogo ? 'logo badge' : 'custom color'}</span>
            </button>

            <button
              onClick={() => handleDownload('svg', 600)}
              disabled={downloading}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px',
                borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Sparkle size={16} color="#2563eb" weight="bold" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Vector SVG</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Lossless vector for Illustrator & Corel</span>
            </button>
          </div>
        </div>

        {/* Tip for external cards */}
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          💡 <strong>Tip</strong>: The <strong>KIPL Emerald</strong> and <strong>KIPL Navy</strong> options match the exact colors of the physical ID card. The center logo badge is scaled so that all smartphones decode it instantly without errors.
        </p>
      </div>
    </Modal>
  )
}
