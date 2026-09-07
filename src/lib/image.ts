const MAX_EDGE = 1600
const JPEG_QUALITY = 0.8

// Downscales an image file to at most MAX_EDGE px on its longest side and
// re-encodes it as JPEG so phone-camera originals (multi-MB) upload fast and
// stay small in storage. Returns the original file when re-encoding would not
// save anything (or the input is not a decodable image).
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.')
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await canvasToBlob(canvas)
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the image file.'))
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY)
  })
}
