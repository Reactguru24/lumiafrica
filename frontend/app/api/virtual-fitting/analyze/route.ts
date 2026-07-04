import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ML_API_URL = (
  process.env.ML_API_URL || 'https://ai-fitting-production.up.railway.app'
).replace(/\/$/, '')

const ANALYZE_TIMEOUT_MS = 55_000

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type')
  if (!contentType?.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  try {
    const body = await request.arrayBuffer()
    const response = await fetch(`${ML_API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    })

    const text = await response.text()
    let parsed: Record<string, unknown> = {}
    try {
      parsed = text ? JSON.parse(text) : {}
    } catch {
      parsed = { error: text || 'Invalid response from fitting service' }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (parsed.detail as string) ||
            (parsed.error as string) ||
            'Analysis failed',
        },
        { status: response.status },
      )
    }

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = message.includes('abort') || message.includes('timeout')
    console.error('Virtual fitting proxy error:', message)
    return NextResponse.json(
      {
        error: isTimeout
          ? 'Analysis timed out. Try a smaller image or try again in a moment.'
          : 'Virtual fitting service is unavailable. Please try again later.',
        detail: message,
      },
      { status: 503 },
    )
  }
}
