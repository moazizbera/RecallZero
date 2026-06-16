import { NextResponse } from "next/server"
import { listIncidents } from "@/lib/db"
import { getCurrentSession } from "@/lib/workspace-context"
import type { Posture } from "@/lib/types"

/** Parse the high end of an exposure string like "$22.1M–$110.4M" into millions. */
function exposureCeilingMillions(estimate: string): number {
  const matches = estimate.match(/([\d.]+)\s*([MBK])/gi)
  if (!matches || matches.length === 0) return 0
  const last = matches[matches.length - 1]
  const num = Number.parseFloat(last)
  const unit = last.slice(-1).toUpperCase()
  if (Number.isNaN(num)) return 0
  if (unit === "B") return num * 1000
  if (unit === "K") return num / 1000
  return num
}

function formatMillions(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`
  return `$${Math.round(m)}M`
}

export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: "Sign in before loading the dashboard." }, { status: 401 })
    const incidents = await listIncidents(session.workspaceId)

    const total = incidents.length
    const byPosture: Record<Posture, number> = { HOLD: 0, ACTIVATE: 0, REJECT: 0 }
    let openCount = 0
    let criticalDelay = 0
    let flaggedCount = 0
    let exposureMillions = 0

    for (const inc of incidents) {
      byPosture[inc.decision.posture]++
      if (inc.status === "OPEN" || inc.status === "ESCALATED") openCount++
      if (inc.decision.delayRisk.trajectory === "critical") criticalDelay++
      // Sum exposure for incidents that are recommended for containment or under review.
      if (inc.decision.posture === "ACTIVATE" || inc.decision.posture === "HOLD") {
        flaggedCount++
        exposureMillions += exposureCeilingMillions(inc.decision.exposureEstimate)
      }
    }

    const avgConfidence =
      total === 0
        ? 0
        : Math.round(
            incidents.reduce((s, i) => s + i.decision.confidenceScore, 0) / total,
          )

    return NextResponse.json({
      kpis: {
        total,
        openCount,
        activate: byPosture.ACTIVATE,
        hold: byPosture.HOLD,
        reject: byPosture.REJECT,
        criticalDelay,
        flaggedCount,
        exposureFlagged: formatMillions(exposureMillions),
        avgConfidence,
      },
      recent: incidents.slice(0, 6),
    })
  } catch (error) {
    console.error("[recallzero] dashboard error:", error)
    return NextResponse.json({ error: "Could not load dashboard." }, { status: 500 })
  }
}
