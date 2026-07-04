import { NextRequest, NextResponse } from 'next/server'

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const response = await fetch(`${ML_API_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
    })

    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: body.detail || body.error || 'Analysis failed' },
        { status: response.status },
      )
    }

    return NextResponse.json(body)
  } catch {
    return NextResponse.json(
      { error: 'Virtual fitting service is unavailable. Please try again later.' },
      { status: 503 },
    )
  }
}
