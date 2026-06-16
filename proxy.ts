import { NextResponse, type NextRequest } from "next/server"

const sessionCookie = "recallzero_session"
const protectedPrefixes = ["/dashboard", "/incidents", "/settings", "/setup", "/connectors", "/admin"]

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const protectedPath = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!protectedPath) return NextResponse.next()

  const hasSession = Boolean(request.cookies.get(sessionCookie)?.value)
  if (hasSession) return NextResponse.next()

  const signInUrl = request.nextUrl.clone()
  signInUrl.pathname = "/signin"
  signInUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}