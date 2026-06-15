'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

export function MobileDrawer({ open, onOpenChange, title, children, footer }: MobileDrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] md:hidden animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={() => onOpenChange(false)} />
      <aside
        className="absolute inset-y-0 right-0 w-[min(100%,20rem)] sm:w-full max-w-sm bg-white dark:bg-gray-950 shadow-2xl flex flex-col animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="font-semibold text-lg">{title || 'Filters'}</h2>
          <button type="button" className="control-button" aria-label="Close" onClick={() => onOpenChange(false)}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-950 safe-bottom">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}
