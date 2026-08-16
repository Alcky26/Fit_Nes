const MAX_DIMENSION = 1600
const OUTPUT_QUALITY = 0.82

export interface ProcessedImage {
  blob: Blob
  mimeType: string
  width: number
  height: number
}

/**
 * Reads an image file, downsizes it so its longest edge is at most
 * MAX_DIMENSION, and re-encodes it as WebP (falling back to JPEG if the
 * browser can't encode WebP) via <canvas>. The result is what
 * photoRepository stores — this never touches IndexedDB itself.
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const source = await loadImageSource(file)
  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const { width, height } = fitWithinMax(sourceWidth, sourceHeight, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available')
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()

  const webp = await canvasToBlob(canvas, 'image/webp', OUTPUT_QUALITY)
  if (webp) return { blob: webp, mimeType: 'image/webp', width, height }

  // Safari/older browsers may not support WebP encoding — fall back to JPEG.
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', OUTPUT_QUALITY)
  if (jpeg) return { blob: jpeg, mimeType: 'image/jpeg', width, height }

  throw new Error('This browser could not encode the photo')
}

async function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // Some browsers can't decode every format via createImageBitmap —
      // fall through to the <img> element path below.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not read image file'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function fitWithinMax(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
