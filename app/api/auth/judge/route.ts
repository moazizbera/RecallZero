import { NextResponse } from "next/server"
import { getAppConfig } from "@/lib/app-config"
import { upsertWorkspace } from "@/lib/db"
import { createSessionToken, SESSION_COOKIE } from "@/lib/session"

const JUDGE_WORKSPACE_ID = "recallzero-judge-workspace"

export async function POST(request: Request) {
  const config = getAppConfig()
  const expectedCode = process.env.RECALLZERO_JUDGE_ACCESS_CODE
  const body = await request.json().catch(() => ({}))
  const providedCode = String(body.code || "").trim()

  if (expectedCode && providedCode !== expectedCode) {
    return NextResponse.json({ error: "Enter the judge access code." }, { status: 401 })
  }

  if (!expectedCode && config.productionMode) {
    return NextResponse.json({ error: "Judge access code is not configured." }, { status: 503 })
  }

  await upsertWorkspace("pilot", JUDGE_WORKSPACE_ID, { name: "RecallZero Judge Workspace" })

  const session = {
    email: "judge@recallzero.app",
    name: "Hackathon Judge",
    workspaceId: JUDGE_WORKSPACE_ID,
    role: "reviewer" as const,
    createdAt: Date.now(),
  }

  const response = NextResponse.json({ ok: true, session, redirectTo: "/brief" })
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
