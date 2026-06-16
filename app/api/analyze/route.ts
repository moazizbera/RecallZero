import { NextResponse } from "next/server"
import { analyzeSignal } from "@/lib/decision-engine"
import { consumeWorkspaceCredit, createIncident } from "@/lib/db"
import { validateIncidentSignal } from "@/lib/intake-quality"
import { getCurrentSession } from "@/lib/workspace-context"
import type { IntakeMethod } from "@/lib/types"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const signal: string = (body.signal || "").trim()
    const intakeMethod: IntakeMethod = body.intakeMethod || "paste"
    const source: string = body.source || "Manual operator entry"
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: "Sign up or sign in before using recall decision credits." }, { status: 401 })
    }
    const workspaceId = session.workspaceId

    if (!signal || signal.length < 10) {
      return NextResponse.json(
        { error: "Please provide a more complete incident signal (at least 10 characters)." },
        { status: 400 },
      )
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
      source,
      intakeMethod,
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
      lotReference: analysis.lotReference,
      affectedRegions: analysis.affectedRegions,
      workspaceId,
    })

    return NextResponse.json({ incident, engine: analysis.engine, workspace: credit.workspace })
  } catch (error) {
    console.error("[recallzero] analyze error:", error)
    return NextResponse.json(
      { error: "The decision engine could not process this signal. Please try again." },
      { status: 500 },
    )
  }
}
