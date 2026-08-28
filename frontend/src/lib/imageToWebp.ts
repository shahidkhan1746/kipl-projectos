/**
 * Client-side image converter to WebP format.
 * Converts JPEG, PNG, BMP, TIFF, and camera photo files to lightweight WebP
 * before uploading across the network.
 */
export async function convertImageToWebP(file: File, quality = 0.85): Promise<File> {
  // If already webp or not an image (e.g. PDF/DOCX), pass through untouched
  if (file.type === 'image/webp' || !file.type.startsWith('image/')) {
    return file
  }

  // If SVG or vector graphic, keep SVG intact
  if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const baseName = file.name.replace(/\.[^.]+$/, '')
            const webpFile = new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(webpFile)
          },
          'image/webp',
          quality,
        )
      } catch {
        resolve(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
