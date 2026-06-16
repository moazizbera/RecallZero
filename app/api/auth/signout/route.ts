import { NextResponse } from "next/server"
import { SESSION_COOKIE } from "@/lib/session"

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}

export async function POST() {
  return clearSession(NextResponse.json({ ok: true }))
}

export async function GET(request: Request) {
  return clearSession(NextResponse.redirect(new URL("/", request.url)))
}
