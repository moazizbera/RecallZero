"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  Activity,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Factory,
  FileWarning,
  KeyRound,
  LockKeyhole,
  RadioTower,
  ServerCog,
  Sparkles,
  Truck,
  Users,
  Workflow,
} from "lucide-react"
import { BrandLockup, BrandMark } from "@/components/brand-logo"

const stages = ["Validate signal", "Map lot exposure", "Score delay risk", "Surface missing evidence", "Prepare audit trail"]
const signalArcs = [
  { label: "Supplier inbox", x: "7%", y: "23%", delay: "0s" },
  { label: "QA alert", x: "18%", y: "55%", delay: "0.35s" },
  { label: "ERP lots", x: "74%", y: "20%", delay: "0.7s" },
  { label: "Complaints", x: "82%", y: "54%", delay: "1.05s" },
]

const featurePanels = [
  {
    icon: <Workflow className="h-5 w-5" />,
    title: "Triage under uncertainty",
    body: "Every result explains what the system knows, what it does not know, and why the current posture is only an initial operating decision.",
  },
  {
    icon: <RadioTower className="h-5 w-5" />,
    title: "Four evidence lanes",
    body: "Supplier inbox, QA systems, ERP lot traceability, and returns or complaints feed into the same incident record.",
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Delay-risk scoring",
    body: "RecallZero separates evidence confidence from delay risk, so teams see when waiting becomes the dangerous option.",
  },
]

const securityPanels = [
  { icon: <LockKeyhole className="h-5 w-5" />, title: "Tenant workspaces", body: "Signed sessions map users to isolated workspace partitions for incidents, credits, and connector configuration." },
  { icon: <KeyRound className="h-5 w-5" />, title: "Secret references", body: "Connector setup stores secret references, not raw credentials, keeping the product ready for a managed vault." },
  { icon: <Database className="h-5 w-5" />, title: "Audit trail", body: "Every intake, posture change, follow-up, operator action, and export is written to persistent DynamoDB records." },
]

const productionSignals = [
  "DynamoDB persistence live",
  "Stripe-ready billing flow",
  "Credit controls enforced",
  "Connector webhooks available",
  "Production readiness endpoint",
]

function shouldShowSplash(skip = false) {
  if (skip) return false
  if (typeof window === "undefined") return true
  const hasSignal = new URLSearchParams(window.location.search).has("signal")
  return !hasSignal
}

export function SplashScreen({ children, skip = false }: { children: ReactNode; skip?: boolean }) {
  const [visible, setVisible] = useState(() => shouldShowSplash(skip))
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    const stageTimer = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % stages.length)
    }, 560)

    return () => {
      window.clearInterval(stageTimer)
    }
  }, [skip])

  if (!visible) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="recall-panorama fixed inset-0" />
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.62))]" />
      <div className="fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[54px_54px] opacity-[0.14]" />
      <div className="recall-scanline fixed inset-x-0 top-0 h-px bg-primary/70" />

      <main className="relative z-10 px-5 py-10">
        <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-8">
            <div className="recall-reveal inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_18%,transparent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Customer-grade recall intelligence
            </div>

            <div className="recall-reveal space-y-4 [animation-delay:120ms]">
              <div className="flex items-center gap-3">
                <BrandMark animated className="h-14 w-14 shrink-0" />
                <div className="min-w-0">
                  <BrandLockup animated markClassName="hidden" className="mb-3" />
                  <h1 className="text-balance text-4xl font-semibold leading-none tracking-tight md:text-6xl">
                    From first signal to defensible action.
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
                RecallZero turns supplier emails, QA alerts, ERP lots, and complaints into transparent triage: what we know, what is missing, how delay changes risk, and which action is safest now.
              </p>
            </div>

            <div className="recall-reveal grid max-w-2xl gap-3 sm:grid-cols-3 [animation-delay:220ms]">
              <SignalTile icon={<RadioTower className="h-4 w-4" />} label="Sources" value="4 evidence lanes" />
              <SignalTile icon={<Activity className="h-4 w-4" />} label="Triage" value="Confidence explained" />
              <SignalTile icon={<Database className="h-4 w-4" />} label="Audit" value="Tenant-scoped record" />
            </div>

            <div className="recall-reveal flex flex-wrap items-center gap-3 [animation-delay:320ms]">
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Start RecallZero
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
              <a href="#splash-panorama" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-3 text-sm font-medium text-muted-foreground backdrop-blur transition hover:text-foreground">
                Explore product panorama
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="recall-reveal relative min-h-136 overflow-hidden rounded-2xl border border-border bg-card/60 shadow-2xl shadow-black/35 backdrop-blur [animation-delay:180ms]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_42%)]" />
            <div className="absolute inset-x-8 top-8 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span>Evidence panorama</span>
              <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-success">Live</span>
            </div>

            <div className="recall-orbit absolute left-1/2 top-[42%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25" />
            <div className="absolute left-1/2 top-[42%] z-10 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-primary/50 bg-background/80 text-center shadow-[0_0_80px_color-mix(in_oklab,var(--primary)_24%,transparent)] backdrop-blur">
              <BrandMark animated className="mb-2 h-14 w-14" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">RecallZero</p>
              <p className="mt-1 text-sm font-semibold">Triage core</p>
            </div>

            {signalArcs.map((arc, index) => (
              <div key={arc.label} className="absolute z-10 max-sm:hidden" style={{ left: arc.x, top: arc.y }}>
                <div className="recall-node" style={{ animationDelay: arc.delay }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    {index === 0 ? <Factory className="h-4 w-4" /> : index === 1 ? <FileWarning className="h-4 w-4" /> : index === 2 ? <Truck className="h-4 w-4" /> : <RadioTower className="h-4 w-4" />}
                  </span>
                  <span className="mt-2 block whitespace-nowrap rounded-md border border-border bg-background/75 px-2 py-1 text-xs font-medium backdrop-blur">{arc.label}</span>
                </div>
              </div>
            ))}

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className="recall-flow" d="M13 27 C28 32 36 39 50 42" />
              <path className="recall-flow" d="M23 59 C35 54 39 47 50 42" />
              <path className="recall-flow" d="M77 24 C67 31 60 38 50 42" />
              <path className="recall-flow" d="M86 58 C72 54 63 45 50 42" />
            </svg>

            <div className="absolute inset-x-5 bottom-5 z-30 rounded-xl border border-border bg-background/88 p-4 shadow-2xl shadow-black/25 backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Decision pipeline</p>
                  <p className="mt-1 text-sm font-medium">Triage under uncertainty</p>
                </div>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {stages.map((stage, index) => {
                  const active = index === stageIndex
                  return (
                    <div key={stage} className={`rounded-lg border px-2.5 py-2 transition-all duration-300 ${active ? "border-primary/70 bg-primary/12 text-foreground" : "border-border bg-secondary/35 text-muted-foreground"}`}>
                      <p className="font-mono text-[10px]">0{index + 1}</p>
                      <p className="mt-1 text-xs font-medium leading-snug">{stage}</p>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-full origin-left animate-[recallzero-load_4.2s_ease-out_forwards] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </section>

        <section id="splash-panorama" className="mx-auto grid w-full max-w-7xl gap-6 py-12 md:py-16">
          <div className="recall-reveal max-w-3xl space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Product panorama</p>
            <h2 className="text-balance text-3xl font-semibold md:text-5xl">Built to make the first customer conversation feel real.</h2>
            <p className="text-pretty leading-relaxed text-muted-foreground">
              Customers see more than a demo. They see how RecallZero receives evidence, explains uncertainty, protects workspaces, controls usage, and prepares the operating record for production.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {featurePanels.map((panel, index) => (
              <PanoramaCard key={panel.title} icon={panel.icon} title={panel.title} body={panel.body} delay={index * 90} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="recall-glass-panel rounded-2xl border border-border bg-card/62 p-5 backdrop-blur">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">Security posture</p>
                  <h3 className="mt-1 text-xl font-semibold">Trust signals customers ask for first</h3>
                </div>
                <LockKeyhole className="h-5 w-5 text-primary" />
              </div>
              <div className="grid gap-3">
                {securityPanels.map((panel, index) => (
                  <div key={panel.title} className="recall-security-row flex items-start gap-3 rounded-xl border border-border bg-background/55 p-4" style={{ animationDelay: `${index * 140}ms` }}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{panel.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{panel.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{panel.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="recall-glass-panel relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/8 p-5 backdrop-blur">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Production readiness</p>
                    <h3 className="mt-1 text-xl font-semibold">Ready to move from judge demo to customer pilot</h3>
                  </div>
                  <ServerCog className="h-5 w-5 text-primary" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {productionSignals.map((signal) => (
                    <div key={signal} className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {signal}
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <SignalTile icon={<Users className="h-4 w-4" />} label="Workspace" value="Tenant scoped" />
                  <SignalTile icon={<CreditCard className="h-4 w-4" />} label="Plans" value="Credits enforced" />
                  <SignalTile icon={<ServerCog className="h-4 w-4" />} label="Mode" value="Demo / production" />
                </div>
              </div>
            </div>
          </div>

          <div className="recall-reveal flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-background/72 p-5 backdrop-blur">
            <div>
              <p className="text-sm font-semibold">Start the cockpit when you are ready.</p>
              <p className="mt-1 text-sm text-muted-foreground">The splash stays open for exploration and only enters the product when the user clicks.</p>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Start RecallZero
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function PanoramaCard({ icon, title, body, delay }: { icon: ReactNode; title: string; body: string; delay: number }) {
  return (
    <div className="recall-feature-card rounded-2xl border border-border bg-card/62 p-5 backdrop-blur" style={{ animationDelay: `${delay}ms` }}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_18px_55px_color-mix(in_oklab,var(--primary)_22%,transparent)]">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function SignalTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/55 p-4 backdrop-blur">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary">{icon}</div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
