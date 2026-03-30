import { useState, useEffect, useCallback, useRef } from 'react'

export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const dataRef = useRef<T | null>(null)

  dataRef.current = data

  const refetch = useCallback(() => {
    if (dataRef.current === null) {
      setLoading(true)
    }
    setError(null)
    return fetcher()
      .then(d => { setData(d); return d })
      .catch(e => { setError(e); return null as T | null })
      .finally(() => setLoading(false))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}
