import Link from "next/link";

import { CsvImportForm } from "@/components/csv-import-form";
import { ImportSeedButton } from "@/components/import-seed-button";
import { SourceGenerationCard } from "@/components/source-generation-card";
import { formatActivityTimestamp, getActivityAccent } from "@/lib/activity-log";
import {
  getBackendReadiness,
  getImportActivity,
  getImportSummary,
} from "@/lib/recall-repository";

export default async function ImportPage() {
  const summary = await getImportSummary();
  const activity = await getImportActivity();
  const readiness = getBackendReadiness();
  const activityPreview = activity.slice(0, 4);
  const importScrollAreaClass = "content-scroll";
  const proofAssets = [
    {
      title: "Dashboard hero",
      detail: "Capture KPIs, the active dataset, recent activity, and the incident pulse panel.",
      href: "/",
      hrefLabel: "Open dashboard",
    },
    {
      title: "Import center",
      detail: "Capture the current data posture, readiness status, import tools, and activity log together.",
      href: "/import",
      hrefLabel: "Refresh import center",
    },
    {
      title: "Backend proof",
      detail: "Capture the JSON readiness endpoint or the import-page readiness card after AWS env vars are configured.",
      href: "/api/system/readiness",
      hrefLabel: "Open readiness endpoint",
    },
    {
      title: "Incident war room",
      detail: "Capture one high-severity incident with locations, tasks, and timeline evidence visible.",
      href: "/incidents/INC-240601-A",
      hrefLabel: "Open sample war room",
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
      <section className="overflow-hidden rounded-4xl border border-line bg-surface shadow-[0_24px_80px_rgba(73,40,24,0.08)]">
        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-white">
                Import center
              </span>
              <span className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                {summary.storageLabel}
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tighter lg:text-6xl">
              Load recall operations into a real AWS-backed database.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted lg:text-lg">
              Seed incidents, locations, tasks, metrics, and timelines through the
              same repository layer the product already uses.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ImportSeedButton />
              <Link
                href="/judge"
                className="inline-flex items-center justify-center rounded-full border border-line bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                Open judge mode
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-strong"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-[linear-gradient(180deg,#241916_0%,#2d1f1b_100%)] p-5 text-white">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#efb183]">
              Current data posture
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Incidents", `${summary.incidentCount}`],
                ["Tasks", `${summary.taskCount}`],
                ["Locations", `${summary.locationCount}`],
                ["Queued notifications", `${summary.notificationCount}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tighter">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-[#f7b289]/20 bg-[#f7b289]/8 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd4bd]">
                Environment requirement
              </p>
              <p className="mt-3 text-sm leading-6 text-[#fff1e5]">
                {summary.databaseConfigured
                  ? `${summary.storageLabel} is configured. Seeding and CSV imports now write into the persistent backend.`
                  : "Add DynamoDB or Aurora configuration to move from fallback mode to persistent AWS-backed data."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Import workflow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            What the seed operation writes
          </h2>
          <div className={`mt-6 grid gap-4 ${importScrollAreaClass}`}>
            {[
              "Incident headers with severity, supplier, lot, and exposure",
              "Metrics for response speed, isolation, and order coverage",
              "Locations with owners and lock status",
              "Task queues and timeline events",
              "Architecture notes for the database story",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.3rem] border border-line bg-surface px-4 py-4 text-sm leading-6 text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="panel-shell panel-shell-surface">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Deployment checklist
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            AWS database setup
          </h2>
          <div className={`mt-6 space-y-4 ${importScrollAreaClass}`}>
            {[
              "Pick one primary AWS backend: DynamoDB for fastest proof or Aurora PostgreSQL for the relational path.",
              "Set DYNAMODB_TABLE_NAME plus AWS_REGION, or set DATABASE_URL locally and in Vercel.",
              "If you choose Aurora, run prisma db push to provision the schema.",
              "Return here and seed the demo dataset.",
            ].map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.3rem] border border-line bg-white/70 px-4 py-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe3d3] font-mono text-xs font-semibold text-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="panel-shell panel-shell-surface">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Backend proof
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Screenshot-ready readiness status
          </h2>
          <div className={`mt-6 space-y-4 ${importScrollAreaClass}`}>
            <div className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-foreground">Active backend</p>
                <span className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  {readiness.storageLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {readiness.databaseConfigured
                  ? "The app is currently wired to an AWS-backed database path."
                  : "The app is still in fallback mode until one AWS database path is configured."}
              </p>
            </div>

            {readiness.checks.map((check) => (
              <div
                key={check.label}
                className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{check.label}</p>
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${
                      check.status === "ready"
                        ? "border-[#b8dfc8] bg-[#e9f7ef] text-[#1f6b45]"
                        : "border-[#f0c5ae] bg-[#fbefe8] text-accent"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{check.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Judge artifact
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            API proof endpoint
          </h2>
          <div className={`mt-6 space-y-4 ${importScrollAreaClass}`}>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4 text-sm leading-6 text-muted">
              Use <span className="font-mono text-foreground">/api/system/readiness</span> as a clean screenshot or browser proof of the configured backend state.
            </div>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4 text-sm leading-6 text-muted">
              It returns the active storage label, whether an AWS database path is configured, and the environment readiness checks judges care about.
            </div>
            <a
              href="/api/system/readiness"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-semibold text-accent underline decoration-transparent hover:decoration-current"
            >
              Open readiness endpoint
            </a>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={importScrollAreaClass}>
          <CsvImportForm />
        </div>

        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            CSV templates
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Expected columns for quick imports
          </h2>
          <div className={`mt-6 space-y-4 text-sm leading-6 text-muted ${importScrollAreaClass}`}>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              <p className="font-semibold text-foreground">Incidents CSV</p>
              <p className="mt-2 font-mono text-xs text-muted">
                incident_id,title,summary,supplier,supplier_lot,severity,affected_skus,affected_orders,affected_locations,impacted_revenue,compliance_state,notifications_queued
              </p>
              <a
                href="/templates/incidents-template.csv"
                className="mt-3 inline-flex text-sm font-semibold text-accent underline decoration-transparent hover:decoration-current"
              >
                Download incidents template
              </a>
            </div>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              <p className="font-semibold text-foreground">Locations CSV</p>
              <p className="mt-2 font-mono text-xs text-muted">
                incident_id,name,type,region,status,affected_units,owner,sort_order
              </p>
              <a
                href="/templates/locations-template.csv"
                className="mt-3 inline-flex text-sm font-semibold text-accent underline decoration-transparent hover:decoration-current"
              >
                Download locations template
              </a>
            </div>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              <p className="font-semibold text-foreground">Tasks CSV</p>
              <p className="mt-2 font-mono text-xs text-muted">
                incident_id,task_id,title,team,due_in,status,assignee,sort_order
              </p>
              <a
                href="/templates/tasks-template.csv"
                className="mt-3 inline-flex text-sm font-semibold text-accent underline decoration-transparent hover:decoration-current"
              >
                Download tasks template
              </a>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={importScrollAreaClass}>
          <SourceGenerationCard />
        </div>

        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Source template
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Generate incidents from exposure data
          </h2>
          <div className={`mt-6 space-y-4 text-sm leading-6 text-muted ${importScrollAreaClass}`}>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              Upload one row per supplier lot exposure with product family, impacted orders, locations, and revenue risk.
            </div>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              RecallZero converts each row into a full incident object with metrics, locations, tasks, and timeline events.
            </div>
            <a
              href="/templates/source-incident-template.csv"
              className="inline-flex text-sm font-semibold text-accent underline decoration-transparent hover:decoration-current"
            >
              Download source incident template
            </a>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Activity log
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Latest demo activity
          </h2>
          <div className={`mt-6 space-y-4 ${importScrollAreaClass}`}>
            {activityPreview.length > 0 ? (
              activityPreview.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-[1.3rem] border px-4 py-4 ${getActivityAccent(entry.action).card}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{entry.action}</p>
                    <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${getActivityAccent(entry.action).badge}`}>
                      {entry.storageLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{entry.detail}</p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    {formatActivityTimestamp(entry.timestamp)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4 text-sm leading-6 text-muted">
                No import activity yet. Seed the demo dataset or upload a CSV to start the log.
              </div>
            )}
          </div>
        </article>

        <article className="panel-shell panel-shell-surface">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Operator notes
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            What judges can see now
          </h2>
          <div className={`mt-6 space-y-4 text-sm leading-6 text-muted ${importScrollAreaClass}`}>
            <div className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4">
              Every demo seed and CSV import is logged, so the loaded dataset stays explicit.
            </div>
            <div className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4">
              The dashboard can reset instantly through the same repository boundary.
            </div>
          </div>
        </article>
      </section>

      <section id="proof-pack" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel-shell panel-shell-surface">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Submission pack
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Capture these proof assets
          </h2>
          <div className={`mt-6 space-y-4 ${importScrollAreaClass}`}>
            {proofAssets.map((asset) => (
              <div
                key={asset.title}
                className="rounded-[1.3rem] border border-line bg-white/70 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{asset.title}</p>
                  <a
                    href={asset.href}
                    className="text-sm font-semibold text-accent underline decoration-transparent hover:decoration-current"
                  >
                    {asset.hrefLabel}
                  </a>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{asset.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Recording order
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Three-minute winning flow
          </h2>
          <div className={`mt-6 space-y-4 ${importScrollAreaClass}`}>
            {[
              "Open the dashboard and frame incident count, affected orders, and revenue at risk.",
              "Switch roles once to prove the product adapts to different operators.",
              "Open this import center and show the backend readiness card plus AWS proof endpoint.",
              "Run one demo reset or import, then point to the activity log update.",
              "Open the war room and close on tasks, impacted locations, and the audit timeline.",
            ].map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.3rem] border border-line bg-surface px-4 py-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe3d3] font-mono text-xs font-semibold text-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted">{step}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}