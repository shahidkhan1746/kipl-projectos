import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { QrCode, DownloadSimple, ArrowSquareOut, Copy, Check, Sparkle, ShieldCheck } from '@phosphor-icons/react'
import { downloadQrCode } from '@/lib/qrDownload'
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

export function QrCodeModal({ open, onClose, employee }: QrCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (!employee) return null

  const empCode = employee.empCode || ''
  const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || 'Employee'
  const verifyUrl = `https://kiplstpsrinagar.com/verify/id/${encodeURIComponent(empCode)}`
  const qrPreviewSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=1&format=png&data=${encodeURIComponent(verifyUrl)}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    toast.success('Verification link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async (format: 'png' | 'svg', size: number) => {
    setDownloading(true)
    try {
      await downloadQrCode(empCode, { format, size })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Download Scannable QR Code"
      width={520}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0a1e28', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {employee.firstName?.[0] || 'K'}{employee.lastName?.[0] || 'I'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{fullName}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{employee.designation || 'Personnel'} · <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{empCode}</span></p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <ShieldCheck size={14} weight="fill" /> Active
          </span>
        </div>

        {/* QR Code Graphic Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1.5px dashed #86efac' }}>
          <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'inline-flex' }}>
            <img
              src={qrPreviewSrc}
              alt={`QR Code for ${empCode}`}
              style={{ width: 180, height: 180, display: 'block', borderRadius: 4 }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#065f46' }}>Scannable by Any Smartphone</p>
            <p style={{ margin: 0, fontSize: 11, color: '#047857', maxWidth: 360, wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {verifyUrl}
            </p>
          </div>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              fontSize: 11, fontWeight: 600, borderRadius: 6, background: '#fff',
              border: '1px solid #a7f3d0', color: '#065f46', cursor: 'pointer'
            }}
          >
            {copied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Portal URL'}</span>
          </button>
        </div>

        {/* Download Options */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Download Options for Print & Design
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => handleDownload('png', 1200)}
              disabled={downloading}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px',
                borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#059669'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <DownloadSimple size={16} color="#059669" weight="bold" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Ultra-HD PNG (1200px)</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>For Photoshop, PVC ID card printing</span>
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
          💡 <strong>Tip for external card templates</strong>: Download the 1200px PNG or Vector SVG and drop it straight into the QR placeholder box on the back of your ID card artwork.
        </p>
      </div>
    </Modal>
  )
}
