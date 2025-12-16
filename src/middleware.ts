import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers for IP (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback
  return 'unknown'
}

/**
 * Create rate limit response with proper headers
 */
function createRateLimitResponse(resetTime: number): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Du har gjort för många förfrågningar. Vänta en stund innan du försöker igen.',
      retryAfter
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      }
    }
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = getClientIP(request)

  // Rate limiting for API endpoints
  if (pathname.startsWith('/api/')) {
    let rateLimitConfig = RATE_LIMITS.api
    let identifier = `${ip}:api`

    // More strict limits for AI endpoints (expensive)
    if (pathname.startsWith('/api/ai/')) {
      rateLimitConfig = RATE_LIMITS.ai
      identifier = `${ip}:ai`
    }
    // Strict limits for Stripe endpoints (security)
    else if (pathname.startsWith('/api/stripe/')) {
      // Skip rate limiting for webhooks (Stripe needs to reach us)
      if (!pathname.includes('webhook')) {
        rateLimitConfig = RATE_LIMITS.stripe
        identifier = `${ip}:stripe`
      }
    }

    // Check rate limit (skip for webhooks)
    if (!pathname.includes('webhook')) {
      const result = checkRateLimit(identifier, rateLimitConfig)

      if (!result.success) {
        return createRateLimitResponse(result.resetTime)
      }
    }
  }

  // Rate limiting for invite endpoints (prevent brute force)
  if (pathname.startsWith('/invite/')) {
    const result = checkRateLimit(`${ip}:invite`, RATE_LIMITS.invite)

    if (!result.success) {
      return createRateLimitResponse(result.resetTime)
    }
  }

  // Continue with session management
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
