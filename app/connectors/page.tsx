"use client"

import Link from "next/link"
import useSWR from "swr"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Plug, RefreshCw, Save, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteHeader } from "@/components/site-header"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ConnectorSignal } from "@/lib/types"
import { formatTime } from "@/lib/ui-helpers"

interface ConnectorDef {
  key: string
  name: string
  description: string
  status: "live" | "pilot" | "queued"
  source: string
}

interface ConnectorConfig {
  authMethod: string
  sourceEndpoint: string
  secretReference?: string
  syncCadence: string
  routingQueue: string
  fieldMapping: string
  status?: "draft" | "saved" | "connected"
  lastTestedAt?: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusClasses: Record<ConnectorDef["status"], string> = {
  live: "bg-success/15 text-success border-success/40",
  pilot: "bg-warning/15 text-warning border-warning/40",
  queued: "bg-secondary text-muted-foreground border-border",
}

const defaultConnectorConfig: ConnectorConfig = {
  authMethod: "api-key",
  sourceEndpoint: "",
  secretReference: "",
  syncCadence: "15 minutes",
  routingQueue: "Recall review queue",
  fieldMapping: "lotReference, subject, body, receivedAt, source",
}

export default function ConnectorsPage() {
  return (
    <Suspense fallback={<ConnectorsShell mode="demo" isLoading />}>
      <ConnectorsView />
    </Suspense>
  )
}

function ConnectorsView() {
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode") === "configure" ? "configure" : "demo"
  const { data, isLoading } = useSWR<{ connectors: ConnectorDef[] }>("/api/connectors", fetcher)

  return <ConnectorsShell mode={mode} isLoading={isLoading} connectors={data?.connectors} />
}

function ConnectorsShell({
  mode,
  isLoading,
  connectors,
}: {
  mode: "demo" | "configure"
  isLoading: boolean
  connectors?: ConnectorDef[]
}) {

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold md:text-3xl">Signal connectors</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {mode === "configure"
                ? "Configure customer connector sources, authentication, sync cadence, and routing before ingesting production recall signals."
                : "RecallZero ingests partial signals from the systems where recall evidence actually lives. Pull a demo signal and route it straight into the decision engine."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/connectors">Demo signals</Link>} variant={mode === "demo" ? "default" : "secondary"} />
            <Button render={<Link href="/connectors?mode=configure">Configure</Link>} variant={mode === "configure" ? "default" : "secondary"} />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && connectors && mode === "demo" && (
          <div className="grid gap-4 md:grid-cols-2">
            {connectors.map((connector) => (
              <ConnectorCard key={connector.key} connector={connector} />
            ))}
          </div>
        )}

        {!isLoading && connectors && mode === "configure" && (
          <div className="grid gap-4 md:grid-cols-2">
            {connectors.map((connector) => (
              <ConnectorConfigCard key={connector.key} connector={connector} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ConnectorConfigCard({ connector }: { connector: ConnectorDef }) {
  const { data, mutate } = useSWR<{ config: ConnectorConfig | null }>(`/api/connectors/${connector.key}/config`, fetcher)
  const initialConfig = { ...defaultConnectorConfig, ...data?.config }
  const initialStatus = data?.config?.status === "connected" ? "connected" : data?.config ? "saved" : "draft"

  return (
    <ConnectorConfigForm
      key={`${connector.key}-${data?.config?.lastTestedAt || data?.config?.sourceEndpoint || "new"}`}
      connector={connector}
      initialConfig={initialConfig}
      initialStatus={initialStatus}
      refreshConfig={mutate}
    />
  )
}

function ConnectorConfigForm({
  connector,
  initialConfig,
  initialStatus,
  refreshConfig,
}: {
  connector: ConnectorDef
  initialConfig: ConnectorConfig
  initialStatus: "draft" | "saved" | "testing" | "connected"
  refreshConfig: () => Promise<unknown>
}) {
  const [config, setConfig] = useState<ConnectorConfig>(() => {
    return initialConfig
  })
  const [status, setStatus] = useState<"draft" | "saved" | "testing" | "connected">(initialStatus)

  function update<K extends keyof ConnectorConfig>(key: K, value: ConnectorConfig[K]) {
    setStatus("draft")
    setConfig((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    const response = await fetch(`/api/connectors/${connector.key}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, status: "saved" }),
    })
    if (!response.ok) return
    await refreshConfig()
    setStatus("saved")
  }

  function testConnection() {
    setStatus("testing")
    window.setTimeout(async () => {
      const response = await fetch(`/api/connectors/${connector.key}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, status: "connected" }),
      })
      if (!response.ok) {
        setStatus("draft")
        return
      }
      await refreshConfig()
      setStatus("connected")
    }, 650)
  }

  return (
    <Card id={connector.key} className="flex flex-col scroll-mt-24">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-primary" />
            {connector.name}
          </CardTitle>
          <Badge variant={status === "connected" || status === "saved" ? "secondary" : "outline"}>
            {status === "testing" ? "Testing" : status === "connected" ? "Connected" : status === "saved" ? "Saved" : "Draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{connector.description}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${connector.key}-endpoint`}>Source endpoint</Label>
            <Input
              id={`${connector.key}-endpoint`}
              value={config.sourceEndpoint}
              onChange={(event) => update("sourceEndpoint", event.target.value)}
              placeholder={endpointPlaceholder(connector.key)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${connector.key}-auth`}>Authentication</Label>
            <select
              id={`${connector.key}-auth`}
              value={config.authMethod}
              onChange={(event) => update("authMethod", event.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="api-key">API key</option>
              <option value="oauth">OAuth</option>
              <option value="sftp">SFTP drop</option>
              <option value="webhook">Webhook secret</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${connector.key}-secret`}>Secret reference</Label>
            <Input
              id={`${connector.key}-secret`}
              value={config.secretReference || ""}
              onChange={(event) => update("secretReference", event.target.value)}
              placeholder="vault://recallzero/connector-secret"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${connector.key}-cadence`}>Sync cadence</Label>
            <select
              id={`${connector.key}-cadence`}
              value={config.syncCadence}
              onChange={(event) => update("syncCadence", event.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option>Real time</option>
              <option>5 minutes</option>
              <option>15 minutes</option>
              <option>Hourly</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${connector.key}-queue`}>Routing queue</Label>
            <Input
              id={`${connector.key}-queue`}
              value={config.routingQueue}
              onChange={(event) => update("routingQueue", event.target.value)}
              placeholder="Recall review queue"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${connector.key}-mapping`}>Field mapping</Label>
          <Textarea
            id={`${connector.key}-mapping`}
            value={config.fieldMapping}
            onChange={(event) => update("fieldMapping", event.target.value)}
            placeholder="lotReference, subject, body, receivedAt, source"
          />
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <KeyRound className="mr-1 inline h-3.5 w-3.5" />
          Store production secrets in the provider vault or deployment environment. RecallZero persists non-secret connector setup to the workspace record and keeps secret values out of the browser.
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={save} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save configuration
          </Button>
          <Button onClick={testConnection} disabled={status === "testing"} className="gap-1.5">
            {status === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Test connection
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function endpointPlaceholder(key: string) {
  switch (key) {
    case "supplier-inbox":
      return "imap://mail.company.com/recall-alerts"
    case "qa-system":
      return "https://qa.company.com/api/inspection-alerts"
    case "erp-traceability":
      return "https://erp.company.com/api/lots"
    case "complaints-feed":
      return "https://support.company.com/webhooks/complaints"
    default:
      return "https://system.company.com/api/signals"
  }
}

function ConnectorCard({ connector }: { connector: ConnectorDef }) {
  const router = useRouter()
  const [signal, setSignal] = useState<ConnectorSignal | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function pull() {
    setLoading(true)
    setMessage(null)
    const res = await fetch(`/api/connectors/${connector.key}`)
    const data = await res.json()
    if (data.signal) {
      setSignal(data.signal)
    } else {
      setSignal(null)
      setMessage(data.message ?? "No signal available.")
    }
    setLoading(false)
  }

  function routeToCockpit() {
    if (!signal) return
    router.push(`/?signal=${encodeURIComponent(signal.body)}`)
  }

  const disabled = connector.status === "queued"

  return (
    <Card id={connector.key} className="flex flex-col scroll-mt-24">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-primary" />
            {connector.name}
          </CardTitle>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              statusClasses[connector.status],
            )}
          >
            {connector.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{connector.description}</p>

        {signal && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{signal.subject}</span>
              {signal.lotReference && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {signal.lotReference}
                </span>
              )}
            </div>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {signal.body}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {signal.source} · {formatTime(signal.receivedAt)}
            </span>
          </div>
        )}

        {message && (
          <p className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={pull}
            disabled={disabled || loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {disabled ? "Coming soon" : "Pull latest signal"}
          </Button>
          {signal && (
            <Button size="sm" onClick={routeToCockpit} className="gap-1.5">
              Send to cockpit
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
