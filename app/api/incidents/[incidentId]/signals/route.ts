import { NextResponse } from "next/server"
import { analyzeSignal } from "@/lib/decision-engine"
import { getIncident, reviseDecision } from "@/lib/db"
import { validateIncidentSignal } from "@/lib/intake-quality"
import { getCurrentSession } from "@/lib/workspace-context"

export const maxDuration = 60

export async function POST(req: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    const { incidentId } = await params
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before adding follow-up signals." }, { status: 401 })
    const workspaceId = session.workspaceId
    const body = await req.json()
    const newSignal: string = (body.signal || "").trim()

    if (!newSignal || newSignal.length < 10) {
      return NextResponse.json(
        { error: "Please provide a more complete follow-up signal (at least 10 characters)." },
        { status: 400 },
      )
    }
    const quality = validateIncidentSignal(newSignal, { followUp: true })
    if (!quality.ok) {
      return NextResponse.json({ error: quality.error, reason: quality.reason, missing: quality.missing }, { status: 422 })
    }

    const incident = await getIncident(incidentId, workspaceId)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found." }, { status: 404 })
    }

    // Fold the new signal into the existing evidence and re-run the engine over
    // the full picture, so the recommendation reflects all signals to date.
    const combinedSignal = `${incident.rawSignal}\n\n--- FOLLOW-UP SIGNAL (${new Date().toISOString()}) ---\n${newSignal}`
    const analysis = await analyzeSignal(combinedSignal)

    const previousPosture = incident.decision.posture
    const newSignalSummary = newSignal.replace(/\s+/g, " ").slice(0, 100) + (newSignal.length > 100 ? "…" : "")

    const updated = await reviseDecision({
      incidentId,
      previousPosture,
      newSignalSummary: `"${newSignalSummary}".`,
      combinedSignal,
      newDecision: {
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
      workspaceId,
    })

    return NextResponse.json({
      incident: updated,
      engine: analysis.engine,
      previousPosture,
      moved: previousPosture !== analysis.posture,
    })
  } catch (error) {
    console.error("[recallzero] follow-up signal error:", error)
    return NextResponse.json({ error: "Could not process the follow-up signal." }, { status: 500 })
  }
}
