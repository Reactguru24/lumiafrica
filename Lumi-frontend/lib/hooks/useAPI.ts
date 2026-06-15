import { useEffect, useState, useCallback } from 'react'

type DataState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useQuery<T>(
  queryFn: () => Promise<T>
): DataState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await queryFn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [queryFn])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

export function useMutation<T, V = void>(
  mutationFn: (data?: V) => Promise<T>
): {
  mutate: (data?: V) => Promise<T | undefined>
  loading: boolean
  error: Error | null
  data: T | null
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (mutationData?: V) => {
      try {
        setLoading(true)
        setError(null)
        const result = await mutationFn(mutationData)
        setData(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [mutationFn]
  )

  return { mutate, loading, error, data }
}
