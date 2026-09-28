/**
 * Rasterise the CPM views for download and for the PDFs. Kept apart from the
 * components so the page keeps fast refresh and the layout stays DOM-free.
 */
/** Rasterise an on-screen SVG to a PNG data URL at `scale`× for download or PDF. */
export async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  const vb = svg.viewBox.baseVal
  const width = vb?.width || svg.width.baseVal.value, height = vb?.height || svg.height.baseVal.value
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width)); clone.setAttribute('height', String(height))
  // The sticky label column is translated by the scroll position on screen; reset it for the export.
  clone.querySelectorAll('g[transform^="translate("]').forEach(g => {
    if (/^translate\(\d+(\.\d+)?,0\)$/.test(g.getAttribute('transform') ?? '')) g.setAttribute('transform', 'translate(0,0)')
  })
  return svgMarkupToPng(new XMLSerializer().serializeToString(clone), width, height, scale)
}

/** Rasterise SVG markup (e.g. from renderToStaticMarkup) to a PNG data URL. */
export async function svgMarkupToPng(markup: string, width: number, height: number, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  const src = markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Could not render the diagram')); img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { dataUrl: canvas.toDataURL('image/png'), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
