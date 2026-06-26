const CLOUDINARY_UPLOAD_MARKER = '/image/upload/'

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes(CLOUDINARY_UPLOAD_MARKER)
}

export type MediaTransform = {
  width?: number
  aspect?: string
  crop?: 'fill' | 'scale' | 'fit'
}

/** Insert Cloudinary transformation segment after /image/upload/. */
export function applyCloudinaryTransform(url: string, transformation: string): string {
  if (!isCloudinaryUrl(url) || !transformation) return url

  const idx = url.indexOf(CLOUDINARY_UPLOAD_MARKER)
  const before = url.slice(0, idx + CLOUDINARY_UPLOAD_MARKER.length)
  const after = url.slice(idx + CLOUDINARY_UPLOAD_MARKER.length)

  // Already transformed (e.g. f_auto,q_auto,w_400/v123/...)
  if (/^[a-z][a-z0-9_:,]*\//.test(after)) return url

  return `${before}${transformation}/${after}`
}

export function buildCloudinaryTransform(opts?: MediaTransform): string | null {
  if (!opts) return null

  const parts: string[] = ['f_auto', 'q_auto']
  if (opts.width) parts.push(`w_${opts.width}`)
  if (opts.aspect) {
    parts.push(`ar_${opts.aspect}`)
    parts.push(`c_${opts.crop || 'fill'}`)
  }

  return parts.length > 2 || opts.width ? parts.join(',') : null
}

export function optimizeCloudinaryUrl(url: string, opts?: MediaTransform): string {
  const transform = buildCloudinaryTransform(opts)
  if (!transform) return url
  return applyCloudinaryTransform(url, transform)
}
