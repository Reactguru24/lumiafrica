/** Allow only same-origin relative paths (blocks open redirects). */
export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback
  const trimmed = path.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  if (trimmed.includes('://')) return fallback
  return trimmed
}

export function isAllowedPaystackUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return (
      parsed.protocol === 'https:' &&
      (host === 'checkout.paystack.com' || host === 'checkout.stripe.com' || host.endsWith('.paystack.com'))
    )
  } catch {
    return false
  }
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && parsed.hostname === 'localhost')
  } catch {
    return false
  }
}
