import Link from "next/link"
import { ArrowRight, CheckCircle2, Database, GitBranch, RadioTower, ShieldAlert, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { getAppConfig } from "@/lib/app-config"
import { CONNECTORS } from "@/lib/connectors"
import { listIncidents } from "@/lib/db"

export const metadata = {
  title: "Judge Brief — RecallZero",
  description: "A concise live product brief for the RecallZero review workspace.",
}

export const dynamic = "force-dynamic"

export default async function BriefPage() {
  const config = getAppConfig()
  const incidents = await listIncidents()
  const liveConnectors = CONNECTORS.filter((connector) => connector.status === "live")
  const activate = incidents.filter((incident) => incident.decision.posture === "ACTIVATE").length
  const escalated = incidents.filter((incident) => incident.status === "ESCALATED").length

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {config.demoMode ? "Hackathon judge brief" : "Production deployment brief"}
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
                RecallZero turns recall chaos into a defensible decision before delay becomes the bigger risk.
              </h1>
              <p className="max-w-3xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
                Food, wellness, and regulated commerce teams do not lose only because they recall too late.
                They lose because supplier emails, QA notes, ERP movement, and complaint data arrive separately.
                RecallZero unifies those signals, recommends a posture, and records the audit trail a compliance team can defend.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button render={<Link href="/connectors">{config.demoMode ? "Start live demo" : "Open connectors"}<ArrowRight className="h-4 w-4" /></Link>} className="gap-1.5" />
              <Button render={<Link href="/dashboard">View dashboard</Link>} variant="secondary" />
            </div>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="grid gap-4 pt-5">
              <Metric icon={Database} label="System of record" value="DynamoDB live" />
              <Metric icon={RadioTower} label="Connected lanes" value={`${liveConnectors.length} live`} />
              <Metric icon={ShieldAlert} label="Incident records" value={`${incidents.length} active`} />
              <Metric icon={Timer} label="Activate calls" value={`${activate} flagged`} />
            </CardContent>
          </Card>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <ProofCard
            title="Not another dashboard"
            body="The cockpit makes the decision: activate, hold, or reject, with confidence, evidence gaps, flip conditions, and delay risk."
          />
          <ProofCard
            title="Connectors are live"
            body="Supplier inbox, QA system, ERP lot traceability, and returns complaints each return routeable incident signals."
          />
          <ProofCard
            title="Defensible by design"
            body="Every incident writes status, operator action, follow-up evidence, and exportable audit packets to persistent storage."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Winning angle</p>
                <h2 className="mt-1 text-xl font-semibold">Why this matters now</h2>
              </div>
              <ul className="grid gap-3 text-sm leading-relaxed text-muted-foreground">
                {[
                  "Recall decisions are high-cost, time-sensitive, and evidence-fragmented.",
                  "Existing tools track tasks after the decision; RecallZero supports the decision itself.",
                  "The app demonstrates full-stack execution: Next.js, live APIs, AWS DynamoDB, Vercel deployment, and operational workflows.",
                  `${escalated} incident${escalated === 1 ? "" : "s"} currently escalated, showing the lifecycle beyond first analysis.`,
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended demo path</p>
                <h2 className="mt-1 text-xl font-semibold">Five minutes, end to end</h2>
              </div>
              <div className="grid gap-3">
                {[
                  ["1", "Open Connectors", "Pull ERP lot traceability or returns complaints."],
                  ["2", "Route to Cockpit", "Show messy operational evidence becoming a structured recall posture."],
                  ["3", "Analyze", "Point out confidence, evidence gaps, flip conditions, and delay trajectory."],
                  ["4", "Open incident", "Change status, add operator action, and show the audit timeline."],
                  ["5", "End on Dashboard", "Show live exposure, posture mix, and DynamoDB-backed incident state."],
                ].map(([step, title, body]) => (
                  <div key={step} className="grid grid-cols-[2rem_1fr] gap-3 rounded-lg border border-border bg-secondary/25 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-foreground">
                      {step}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/70 p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

function ProofCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
