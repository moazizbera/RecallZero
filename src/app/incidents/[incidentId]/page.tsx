import Link from "next/link";
import { notFound } from "next/navigation";

import { JudgeSummaryButton } from "@/components/judge-summary-button";
import { getIncidentById } from "@/lib/recall-repository";

type IncidentPageProps = {
  params: Promise<{
    incidentId: string;
  }>;
};

const severityStyles = {
  "Severity A": "bg-accent text-white",
  "Severity B": "bg-[#e8c98c] text-[#5d4318]",
  "Severity C": "bg-[#d8d4cf] text-[#4f4b46]",
};

export default async function IncidentPage({ params }: IncidentPageProps) {
  const { incidentId } = await params;
  const incident = await getIncidentById(incidentId);

  if (!incident) {
    notFound();
  }

  const incidentScrollAreaClass = "content-scroll";
  const lockedLocations = incident.locations.filter(
    (location) => location.status === "Locked",
  ).length;
  const queuedTasks = incident.tasks.filter((task) => task.status === "Queued").length;
  const inProgressTasks = incident.tasks.filter(
    (task) => task.status === "In progress",
  ).length;
  const completedTasks = incident.tasks.filter(
    (task) => task.status === "Completed",
  ).length;
  const storePullNotice = `Store action notice for ${incident.title}: immediately pull all inventory linked to supplier lot ${incident.supplierLot}. ${incident.affectedLocations} locations are in scope. Confirm isolation, stop sell-through, and report completion back to RecallZero within 30 minutes.`;
  const customerMessage = `Customer update draft: We identified a quality issue tied to products supplied through lot ${incident.supplierLot}. We have isolated impacted inventory, reviewed ${incident.affectedOrders} affected orders, and are preparing direct outreach with replacement or refund guidance.`;
  const regulatorBrief = `Regulatory brief: ${incident.title} is operating as ${incident.severity}. Supplier ${incident.supplier} reported the source lot ${incident.supplierLot}. Current state: ${incident.complianceState}. RecallZero shows ${lockedLocations} locked locations, ${inProgressTasks} active response tasks, and an auditable timeline ready for review.`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-line bg-white/70 px-5 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Incident war room
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            {incident.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {incident.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[incident.severity]}`}
          >
            {incident.severity}
          </span>
          <Link
            href="/"
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-strong"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="panel-shell panel-shell-surface">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Containment
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {lockedLocations}/{incident.locations.length} locked
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {incident.affectedLocations} impacted locations across active channels.
          </p>
        </div>
        <div className="panel-shell panel-shell-muted">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Execution
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {inProgressTasks} in progress
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {queuedTasks} queued and {completedTasks} completed tasks in the response queue.
          </p>
        </div>
        <div className="panel-shell panel-shell-muted">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Compliance
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {incident.complianceState}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Timeline and evidence stay ready for legal and regulatory review.
          </p>
        </div>
        <div className="panel-shell panel-shell-dark">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#efb183]">
            Next 30 minutes
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
            Lock, notify, verify
          </p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Finish inventory holds, publish pull instructions, and confirm customer messaging readiness.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel-shell panel-shell-surface">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                Response pack
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                Ready-to-send communications
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted">
              These drafts turn incident data into immediate operator, customer, and regulator outputs.
            </p>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {[
              {
                title: "Store pull notice",
                detail: storePullNotice,
                label: "Copy store notice",
              },
              {
                title: "Customer update",
                detail: customerMessage,
                label: "Copy customer update",
              },
              {
                title: "Regulatory brief",
                detail: regulatorBrief,
                label: "Copy regulator brief",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.35rem] border border-line bg-white/70 p-5"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
                <div className="mt-4">
                  <JudgeSummaryButton
                    summary={item.detail}
                    buttonLabel={item.label}
                    copiedLabel="Copied"
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-shell panel-shell-muted">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Why this matters
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Beyond detection
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-6 text-muted">
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              Most recall tools stop at visibility. Winning products shorten the action gap after detection.
            </div>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              RecallZero converts one incident into traceability, tasks, and stakeholder-ready communications from the same data model.
            </div>
            <div className="rounded-[1.3rem] border border-line bg-surface px-4 py-4">
              That makes the demo feel closer to a deployable incident-response platform than a reporting dashboard.
            </div>
          </div>
        </article>
      </section>

      <section id="overview" className="grid gap-6 scroll-mt-24 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="panel-shell panel-shell-surface">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Supplier", incident.supplier],
              ["Supplier lot", incident.supplierLot],
              ["Orders", `${incident.affectedOrders}`],
              ["Revenue at risk", `$${incident.impactedRevenue.toLocaleString()}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.35rem] border border-line bg-white/70 p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                  {label}
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-line bg-white/70 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
              Architecture posture
            </p>
            <div className={`mt-4 space-y-3 ${incidentScrollAreaClass}`}>
              {incident.architecture.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.2rem] border border-line bg-surface px-4 py-4 text-sm leading-6 text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </article>

        <article id="timeline" className="panel-shell panel-shell-dark scroll-mt-24">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#efb183]">
            Event stream
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Compliance-ready history
          </h2>
          <div className={`mt-6 space-y-5 ${incidentScrollAreaClass}`}>
            {incident.timeline.map((event, index) => (
              <div key={`${event.time}-${event.title}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[#efb183]" />
                  {index < incident.timeline.length - 1 ? (
                    <div className="mt-2 h-full w-px bg-white/10" />
                  ) : null}
                </div>
                <div className="pb-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#efb183]">
                    {event.time}
                  </p>
                  <p className="mt-2 text-base font-semibold">{event.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {event.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article id="locations" className="panel-shell panel-shell-muted scroll-mt-24">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Location response
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Impacted sites and owners
          </h2>
          <div className={`mt-6 space-y-4 ${incidentScrollAreaClass}`}>
            {incident.locations.map((location) => (
              <div
                key={location.name}
                className="rounded-[1.35rem] border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      {location.type}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                      {location.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#f8ece3] px-3 py-1 text-xs font-semibold text-accent">
                    {location.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-3">
                  <div>
                    <dt>Region</dt>
                    <dd className="mt-1 font-semibold text-foreground">{location.region}</dd>
                  </div>
                  <div>
                    <dt>Affected units</dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {location.affectedUnits.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Owner</dt>
                    <dd className="mt-1 font-semibold text-foreground">{location.owner}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </article>

        <article id="tasks" className="panel-shell panel-shell-surface scroll-mt-24">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Execution queue
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Response tasks
          </h2>
          <div className={`mt-6 grid gap-4 ${incidentScrollAreaClass}`}>
            {incident.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-[1.35rem] border border-line bg-white/70 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em]">
                      {task.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{task.team} · {task.assignee}</p>
                  </div>
                  <span className="rounded-full bg-[#efe3d3] px-3 py-1 text-xs font-semibold text-foreground">
                    {task.status}
                  </span>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  Due in {task.dueIn}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}