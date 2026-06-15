'use client'

import type { CropSession } from '@/lib/hooks/useImageUploadWithCrop'
import { ImageCropDialog } from '@/components/common/ImageCropDialog'

interface ImageUploadCropHostProps {
  cropSession: CropSession | null
  onConfirm: (file: File) => void
  onCancel: () => void
}

export function ImageUploadCropHost({ cropSession, onConfirm, onCancel }: ImageUploadCropHostProps) {
  if (!cropSession) return null
  return (
    <ImageCropDialog
      key={cropSession.imageSrc}
      session={cropSession}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
