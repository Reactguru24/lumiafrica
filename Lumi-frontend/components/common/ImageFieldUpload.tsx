'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { MediaImage } from '@/components/common/MediaImage'
import { ImageUploadCropHost } from '@/components/common/ImageUploadCropHost'
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_UPLOAD_PRESETS,
  imageSizeHint,
  type ImageUploadPresetId,
} from '@/lib/constants/imageUpload'
import { useImageUploadWithCrop } from '@/lib/hooks/useImageUploadWithCrop'
import { useUploadImage } from '@/lib/api/hooks'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

interface ImageFieldUploadProps {
  presetId: ImageUploadPresetId
  value?: string
  onChange: (url: string) => void
  variant?: 'round' | 'banner' | 'square'
  disabled?: boolean
}

export function ImageFieldUpload({
  presetId,
  value,
  onChange,
  variant = 'square',
  disabled,
}: ImageFieldUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadImage = useUploadImage().mutate
  const { prepareImageFile, cropSession, confirmCrop, cancelCrop } = useImageUploadWithCrop()
  const preset = IMAGE_UPLOAD_PRESETS[presetId]

  async function processFile(file: File) {
    try {
      const prepared = await prepareImageFile(file, presetId)
      if (!prepared) return
      const result = await uploadImage(prepared) as { url?: string }
      if (!result?.url) {
        toast.error('Upload succeeded but no URL was returned.')
        return
      }
      onChange(result.url)
      toast.success(`${preset.label} uploaded`)
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload image.'))
    }
  }

  const previewRound = variant === 'round'
  const previewBanner = variant === 'banner'

  return (
    <>
      <ImageUploadCropHost cropSession={cropSession} onConfirm={confirmCrop} onCancel={cancelCrop} />
      <div className={previewBanner ? 'space-y-2' : 'flex items-center gap-4'}>
        {value ? (
          previewBanner ? (
            <MediaImage src={value} alt={preset.label} width={1200} height={400} className="w-full h-40 object-cover rounded-lg" />
          ) : (
            <MediaImage
              src={value}
              alt={preset.label}
              width={previewRound ? 80 : 64}
              height={previewRound ? 80 : 64}
              className={`${previewRound ? 'w-20 h-20 rounded-full' : 'w-16 h-16 rounded-lg'} object-cover`}
            />
          )
        ) : (
          <div
            className={
              previewBanner
                ? 'w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 rounded-lg'
                : `${previewRound ? 'w-20 h-20 rounded-full' : 'w-16 h-16 rounded-lg'} bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 text-center px-1`
            }
          >
            {previewBanner ? `${preset.width}×${preset.height}px` : preset.label}
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) await processFile(file)
            }}
          />
          <button
            type="button"
            className="btn-secondary text-sm py-2"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Upload {preset.label}
          </button>
          <p className="text-xs text-gray-500 mt-1">{imageSizeHint(preset)}</p>
        </div>
      </div>
    </>
  )
}
