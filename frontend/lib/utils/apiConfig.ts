export const DEFAULT_API_URL = 'http://localhost:8080'
export const API_PROXY_PREFIX = '/api-proxy'

export function getConfiguredApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
}

export function isRemoteApiUrl(url: string = getConfiguredApiUrl()): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname !== 'localhost' && hostname !== '127.0.0.1'
  } catch {
    return false
  }
}

/** Browser dev: same-origin proxy to avoid CORS against a deployed backend. */
export function shouldUseBrowserApiProxy(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NODE_ENV !== 'development') return false
  return isRemoteApiUrl()
}

export function getApiBaseUrl(): string {
  if (shouldUseBrowserApiProxy()) {
    return API_PROXY_PREFIX
  }
  return getConfiguredApiUrl()
}

export function isLocalDevApi(): boolean {
  return !isRemoteApiUrl()
}
