import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Проверяем только админ-роуты
  if (req.nextUrl.pathname.startsWith('/admin')) {
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    // Отладочная информация
    console.log('Middleware - Path:', req.nextUrl.pathname)
    console.log('Middleware - User authenticated:', !!user)

    // Разрешаем доступ к основной админ-странице для показа формы входа
    if (!user && req.nextUrl.pathname === '/admin') {
      console.log('Middleware - Allowing access to /admin for login')
      return response
    }

    // Блокируем доступ к подстраницам админки без аутентификации
    if (!user && req.nextUrl.pathname.startsWith('/admin/')) {
      console.log('Middleware - Redirecting unauthenticated user from', req.nextUrl.pathname, 'to /admin')
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/admin'
      return NextResponse.redirect(redirectUrl)
    }

    // Разрешаем доступ ко всем админ-страницам для аутентифицированных пользователей
    if (user && req.nextUrl.pathname.startsWith('/admin')) {
      console.log('Middleware - Allowing authenticated access to', req.nextUrl.pathname)
      return response
    }

    return response
  }

  return NextResponse.next()
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