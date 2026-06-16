import { NextResponse } from "next/server"
import { getWorkspaceAdmin, saveWorkspaceAdmin } from "@/lib/db"
import { createWebhookSecret, hashWebhookSecret, secretPreview } from "@/lib/webhook-secret"
import { getCurrentSession } from "@/lib/workspace-context"

export async function POST() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: "Sign in before rotating workspace secrets." }, { status: 401 })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only workspace admins can rotate webhook secrets." }, { status: 403 })
  }

  const secret = createWebhookSecret()
  const current = await getWorkspaceAdmin(session.workspaceId)
  const admin = await saveWorkspaceAdmin(
    {
      ...current,
      webhookSecretHash: hashWebhookSecret(secret),
      webhookSecretPreview: secretPreview(secret),
      webhookSecretRotatedAt: Date.now(),
      webhookSecretRotatedBy: session.email,
    },
    session.workspaceId,
  )

  return NextResponse.json({
    secret,
    preview: admin.webhookSecretPreview,
    rotatedAt: admin.webhookSecretRotatedAt,
    rotatedBy: admin.webhookSecretRotatedBy,
  })
}
