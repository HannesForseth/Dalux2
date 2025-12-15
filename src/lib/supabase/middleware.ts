import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth check if env vars are missing (during build)
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public paths that don't require authentication (SEO, static files, public pages)
  const publicPaths = [
    '/sitemap.xml',
    '/robots.txt',
    '/manifest.webmanifest',
    '/opengraph-image',
    '/twitter-image',
    '/apple-icon',
    '/favicon.ico',
    '/invite',
    '/om-oss',
  ]

  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login if not authenticated and trying to access protected routes
  if (
    !user &&
    !isPublicPath &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/register') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to project selector if authenticated and trying to access auth pages or /dashboard directly
  if (user) {
    if (
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/projects'
      return NextResponse.redirect(url)
    }

    // Redirect /dashboard to /projects (project selector is the new home)
    if (request.nextUrl.pathname === '/dashboard') {
      const url = request.nextUrl.clone()
      url.pathname = '/projects'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
