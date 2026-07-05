export type ImageUploadPresetId =
  | 'avatar'
  | 'logo'
  | 'banner'
  | 'heroCarousel'
  | 'homepageShowcase'
  | 'product'

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
  /** Full-width homepage hero carousel — landscape, subject on the right third. */
  heroCarousel: {
    id: 'heroCarousel',
    label: 'Hero carousel slide',
    width: 1920,
    height: 900,
    minWidth: 1280,
    minHeight: 600,
    mimeType: 'image/jpeg',
    quality: 0.9,
    extension: 'jpg',
  },
  /** Portrait tiles in the homepage feature showcase grid (4:5). */
  homepageShowcase: {
    id: 'homepageShowcase',
    label: 'Showcase grid image',
    width: 800,
    height: 1000,
    minWidth: 400,
    minHeight: 500,
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

export function imageAspectRatioLabel(preset: ImageUploadPreset): string {
  const ratio = preset.width / preset.height
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9'
  if (Math.abs(ratio - 2) < 0.05) return '2:1'
  if (Math.abs(ratio - 4) < 0.05) return '4:1'
  if (Math.abs(ratio - 1) < 0.05) return '1:1'
  return `${ratio.toFixed(2)}:1`
}

/** Admin copy for homepage hero carousel uploads. */
export const HOMEPAGE_HERO_CAROUSEL_GUIDE = {
  preset: IMAGE_UPLOAD_PRESETS.heroCarousel,
  title: 'Recommended dimensions',
  dimensions: `${IMAGE_UPLOAD_PRESETS.heroCarousel.width}×${IMAGE_UPLOAD_PRESETS.heroCarousel.height}px (${imageAspectRatioLabel(IMAGE_UPLOAD_PRESETS.heroCarousel)} landscape)`,
  minimum: `Minimum ${IMAGE_UPLOAD_PRESETS.heroCarousel.minWidth}×${IMAGE_UPLOAD_PRESETS.heroCarousel.minHeight}px`,
  note: 'Full-width hero (55–75vh). Keep the main subject on the right — text overlays the left side.',
}

/** Admin copy for homepage feature showcase grid uploads. */
export const HOMEPAGE_SHOWCASE_GUIDE = {
  preset: IMAGE_UPLOAD_PRESETS.homepageShowcase,
  title: 'Recommended dimensions',
  dimensions: `${IMAGE_UPLOAD_PRESETS.homepageShowcase.width}×${IMAGE_UPLOAD_PRESETS.homepageShowcase.height}px (${imageAspectRatioLabel(IMAGE_UPLOAD_PRESETS.homepageShowcase)} portrait)`,
  minimum: `Minimum ${IMAGE_UPLOAD_PRESETS.homepageShowcase.minWidth}×${IMAGE_UPLOAD_PRESETS.homepageShowcase.minHeight}px`,
  note: 'Four portrait images in a staggered 2×2 grid beside the promo text.',
}
