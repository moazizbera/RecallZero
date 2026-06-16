"use client"

import useSWR from "swr"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertOctagon,
  Clock,
  Database,
  Gauge,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { PostureBreakdown } from "@/components/posture-breakdown"
import { cn } from "@/lib/utils"
import type { Incident, Posture } from "@/lib/types"
import { postureClasses, postureLabel, severityLabel, timeAgo } from "@/lib/ui-helpers"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const demoMode = (process.env.NEXT_PUBLIC_RECALLZERO_MODE || "demo") === "demo"

interface DashboardData {
  kpis: {
    total: number
    openCount: number
    activate: number
    hold: number
    reject: number
    criticalDelay: number
    flaggedCount: number
    exposureFlagged: string
    avgConfidence: number
  }
  recent: Incident[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR<DashboardData>("/api/dashboard", fetcher)
  const [seeding, setSeeding] = useState(false)

  async function seedDemo() {
    setSeeding(true)
    await fetch("/api/demo", { method: "POST" })
    await mutate()
    setSeeding(false)
  }

  const k = data?.kpis

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold md:text-3xl">Operations dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Live incident posture across the response program, backed by DynamoDB.
            </p>
          </div>
          {demoMode && (
            <Button variant="secondary" onClick={seedDemo} disabled={seeding} className="gap-2">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Load sample incident set
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && k && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi
                icon={AlertOctagon}
                label="Activate now"
                value={k.activate}
                accent="text-destructive"
                sub="Recommended containment"
              />
              <Kpi
                icon={ShieldAlert}
                label="On hold"
                value={k.hold}
                accent="text-warning"
                sub="Awaiting evidence"
              />
              <Kpi
                icon={Clock}
                label="Critical delay risk"
                value={k.criticalDelay}
                accent="text-destructive"
                sub="Time is the dominant risk"
              />
              <Kpi
                icon={Gauge}
                label="Avg confidence"
                value={`${k.avgConfidence}`}
                accent="text-primary"
                sub="Across open decisions"
              />
            </div>

            {data.recent.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                  <p className="max-w-sm text-balance text-sm text-muted-foreground">
                    No incidents yet. Load the sample incident set, or run a signal through the
                    cockpit to populate the database.
                  </p>
                  {demoMode && (
                    <Button variant="secondary" onClick={seedDemo} disabled={seeding}>
                      Load sample incident set
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card>
                  <CardContent className="p-0">
                    <div className="border-b border-border px-5 py-3">
                      <h2 className="text-sm font-semibold">Recent decisions</h2>
                    </div>
                    <ul className="divide-y divide-border">
                      {data.recent.map((inc) => (
                        <li key={inc.id}>
                          <button
                            onClick={() => router.push(`/incidents/${inc.id}`)}
                            className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
                          >
                            <PostureChip posture={inc.decision.posture} />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-medium">{inc.title}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {inc.source} · {severityLabel(inc.decision.severity)}
                              </span>
                            </div>
                            <div className="hidden items-center gap-2 sm:flex">
                              <span className="font-mono text-xs text-muted-foreground">
                                {inc.decision.exposureEstimate}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-sm tabular-nums">
                                {inc.decision.confidenceScore}
                                <span className="text-xs text-muted-foreground">/100</span>
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {timeAgo(inc.updatedAt)}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-6">
                  <PostureBreakdown activate={k.activate} hold={k.hold} reject={k.reject} />
                  <Card>
                    <CardContent className="flex flex-col gap-2 pt-5">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Flagged financial exposure
                      </span>
                      <span className="font-mono text-3xl font-semibold tabular-nums text-destructive">
                        {k.exposureFlagged}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Open incidents where containment is recommended or under review. Each delayed
                        call compounds recall, regulatory, and brand cost.
                      </span>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: typeof Activity
  label: string
  value: string | number
  accent: string
  sub: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className={cn("h-4 w-4", accent)} />
        </div>
        <span className="font-mono text-3xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </CardContent>
    </Card>
  )
}

function PostureChip({ posture }: { posture: Posture }) {
  return (
    <span
      className={cn(
        "flex h-6 w-fit shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold uppercase tracking-wide",
        postureClasses(posture),
      )}
    >
      {postureLabel(posture)}
    </span>
  )
}
