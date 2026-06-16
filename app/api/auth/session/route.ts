import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { parseSessionToken, SESSION_COOKIE } from "@/lib/session"

export async function GET() {
  const cookieStore = await cookies()
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  return NextResponse.json({ authenticated: Boolean(session), session })
}
