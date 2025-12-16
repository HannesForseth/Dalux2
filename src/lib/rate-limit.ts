/**
 * In-memory rate limiter for API endpoints
 * For production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  maxRequests: number  // Maximum requests allowed
  windowMs: number     // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP + endpoint)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry exists or window has expired, create a new one
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI endpoints - expensive, limit strictly
  ai: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },
  // Stripe endpoints - payment security
  stripe: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requests per minute
  },
  // Invite endpoints - prevent brute force
  invite: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
  },
  // General API - more lenient
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },
}
