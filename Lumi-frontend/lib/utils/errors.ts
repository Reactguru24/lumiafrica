import { APIError } from '@/lib/api/client'

const FRIENDLY_MESSAGES: Record<number, string> = {
  400: 'Please check your input and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'This action conflicts with existing data.',
  422: 'Some of the information provided is invalid.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Our servers are temporarily unavailable. Please try again.',
  503: 'Our service is temporarily unavailable. Please try again later.',
}

export function getFriendlyErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof APIError) {
    if (error.message && error.message !== 'An error occurred' && !error.message.startsWith('Invalid request:')) {
      return error.message
    }
    return FRIENDLY_MESSAGES[error.status] || fallback
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
