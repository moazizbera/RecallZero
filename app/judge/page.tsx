import Link from "next/link"
import { Award, CheckCircle2, Clock, Database, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { JudgeAccessForm } from "@/components/judge-access-form"
import { SiteHeader } from "@/components/site-header"

export const metadata = {
  title: "Judge Access — RecallZero",
  description: "Controlled judge access to the RecallZero product review workspace.",
}

export default function JudgePage() {
  const requiresCode = Boolean(process.env.RECALLZERO_JUDGE_ACCESS_CODE)

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col gap-5">
          <Badge variant="secondary" className="w-fit gap-1.5">
            <Award className="h-3.5 w-3.5" />
            Special judge address
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
              Welcome to RecallZero, the recall decision cockpit built as a real product.
            </h1>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
              Judges get a controlled review workspace with live DynamoDB persistence, connector workflows, credits, incidents, audit exports, and a guided five-minute brief. Customer and admin areas remain managed separately.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TrustPill icon={Database} label="Live storage" />
            <TrustPill icon={Clock} label="Fast demo path" />
            <TrustPill icon={ShieldCheck} label="Managed access" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/brief">Read product brief</Link>} variant="secondary" />
            <Button render={<Link href="/pricing">View plans</Link>} variant="secondary" />
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md border-primary/35 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Open judge workspace</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {requiresCode ? "Enter the access code provided with the submission." : "One-click access is enabled for the review workspace."}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <JudgeAccessForm requiresCode={requiresCode} />
            <div className="grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="leading-relaxed">
                This creates a temporary reviewer session for the judge workspace. Product administration stays in `/admin` for signed workspace admins.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function TrustPill({ icon: Icon, label }: { icon: typeof Database; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
  )
}
