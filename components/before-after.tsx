import { Clock, FileWarning, Mailbox, ShieldCheck, Sparkles, GitCommitVertical } from "lucide-react"

const BEFORE = [
  {
    icon: Mailbox,
    title: "Signal lost in inboxes",
    body: "A supplier email, a QA flag, and a complaint sit in three different inboxes. No one owns the call.",
  },
  {
    icon: Clock,
    title: "Days of back-and-forth",
    body: "Quality, legal, and ops trade threads and spreadsheets for 2–3 days while product stays on shelves.",
  },
  {
    icon: FileWarning,
    title: "Indefensible under audit",
    body: "When a regulator asks why you waited, there is no timestamped record of what was known and when.",
  },
]

const AFTER = [
  {
    icon: Sparkles,
    title: "One signal in, one decision out",
    body: "Paste any messy signal and get a posture, confidence, evidence gaps, and delay risk in seconds.",
  },
  {
    icon: GitCommitVertical,
    title: "Evolves with the incident",
    body: "New lab results or complaints fold in and the recommendation updates — every change logged.",
  },
  {
    icon: ShieldCheck,
    title: "Defensible by default",
    body: "An immutable, exportable audit packet shows exactly what was known, recommended, and decided.",
  },
]

export function BeforeAfter() {
  return (
    <section className="mt-16 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-balance text-2xl font-semibold md:text-3xl">
          From a 3-day scramble to a 90-second decision
        </h2>
        <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          The cost of a recall is rarely the product — it&apos;s the time spent deciding and the
          inability to defend the call later. Here&apos;s the shift.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Before */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/20 p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Today
            </span>
            <span className="text-sm font-medium text-muted-foreground">Manual, slow, undefensible</span>
          </div>
          <ul className="flex flex-col gap-4">
            {BEFORE.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{item.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* After */}
        <div className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/5 p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-primary">
              With RecallZero
            </span>
            <span className="text-sm font-medium">Decision-grade, instant, auditable</span>
          </div>
          <ul className="flex flex-col gap-4">
            {AFTER.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{item.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
