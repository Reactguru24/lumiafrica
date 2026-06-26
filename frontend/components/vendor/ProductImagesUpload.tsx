'use client'

import { useEffect, useRef, useState } from 'react'
import { MediaImage } from '@/components/common/MediaImage'
import { toast } from 'sonner'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ImageUploadCropHost } from '@/components/common/ImageUploadCropHost'
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_UPLOAD_PRESETS,
  imageSizeHint,
} from '@/lib/constants/imageUpload'
import { useImageUploadWithCrop } from '@/lib/hooks/useImageUploadWithCrop'
import { useAuthStore } from '@/lib/stores/auth'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

const PRODUCT_PRESET = IMAGE_UPLOAD_PRESETS.product

type ProductImagesUploadProps = {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  disabled?: boolean
  error?: string
  onUploadingChange?: (uploading: boolean) => void
}

export function ProductImagesUpload({
  images,
  onChange,
  maxImages = 5,
  disabled,
  error,
  onUploadingChange,
}: ProductImagesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<File[]>([])
  const imagesRef = useRef(images)
  const [uploading, setUploading] = useState(false)
  const uploadImage = useAuthStore((s) => s.uploadImage)
  const { prepareImageFile, cropSession, confirmCrop, cancelCrop } = useImageUploadWithCrop()

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  async function uploadPreparedFile(prepared: File) {
    const result = await uploadImage(prepared)
    if (!result.url) {
      throw new Error('Upload succeeded but no URL was returned.')
    }
    return result.url
  }

  async function processNextInQueue(): Promise<number> {
    const next = queueRef.current.shift()
    if (!next) {
      setUploading(false)
      return 0
    }

    try {
      const prepared = await prepareImageFile(next, 'product')
      if (!prepared) {
        return processNextInQueue()
      }
      const url = await uploadPreparedFile(prepared)
      const updated = [...imagesRef.current, url]
      imagesRef.current = updated
      onChange(updated)
      const rest = await processNextInQueue()
      return rest + 1
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload image.'))
      return processNextInQueue()
    }
  }

  async function handleFilesSelected(fileList: FileList | null) {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const remaining = maxImages - imagesRef.current.length
    if (remaining <= 0) {
      toast.error(`You can upload up to ${maxImages} images per product.`)
      return
    }

    const batch = files.slice(0, remaining)
    if (files.length > remaining) {
      toast.warning(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added.`)
    }

    queueRef.current = [...queueRef.current, ...batch]
    if (uploading) return

    setUploading(true)
    const startCount = imagesRef.current.length
    const added = await processNextInQueue()
    if (added > 0) {
      toast.success(`${added} image${added === 1 ? '' : 's'} uploaded`)
    } else if (imagesRef.current.length === startCount && batch.length > 0 && queueRef.current.length === 0) {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <>
      <ImageUploadCropHost cropSession={cropSession} onConfirm={confirmCrop} onCancel={cancelCrop} />
      <div>
        <label className="text-sm font-medium">Product Images</label>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">
          Portrait 3:4 ratio — same as the storefront grid and product page. {imageSizeHint(PRODUCT_PRESET)}. Up to {maxImages} images.
        </p>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div
              key={`${img}-${i}`}
              className="relative w-24 aspect-[3/4] rounded overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
            >
              <MediaImage
                src={img}
                alt={`Product ${i + 1}`}
                fill
                transform={{ width: 200, aspect: '3:4' }}
                className="object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                aria-label="Remove image"
                disabled={disabled || uploading}
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {images.length < maxImages && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                multiple
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => {
                  void handleFilesSelected(e.target.files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
                className="w-24 aspect-[3/4] flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-brand-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PhotoIcon className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] text-gray-500 text-center px-1">
                  {uploading ? 'Processing...' : 'Add photo'}
                </span>
              </button>
            </>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    </>
  )
}
