"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ClipboardPaste,
  Loader2,
  Mail,
  Plug,
  Webhook,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { validateIncidentSignal } from "@/lib/intake-quality"
import type { IntakeMethod, Incident } from "@/lib/types"
import { DecisionResult } from "@/components/decision-result"

const METHODS: {
  key: IntakeMethod
  label: string
  icon: typeof Mail
  source: string
  placeholder: string
}[] = [
  {
    key: "paste",
    label: "Paste text",
    icon: ClipboardPaste,
    source: "Manual operator entry",
    placeholder:
      "Paste a call note, escalation summary, or any incident detail. e.g. 'Operator reports metal shavings found in lot 8841 during line inspection; product already palletized for 4 stores...'",
  },
  {
    key: "email",
    label: "Forwarded email",
    icon: Mail,
    source: "Forwarded supplier/QA email",
    placeholder:
      "Paste the full body of a forwarded supplier or QA email, including subject and lot references.",
  },
  {
    key: "webhook",
    label: "Webhook payload",
    icon: Webhook,
    source: "External webhook",
    placeholder:
      'Paste a raw event payload from an ops or marketplace system, e.g. {"event":"complaint.cluster","lot":"...","count":3}',
  },
  {
    key: "connector",
    label: "Connected system",
    icon: Plug,
    source: "Connected system",
    placeholder: "Pull a live signal from a connected system on the Connectors page, or paste one here.",
  },
]

const SAMPLE = `From: quality@northriverfoods.com
Subject: URGENT: Possible undeclared peanut protein - granola lot NR-GRN-4471

During a line changeover review this morning we found that the shared roasting line ran a peanut-containing product immediately before lot NR-GRN-4471 (Honey Oat Granola). The allergen wash-down log for that changeover is incomplete - the operator signed the start of the cleaning cycle but there is no completion signature or ATP swab result on file.

This lot has already shipped to 3 regional DCs (Northeast, Mid-Atlantic, Southeast). Approximately 18,400 units. The product label does NOT declare peanut. We have not had any consumer complaints yet. Retained samples are out for lab testing, results 24-48 hours away.`

export function DecisionCockpit({ initialSignal }: { initialSignal?: string }) {
  const router = useRouter()
  const [method, setMethod] = useState<IntakeMethod>("paste")
  const [signal, setSignal] = useState(initialSignal ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [incident, setIncident] = useState<Incident | null>(null)

  const active = METHODS.find((m) => m.key === method)!

  async function submit() {
    if (signal.trim().length < 10) {
      setError("Please provide a more complete incident signal.")
      return
    }
    const quality = validateIncidentSignal(signal)
    if (!quality.ok) {
      setError(quality.error || "Please provide a recall-relevant signal.")
      return
    }
    setLoading(true)
    setError(null)
    setIncident(null)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal, intakeMethod: method, source: active.source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Analysis failed.")
      setIncident(data.incident)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Intake column */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Signal intake
              </span>
              <h2 className="text-lg font-semibold">How is the signal arriving?</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon
                const isActive = m.key === method
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                    {m.label}
                  </button>
                )
              })}
            </div>

            <Textarea
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              placeholder={active.placeholder}
              className="min-h-44 resize-y bg-secondary/30 font-mono text-xs leading-relaxed"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Include product or lot/SKU, source, suspected issue, and shipment, complaint, QA, or containment details. Generic test emails are rejected before credits are used.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={submit} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing signal…
                  </>
                ) : (
                  <>
                    Run decision engine
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setMethod("email")
                  setSignal(SAMPLE)
                  setError(null)
                }}
                disabled={loading}
              >
                Load sample signal
              </Button>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Live model analysis on recall-relevant operational signals. Each decision is written to DynamoDB with a full
              audit trail.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Result column */}
      <div className="flex flex-col gap-4">
        {loading && <LoadingState />}
        {!loading && !incident && <EmptyState />}
        {!loading && incident && (
          <>
            <DecisionResult decision={incident.decision} />
            <Button
              variant="secondary"
              className="gap-2 self-start"
              onClick={() => router.push(`/incidents/${incident.id}`)}
            >
              Open war room & audit trail
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="flex min-h-80 items-center justify-center border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="max-w-xs text-balance text-sm text-muted-foreground">
          Submit an incident signal and RecallZero will return a recommended posture, confidence, what
          is blocking it, and how delay changes the risk.
        </p>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <Card className="min-h-80">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Reasoning over the signal…</p>
          <p className="text-xs text-muted-foreground">
            Interpreting evidence, weighing contradictions, and assessing delay risk.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
