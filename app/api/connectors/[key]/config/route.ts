import { NextResponse } from "next/server"
import { CONNECTORS } from "@/lib/connectors"
import { getConnectorConfig, saveConnectorConfig } from "@/lib/db"
import { getCurrentSession } from "@/lib/workspace-context"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: "Sign in before loading connector configuration." }, { status: 401 })
  const connector = CONNECTORS.find((item) => item.key === key)
  if (!connector) return NextResponse.json({ error: "Unknown connector." }, { status: 404 })

  const config = await getConnectorConfig(key, session.workspaceId)
  return NextResponse.json({ connector, config })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: "Sign in before saving connector configuration." }, { status: 401 })
  const connector = CONNECTORS.find((item) => item.key === key)
  if (!connector) return NextResponse.json({ error: "Unknown connector." }, { status: 404 })

  const body = await request.json()
  const config = await saveConnectorConfig(
    {
      key,
      authMethod: String(body.authMethod || "api-key"),
      sourceEndpoint: String(body.sourceEndpoint || ""),
      secretReference: body.secretReference ? String(body.secretReference) : undefined,
      syncCadence: String(body.syncCadence || "15 minutes"),
      routingQueue: String(body.routingQueue || "Recall review queue"),
      fieldMapping: String(body.fieldMapping || "lotReference, subject, body, receivedAt, source"),
      status: body.status === "connected" ? "connected" : "saved",
      lastTestedAt: body.status === "connected" ? Date.now() : undefined,
    },
    session.workspaceId,
  )

  return NextResponse.json({ connector, config })
}
