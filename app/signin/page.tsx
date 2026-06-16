import Link from "next/link"
import { Building2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AuthForm } from "@/components/auth-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { getAppConfig } from "@/lib/app-config"

export const metadata = {
  title: "Sign In — RecallZero",
  description: "Production sign-in gateway for RecallZero.",
}

export const dynamic = "force-dynamic"

export default function SignInPage() {
  const config = getAppConfig()
  const readyForAuth = config.signInEnabled && config.authConfigured

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <LockKeyhole className="h-3.5 w-3.5" />
            Production access
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
              Sign in to the recall decision cockpit.
            </h1>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
              Existing customers sign in to manage credits, connectors, incidents, and audit exports. New teams can start with a free review workspace and upgrade when they need production connectors.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TrustPill icon={ShieldCheck} label="Audit-safe" />
            <TrustPill icon={Building2} label="Enterprise SSO" />
            <TrustPill icon={KeyRound} label="Role ready" />
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Account sign in</CardTitle>
                <p className="text-sm text-muted-foreground">Use the configured identity provider or create a signed workspace session.</p>
              </div>
              <Badge variant="secondary">
                {readyForAuth ? config.authProvider : "Signed session"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <AuthForm />

            {!readyForAuth && (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">
                This review build creates a signed RecallZero workspace session. Customer deployments can connect the same flow to Azure AD, Auth0, Cognito, or another SSO provider.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">New to RecallZero?</span>
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create workspace
              </Link>
            </div>
          </CardContent>
        </Card>
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
