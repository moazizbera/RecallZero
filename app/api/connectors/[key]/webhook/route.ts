import { NextResponse } from "next/server"
import { analyzeSignal } from "@/lib/decision-engine"
import { CONNECTORS } from "@/lib/connectors"
import { consumeWorkspaceCredit, createIncident, getConnectorConfig, getWorkspaceAdmin } from "@/lib/db"
import { validateIncidentSignal } from "@/lib/intake-quality"
import { verifyWebhookSecret } from "@/lib/webhook-secret"
import { getWebhookWorkspaceId } from "@/lib/workspace-context"

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  const workspaceId = getWebhookWorkspaceId(request)
  const connector = CONNECTORS.find((item) => item.key === key)
  if (!connector) return NextResponse.json({ error: "Unknown connector." }, { status: 404 })

  const providedSecret = request.headers.get("x-recallzero-webhook-secret")
  const workspaceAdmin = workspaceId ? await getWorkspaceAdmin(workspaceId) : null
  if (workspaceAdmin?.webhookSecretHash && (!providedSecret || !verifyWebhookSecret(providedSecret, workspaceAdmin.webhookSecretHash))) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 })
  }
  const configuredSecret = process.env.RECALLZERO_CONNECTOR_WEBHOOK_SECRET
  if (!workspaceAdmin?.webhookSecretHash && configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 })
  }

  const config = await getConnectorConfig(key, workspaceId)
  if (!config || config.status !== "connected") {
    return NextResponse.json({ error: "Connector is not configured and connected." }, { status: 409 })
  }

  const body = await request.json()
  const signal = String(body.signal || body.body || body.message || "").trim()
  if (signal.length < 10) {
    return NextResponse.json({ error: "Webhook payload must include a signal body with at least 10 characters." }, { status: 400 })
  }
  const quality = validateIncidentSignal(signal)
  if (!quality.ok) {
    return NextResponse.json({ error: quality.error, reason: quality.reason, missing: quality.missing }, { status: 422 })
  }

  const credit = await consumeWorkspaceCredit(workspaceId)
  if (!credit.ok) {
    return NextResponse.json(
      {
        error: "This workspace is out of recall decision credits. Upgrade the plan or wait for the next billing cycle.",
        workspace: credit.workspace,
      },
      { status: 402 },
    )
  }

  const analysis = await analyzeSignal(signal)
  const incident = await createIncident({
    title: analysis.title,
    source: connector.source,
    intakeMethod: "webhook",
    rawSignal: signal,
    decision: {
      posture: analysis.posture,
      confidence: analysis.confidence,
      confidenceScore: analysis.confidenceScore,
      headline: analysis.headline,
      rationale: analysis.rationale,
      evidenceGaps: analysis.evidenceGaps,
      flipConditions: analysis.flipConditions,
      delayRisk: analysis.delayRisk,
      severity: analysis.severity,
      exposureEstimate: analysis.exposureEstimate,
    },
    lotReference: analysis.lotReference || body.lotReference,
    affectedRegions: analysis.affectedRegions,
    workspaceId,
  })

  return NextResponse.json({ ok: true, connector, incident, workspace: credit.workspace })
}
