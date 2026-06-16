import { NextResponse } from "next/server"
import { getWorkspace, upsertWorkspace } from "@/lib/db"
import { getPlan, type PlanKey } from "@/lib/plans"
import { getCurrentSession } from "@/lib/workspace-context"

export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before loading a workspace." }, { status: 401 })
    const workspace = await getWorkspace(session.workspaceId)
    return NextResponse.json({ workspace, plan: getPlan(workspace.planKey) })
  } catch (error) {
    console.error("[recallzero] workspace load error", error)
    return NextResponse.json({ error: "Could not load workspace." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before updating a workspace." }, { status: 401 })
    const { planKey } = (await request.json()) as { planKey?: PlanKey }
    const plan = getPlan(planKey)
    const workspace = await upsertWorkspace(plan.key, session.workspaceId)
    return NextResponse.json({ workspace, plan })
  } catch (error) {
    console.error("[recallzero] workspace update error", error)
    return NextResponse.json({ error: "Could not update workspace." }, { status: 500 })
  }
}
