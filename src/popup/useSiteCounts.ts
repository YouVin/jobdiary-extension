import { useCallback, useEffect, useRef, useState } from 'react'
import { getSiteCounts, STORAGE_KEY } from '@/lib/storage'
import type { Platform } from '@/types/application'

type CountsState =
  | { status: 'loading' }
  | { status: 'ready', counts: Record<Platform, number> }
  | { status: 'error' }

export function useSiteCounts() {
  const [state, setState] = useState<CountsState>({ status: 'loading' })
  const mounted = useRef(false)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    try {
      const counts = await getSiteCounts()
      if (mounted.current && id === requestId.current) setState({ status: 'ready', counts })
    }
    catch {
      if (mounted.current && id === requestId.current) setState({ status: 'error' })
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) void refresh()
    }
    chrome.storage.onChanged.addListener(onChanged)
    void refresh()
    return () => {
      mounted.current = false
      ++requestId.current
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [refresh])

  return { state, refresh }
}
