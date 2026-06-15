import { create } from 'zustand'
import { getStorage, setStorage } from '@/lib/utils/storage'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'lumi_theme'

interface ThemeState {
  isDark: boolean
  mode: ThemeMode
  toggle: () => void
  setDark: (value: boolean) => void
  setMode: (value: ThemeMode) => void
  applyTheme: () => void
  hydrate: () => void
}

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = getStorage<ThemeMode | null>(THEME_KEY, null)
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  mode: 'light',

  hydrate: () => {
    const isDark = getInitialDark()
    set({ isDark, mode: isDark ? 'dark' : 'light' })
    get().applyTheme()
  },

  applyTheme: () => {
    if (typeof document === 'undefined') return
    const { isDark, mode } = get()
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode
  },

  toggle: () => {
    const isDark = !get().isDark
    set({ isDark, mode: isDark ? 'dark' : 'light' })
    setStorage(THEME_KEY, isDark ? 'dark' : 'light')
    get().applyTheme()
  },

  setDark: (value) => {
    set({ isDark: value, mode: value ? 'dark' : 'light' })
    setStorage(THEME_KEY, value ? 'dark' : 'light')
    get().applyTheme()
  },

  setMode: (value) => {
    const isDark = value === 'dark'
    set({ isDark, mode: value })
    setStorage(THEME_KEY, value)
    get().applyTheme()
  },
}))
