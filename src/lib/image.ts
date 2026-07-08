const MAX_CLIENT_IMAGE_BYTES = 10 * 1024 * 1024
const PROFILE_IMAGE_MAX_DIMENSION = 768
const PROFILE_IMAGE_QUALITY = 0.82

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('تعذر قراءة الصورة'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('تعذر ضغط الصورة'))
      },
      'image/jpeg',
      PROFILE_IMAGE_QUALITY
    )
  })
}

export async function compressProfileImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة')
  }

  if (file.size > MAX_CLIENT_IMAGE_BYTES) {
    throw new Error('حجم الصورة كبير جدا، الحد الأقصى 10MB')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, PROFILE_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذر تجهيز الصورة')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(canvas)
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}
