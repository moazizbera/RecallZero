import Link from "next/link";

import { JudgeSummaryButton } from "@/components/judge-summary-button";
import { formatActivityTimestamp } from "@/lib/activity-log";
import {
  getBackendReadiness,
  getCurrentDatasetStatus,
  getDashboardSnapshot,
  getImportActivity,
} from "@/lib/recall-repository";

export default async function JudgePage() {
  const [snapshot, currentDataset, readiness, activity] = await Promise.all([
    getDashboardSnapshot(),
    getCurrentDatasetStatus(),
    getBackendReadiness(),
    getImportActivity(),
  ]);
  const featuredIncident = snapshot.incidents[0];
  const latestActivity = activity[0] ?? null;
  const judgeSummary = `RecallZero is running on ${currentDataset.storageLabel} with dataset state '${currentDataset.label}'. There are ${snapshot.incidents.length} active incidents, ${snapshot.kpis[1]?.value ?? "0"} affected orders, and ${snapshot.kpis[2]?.value ?? "$0"} revenue at risk. The latest operator activity is ${latestActivity ? `${latestActivity.action} at ${formatActivityTimestamp(latestActivity.timestamp)}` : "not yet recorded"}.`;
  const proofLinks = [
    { title: "Dashboard", href: "/" },
    { title: "Import center", href: "/import" },
    { title: "Readiness JSON", href: "/api/system/readiness" },
    { title: "War room", href: `/incidents/${featuredIncident.id}` },
  ];
  const demoFlow = [
    "Open the dashboard and frame incident volume, affected orders, and revenue at risk.",
    "Show the import center readiness card to prove the live backend posture.",
    "Run one demo reset or import and point to the updated activity log.",
    "Open the war room and close on traceability, tasks, and audit evidence.",
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
      <section className="overflow-hidden rounded-4xl border border-line bg-surface shadow-[0_24px_80px_rgba(73,40,24,0.08)]">
        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-white">
                Judge mode
              </span>
              <span className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                {currentDataset.storageLabel}
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tighter lg:text-6xl">
              One page for the story, proof, and live walkthrough.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted lg:text-lg">
              Use this page as the operator script for judges: product framing,
              live backend posture, proof links, and the shortest path through the demo.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <JudgeSummaryButton summary={judgeSummary} />
              <Link
                href="/import"
                className="inline-flex items-center justify-center rounded-full border border-line bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                Open import center
              </Link>
              <Link
                href={`/incidents/${featuredIncident.id}`}
                className="inline-flex items-center justify-center rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-strong"
              >
                Open war room
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-[linear-gradient(180deg,#241916_0%,#2d1f1b_100%)] p-5 text-white">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#efb183]">
              Demo scoreboard
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Incidents", `${snapshot.incidents.length}`],
                ["Affected orders", `${snapshot.kpis[1]?.value ?? "0"}`],
                ["Revenue risk", `${snapshot.kpis[2]?.value ?? "$0"}`],
                ["Backend", currentDataset.storageLabel],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tighter">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-[#f7b289]/20 bg-[#f7b289]/8 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd4bd]">
                Current dataset
              </p>
              <p className="mt-3 text-sm font-semibold text-[#fff1e5]">{currentDataset.label}</p>
              <p className="mt-2 text-sm leading-6 text-[#fff1e5]">{currentDataset.detail}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel-shell panel-shell-surface">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Proof links
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Open these during judging
          </h2>
          <div className="mt-6 grid gap-4 content-scroll">
            {proofLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </article>

        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Backend readiness
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            What counts as proof
          </h2>
          <div className="mt-6 space-y-4 content-scroll">
            {readiness.checks.map((check) => (
              <div key={check.label} className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{check.label}</p>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${check.status === "ready" ? "border-[#b8dfc8] bg-[#e9f7ef] text-[#1f6b45]" : "border-[#f0c5ae] bg-[#fbefe8] text-accent"}`}>
                    {check.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{check.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Demo flow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Three-minute walkthrough
          </h2>
          <div className="mt-6 space-y-4 content-scroll">
            {demoFlow.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[1.3rem] border border-line bg-surface px-4 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe3d3] font-mono text-xs font-semibold text-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-shell panel-shell-surface">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Latest activity
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Live response evidence
          </h2>
          <div className="mt-6 space-y-4 content-scroll">
            {activity.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{entry.action}</p>
                  <span className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    {entry.storageLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{entry.detail}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  {formatActivityTimestamp(entry.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}