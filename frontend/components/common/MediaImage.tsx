'use client'

import { useEffect, useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { resolveMediaUrl, isLegacyLocalUpload } from '@/lib/utils/api'
import { isExternalImageUrl } from '@/lib/utils/images'
import type { MediaTransform } from '@/lib/utils/cloudinary'

export function isLocalUpload(url?: string | null): boolean {
  if (!url) return false
  return isLegacyLocalUpload(url) || url.includes('/uploads/')
}

interface MediaImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null
  transform?: MediaTransform
  fallbackSrc?: string
  onImageError?: () => void
}

/** Image that resolves API upload paths and applies Cloudinary delivery transforms. */
export function MediaImage({
  src,
  alt,
  unoptimized,
  transform,
  fallbackSrc = '/placeholder.png',
  onImageError,
  onError,
  ...props
}: MediaImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const resolved = failed ? fallbackSrc : resolveMediaUrl(src, transform)
  const useUnoptimized = unoptimized ?? (isLocalUpload(src) || isExternalImageUrl(src) || isExternalImageUrl(resolved) || failed)

  return (
    <Image
      src={resolved}
      alt={alt}
      unoptimized={useUnoptimized}
      onError={(event) => {
        if (!failed) {
          setFailed(true)
          onImageError?.()
        }
        onError?.(event)
      }}
      {...props}
    />
  )
}
