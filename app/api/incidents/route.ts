import { NextResponse } from "next/server"
import { listIncidents } from "@/lib/db"
import { getCurrentSession } from "@/lib/workspace-context"

export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before loading incidents." }, { status: 401 })
    const incidents = await listIncidents(session.workspaceId)
    return NextResponse.json({ incidents })
  } catch (error) {
    console.error("[recallzero] incidents list error:", error)
    return NextResponse.json({ incidents: [], error: "Could not load incidents." }, { status: 500 })
  }
}
