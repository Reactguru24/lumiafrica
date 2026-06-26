'use client'

import { MediaImage } from '@/components/common/MediaImage'
import { getInitials } from '@/components/common/UserMenu'

interface UserAvatarProps {
  fullName?: string | null
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-lg',
}

const sizePixels = { sm: 32, md: 40, lg: 80 }

export function UserAvatar({ fullName, avatar, size = 'md', className = '' }: UserAvatarProps) {
  const initials = getInitials(fullName)
  const px = sizePixels[size]

  if (avatar) {
    return (
      <MediaImage
        src={avatar}
        alt={fullName?.trim() || 'User'}
        width={px}
        height={px}
        className={`rounded-full object-cover shrink-0 ${sizeClasses[size]} ${className}`}
      />
    )
  }

  return (
    <span
      className={`rounded-full bg-brand-teal dark:bg-brand-orange text-white font-semibold flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </span>
  )
}
