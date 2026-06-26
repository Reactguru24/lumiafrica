'use client'

import { useEffect, type ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
}

export function Modal({ open, title, onClose, children, footer, size = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${sizeClasses[size]} max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-lg shadow-xl border border-gray-200 dark:border-gray-800`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800 shrink-0 gap-3 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
          <button type="button" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={onClose} aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 sm:px-5 py-4 flex-1 overscroll-contain">{children}</div>
        {footer && (
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
