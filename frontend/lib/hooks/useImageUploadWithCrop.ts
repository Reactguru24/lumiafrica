'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  IMAGE_UPLOAD_PRESETS,
  MAX_IMAGE_FILE_BYTES,
  type ImageUploadPreset,
  type ImageUploadPresetId,
} from '@/lib/constants/imageUpload'
import {
  autoFitImage,
  loadImageFromFile,
  meetsMinimumSize,
  needsCropDialog,
} from '@/lib/utils/imageProcessing'

export interface CropSession {
  file: File
  image: HTMLImageElement
  imageSrc: string
  preset: ImageUploadPreset
}

export function useImageUploadWithCrop() {
  const [cropSession, setCropSession] = useState<CropSession | null>(null)
  const resolverRef = useRef<((file: File | null) => void) | null>(null)

  const cancelCrop = useCallback(() => {
    if (cropSession?.imageSrc) URL.revokeObjectURL(cropSession.imageSrc)
    setCropSession(null)
    resolverRef.current?.(null)
    resolverRef.current = null
  }, [cropSession])

  const confirmCrop = useCallback((processed: File) => {
    if (cropSession?.imageSrc) URL.revokeObjectURL(cropSession.imageSrc)
    setCropSession(null)
    resolverRef.current?.(processed)
    resolverRef.current = null
  }, [cropSession])

  const prepareImageFile = useCallback(async (
    file: File,
    presetId: ImageUploadPresetId,
  ): Promise<File | null> => {
    const preset = IMAGE_UPLOAD_PRESETS[presetId]

    if (!file.type.startsWith('image/')) {
      toast.error(`${file.name} is not a valid image file.`)
      return null
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      toast.error(`${preset.label} must be under 10MB.`)
      return null
    }

    let img: HTMLImageElement
    try {
      img = await loadImageFromFile(file)
    } catch {
      toast.error('Invalid image file.')
      return null
    }

    const { width, height } = { width: img.naturalWidth, height: img.naturalHeight }
    if (!meetsMinimumSize(width, height, preset)) {
      toast.error(
        `${preset.label} must be at least ${preset.minWidth}×${preset.minHeight}px. Yours: ${width}×${height}px.`,
      )
      return null
    }

    if (!needsCropDialog(width, height, preset)) {
      return autoFitImage(img, preset)
    }

    const imageSrc = URL.createObjectURL(file)
    return new Promise<File | null>((resolve) => {
      resolverRef.current = resolve
      setCropSession({ file, image: img, imageSrc, preset })
    })
  }, [])

  return { prepareImageFile, cropSession, confirmCrop, cancelCrop }
}
