import Link from "next/link";
import { cookies } from "next/headers";

import { ImportSeedButton } from "@/components/import-seed-button";
import { JudgeSummaryButton } from "@/components/judge-summary-button";
import { RoleSwitcher } from "@/components/role-switcher";
import { formatActivityTimestamp, getActivityAccent } from "@/lib/activity-log";
import {
  getCurrentDatasetStatus,
  getDashboardSnapshot,
  getExecutiveAnalytics,
  getImportActivity,
  getRoleBrief,
} from "@/lib/recall-repository";
import {
  dashboardRoleCookieName,
  dashboardRoleLabels,
  getSafeDashboardRole,
} from "@/lib/role-session";

export default async function Home() {
  const cookieStore = await cookies();
  const role = getSafeDashboardRole(cookieStore.get(dashboardRoleCookieName)?.value);
  const snapshot = await getDashboardSnapshot();
  const featuredIncident = snapshot.incidents[0];
  const analytics = getExecutiveAnalytics(snapshot.incidents);
  const roleBrief = getRoleBrief(role, snapshot.incidents);
  const currentDataset = await getCurrentDatasetStatus();
  const activity = await getImportActivity();
  const latestActivity = activity[0] ?? null;
  const recentActivity = activity.slice(0, 2);
  const judgeSummary = `RecallZero is running on ${currentDataset.storageLabel} with dataset state '${currentDataset.label}'. There are ${snapshot.incidents.length} active incidents, ${snapshot.kpis[1]?.value ?? "0"} affected orders, and ${snapshot.kpis[2]?.value ?? "$0"} revenue at risk. The latest operator activity is ${latestActivity ? `${latestActivity.action} at ${formatActivityTimestamp(latestActivity.timestamp)}` : "not yet recorded"}.`;
  const demoSequence = [
    {
      title: "1. Frame the risk",
      detail: `Open with ${snapshot.kpis[0]?.value ?? "0"} live incidents and ${snapshot.kpis[2]?.value ?? "$0"} revenue at risk to establish business urgency.`,
      time: "0:30",
    },
    {
      title: "2. Show the operator loop",
      detail: "Switch roles, point to the current dataset badge, and show the latest activity feed updating in real time.",
      time: "0:45",
    },
    {
      title: "3. Trigger the workflow",
      detail: "Jump to the import center, upload a source or CSV dataset, then return here to show the dashboard state change instantly.",
      time: "1:15",
    },
    {
      title: "4. Close on system depth",
      detail: "Use the war room, timeline, and backend posture cards to connect the polished UX to a real operational data model.",
      time: "0:45",
    },
  ];
  const dashboardScrollAreaClass = "content-scroll lg:max-h-[28rem]";
  const judgeBriefPoints = [
    {
      label: "Problem",
      detail: "Recalls still run through fragmented spreadsheets, inboxes, and delayed store actions.",
    },
    {
      label: "Product",
      detail: "RecallZero turns one supplier alert into traceability, tasks, and an auditable response loop.",
    },
    {
      label: "Proof",
      detail: `Live incidents, ${snapshot.kpis[1]?.value ?? "0"} affected orders, and ${currentDataset.storageLabel} persistence are already running here.`,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-400 flex-col gap-6 px-4 py-4 text-foreground md:px-6 lg:px-8 lg:py-6">
      <section className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-4xl border border-line bg-[linear-gradient(180deg,#201613_0%,#17110f_100%)] p-5 text-white shadow-[0_24px_80px_rgba(43,22,14,0.25)] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#efb183]">
                RecallZero
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tighter">
                Incident OS
              </h1>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
              Live
            </div>
          </div>

          <p className="mt-6 text-sm leading-6 text-white/70">
            {snapshot.summary}
          </p>

          <div className="mt-8 space-y-3">
            {[
              ["Command Center", `${snapshot.incidents.length} active incidents`],
              ["Traceability", "Lot to order graph"],
              ["Task orchestration", "6 teams engaged"],
              ["Active role", dashboardRoleLabels[role]],
            ].map(([label, detail]) => (
              <div
                key={label}
                className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#efb183]">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/80">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <RoleSwitcher currentRole={role} />
          </div>

          <div className="mt-8 rounded-3xl border border-[#f0b183]/15 bg-[#f0b183]/10 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd1b2]">
              Backend boundary
            </p>
            <p className="mt-3 text-sm leading-6 text-white/85">
              Seeded dashboard and incident APIs already back the UI.
            </p>
            <div className="mt-4 space-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffd9c4]">
              <p>/api/dashboard</p>
              <p>/api/incidents/{featuredIncident.id}</p>
              <p>/api/import/source</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd1b2]">
                  Current dataset
                </p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
                  {currentDataset.storageLabel}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white/90">
                {currentDataset.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {currentDataset.detail}
              </p>
            </div>
            <Link
              href="/import"
              className="mt-4 inline-flex items-center text-sm font-semibold text-white underline decoration-transparent transition-colors hover:decoration-current"
            >
              Open import center
            </Link>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd1b2]">
                Demo reset
              </p>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Reset to the baseline scenario before the next walkthrough.
              </p>
              <div className="mt-4">
                <ImportSeedButton
                  buttonLabel="Reset demo data"
                  pendingLabel="Resetting demo data..."
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="grid gap-6">
          <section
            id="overview"
            className="scroll-mt-24 overflow-hidden rounded-4xl border border-line bg-surface shadow-[0_24px_80px_rgba(73,40,24,0.08)]"
          >
            <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-8">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-accent px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-white">
                    {featuredIncident.severity}
                  </span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    {featuredIncident.id}
                  </span>
                </div>

                <p className="mt-5 font-mono text-xs uppercase tracking-[0.3em] text-accent">
                  {snapshot.headline}
                </p>
                <h2 className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tighter lg:text-6xl">
                  {snapshot.subheadline}
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-muted lg:text-lg">
                  {featuredIncident.summary}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-full border border-line bg-white/80 px-4 py-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      Active dataset
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {currentDataset.label}
                    </p>
                  </div>
                  {latestActivity ? (
                    <div className="rounded-full border border-line bg-white/80 px-4 py-2">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        Latest activity
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {latestActivity.action}
                      </p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                        {formatActivityTimestamp(latestActivity.timestamp)}
                      </p>
                    </div>
                  ) : null}
                  <Link
                    href={`/incidents/${featuredIncident.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-line bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                  >
                    Open war room
                  </Link>
                  <JudgeSummaryButton summary={judgeSummary} />
                </div>

                <div className="mt-6 rounded-3xl border border-line bg-[#fff8ef] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                        Judge briefing
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Use this block to frame the demo before you move into imports or the war room.
                      </p>
                    </div>
                    <Link
                      href="/import"
                      className="inline-flex items-center text-sm font-semibold text-accent underline decoration-transparent transition-colors hover:decoration-current"
                    >
                      Open import center
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {judgeBriefPoints.map((point) => (
                      <div
                        key={point.label}
                        className="rounded-[1.2rem] border border-line bg-white/80 px-4 py-4"
                      >
                        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                          {point.label}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-muted">{point.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-line bg-[#fffdf8] p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                    {roleBrief.title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">{roleBrief.summary}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {roleBrief.priorities.map((priority) => (
                      <div
                        key={priority}
                        className="rounded-[1.2rem] border border-line bg-white/70 px-4 py-4 text-sm leading-6 text-muted"
                      >
                        {priority}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {snapshot.kpis.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-3xl border border-line bg-[#fffdf8] p-5"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        {metric.label}
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-tighter">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-sm text-muted">{metric.delta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-line bg-[linear-gradient(180deg,#241916_0%,#2d1f1b_100%)] p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#efb183]">
                      Incident pulse
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                      {featuredIncident.title}
                    </h3>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                    Updated {featuredIncident.lastUpdated}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Affected SKUs", `${featuredIncident.affectedSkus}`],
                    ["Affected orders", `${featuredIncident.affectedOrders}`],
                    ["Locations", `${featuredIncident.affectedLocations}`],
                    ["Revenue at risk", `$${featuredIncident.impactedRevenue.toLocaleString()}`],
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
                    Next action window
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#fff1e5]">
                    Lock inventory, issue store pull lists, and publish customer
                    message drafts before the next sync cycle closes.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {featuredIncident.metrics.slice(0, 3).map((metric) => (
                      <span
                        key={metric.label}
                        className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                      >
                        {metric.label}: {metric.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="analytics" className="grid gap-6 scroll-mt-24 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="panel-shell panel-shell-muted">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                    Executive analytics
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                    Exposure, SLA, and team health
                  </h3>
                </div>
                <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-foreground">
                  Revenue protected {analytics.revenueProtected}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {analytics.slaHealth.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.3rem] border border-line bg-surface p-4"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      {item.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tighter">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm text-muted">{item.trend}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-shell panel-shell-surface">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                    Load distribution
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                    Team utilization and regional exposure
                  </h3>
                </div>
                {latestActivity ? (
                  <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${getActivityAccent(latestActivity.action).badge}`}>
                    {latestActivity.action} · {formatActivityTimestamp(latestActivity.timestamp)}
                  </div>
                ) : null}
              </div>

              {latestActivity ? (
                <div className={`mt-5 rounded-[1.3rem] border px-4 py-4 text-sm leading-6 text-muted ${getActivityAccent(latestActivity.action).card}`}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                    Latest activity detail
                  </p>
                  <p className="mt-3">{latestActivity.detail}</p>
                </div>
              ) : null}

              {recentActivity.length > 0 ? (
                <div className={`mt-5 space-y-3 ${dashboardScrollAreaClass}`}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                    Latest 2 events
                  </p>
                  {recentActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[1.2rem] border px-4 py-4 ${getActivityAccent(entry.action).card}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{entry.action}</p>
                        <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${getActivityAccent(entry.action).badge}`}>
                          {formatActivityTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">{entry.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Team utilization</p>
                  {analytics.teamUtilization.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-[#efe3d3]">
                        <div
                          className="h-3 rounded-full bg-accent"
                          style={{ width: `${Math.min(100, item.value * 14)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Regional exposure</p>
                  {analytics.regionalExposure.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>{item.label}</span>
                        <span>{item.value.toLocaleString()}</span>
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-[#efe3d3]">
                        <div
                          className="h-3 rounded-full bg-[#8e2418]"
                          style={{ width: `${Math.min(100, item.value / 30)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>

          <section id="operations" className="grid gap-6 scroll-mt-24 2xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-6">
              <article className="panel-shell panel-shell-surface">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                      Active incidents
                    </p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                      Operations dashboard
                    </h3>
                  </div>
                  <div className="rounded-full border border-line bg-white/80 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    Synced from backend contract
                  </div>
                </div>

                <div className={`mt-6 overflow-hidden rounded-3xl border border-line ${dashboardScrollAreaClass}`}>
                  <div className="grid grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr] gap-3 bg-[#efe3d3] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    <span>Incident</span>
                    <span>Supplier lot</span>
                    <span>Orders</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-line bg-white/70">
                    {snapshot.incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr] md:items-center"
                      >
                        <div>
                          <p className="text-base font-semibold tracking-[-0.02em]">
                            {incident.title}
                          </p>
                          <p className="mt-1 text-sm text-muted">{incident.supplier}</p>
                        </div>
                        <div className="text-sm text-muted">{incident.supplierLot}</div>
                        <div className="text-sm text-muted">{incident.affectedOrders}</div>
                        <div className="flex items-center justify-between gap-3 md:justify-start">
                          <span className="rounded-full bg-[#f8ece3] px-3 py-1 text-xs font-semibold text-accent">
                            {incident.severity}
                          </span>
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="text-sm font-semibold text-accent underline decoration-transparent transition-colors hover:decoration-current"
                          >
                            Open war room
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="panel-shell panel-shell-muted">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                      Traceability map
                    </p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                      Impacted locations and owners
                    </h3>
                  </div>
                  <p className="max-w-sm text-sm leading-6 text-muted">
                    Real products need clear accountability. Each affected location is
                    tied to a status and human owner.
                  </p>
                </div>

                <div className={`mt-6 grid gap-4 xl:grid-cols-3 ${dashboardScrollAreaClass}`}>
                  {featuredIncident.locations.map((location) => (
                    <div
                      key={location.name}
                      className="rounded-[1.4rem] border border-line bg-surface p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                            {location.type}
                          </p>
                          <h4 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                            {location.name}
                          </h4>
                        </div>
                        <span className="rounded-full bg-[#f8ece3] px-3 py-1 text-xs font-semibold text-accent">
                          {location.status}
                        </span>
                      </div>
                      <dl className="mt-5 space-y-3 text-sm text-muted">
                        <div className="flex items-center justify-between gap-4">
                          <dt>Region</dt>
                          <dd>{location.region}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt>Affected units</dt>
                          <dd>{location.affectedUnits.toLocaleString()}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt>Owner</dt>
                          <dd>{location.owner}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="grid gap-6">
              <article className="panel-shell panel-shell-surface">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                  Response queue
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                  Team orchestration
                </h3>
                <div className={`mt-6 space-y-4 ${dashboardScrollAreaClass}`}>
                  {featuredIncident.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[1.4rem] border border-line bg-white/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold tracking-[-0.02em]">
                            {task.title}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {task.team} · {task.assignee}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#efe3d3] px-3 py-1 text-xs font-semibold text-foreground">
                          {task.status}
                        </span>
                      </div>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                        Due in {task.dueIn}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-shell panel-shell-dark">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#efb183]">
                  Incident timeline
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                  Auditable event stream
                </h3>
                <div className={`mt-6 space-y-5 ${dashboardScrollAreaClass}`}>
                  {featuredIncident.timeline.map((event) => (
                    <div key={`${event.time}-${event.title}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-[#efb183]" />
                        <div className="mt-2 h-full w-px bg-white/10" />
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
            </div>
          </section>

          <section id="backend" className="grid gap-6 scroll-mt-24 lg:grid-cols-[1fr_0.8fr_0.9fr]">
            <article className="panel-shell panel-shell-surface">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                Backend posture
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                Strong backend, clear path to Aurora.
              </h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {featuredIncident.architecture.slice(0, 3).map((principle) => (
                  <div
                    key={principle}
                    className="rounded-[1.4rem] border border-line bg-white/70 p-5 text-sm leading-6 text-muted"
                  >
                    {principle}
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-shell panel-shell-dark">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#efb183]">
                Demo sequence
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                Live pitch flow for judges
              </h3>
              <div className={`mt-6 space-y-4 ${dashboardScrollAreaClass}`}>
                {demoSequence.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#efb183]">
                        {step.time}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/70">{step.detail}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-shell panel-shell-muted">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                Product principles
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                What makes this hackathon-worthy
              </h3>
              <div className={`mt-6 space-y-4 ${dashboardScrollAreaClass}`}>
                {snapshot.architecturePrinciples.slice(0, 3).map((principle) => (
                  <div
                    key={principle}
                    className="rounded-[1.3rem] border border-line bg-surface px-4 py-4 text-sm leading-6 text-muted"
                  >
                    {principle}
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
