import { NextResponse } from "next/server"
import { getIncident, recordAction } from "@/lib/db"
import { getCurrentSession } from "@/lib/workspace-context"
import type { Posture } from "@/lib/types"

type ActionType = "acknowledge" | "override" | "escalate" | "resolve"

export async function POST(req: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    const { incidentId } = await params
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before recording incident actions." }, { status: 401 })
    const workspaceId = session.workspaceId
    const body = await req.json()
    const action: ActionType = body.action
    const actor: string = body.actor || "Operator"

    const incident = await getIncident(incidentId, workspaceId)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found." }, { status: 404 })
    }

    const posture = incident.decision.posture

    switch (action) {
      case "acknowledge": {
        const { incident: updated, event } = await recordAction({
          incidentId,
          action: "acknowledge",
          summary: `${actor} acknowledged the recommended posture (${posture}) and accepted the AI rationale.`,
          actor,
          posture,
          setAcknowledged: true,
          workspaceId,
        })
        return NextResponse.json({ incident: updated, event })
      }
      case "escalate": {
        const { incident: updated, event } = await recordAction({
          incidentId,
          action: "escalate",
          summary: `${actor} escalated this incident to the recall committee for executive sign-off.`,
          actor,
          posture,
          setStatus: "ESCALATED",
          workspaceId,
        })
        return NextResponse.json({ incident: updated, event })
      }
      case "resolve": {
        const { incident: updated, event } = await recordAction({
          incidentId,
          action: "resolve",
          summary: `${actor} marked this incident resolved. Final posture on record: ${posture}.`,
          actor,
          posture,
          setStatus: "RESOLVED",
          workspaceId,
        })
        return NextResponse.json({ incident: updated, event })
      }
      case "override": {
        const overrideTo: Posture = body.overrideTo
        const reason: string = (body.reason || "").trim()
        if (!overrideTo || !reason) {
          return NextResponse.json(
            { error: "An override requires a target posture and a written justification." },
            { status: 400 },
          )
        }
        const { incident: updated, event } = await recordAction({
          incidentId,
          action: "override",
          summary: `${actor} OVERRODE the AI recommendation (${posture} → ${overrideTo}). Justification: "${reason}"`,
          actor,
          posture: overrideTo,
          workspaceId,
        })
        return NextResponse.json({ incident: updated, event })
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 })
    }
  } catch (error) {
    console.error("[recallzero] action error:", error)
    return NextResponse.json({ error: "Could not record the action." }, { status: 500 })
  }
}
