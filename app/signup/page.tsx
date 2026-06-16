import Link from "next/link"
import { Check, CreditCard, Database, Factory, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckoutButton } from "@/components/checkout-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteHeader } from "@/components/site-header"
import { PLANS, getPlan } from "@/lib/plans"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Sign Up — RecallZero",
  description: "Create a RecallZero workspace and choose a plan.",
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}) {
  const params = await searchParams
  const selectedPlan = getPlan(params?.plan)

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <section className="mb-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <CreditCard className="h-3.5 w-3.5" />
              Create workspace
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
                Start free, then scale recall decisions with credits.
              </h1>
              <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
                Review users can start free. Customers register a workspace, choose Pilot, Program, or Enterprise, then configure connector lanes and usage controls.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TrustPill icon={ShieldCheck} label="Audit trail" />
              <TrustPill icon={Database} label="DynamoDB storage" />
              <TrustPill icon={Factory} label="Connector setup" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>Workspace details</CardTitle>
                  <p className="text-sm text-muted-foreground">Selected plan: {selectedPlan.name}</p>
                </div>
                <Badge variant={selectedPlan.key === "free" ? "secondary" : "default"}>{selectedPlan.credits}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5">
              <form className="grid gap-4" data-signup-form>
                <div className="grid gap-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" placeholder="Quality lead" autoComplete="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Acme Foods" autoComplete="organization" />
                </div>
                <CheckoutButton planKey={selectedPlan.key} />
              </form>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Free review workspaces activate immediately. Paid plans use Stripe Checkout when production billing keys are configured, with simulated checkout available for review mode.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={cn(
                "relative flex flex-col",
                selectedPlan.key === plan.key && "border-primary/60 shadow-lg shadow-primary/5",
              )}
            >
              <CardContent className="flex flex-1 flex-col gap-5 pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{plan.name}</h2>
                    {plan.featured && <Badge>Popular</Badge>}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="font-mono text-2xl font-semibold">{plan.price}</span>
                    <span className="pb-0.5 text-sm text-muted-foreground">{plan.cadence}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.credits}</p>
                </div>
                <ul className="flex flex-1 flex-col gap-2">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  render={<Link href={`/signup?plan=${plan.key}`}>{selectedPlan.key === plan.key ? "Selected" : plan.cta}</Link>}
                  variant={selectedPlan.key === plan.key ? "default" : "secondary"}
                  className="w-full"
                />
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}

function TrustPill({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
  )
}
