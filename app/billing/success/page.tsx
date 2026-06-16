import Link from "next/link"
import { ArrowRight, CheckCircle2, CreditCard, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { upsertWorkspace } from "@/lib/db"
import { getPlan } from "@/lib/plans"
import { getCurrentSession } from "@/lib/workspace-context"

export const metadata = {
  title: "Billing Complete — RecallZero",
  description: "RecallZero workspace plan activation.",
}

export const dynamic = "force-dynamic"

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; checkout?: string; session_id?: string; workspace?: string }>
}) {
  const params = await searchParams
  const plan = getPlan(params?.plan)
  const session = await getCurrentSession()
  if (!session) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-12 md:px-6">
          <Card className="w-full">
            <CardContent className="grid gap-4 pt-8 text-center">
              <h1 className="text-2xl font-semibold">Sign in to activate a workspace plan.</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Plan activation must be tied to a signed workspace session so credits and billing stay attached to the right customer.
              </p>
              <Button render={<Link href={`/signin?next=/billing/success?plan=${plan.key}`}>Sign in</Link>} className="mx-auto" />
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }
  const workspaceId = session.workspaceId
  await upsertWorkspace(plan.key, workspaceId)
  const demoCheckout = params?.checkout === "demo"
  const salesCheckout = params?.checkout === "sales"

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-12 md:px-6">
        <Card className="w-full border-primary/40 bg-primary/5">
          <CardContent className="grid gap-6 pt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              {salesCheckout ? <Settings className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </div>
            <div className="space-y-3">
              <Badge variant="secondary" className="mx-auto">
                {demoCheckout ? "Demo checkout" : salesCheckout ? "Sales follow-up" : "Payment complete"}
              </Badge>
              <h1 className="text-balance text-3xl font-semibold md:text-4xl">
                {salesCheckout ? "Enterprise workspace request received." : `${plan.name} workspace activated.`}
              </h1>
              <p className="mx-auto max-w-2xl text-pretty leading-relaxed text-muted-foreground">
                {salesCheckout
                  ? "Enterprise plans use custom credits, connector scope, SSO, and data residency. The workspace can continue in setup mode while the commercial agreement is finalized."
                  : `Your workspace now has ${plan.credits}. Configure connectors, invite your team, and start routing recall signals into the cockpit.`}
              </p>
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-background/70 p-4 text-left sm:grid-cols-3">
              <SummaryItem label="Plan" value={plan.name} />
              <SummaryItem label="Credits" value={plan.credits} />
              <SummaryItem label="Checkout" value={demoCheckout ? "Simulated" : salesCheckout ? "Quote" : "Stripe"} />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button render={<Link href="/setup">Open setup<ArrowRight className="h-4 w-4" /></Link>} className="gap-1.5" />
              <Button render={<Link href="/settings">Plan settings</Link>} variant="secondary" />
              <Button render={<Link href="/connectors?mode=configure">Configure connectors</Link>} variant="secondary" />
            </div>
            <p className="text-xs text-muted-foreground">
              <CreditCard className="mr-1 inline h-3.5 w-3.5" />
              In production mode this page follows Stripe Checkout. In demo mode it simulates activation for judges and customer walkthroughs.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}
