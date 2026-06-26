import type { ImageUploadPreset } from '@/lib/constants/imageUpload'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplayedImageBounds {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image file'))
    }
    img.src = url
  })
}

export function meetsMinimumSize(width: number, height: number, preset: ImageUploadPreset): boolean {
  return width >= preset.minWidth && height >= preset.minHeight
}

export function needsCropDialog(width: number, height: number, preset: ImageUploadPreset): boolean {
  const targetAspect = preset.width / preset.height
  const imageAspect = width / height
  const aspectMismatch = Math.abs(imageAspect - targetAspect) > 0.02
  return width > preset.width || height > preset.height || aspectMismatch
}

export function getDisplayedImageBounds(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
): DisplayedImageBounds {
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight)
  const width = naturalWidth * scale
  const height = naturalHeight * scale
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
    scale,
  }
}

export function getInitialCropRect(naturalWidth: number, naturalHeight: number, preset: ImageUploadPreset): CropRect {
  const targetAspect = preset.width / preset.height
  const imageAspect = naturalWidth / naturalHeight

  let cropW: number
  let cropH: number
  if (imageAspect > targetAspect) {
    cropH = naturalHeight
    cropW = naturalHeight * targetAspect
  } else {
    cropW = naturalWidth
    cropH = naturalWidth / targetAspect
  }

  return {
    x: (naturalWidth - cropW) / 2,
    y: (naturalHeight - cropH) / 2,
    width: cropW,
    height: cropH,
  }
}

export function clampCropRect(crop: CropRect, naturalWidth: number, naturalHeight: number): CropRect {
  const width = Math.min(crop.width, naturalWidth)
  const height = Math.min(crop.height, naturalHeight)
  const x = Math.max(0, Math.min(crop.x, naturalWidth - width))
  const y = Math.max(0, Math.min(crop.y, naturalHeight - height))
  return { x, y, width, height }
}

export function displayCropToNatural(
  displayCrop: CropRect,
  bounds: DisplayedImageBounds,
  naturalWidth: number,
  naturalHeight: number,
): CropRect {
  const scale = bounds.scale
  return clampCropRect(
    {
      x: (displayCrop.x - bounds.x) / scale,
      y: (displayCrop.y - bounds.y) / scale,
      width: displayCrop.width / scale,
      height: displayCrop.height / scale,
    },
    naturalWidth,
    naturalHeight,
  )
}

export function naturalCropToDisplay(crop: CropRect, bounds: DisplayedImageBounds): CropRect {
  const scale = bounds.scale
  return {
    x: bounds.x + crop.x * scale,
    y: bounds.y + crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  }
}

export function getMaxDisplayCropSize(bounds: DisplayedImageBounds, preset: ImageUploadPreset) {
  const aspect = preset.width / preset.height
  let width = bounds.width
  let height = width / aspect
  if (height > bounds.height) {
    height = bounds.height
    width = height * aspect
  }
  return { width, height }
}

export async function exportCroppedImage(
  img: HTMLImageElement,
  crop: CropRect,
  preset: ImageUploadPreset,
): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = preset.width
  canvas.height = preset.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to process image')

  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, preset.width, preset.height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Failed to encode image'))),
      preset.mimeType,
      preset.quality,
    )
  })

  return new File([blob], `upload-${preset.id}.${preset.extension}`, { type: preset.mimeType })
}

export async function autoFitImage(img: HTMLImageElement, preset: ImageUploadPreset): Promise<File> {
  const crop = getInitialCropRect(img.naturalWidth, img.naturalHeight, preset)
  return exportCroppedImage(img, crop, preset)
}
