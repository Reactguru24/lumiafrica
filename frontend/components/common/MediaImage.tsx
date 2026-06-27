'use client'

import Image, { type ImageProps } from 'next/image'
import { resolveMediaUrl } from '@/lib/utils/api'
import { isExternalImageUrl } from '@/lib/utils/images'
import type { MediaTransform } from '@/lib/utils/cloudinary'

export function isLocalUpload(url?: string | null): boolean {
  if (!url) return false
  return url.startsWith('/uploads') || url.includes('/uploads/')
}

interface MediaImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null
  transform?: MediaTransform
}

/** Image that resolves API upload paths and applies Cloudinary delivery transforms. */
export function MediaImage({ src, alt, unoptimized, transform, ...props }: MediaImageProps) {
  const resolved = resolveMediaUrl(src, transform)
  const useUnoptimized = unoptimized ?? (isLocalUpload(src) || isExternalImageUrl(src))

  return (
    <Image
      src={resolved}
      alt={alt}
      unoptimized={useUnoptimized}
      {...props}
    />
  )
}
