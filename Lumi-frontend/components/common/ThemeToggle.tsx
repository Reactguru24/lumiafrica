'use client'

import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useThemeStore } from '@/lib/stores/theme'

export function ThemeToggle() {
  const { isDark, toggle } = useThemeStore()

  return (
    <button
      type="button"
      className="control-button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
    </button>
  )
}
