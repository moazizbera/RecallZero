import Link from "next/link"
import { Bell, CheckCircle2, CreditCard, Database, KeyRound, Link2, Settings, ShieldCheck, SlidersHorizontal, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CONNECTORS } from "@/lib/connectors"
import { getAppConfig } from "@/lib/app-config"
import { getWorkspace } from "@/lib/db"
import { PLANS, getPlan } from "@/lib/plans"
import { SiteHeader } from "@/components/site-header"
import { getCurrentWorkspaceId } from "@/lib/workspace-context"

export const metadata = {
  title: "Settings — RecallZero",
  description: "Workspace, usage, connector, and team settings for RecallZero.",
}

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const workspaceId = await getCurrentWorkspaceId()
  const workspace = await getWorkspace(workspaceId)
  const config = getAppConfig()
  const activePlan = getPlan(workspace.planKey)
  const usedCredits = workspace.creditsUsed
  const totalCredits = typeof activePlan.decisionsPerMonth === "number" ? activePlan.decisionsPerMonth : 1000
  const usagePercent = Math.min(100, Math.round((usedCredits / totalCredits) * 100))
  const connectorLimit = typeof activePlan.connectorLimit === "number" ? activePlan.connectorLimit : CONNECTORS.length

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-3xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Settings className="h-3.5 w-3.5" />
              Workspace settings
            </span>
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold md:text-4xl">Manage plan, credits, connectors, and team access.</h1>
              <p className="text-pretty leading-relaxed text-muted-foreground">
                Customers configure RecallZero here after signup. Demo users can still explore with limited credits before choosing Pilot, Program, or Enterprise.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/pricing">Change plan</Link>} variant="secondary" />
            <Button render={<Link href="/connectors?mode=configure">Configure connectors<Link2 className="h-4 w-4" /></Link>} className="gap-1.5" />
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard icon={CreditCard} label="Current plan" value={activePlan.name} detail={activePlan.credits} />
          <StatusCard icon={SlidersHorizontal} label="Credits used" value={`${usedCredits} / ${totalCredits}`} detail={`${usagePercent}% this cycle`} />
          <StatusCard icon={Database} label="Storage" value="DynamoDB live" detail="Audit trail enabled" />
          <StatusCard icon={ShieldCheck} label="Security" value={config.sessionConfigured ? "Session protected" : "Demo session"} detail={config.connectorWebhookProtected ? "Webhook secret enabled" : "Webhook secret not set"} />
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Usage control</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">Decision credits</span>
                  <span className="font-mono text-muted-foreground">{usagePercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
              <SettingChoice title="Credit alerts" body="Notify admins at 70%, 90%, and 100% of monthly credit usage." active />
              <SettingChoice title="Approval threshold" body="Require compliance approval before spending credits on Severity A incidents." active={activePlan.key !== "free"} />
              <SettingChoice title="Auto-upgrade protection" body="Do not exceed plan credits without an admin approval." active />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connector configuration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {CONNECTORS.map((connector, index) => {
                const enabled = index < connectorLimit
                return (
                  <div key={connector.key} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium">{connector.name}</h2>
                        <Badge variant={enabled ? "secondary" : "outline"}>{enabled ? "Enabled" : "Upgrade"}</Badge>
                      </div>
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{connector.description}</p>
                    </div>
                    <Button render={<Link href={`/connectors?mode=configure#${connector.key}`}>{enabled ? "Configure" : "Upgrade"}</Link>} variant={enabled ? "secondary" : "outline"} />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <PreferenceCard icon={Users} title="Team roles" body="Invite recall owners, QA reviewers, legal approvers, and read-only executives." items={["Admin", "Operator", "Compliance reviewer"]} />
          <PreferenceCard icon={Bell} title="Notifications" body="Route high-risk signals to email, Slack, Teams, or incident response queues." items={["Severity A escalation", "Credit threshold", "Connector failure"]} />
          <PreferenceCard icon={KeyRound} title="Access policy" body="Use signed sessions now, then connect enterprise SSO before production customer rollout." items={[config.authConfigured ? `SSO provider: ${config.authProvider}` : "SSO provider not configured", config.sessionConfigured ? "Session secret configured" : "Demo session secret fallback", config.connectorWebhookProtected ? "Connector webhook secret enabled" : "Connector webhook secret missing"]} />
        </section>

        <section className="mt-6">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <div>
                <h2 className="font-medium">Plan comparison</h2>
                <p className="text-sm text-muted-foreground">Free demo remains open for hackathon judging. Customers can upgrade when they need production connectors and higher credits.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLANS.map((plan) => (
                  <Button key={plan.key} render={<Link href={plan.key === activePlan.key ? "/settings" : `/signup?plan=${plan.key}`}>{plan.name}</Link>} variant={plan.key === activePlan.key ? "default" : "secondary"} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

function StatusCard({ icon: Icon, label, value, detail }: { icon: typeof Settings; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-mono text-lg font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  )
}

function SettingChoice({ title, body, active }: { title: string; body: string; active: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <CheckCircle2 className={active ? "mt-0.5 h-4 w-4 shrink-0 text-success" : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"} />
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">{title}</h2>
          <Badge variant={active ? "secondary" : "outline"}>{active ? "On" : "Available on upgrade"}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function PreferenceCard({ icon: Icon, title, body, items }: { icon: typeof Settings; title: string; body: string; items: string[] }) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </div>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
