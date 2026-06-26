'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

export type FilterSelectOption = { value: string; label: string }

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterSelectOption[]
  emptyLabel?: string
  allowEmpty?: boolean
  ariaLabel?: string
}

export function FilterSelect({
  value,
  onChange,
  options,
  emptyLabel = 'All',
  allowEmpty = true,
  ariaLabel,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? emptyLabel

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      const menu = document.getElementById(menuId)
      if (menu?.contains(target)) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuId, open])

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    setOpen(true)
  }

  function toggleMenu() {
    if (open) {
      setOpen(false)
      return
    }
    openMenu()
  }

  function select(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`filter-select flex items-center justify-between gap-2 text-left w-full ${allowEmpty && value ? 'pr-8' : ''}`}
        onClick={toggleMenu}
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {allowEmpty && value && (
        <button
          type="button"
          aria-label={`Clear ${ariaLabel || 'selection'}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          onClick={(e) => {
            e.stopPropagation()
            select('')
          }}
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
      {open && menuPos && typeof document !== 'undefined' && createPortal(
        <ul
          id={menuId}
          role="listbox"
          className="fixed z-[100] max-h-36 overflow-y-auto rounded-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-0.5"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {allowEmpty && (
            <li role="option" aria-selected={!value}>
              <button
                type="button"
                className={`filter-select-option ${!value ? 'filter-select-option-selected' : ''}`}
                onClick={() => select('')}
              >
                {emptyLabel}
              </button>
            </li>
          )}
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={value === option.value}>
              <button
                type="button"
                className={`filter-select-option ${value === option.value ? 'filter-select-option-selected' : ''}`}
                onClick={() => select(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  )
}
