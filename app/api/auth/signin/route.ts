import { NextResponse } from "next/server"
import { getWorkspace, upsertWorkspace } from "@/lib/db"
import { createSessionToken, SESSION_COOKIE, workspaceIdFromEmail, type AppSession } from "@/lib/session"

function adminEmails() {
  return (process.env.RECALLZERO_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email || "").trim().toLowerCase()
  const name = String(body.name || email.split("@")[0] || "RecallZero operator").trim()
  const company = String(body.company || "").trim()

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 })
  }

  const workspaceId = workspaceIdFromEmail(email)
  const workspace = await getWorkspace(workspaceId)
  if (company && workspace.name === `${workspaceId} workspace`) {
    await upsertWorkspace(workspace.planKey, workspaceId, { name: `${company} workspace` })
  }
  const role: AppSession["role"] = adminEmails().includes(email) ? "admin" : "operator"

  const session: AppSession = {
    email,
    name,
    workspaceId,
    role,
    createdAt: Date.now(),
  }

  const response = NextResponse.json({ ok: true, session })
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
