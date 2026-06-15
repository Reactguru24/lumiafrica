'use client'

import Image, { type ImageProps } from 'next/image'
import { resolveMediaUrl } from '@/lib/utils/api'

export function isLocalUpload(url?: string | null): boolean {
  return !!url && (url.startsWith('/uploads') || url.includes('/uploads/'))
}

interface MediaImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null
}

/** Image that resolves API upload paths and Cloudinary URLs correctly. */
export function MediaImage({ src, alt, unoptimized, ...props }: MediaImageProps) {
  const resolved = resolveMediaUrl(src)
  const useUnoptimized = unoptimized ?? isLocalUpload(src)

  return (
    <Image
      src={resolved}
      alt={alt}
      unoptimized={useUnoptimized}
      {...props}
    />
  )
}
