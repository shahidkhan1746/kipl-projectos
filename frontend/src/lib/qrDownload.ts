import { toast } from '@/lib/notify'
import { API_BASE } from '@/api/base'

export interface DownloadQrOptions {
  format?: 'png' | 'svg'
  size?: number
}

/**
 * Downloads a scannable QR code for an employee directly from the ERP.
 * Works seamlessly across Chrome, Edge, Safari, Firefox on Desktop & Mobile.
 */
export async function downloadQrCode(
  empCode: string,
  options: DownloadQrOptions = {}
): Promise<void> {
  const cleanCode = (empCode || '').trim()
  if (!cleanCode) {
    toast.error('Employee code is missing')
    return
  }

  const format = options.format || 'png'
  const size = options.size || 600
  const fileName = `KIPL-QR-${cleanCode}.${format}`

  toast.info(`Preparing ${format.toUpperCase()} QR code for ${cleanCode}...`)

  try {
    // Target verification URL
    const targetUrl = `https://kiplstpsrinagar.com/verify/id/${encodeURIComponent(cleanCode)}`
    
    // We fetch as a blob so we can create a clean local object URL that triggers
    // native download without cross-origin browser blocking.
    const downloadUrl = `${API_BASE}/api/v1/hr/qr/${encodeURIComponent(cleanCode)}?format=${format}&size=${size}`
    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&format=${format}&data=${encodeURIComponent(targetUrl)}`

    let blob: Blob | null = null

    // Try backend endpoint first
    try {
      const res = await fetch(downloadUrl)
      if (res.ok) {
        blob = await res.blob()
      }
    } catch {
      // Fallback to direct QR generator service
    }

    if (!blob) {
      const res = await fetch(fallbackUrl)
      if (!res.ok) throw new Error('Could not generate QR code image')
      blob = await res.blob()
    }

    // Trigger instant browser download
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)

    toast.success(`Downloaded ${fileName}`)
  } catch (err: any) {
    toast.error('Failed to download QR code: ' + (err?.message || 'Network error'))
  }
}
