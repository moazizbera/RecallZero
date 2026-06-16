import Link from "next/link"
import { ArrowRight, CheckCircle2, Circle, CreditCard, Plug, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { CONNECTORS } from "@/lib/connectors"
import { getWorkspace, listConnectorConfigs } from "@/lib/db"
import { getPlan } from "@/lib/plans"
import { getCurrentWorkspaceId } from "@/lib/workspace-context"

export const metadata = {
  title: "Setup — RecallZero",
  description: "Customer setup checklist for RecallZero workspaces.",
}

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  const workspaceId = await getCurrentWorkspaceId()
  const workspace = await getWorkspace(workspaceId)
  const plan = getPlan(workspace.planKey)
  const connectorConfigs = await listConnectorConfigs(workspaceId)
  const connectedCount = connectorConfigs.filter((config) => config.status === "connected").length
  const savedCount = connectorConfigs.length

  const steps = [
    {
      title: "Workspace activated",
      body: `${plan.name} is active with ${plan.credits}.`,
      ready: true,
      href: "/settings",
      cta: "View usage",
      icon: CreditCard,
    },
    {
      title: "Configure connector sources",
      body: `${savedCount} of ${CONNECTORS.length} connector setup records saved.`,
      ready: savedCount > 0,
      href: "/connectors?mode=configure",
      cta: "Configure connectors",
      icon: Plug,
    },
    {
      title: "Test live connections",
      body: `${connectedCount} connector${connectedCount === 1 ? "" : "s"} tested successfully.`,
      ready: connectedCount > 0,
      href: "/connectors?mode=configure",
      cta: "Test connection",
      icon: ShieldCheck,
    },
    {
      title: "Send first webhook signal",
      body: "POST a customer signal to /api/connectors/{key}/webhook after a connector is connected.",
      ready: connectedCount > 0,
      href: "/connectors?mode=configure",
      cta: "Copy connector key",
      icon: Plug,
    },
    {
      title: "Invite response team",
      body: "Add operators, compliance reviewers, and read-only executives.",
      ready: false,
      href: "/settings",
      cta: "Open team settings",
      icon: Users,
    },
  ]

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="secondary">Customer setup</Badge>
            <h1 className="text-balance text-3xl font-semibold md:text-4xl">Get the first production recall workflow live.</h1>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              Connect one real evidence source, test ingestion, then route the first signal into the decision cockpit.
            </p>
          </div>
          <Button render={<Link href="/connectors?mode=configure">Configure connectors<ArrowRight className="h-4 w-4" /></Link>} className="gap-1.5" />
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="Plan" value={plan.name} detail={plan.credits} />
          <SummaryCard label="Credits used" value={`${workspace.creditsUsed} / ${workspace.monthlyCredits}`} detail="Current billing cycle" />
          <SummaryCard label="Connectors" value={`${connectedCount} connected`} detail={`${savedCount} configured`} />
        </section>

        <section className="grid gap-4">
          {steps.map((step) => (
            <Card key={step.title}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {step.ready ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      <CardTitle className="text-base">{step.title}</CardTitle>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </div>
                <Button render={<Link href={step.href}>{step.cta}</Link>} variant={step.ready ? "secondary" : "default"} />
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-mono text-lg font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
