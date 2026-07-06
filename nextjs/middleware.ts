import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // API routes authenticate themselves inside the route handler;
  // skip the session round-trip and redirect logic here.
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')

  // Redirects must carry any session cookies getUser() just rotated,
  // or the browser keeps a consumed refresh token and gets logged out.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }

  if (!user && !isAuthRoute) {
    return redirectTo('/login')
  }

  if (user && isAuthRoute) {
    return redirectTo('/')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
