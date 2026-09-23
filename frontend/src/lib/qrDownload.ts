import { toast } from '@/lib/notify'
import { API_BASE } from '@/api/base'

export interface DownloadQrOptions {
  format?: 'png' | 'svg'
  size?: number
  color?: string // Hex code (e.g. '#059669', '#0a1e28', '#000000')
  withLogo?: boolean // Embed center KIPL logo emblem
}

// Pre-load helper for images
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image from ' + src))
    img.src = src
  })
}

/**
 * Draws a branded QR code onto an HTML canvas with custom color and optional center logo badge.
 */
export async function renderBrandedQrToCanvas(
  canvas: HTMLCanvasElement,
  empCode: string,
  options: { color?: string; withLogo?: boolean; size?: number } = {}
): Promise<void> {
  const cleanCode = (empCode || '').trim()
  const targetUrl = `https://kiplstpsrinagar.com/verify/id/${encodeURIComponent(cleanCode)}`
  const color = (options.color || '#059669').replace('#', '').trim()
  const strokeColor = options.color || '#059669'
  const withLogo = options.withLogo !== false
  const size = options.size || 600

  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // Generate QR code with High error correction (30% recovery for logo occlusion)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&format=png&ecc=H&color=${color}&data=${encodeURIComponent(targetUrl)}`
  const qrImg = await loadImage(qrUrl)

  // Draw base QR code
  ctx.drawImage(qrImg, 0, 0, size, size)

  // Draw center KIPL logo badge if enabled
  if (withLogo) {
    try {
      const logoImg = await loadImage('/assets/kipl-logo.png')
      const cx = size / 2
      const cy = size / 2
      const badgeRadius = size * 0.125 // 25% diameter
      const borderWidth = Math.max(3, Math.round(size * 0.007))

      // Circular white badge background
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.lineWidth = borderWidth
      ctx.strokeStyle = strokeColor
      ctx.stroke()

      // Inner logo clip
      ctx.beginPath()
      ctx.arc(cx, cy, badgeRadius - borderWidth, 0, Math.PI * 2)
      ctx.clip()

      // Center logo image
      const logoSize = badgeRadius * 1.65
      ctx.drawImage(logoImg, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
      ctx.restore()
    } catch {
      // Fallback: keep clean QR code without logo if logo file failed to load
    }
  }
}

/**
 * Downloads a scannable QR code for an employee directly from the ERP.
 * Supports custom brand colors, center KIPL logo emblem, and ultra-HD resolution.
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
  const size = options.size || 1200
  const color = (options.color || '#059669').trim()
  const cleanColor = color.replace('#', '')
  const withLogo = options.withLogo !== false
  const targetUrl = `https://kiplstpsrinagar.com/verify/id/${encodeURIComponent(cleanCode)}`
  const fileName = `KIPL-QR-${cleanCode}${withLogo ? '-branded' : ''}.${format}`

  toast.info(`Generating ${withLogo ? 'branded ' : ''}${format.toUpperCase()} QR code...`)

  try {
    let blob: Blob | null = null

    if (format === 'svg') {
      const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&format=svg&ecc=H&color=${cleanColor}&data=${encodeURIComponent(targetUrl)}`
      const res = await fetch(svgUrl)
      if (!res.ok) throw new Error('Could not fetch SVG QR')
      let svgText = await res.text()

      if (withLogo) {
        // Embed logo in SVG
        try {
          const logoRes = await fetch('/assets/kipl-logo.png')
          const logoBlob = await logoRes.blob()
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(logoBlob)
          })

          const match = svgText.match(/width="(\d+)"\s+height="(\d+)"/)
          const w = match ? parseInt(match[1]) : 574
          const h = match ? parseInt(match[2]) : 574
          const cx = w / 2
          const cy = h / 2
          const r = w * 0.125
          const logoW = r * 1.65
          const logoX = cx - (logoW / 2)
          const logoY = cy - (logoW / 2)

          const badgeSvg = `
	<g id="kipl-emblem-badge">
		<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${color}" stroke-width="${Math.max(3, w * 0.007)}" />
		<image href="${logoBase64}" x="${logoX}" y="${logoY}" width="${logoW}" height="${logoW}" preserveAspectRatio="xMidYMid meet" />
	</g>
</svg>`
          svgText = svgText.replace('</svg>', badgeSvg)
        } catch {
          // Keep raw SVG if logo embed fails
        }
      }

      blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    } else {
      // PNG format (rendered via offscreen canvas for crisp anti-aliased output)
      const offscreenCanvas = document.createElement('canvas')
      await renderBrandedQrToCanvas(offscreenCanvas, cleanCode, { color, withLogo, size })

      blob = await new Promise<Blob | null>((resolve) => {
        offscreenCanvas.toBlob((b) => resolve(b), 'image/png', 1.0)
      })
    }

    if (!blob) throw new Error('Failed to generate image blob')

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
