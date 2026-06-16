"use client"

import { ClipboardCheck, GitBranch, HelpCircle, ListChecks, ShieldCheck, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Decision } from "@/lib/types"
import {
  confidenceLabel,
  postureAccent,
  postureClasses,
  postureDescription,
  postureLabel,
  severityLabel,
} from "@/lib/ui-helpers"
import { DelayRiskChart } from "@/components/delay-risk-chart"

export function DecisionResult({ decision }: { decision: Decision }) {
  const nextEvidence = decision.evidenceGaps.slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/35 bg-primary/5">
        <CardContent className="grid gap-4 pt-5 md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Initial triage, not a final recall determination</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                RecallZero only reasons over the evidence provided in the signal. It recommends the safest next action under uncertainty, then shows what evidence is missing before the case can be closed.
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            <TriageFact label="Decision basis" value="Submitted signal, stated exposure, and known evidence gaps" />
            <TriageFact label="Confidence meaning" value="How complete and corroborated the current case record is" />
            <TriageFact label="Next step" value={decision.confidence === "HIGH" ? "Confirm the record and execute the workflow" : "Collect missing evidence before treating this as closed"} />
          </div>
        </CardContent>
      </Card>

      {/* Hero recommendation */}
      <Card className="overflow-hidden border-border/80">
        <div className={cn("h-1 w-full", postureAccent(decision.posture))} />
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide",
                  postureClasses(decision.posture),
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", postureAccent(decision.posture))} />
                {postureLabel(decision.posture)}
              </span>
              <span className="text-xs text-muted-foreground">
                {postureDescription(decision.posture)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Confidence
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {decision.confidenceScore}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {confidenceLabel(decision.confidence)}
              </span>
            </div>
          </div>

          <h2 className="text-balance text-xl font-semibold leading-snug md:text-2xl">
            {decision.headline}
          </h2>

          {/* Confidence meter */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full transition-all", postureAccent(decision.posture))}
                style={{ width: `${decision.confidenceScore}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-border bg-secondary/60 px-2 py-1 font-medium">
              {severityLabel(decision.severity)}
            </span>
            <span className="flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-1 font-medium">
              <TrendingUp className="h-3 w-3" />
              Exposure {decision.exposureEstimate}
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">{decision.rationale}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Evidence gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <HelpCircle className="h-4 w-4 text-warning" />
              What&apos;s blocking confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {decision.evidenceGaps.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No outstanding evidence gaps. The record supports this posture.
              </p>
            )}
            {decision.evidenceGaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 shrink-0 items-center rounded px-1.5 text-[10px] font-semibold uppercase",
                    gap.kind === "conflicting"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/15 text-warning",
                  )}
                >
                  {gap.kind}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{gap.label}</span>
                  <span className="text-xs text-muted-foreground">{gap.detail}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Flip conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4 text-primary" />
              What would flip this
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {decision.flipConditions.length === 0 && (
              <p className="text-sm text-muted-foreground">No flip conditions identified.</p>
            )}
            {decision.flipConditions.map((fc, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] font-semibold uppercase",
                    postureClasses(fc.flipsTo),
                  )}
                >
                  → {postureLabel(fc.flipsTo)}
                </span>
                <span className="text-sm text-muted-foreground">{fc.condition}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListChecks className="h-4 w-4 text-primary" />
            Next evidence to collect
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {nextEvidence.length > 0 ? (
            nextEvidence.map((gap, index) => (
              <div key={`${gap.label}-${index}`} className="rounded-lg border border-border bg-secondary/35 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence {index + 1}</p>
                <p className="mt-1 text-sm font-medium">{gap.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gap.detail}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-success/35 bg-success/10 p-3 md:col-span-3">
              <p className="text-sm font-medium text-success">No major evidence gaps detected.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Review the audit trail and confirm operating procedures before closing the case.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delay risk escalation curve */}
      <DelayRiskChart decision={decision} />
    </div>
  )
}

function TriageFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/55 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-foreground">{value}</p>
    </div>
  )
}
