"use client"

import { TrendingUp, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Incident } from "@/lib/types"

/** Annual cost of the reference (Business) plan, used as the ROI denominator. */
const PLAN_ANNUAL = 108_000

/** Parse "$3.8M - $9.5M" style strings into [low, high] in dollars. */
function parseExposure(estimate: string): [number, number] {
  const matches = estimate.match(/([\d.]+)\s*([MBK])/gi) || []
  const toDollars = (s: string) => {
    const n = Number.parseFloat(s)
    const u = s.slice(-1).toUpperCase()
    if (Number.isNaN(n)) return 0
    if (u === "B") return n * 1_000_000_000
    if (u === "K") return n * 1_000
    return n * 1_000_000
  }
  const nums = matches.map(toDollars)
  if (nums.length === 0) return [0, 0]
  if (nums.length === 1) return [nums[0], nums[0]]
  return [Math.min(...nums), Math.max(...nums)]
}

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

/**
 * Translates a decision into a "value captured" story. The mechanism differs
 * by posture: ACTIVATE captures value by acting early (avoiding the larger,
 * mandated-recall tail); REJECT captures value by avoiding an unnecessary
 * recall; HOLD preserves optionality while evidence is gathered.
 */
export function ValueCaptured({ incident }: { incident: Incident }) {
  const [low, high] = parseExposure(incident.decision.exposureEstimate)
  const posture = incident.decision.posture

  let captured = 0
  let mechanism = ""
  if (posture === "ACTIVATE") {
    // Acting early typically contains exposure to the low end vs. the
    // worst-case mandated recall at the high end.
    captured = Math.max(0, high - low)
    mechanism =
      "Acting now contains the incident at the low end of exposure instead of the worst-case mandated recall."
  } else if (posture === "REJECT") {
    // Avoiding an unnecessary recall saves the full lower-bound cost.
    captured = low
    mechanism =
      "A defensible REJECT avoids the cost of an unnecessary recall while keeping the rationale on record."
  } else {
    // HOLD preserves optionality; quantify the decision window protected.
    captured = Math.max(0, (high - low) * 0.4)
    mechanism =
      "Holding preserves optionality — neither over-reacting nor exposing consumers — until the named gaps close."
  }

  const roi = captured > 0 ? captured / PLAN_ANNUAL : 0

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4 text-primary" />
          Value captured by this decision
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Estimated value captured
            </span>
            <span className="font-mono text-3xl font-semibold tabular-nums text-primary">
              {money(captured)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              ROI vs. annual platform cost
            </span>
            <span className="font-mono text-3xl font-semibold tabular-nums">
              {roi >= 1 ? `${Math.round(roi)}×` : "<1×"}
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mechanism} At {money(captured)} on a single incident, this decision alone is{" "}
          <span className="font-medium text-foreground">
            {roi >= 1 ? `${Math.round(roi)} times` : "a fraction of"}
          </span>{" "}
          the {money(PLAN_ANNUAL)}/yr platform cost.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Range modeled from this incident&apos;s exposure of {incident.decision.exposureEstimate}.
        </div>
      </CardContent>
    </Card>
  )
}
