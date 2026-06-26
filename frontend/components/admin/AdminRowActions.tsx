'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

export type AdminRowAction = {
  id: string
  label: string
  variant?: 'default' | 'danger'
  hidden?: boolean
  disabled?: boolean
}

interface AdminRowActionsProps {
  options: AdminRowAction[]
  onSelect: (actionId: string) => void
  disabled?: boolean
  ariaLabel?: string
}

export function AdminRowActions({ options, onSelect, disabled, ariaLabel = 'Row actions' }: AdminRowActionsProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const visible = options.filter((o) => !o.hidden)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      const menu = document.getElementById('admin-row-actions-menu')
      if (menu?.contains(target)) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function toggleMenu() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 144) })
    setOpen(true)
  }

  if (!visible.length) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        onClick={toggleMenu}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      {open && menuPos && typeof document !== 'undefined' && createPortal(
        <div
          id="admin-row-actions-menu"
          className="fixed z-[100] min-w-[9rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {visible.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={opt.disabled}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 ${
                opt.variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
              }`}
              onClick={() => {
                setOpen(false)
                onSelect(opt.id)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
