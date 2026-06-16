import { NextResponse } from "next/server"
import { getIncident, getAuditTrail, updateIncidentStatus } from "@/lib/db"
import { getCurrentSession } from "@/lib/workspace-context"
import type { IncidentStatus } from "@/lib/types"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await params
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before loading incidents." }, { status: 401 })
    const incident = await getIncident(incidentId, session.workspaceId)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found." }, { status: 404 })
    }
    const auditTrail = await getAuditTrail(incidentId, session.workspaceId)
    return NextResponse.json({ incident, auditTrail })
  } catch (error) {
    console.error("[recallzero] incident detail error:", error)
    return NextResponse.json({ error: "Could not load incident." }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await params
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before updating incidents." }, { status: 401 })
    const body = await req.json()
    const status = body.status as IncidentStatus
    const incident = await updateIncidentStatus(incidentId, status, session.workspaceId)
    if (!incident) {
      return NextResponse.json({ error: "Incident not found." }, { status: 404 })
    }
    const auditTrail = await getAuditTrail(incidentId, session.workspaceId)
    return NextResponse.json({ incident, auditTrail })
  } catch (error) {
    console.error("[recallzero] incident update error:", error)
    return NextResponse.json({ error: "Could not update incident." }, { status: 500 })
  }
}
