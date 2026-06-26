import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPrefixes = ['/admin', '/vendor', '/account', '/checkout']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needsAuth = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!needsAuth) {
    return NextResponse.next()
  }

  const isAuthed = request.cookies.get('lumi_authenticated')?.value === '1'
  if (isAuthed) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/auth/login'
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/vendor/:path*', '/account/:path*', '/checkout/:path*'],
}
