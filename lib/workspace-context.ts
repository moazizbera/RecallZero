import { cookies } from "next/headers"
import { parseSessionToken, SESSION_COOKIE } from "@/lib/session"

export async function getCurrentSession() {
  const cookieStore = await cookies()
  return parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value)
}

export async function getCurrentWorkspaceId() {
  return (await getCurrentSession())?.workspaceId
}

export function getWebhookWorkspaceId(request: Request) {
  const headerWorkspace = request.headers.get("x-recallzero-workspace-id")?.trim()
  return headerWorkspace || undefined
}
