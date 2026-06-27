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
import { useAuthStore } from '@/lib/stores/auth'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

interface ImageFieldUploadProps {
  presetId: ImageUploadPresetId
  value?: string
  onChange: (url: string) => void
  variant?: 'round' | 'banner' | 'square'
  disabled?: boolean
  allowClear?: boolean
}

export function ImageFieldUpload({
  presetId,
  value,
  onChange,
  variant = 'square',
  disabled,
  allowClear = true,
}: ImageFieldUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadImage = useAuthStore((s) => s.uploadImage)
  const { prepareImageFile, cropSession, confirmCrop, cancelCrop } = useImageUploadWithCrop()
  const preset = IMAGE_UPLOAD_PRESETS[presetId]

  async function processFile(file: File) {
    try {
      const prepared = await prepareImageFile(file, presetId)
      if (!prepared) return
      const result = await uploadImage(prepared)
      if (!result.url) {
        toast.error('Upload succeeded but no URL was returned.')
        return
      }
      onChange(result.url)
      toast.success(`${preset.label} uploaded`)
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload image.'))
    }
  }

  function openFilePicker() {
    if (!disabled) inputRef.current?.click()
  }

  const previewRound = variant === 'round'
  const previewBanner = variant === 'banner'

  return (
    <>
      <ImageUploadCropHost cropSession={cropSession} onConfirm={confirmCrop} onCancel={cancelCrop} />
      <div className={previewBanner ? 'space-y-2' : 'flex items-center gap-4'}>
        {previewBanner ? (
          <button
            type="button"
            disabled={disabled}
            onClick={openFilePicker}
            className="relative w-full h-40 rounded-lg overflow-hidden border border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 hover:border-brand-teal hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {value ? (
              <MediaImage src={value} alt={preset.label} width={1200} height={400} className="w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center text-xs text-gray-500 gap-1 px-4">
                <span className="font-medium text-gray-600 dark:text-gray-300">Click to upload cover image</span>
                <span>{preset.width}×{preset.height}px · JPEG, PNG or WebP</span>
              </span>
            )}
          </button>
        ) : value ? (
          <MediaImage
            src={value}
            alt={preset.label}
            width={previewRound ? 80 : 64}
            height={previewRound ? 80 : 64}
            className={`${previewRound ? 'w-20 h-20 rounded-full' : 'w-16 h-16 rounded-lg'} object-cover`}
          />
        ) : (
          <div
            className={`${previewRound ? 'w-20 h-20 rounded-full' : 'w-16 h-16 rounded-lg'} bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 text-center px-1`}
          >
            {preset.label}
          </div>
        )}
        <div className={previewBanner ? 'flex flex-wrap items-center gap-2' : undefined}>
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
          {!previewBanner && (
            <button
              type="button"
              className="btn-secondary text-sm py-2"
              disabled={disabled}
              onClick={openFilePicker}
            >
              Upload {preset.label}
            </button>
          )}
          {previewBanner && (
            <button type="button" className="btn-secondary text-sm py-2" disabled={disabled} onClick={openFilePicker}>
              {value ? 'Replace image' : 'Choose file'}
            </button>
          )}
          {allowClear && value && (
            <button
              type="button"
              className="btn-secondary text-sm py-2"
              disabled={disabled}
              onClick={() => onChange('')}
            >
              Remove
            </button>
          )}
          {!previewBanner && <p className="text-xs text-gray-500 mt-1">{imageSizeHint(preset)}</p>}
        </div>
      </div>
    </>
  )
}
