'use client'

import { create } from 'zustand'

export interface QueryEntry<T = unknown> {
  data: T | null
  loading: boolean
  isRefetching: boolean
  error: Error | null
}

export interface MutationEntry<T = unknown> {
  data: T | null
  loading: boolean
  error: Error | null
}

export const emptyQueryEntry: QueryEntry = {
  data: null,
  loading: false,
  isRefetching: false,
  error: null,
}

export const emptyMutationEntry: MutationEntry = {
  data: null,
  loading: false,
  error: null,
}

interface QueryStoreState {
  queries: Record<string, QueryEntry>
  mutations: Record<string, MutationEntry>
  fetchQuery: <T>(key: string, queryFn: () => Promise<T>) => Promise<void>
  runMutation: <T>(key: string, mutationFn: (data?: unknown) => Promise<T>, data?: unknown) => Promise<T>
}

export const useQueryStore = create<QueryStoreState>((set, get) => ({
  queries: {},
  mutations: {},

  fetchQuery: async (key, queryFn) => {
    const existing = get().queries[key]
    const hasLoaded = existing != null && !existing.loading && !existing.isRefetching && existing.error == null

    set((state) => ({
      queries: {
        ...state.queries,
        [key]: {
          data: existing?.data ?? null,
          loading: !hasLoaded,
          isRefetching: hasLoaded,
          error: null,
        },
      },
    }))

    try {
      const result = await queryFn()
      set((state) => ({
        queries: {
          ...state.queries,
          [key]: { data: result, loading: false, isRefetching: false, error: null },
        },
      }))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      set((state) => ({
        queries: {
          ...state.queries,
          [key]: {
            data: existing?.data ?? null,
            loading: false,
            isRefetching: false,
            error,
          },
        },
      }))
    }
  },

  runMutation: async (key, mutationFn, data) => {
    set((state) => ({
      mutations: {
        ...state.mutations,
        [key]: {
          data: state.mutations[key]?.data ?? null,
          loading: true,
          error: null,
        },
      },
    }))

    try {
      const result = await mutationFn(data)
      set((state) => ({
        mutations: {
          ...state.mutations,
          [key]: { data: result, loading: false, error: null },
        },
      }))
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      set((state) => ({
        mutations: {
          ...state.mutations,
          [key]: { data: null, loading: false, error },
        },
      }))
      throw error
    }
  },
}))
