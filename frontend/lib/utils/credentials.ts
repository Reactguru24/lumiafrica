import { authAPI, APIError } from '@/lib/api/client'

export type CredentialCheckContext = 'register' | 'vendor_application'

export type CredentialFieldStatus = {
  available: boolean
  message?: string
}

export type CredentialCheckResult = {
  available: boolean
  fields: Record<string, CredentialFieldStatus>
}

export async function checkCredentials(
  data: { email?: string; phone?: string; context?: CredentialCheckContext },
): Promise<CredentialCheckResult> {
  return authAPI.checkCredentials(data) as Promise<CredentialCheckResult>
}

export function credentialErrorsFromApiError(error: unknown): Record<string, string> {
  if (!(error instanceof APIError) || error.status !== 409 || !error.message) {
    return {}
  }

  const message = error.message.toLowerCase()
  if (message.includes('email')) {
    if (message.includes('vendor')) return { businessEmail: error.message }
    return { email: error.message }
  }
  if (message.includes('phone')) {
    if (message.includes('another account')) return { contactPhone: error.message }
    return { phone: error.message }
  }
  return {}
}

export async function validateCredentialsBeforeSubmit(
  data: { email?: string; phone?: string; context?: CredentialCheckContext },
  fieldMap?: Partial<Record<'email' | 'phone', string>>,
): Promise<Record<string, string>> {
  const result = await checkCredentials(data)
  if (result.available) return {}

  const errors: Record<string, string> = {}
  for (const [field, status] of Object.entries(result.fields)) {
    if (status.available || !status.message) continue
    const mapped = fieldMap?.[field as 'email' | 'phone'] ?? field
    errors[mapped] = status.message
  }
  return errors
}
