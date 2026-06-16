import { SiteHeader } from "@/components/site-header"
import { DecisionCockpit } from "@/components/decision-cockpit"
import { BeforeAfter } from "@/components/before-after"
import { SplashScreen } from "@/components/splash-screen"

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ signal?: string; skipSplash?: string }>
}) {
  const params = await searchParams
  const initialSignal = params?.signal
  const skipSplash = Boolean(initialSignal) || params?.skipSplash === "1"

  return (
    <SplashScreen skip={skipSplash}>
      <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <section className="mb-8 flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Recall & incident decisioning
          </span>
          <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
            Turn messy recall signals into a clear, defensible next action.
          </h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
            A delayed or wrong recall call can cost millions in regulatory fines, liability, and brand
            damage. RecallZero reads partial supplier, QA, and operations signals and returns a posture,
            confidence, what evidence is missing, and how delay changes the risk — with an audit trail
            your compliance team can defend.
          </p>
        </section>

        <DecisionCockpit initialSignal={initialSignal} />

        <BeforeAfter />
      </main>
      </div>
    </SplashScreen>
  )
}
