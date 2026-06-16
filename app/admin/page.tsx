import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, ArrowRight, Copy, CreditCard, Database, KeyRound, Plug, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyButton, RotateWebhookSecretButton } from "@/components/admin-actions"
import { SiteHeader } from "@/components/site-header"
import { CONNECTORS } from "@/lib/connectors"
import { getAppConfig } from "@/lib/app-config"
import { getWorkspace, getWorkspaceAdmin, listConnectorConfigs } from "@/lib/db"
import { getPlan } from "@/lib/plans"
import { getCurrentSession } from "@/lib/workspace-context"

export const metadata = {
  title: "Admin — RecallZero",
  description: "Workspace administration, webhook endpoints, connector readiness, and security controls.",
}

export const dynamic = "force-dynamic"

function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.RECALLZERO_APP_URL) return process.env.RECALLZERO_APP_URL
  if (process.env.NODE_ENV === "production") return "https://recallzero-app.vercel.app"
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export default async function AdminPage() {
  const session = await getCurrentSession()
  if (!session || session.role !== "admin") redirect("/signin?next=/admin")
  const workspaceId = session?.workspaceId
  const workspace = await getWorkspace(workspaceId)
  const admin = await getWorkspaceAdmin(workspaceId)
  const connectorConfigs = await listConnectorConfigs(workspaceId)
  const plan = getPlan(workspace.planKey)
  const config = getAppConfig()
  const connectedCount = connectorConfigs.filter((connector) => connector.status === "connected").length
  const baseUrl = appUrl()

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="secondary">Workspace admin</Badge>
            <h1 className="text-balance text-3xl font-semibold md:text-4xl">Operate a customer workspace from one control room.</h1>
            <p className="max-w-3xl text-pretty leading-relaxed text-muted-foreground">
              Manage connector webhook endpoints, rotate workspace secrets, confirm usage controls, and prepare the workspace for a production pilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/connectors?mode=configure">Configure connectors<ArrowRight className="h-4 w-4" /></Link>} className="gap-1.5" />
            <Button render={<Link href="/settings">Settings</Link>} variant="secondary" />
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetric icon={Users} label="Workspace" value={workspace.id} detail={session ? session.email : "Default demo workspace"} />
          <AdminMetric icon={CreditCard} label="Plan" value={plan.name} detail={`${workspace.creditsUsed} / ${workspace.monthlyCredits} credits`} />
          <AdminMetric icon={Plug} label="Connectors" value={`${connectedCount} connected`} detail={`${connectorConfigs.length} configured records`} />
          <AdminMetric icon={ShieldCheck} label="Webhook secret" value={admin.webhookSecretPreview || "Not rotated"} detail={admin.webhookSecretRotatedAt ? `Rotated ${new Date(admin.webhookSecretRotatedAt).toLocaleDateString()}` : "Uses environment fallback if configured"} />
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Webhook security
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Rotate a workspace-specific webhook secret before sharing connector endpoints with a customer system. The raw secret is shown once, then only the hash and preview remain in DynamoDB.
              </p>
              <RotateWebhookSecretButton />
              <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                <p className="font-medium">Required webhook headers</p>
                <code className="rounded-md border border-border bg-background px-2 py-1 text-xs">x-recallzero-workspace-id: {workspace.id}</code>
                <code className="rounded-md border border-border bg-background px-2 py-1 text-xs">x-recallzero-webhook-secret: {admin.webhookSecretPreview ? "<rotated-secret>" : "<environment-secret-if-configured>"}</code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Production readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ReadinessRow label="Runtime mode" value={config.mode} ready />
              <ReadinessRow label="Session secret" value={config.sessionConfigured ? "Configured" : "Demo fallback"} ready={config.sessionConfigured || config.demoMode} />
              <ReadinessRow label="Billing" value={config.billingConfigured ? "Stripe configured" : "Demo checkout"} ready={config.billingConfigured || config.demoMode} />
              <ReadinessRow label="Connector webhook protection" value={admin.webhookSecretPreview || config.connectorWebhookProtected ? "Protected" : "Needs secret"} ready={Boolean(admin.webhookSecretPreview || config.connectorWebhookProtected)} />
              <ReadinessRow label="Storage" value="DynamoDB live" ready />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Connector webhook endpoints</h2>
              <p className="text-sm text-muted-foreground">Copy endpoint URLs into ERP, QA, inbox automation, or complaint systems.</p>
            </div>
            <CopyButton value={workspace.id} label="Copy workspace ID" />
          </div>

          <div className="grid gap-3">
            {CONNECTORS.map((connector) => {
              const saved = connectorConfigs.find((item) => item.key === connector.key)
              const endpoint = `${baseUrl}/api/connectors/${connector.key}/webhook`
              return (
                <Card key={connector.key}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-5">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{connector.name}</h3>
                        <Badge variant={saved?.status === "connected" ? "secondary" : "outline"}>{saved?.status || "not configured"}</Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{connector.description}</p>
                      <code className="block overflow-x-auto rounded-md border border-border bg-secondary/35 px-2 py-1.5 text-xs">{endpoint}</code>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CopyButton value={endpoint} label="Copy URL" />
                      <Button render={<Link href={`/connectors?mode=configure#${connector.key}`}>Configure</Link>} variant="secondary" size="sm" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function AdminMetric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate font-mono text-lg font-semibold">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  )
}

function ReadinessRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium">
        {ready ? <ShieldCheck className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-warning" />}
        {value}
      </span>
    </div>
  )
}
