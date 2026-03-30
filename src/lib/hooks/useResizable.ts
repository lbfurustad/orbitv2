import { useState, useCallback, useRef, useEffect } from 'react'

interface UseResizableOptions {
  storageKey: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
  reverse?: boolean
}

export function useResizable({ storageKey, defaultWidth, minWidth, maxWidth, reverse }: UseResizableOptions) {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10))) : defaultWidth
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + (reverse ? -delta : delta)))
      setWidth(newWidth)
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [storageKey, minWidth, maxWidth, reverse])

  // Persist on width change
  useEffect(() => {
    localStorage.setItem(storageKey, String(width))
  }, [width, storageKey])

  return { width, onMouseDown }
}
