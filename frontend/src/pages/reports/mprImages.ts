export interface MprPhoto { dataUrl: string; width: number; height: number; caption: string; date: string; location: string }

export async function prepareMprImage(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPEG, PNG or WebP photographs.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Each photograph must be under 15 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve,reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not read photograph')); image.src = url
    })
    const scale = Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight))
    const canvas = document.createElement('canvas'); canvas.width = Math.round(img.naturalWidth*scale); canvas.height = Math.round(img.naturalHeight*scale)
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image processing unavailable')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height)
    return { dataUrl:canvas.toDataURL('image/jpeg',0.88), width:canvas.width, height:canvas.height }
  } finally { URL.revokeObjectURL(url) }
}
