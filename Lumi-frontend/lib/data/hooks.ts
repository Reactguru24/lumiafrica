'use client'

import { useState, useEffect, useRef } from 'react'
import { subscribeLocalData } from './events'

/** Read from local hardcoded data + localStorage; re-renders when data is persisted. */
export function useLocalData<T>(selector: () => T): T {
  const selectorRef = useRef(selector)
  selectorRef.current = selector

  const [snapshot, setSnapshot] = useState<T>(() => selectorRef.current())

  useEffect(() => {
    // Set initial snapshot
    setSnapshot(selectorRef.current())

    // Subscribe to data changes
    const unsubscribe = subscribeLocalData(() => {
      setSnapshot(selectorRef.current())
    })

    return unsubscribe
  }, []) // Empty dependency array - only run once on mount

  return snapshot
}

/** Hook to check if component has hydrated (for client-side only features with localStorage) */
export function useHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}
