export type ImageUploadPresetId = 'avatar' | 'logo' | 'banner' | 'product'

export interface ImageUploadPreset {
  id: ImageUploadPresetId
  label: string
  width: number
  height: number
  minWidth: number
  minHeight: number
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  quality: number
  extension: string
}

export const IMAGE_UPLOAD_PRESETS: Record<ImageUploadPresetId, ImageUploadPreset> = {
  avatar: {
    id: 'avatar',
    label: 'Profile photo',
    width: 256,
    height: 256,
    minWidth: 128,
    minHeight: 128,
    mimeType: 'image/jpeg',
    quality: 0.9,
    extension: 'jpg',
  },
  logo: {
    id: 'logo',
    label: 'Logo',
    width: 512,
    height: 512,
    minWidth: 256,
    minHeight: 256,
    mimeType: 'image/jpeg',
    quality: 0.9,
    extension: 'jpg',
  },
  banner: {
    id: 'banner',
    label: 'Banner',
    width: 1200,
    height: 600,
    minWidth: 600,
    minHeight: 300,
    mimeType: 'image/jpeg',
    quality: 0.9,
    extension: 'jpg',
  },
  product: {
    id: 'product',
    label: 'Product image',
    width: 900,
    height: 1200,
    minWidth: 450,
    minHeight: 600,
    mimeType: 'image/jpeg',
    quality: 0.9,
    extension: 'jpg',
  },
}

export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'

export function imageSizeHint(preset: ImageUploadPreset): string {
  return `${preset.width}×${preset.height}px · min ${preset.minWidth}×${preset.minHeight}px · JPEG, PNG or WebP`
}
