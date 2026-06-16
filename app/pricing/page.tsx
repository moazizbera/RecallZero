import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { PLANS } from "@/lib/plans"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Pricing — RecallZero",
  description: "Decision-grade recall response, priced by program scope.",
}

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Pricing
          </span>
          <h1 className="text-balance text-3xl font-semibold md:text-4xl">
            A wrong recall call costs millions. Decision speed is cheap.
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Start with free demo credits, then choose a paid workspace when you need production connectors, team controls, and higher monthly decision volume.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {PLANS.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative flex flex-col",
                tier.featured && "border-primary/60 shadow-lg shadow-primary/5",
              )}
            >
              <CardContent className="flex flex-1 flex-col gap-6 pt-8">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold">{tier.name}</h2>
                  <div className="flex items-end gap-1">
                    <span className="font-mono text-3xl font-semibold">{tier.price}</span>
                    <span className="pb-1 text-sm text-muted-foreground">{tier.cadence}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tier.blurb}</p>
                  <p className="font-mono text-sm text-primary">{tier.credits}</p>
                </div>

                <ul className="flex flex-1 flex-col gap-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  render={
                    <Link href={`/signup?plan=${tier.key}`}>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  }
                  variant={tier.featured ? "default" : "secondary"}
                  className="w-full gap-1.5"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
