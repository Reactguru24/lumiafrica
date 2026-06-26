'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/account/UserAvatar'
import { ImageUploadCropHost } from '@/components/common/ImageUploadCropHost'
import { ACCEPTED_IMAGE_TYPES, IMAGE_UPLOAD_PRESETS, imageSizeHint } from '@/lib/constants/imageUpload'
import { useImageUploadWithCrop } from '@/lib/hooks/useImageUploadWithCrop'
import { useAuthStore } from '@/lib/stores/auth'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

interface ProfileAvatarUploadProps {
  fullName?: string | null
  avatar?: string | null
  onAvatarChange: (url: string) => void | Promise<void>
  disabled?: boolean
}

export function ProfileAvatarUpload({
  fullName,
  avatar,
  onAvatarChange,
  disabled,
}: ProfileAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadImage = useAuthStore((s) => s.uploadImage)
  const { prepareImageFile, cropSession, confirmCrop, cancelCrop } = useImageUploadWithCrop()
  const preset = IMAGE_UPLOAD_PRESETS.avatar

  async function handleAvatarChange(url: string) {
    await onAvatarChange(url)
  }

  async function handleSelect(file: File) {
    try {
      const prepared = await prepareImageFile(file, 'avatar')
      if (!prepared) return
      const result = await uploadImage(prepared)
      const url = result.url
      if (!url) {
        toast.error('Upload succeeded but no URL was returned.')
        return
      }
      await handleAvatarChange(url)
      toast.success('Profile photo updated')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload photo.'))
    }
  }

  return (
    <>
      <ImageUploadCropHost cropSession={cropSession} onConfirm={confirmCrop} onCancel={cancelCrop} />
      <div className="flex items-center gap-4">
        <UserAvatar fullName={fullName} avatar={avatar} size="lg" />
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
              if (file) await handleSelect(file)
            }}
          />
          <button
            type="button"
            className="btn-secondary text-sm py-2"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Upload photo
          </button>
          <p className="text-xs text-gray-500 mt-1">{imageSizeHint(preset)}</p>
          <p className="text-xs text-gray-500">Larger images can be cropped in the editor.</p>
        </div>
      </div>
    </>
  )
}
