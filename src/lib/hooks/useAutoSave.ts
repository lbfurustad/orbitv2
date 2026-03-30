import { useEffect, useRef } from 'react'

export function useAutoSave<T>(
  saveFn: (data: T) => void | Promise<void>,
  data: T,
  delay: number = 2000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const latestData = useRef(data)

  latestData.current = data

  useEffect(() => {
    // Skip auto-save on initial render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveFn(latestData.current)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        saveFn(latestData.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
