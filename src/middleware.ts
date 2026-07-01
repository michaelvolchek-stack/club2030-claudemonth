import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  // WhatsApp API routes self-secure (CRON_SECRET / webhook token / owner check)
  // and are called by external services that can't carry a session cookie.
  if (req.nextUrl.pathname.startsWith('/api/whatsapp')) {
    return NextResponse.next()
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const authenticated = await verifySessionToken(token)
  const isLoginPage = req.nextUrl.pathname === '/login'

  if (!authenticated && !isLoginPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (authenticated && isLoginPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/today'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
