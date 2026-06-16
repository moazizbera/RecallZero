"use client"

import useSWR from "swr"
import { useState } from "react"
import Link from "next/link"
import { use } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Download,
  FileText,
  GitCommitVertical,
  Inbox,
  Loader2,
  ShieldAlert,
  SquarePen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { DecisionResult } from "@/components/decision-result"
import { IncidentActions } from "@/components/incident-actions"
import { ValueCaptured } from "@/components/value-captured"
import { cn } from "@/lib/utils"
import type { AuditEvent, Incident, IncidentStatus } from "@/lib/types"
import { formatTime, postureAccent } from "@/lib/ui-helpers"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_OPTIONS: IncidentStatus[] = ["OPEN", "MONITORING", "ESCALATED", "RESOLVED"]

export default function IncidentPage({
  params,
}: {
  params: Promise<{ incidentId: string }>
}) {
  const { incidentId } = use(params)
  const { data, isLoading, mutate } = useSWR<{ incident: Incident; auditTrail: AuditEvent[] }>(
    `/api/incidents/${incidentId}`,
    fetcher,
  )
  const [updating, setUpdating] = useState(false)

  async function setStatus(status: IncidentStatus) {
    setUpdating(true)
    await fetch(`/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await mutate()
    setUpdating(false)
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && data?.incident && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-balance text-2xl font-semibold md:text-3xl">
                  {data.incident.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.incident.source}
                  {data.incident.lotReference && (
                    <>
                      {" · "}
                      <span className="font-mono">{data.incident.lotReference}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={data.incident.status === s ? "default" : "secondary"}
                    disabled={updating}
                    onClick={() => setStatus(s)}
                    className="h-8 text-xs"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-6">
                <DecisionResult decision={data.incident.decision} />

                <ValueCaptured incident={data.incident} />

                {data.incident.affectedRegions && data.incident.affectedRegions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Distribution exposure</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {data.incident.affectedRegions.map((r) => (
                        <span
                          key={r}
                          className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium"
                        >
                          {r}
                        </span>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Inbox className="h-4 w-4 text-muted-foreground" />
                      Original signal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                      {data.incident.rawSignal}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Right column: operator actions + audit timeline */}
              <div className="flex flex-col gap-6">
                <IncidentActions incident={data.incident} onChanged={mutate} />

                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <GitCommitVertical className="h-4 w-4 text-primary" />
                      Decision audit trail
                      {data.incident.signalCount && data.incident.signalCount > 1 ? (
                        <span className="ml-auto rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          {data.incident.signalCount} signals
                        </span>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
                      {data.auditTrail.map((event) => (
                        <li key={event.id} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[1.5rem] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-card",
                              event.posture ? postureAccent(event.posture) : "bg-muted-foreground",
                            )}
                          />
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <AuditIcon event={event} />
                              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {(event.action || event.kind).replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{event.summary}</p>
                            <span className="text-xs text-muted-foreground">
                              {event.actor} · {formatTime(event.createdAt)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function AuditIcon({ event }: { event: AuditEvent }) {
  const cls = "h-3 w-3 text-muted-foreground"
  if (event.action === "override" || event.kind === "posture_change")
    return <SquarePen className={cls} />
  if (event.action === "escalate") return <ShieldAlert className={cls} />
  if (event.action === "acknowledge" || event.action === "resolve")
    return <CheckCircle2 className={cls} />
  if (event.action === "export") return <Download className={cls} />
  if (event.kind === "intake" || event.kind === "evidence_update")
    return <Inbox className={cls} />
  if (event.kind === "note") return <FileText className={cls} />
  return <CircleDot className={cls} />
}
