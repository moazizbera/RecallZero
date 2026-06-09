import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ArchitectureNote,
  ImpactLocation as PrismaImpactLocation,
  Incident,
  IncidentMetric as PrismaIncidentMetric,
  RecallTask as PrismaRecallTask,
  TimelineEvent as PrismaTimelineEvent,
} from "@prisma/client";

import {
  appendImportActivityInDynamoDb,
  canResolveDynamoDbCredentials,
  getDynamoDbImportActivityStore,
  getDynamoDbIncidentById,
  getDynamoDbIncidentStore,
  hasDynamoDbConfig,
  replaceIncidentsInDynamoDb,
} from "@/lib/dynamodb";
import {
  getDashboardSnapshot as getFallbackDashboardSnapshot,
  getIncidentById as getFallbackIncidentById,
  getIncidents as getFallbackIncidents,
  type DashboardSnapshot,
  type RecallIncident,
} from "@/lib/recall-data";
import { buildIncidentsFromSourceCsv } from "@/lib/source-incident-csv";
import { parseCsv } from "@/lib/csv-import";
import { getPrismaClient, hasPrismaDatabaseUrl } from "@/lib/prisma";
import type { DashboardRole } from "@/lib/role-session";

export type ImportSummary = {
  databaseConfigured: boolean;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
  incidentCount: number;
  taskCount: number;
  locationCount: number;
  notificationCount: number;
};

export type ImportActivity = {
  id: string;
  timestamp: string;
  action: string;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
  detail: string;
};

export type CurrentDatasetStatus = {
  label: string;
  detail: string;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
};

export type SeedDemoResult = {
  ok: boolean;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
  incidentCount: number;
  message: string;
};

export type CsvDataset = "incidents" | "locations" | "tasks";

export type CsvImportResult = {
  ok: boolean;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
  importedRows: number;
  message: string;
};

export type GeneratedImportResult = {
  ok: boolean;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
  parsedCount: number;
  importedCount: number;
  message: string;
  fileName: string;
  previewIncidents: Array<{
    id: string;
    title: string;
    severity: RecallIncident["severity"];
    supplier: string;
    supplierLot: string;
    affectedOrders: number;
    affectedLocations: number;
    impactedRevenue: number;
    taskCount: number;
  }>;
};

export type ExecutiveAnalytics = {
  revenueProtected: string;
  activeAlerts: number;
  teamUtilization: Array<{ label: string; value: number }>;
  regionalExposure: Array<{ label: string; value: number }>;
  slaHealth: Array<{ label: string; value: string; trend: string }>;
};

export type RoleBrief = {
  title: string;
  summary: string;
  priorities: string[];
};

export type BackendReadiness = {
  storageLabel: string;
  persistenceMode: "database" | "fallback";
  databaseConfigured: boolean;
  recommendedPath: "DynamoDB" | "PostgreSQL";
  checks: Array<{
    label: string;
    status: "ready" | "missing";
    detail: string;
  }>;
};

type IncidentRecord = Incident & {
  metrics: PrismaIncidentMetric[];
  locations: PrismaImpactLocation[];
  tasks: PrismaRecallTask[];
  timeline: PrismaTimelineEvent[];
  architectureNotes: ArchitectureNote[];
};

const fallbackStoreFilePath = path.join(
  process.cwd(),
  ".demo-store",
  "fallback-incidents.json",
);
const importActivityFilePath = path.join(
  process.cwd(),
  ".demo-store",
  "import-activity.json",
);

function hasPrimaryDatabaseConfig() {
  return hasDynamoDbConfig() || hasPrismaDatabaseUrl();
}

function getPrimaryPersistenceMode(): "database" | "fallback" {
  return hasPrimaryDatabaseConfig() ? "database" : "fallback";
}

function getPrimaryDatabaseLabel() {
  return hasDynamoDbConfig() ? "DynamoDB" : "PostgreSQL";
}

function getStorageLabel(persistenceMode: "database" | "fallback") {
  return persistenceMode === "database" ? getPrimaryDatabaseLabel() : "Fallback store";
}

export async function getBackendReadiness(): Promise<BackendReadiness> {
  const dynamoRegionConfigured = Boolean(process.env.AWS_REGION);
  const dynamoTableConfigured = Boolean(process.env.DYNAMODB_TABLE_NAME);
  const dynamoConfigured = dynamoRegionConfigured && dynamoTableConfigured;
  const dynamoCredentialsReady = dynamoConfigured
    ? await canResolveDynamoDbCredentials()
    : false;
  const postgresConfigured = hasPrismaDatabaseUrl();
  const persistenceMode = dynamoCredentialsReady || postgresConfigured ? "database" : "fallback";
  const storageLabel = dynamoCredentialsReady
    ? "DynamoDB"
    : postgresConfigured
      ? "PostgreSQL"
      : "Fallback store";

  return {
    storageLabel,
    persistenceMode,
    databaseConfigured: persistenceMode === "database",
    recommendedPath: "DynamoDB",
    checks: [
      {
        label: "AWS_REGION",
        status: dynamoRegionConfigured ? "ready" : "missing",
        detail: dynamoRegionConfigured
          ? "AWS region is configured for DynamoDB access."
          : "Required for DynamoDB table access and bootstrap.",
      },
      {
        label: "DYNAMODB_TABLE_NAME",
        status: dynamoTableConfigured ? "ready" : "missing",
        detail: dynamoTableConfigured
          ? "DynamoDB table name is configured."
          : "Required for the primary AWS-backed demo path.",
      },
      {
        label: "AWS credentials or runtime role",
        status: dynamoCredentialsReady ? "ready" : "missing",
        detail: dynamoConfigured
          ? dynamoCredentialsReady
            ? "The AWS SDK resolved credentials for DynamoDB access."
            : "DynamoDB env vars are present, but the AWS SDK could not resolve credentials yet."
          : "Not required until the DynamoDB path is selected.",
      },
      {
        label: "DATABASE_URL",
        status: postgresConfigured ? "ready" : "missing",
        detail: postgresConfigured
          ? "PostgreSQL or Aurora connection string is configured."
          : "Optional alternate AWS database path through Prisma.",
      },
    ],
  };
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

function mapIncident(record: IncidentRecord): RecallIncident {
  return {
    id: record.id,
    supplier: record.supplier,
    supplierLot: record.supplierLot,
    title: record.title,
    summary: record.summary,
    severity: record.severity as RecallIncident["severity"],
    affectedSkus: record.affectedSkus,
    affectedOrders: record.affectedOrders,
    affectedLocations: record.affectedLocations,
    impactedRevenue: record.impactedRevenue,
    startedAt: formatTimestamp(record.startedAt),
    lastUpdated: formatTimestamp(record.lastUpdatedAt),
    notificationsQueued: record.notificationsQueued,
    complianceState: record.complianceState,
    metrics: record.metrics
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((metric) => ({
        label: metric.label,
        value: metric.value,
        delta: metric.delta,
      })),
    locations: record.locations
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((location) => ({
        name: location.name,
        type: location.type as RecallIncident["locations"][number]["type"],
        region: location.region,
        status: location.status as RecallIncident["locations"][number]["status"],
        affectedUnits: location.affectedUnits,
        owner: location.owner,
      })),
    tasks: record.tasks
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((task) => ({
        id: task.id,
        title: task.title,
        team: task.team,
        dueIn: task.dueIn,
        status: task.status as RecallIncident["tasks"][number]["status"],
        assignee: task.assignee,
      })),
    timeline: record.timeline
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((event) => ({
        time: event.timeLabel,
        title: event.title,
        detail: event.detail,
      })),
    architecture: record.architectureNotes
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((note) => note.body),
  };
}

async function fetchDbIncidents() {
  if (!hasPrismaDatabaseUrl()) {
    return null;
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const incidents = await prisma.incident.findMany({
      include: {
        metrics: true,
        locations: true,
        tasks: true,
        timeline: true,
        architectureNotes: true,
      },
      orderBy: { lastUpdatedAt: "desc" },
    });

    return incidents.length > 0 ? incidents.map(mapIncident) : null;
  } catch (error) {
    console.error("Failed to query Prisma incident store, using fallback data.", error);
    return null;
  }
}

async function getFallbackIncidentStore() {
  try {
    const content = await readFile(fallbackStoreFilePath, "utf8");
    const incidents = JSON.parse(content) as RecallIncident[];

    return incidents.length > 0 ? incidents : getFallbackIncidents();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return getFallbackIncidents();
    }

    console.error("Failed to read fallback incident store, using static fallback data.", error);
    return getFallbackIncidents();
  }
}

async function replaceFallbackIncidents(incidents: RecallIncident[]) {
  await mkdir(path.dirname(fallbackStoreFilePath), { recursive: true });
  await writeFile(
    fallbackStoreFilePath,
    JSON.stringify(incidents, null, 2),
    "utf8",
  );
}

async function getImportActivityStore() {
  if (hasDynamoDbConfig()) {
    try {
      return (await getDynamoDbImportActivityStore()) ?? [];
    } catch (error) {
      console.error("Failed to read DynamoDB import activity store.", error);
    }
  }

  try {
    const content = await readFile(importActivityFilePath, "utf8");
    return JSON.parse(content) as ImportActivity[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    console.error("Failed to read import activity store.", error);
    return [];
  }
}

async function appendImportActivity(
  entry: Omit<ImportActivity, "id" | "timestamp" | "storageLabel">,
) {
  if (hasDynamoDbConfig()) {
    try {
      await appendImportActivityInDynamoDb(entry);
      return;
    } catch (error) {
      console.error("Failed to append DynamoDB import activity, using fallback store.", error);
    }
  }

  await mkdir(path.dirname(importActivityFilePath), { recursive: true });

  const existingEntries = await getImportActivityStore();
  const nextEntries = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      storageLabel: getStorageLabel(entry.persistenceMode),
      ...entry,
    },
    ...existingEntries,
  ].slice(0, 8);

  await writeFile(importActivityFilePath, JSON.stringify(nextEntries, null, 2), "utf8");
}

export async function getImportActivity() {
  return getImportActivityStore();
}

export async function logRoleSelection(role: DashboardRole) {
  await appendImportActivity({
    action: "Role switch",
    persistenceMode: getPrimaryPersistenceMode(),
    detail: `Switched the dashboard view to ${role}.`,
  });
}

export async function getCurrentDatasetStatus(): Promise<CurrentDatasetStatus> {
  const [activity, incidents] = await Promise.all([
    getImportActivityStore(),
    getIncidents(),
  ]);

  const latestEntry = activity.find((entry) => entry.action !== "Role switch");

  if (!latestEntry) {
    const readiness = await getBackendReadiness();

    return {
      label: "Demo baseline",
      detail: `${incidents.length} incident records loaded from the baseline workspace dataset.`,
      persistenceMode: readiness.persistenceMode,
      storageLabel: readiness.storageLabel,
    };
  }

  return {
    label: latestEntry.action,
    detail: latestEntry.detail,
    persistenceMode: latestEntry.persistenceMode,
    storageLabel: latestEntry.storageLabel,
  };
}

export async function getIncidents() {
  if (hasDynamoDbConfig()) {
    try {
      const incidents = await getDynamoDbIncidentStore();

      if (incidents && incidents.length > 0) {
        return incidents;
      }
    } catch (error) {
      console.error("Failed to query DynamoDB incident store, using fallback data.", error);
    }
  }

  const incidents = await fetchDbIncidents();
  return incidents ?? (await getFallbackIncidentStore());
}

export async function getIncidentById(incidentId: string) {
  if (hasDynamoDbConfig()) {
    try {
      const incident = await getDynamoDbIncidentById(incidentId);

      if (incident) {
        return incident;
      }
    } catch (error) {
      console.error("Failed to query DynamoDB incident by id, using fallback data.", error);
    }
  }

  if (hasPrismaDatabaseUrl()) {
    const prisma = getPrismaClient();

    if (!prisma) {
      return getFallbackIncidentById(incidentId);
    }

    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          metrics: true,
          locations: true,
          tasks: true,
          timeline: true,
          architectureNotes: true,
        },
      });

      if (incident) {
        return mapIncident(incident);
      }
    } catch (error) {
      console.error("Failed to query Prisma incident by id, using fallback data.", error);
    }
  }

  const fallbackIncidents = await getFallbackIncidentStore();

  return (
    fallbackIncidents.find((incident) => incident.id === incidentId) ??
    getFallbackIncidentById(incidentId)
  );
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const incidents = await getIncidents();
  const fallback = getFallbackDashboardSnapshot();

  if (!incidents.length) {
    return fallback;
  }

  const totalImpactedRevenue = incidents.reduce(
    (sum, incident) => sum + incident.impactedRevenue,
    0,
  );
  const totalAffectedOrders = incidents.reduce(
    (sum, incident) => sum + incident.affectedOrders,
    0,
  );

  return {
    ...fallback,
    incidents,
    kpis: [
      {
        label: "Open incidents",
        value: `${incidents.length}`,
        delta: incidents[0]?.severity === "Severity A" ? "Critical workflow active" : "Monitoring active incidents",
      },
      {
        label: "Affected orders",
        value: `${totalAffectedOrders}`,
        delta: "Calculated from live incident graph",
      },
      {
        label: "Revenue at risk",
        value: `$${Math.round(totalImpactedRevenue / 1000)}k`,
        delta: "Updated from incident records",
      },
      {
        label: "Teams activated",
        value: `${new Set(incidents.flatMap((incident) => incident.tasks.map((task) => task.team))).size}`,
        delta: "Cross-functional response network",
      },
    ],
  };
}

function parseUtcTimeLabel(timeLabel: string) {
  const [clock] = timeLabel.split(" ");
  const [hours, minutes] = clock.split(":").map(Number);
  const date = new Date();

  date.setUTCHours(hours, minutes, 0, 0);

  return date;
}

async function replaceIncidentsInDatabase(incidents: RecallIncident[]) {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("Prisma client could not be initialized.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.architectureNote.deleteMany();
    await tx.timelineEvent.deleteMany();
    await tx.recallTask.deleteMany();
    await tx.impactLocation.deleteMany();
    await tx.incidentMetric.deleteMany();
    await tx.incident.deleteMany();

    for (const incident of incidents) {
      await tx.incident.create({
        data: {
          id: incident.id,
          title: incident.title,
          summary: incident.summary,
          supplier: incident.supplier,
          supplierLot: incident.supplierLot,
          severity: incident.severity,
          startedAt: parseUtcTimeLabel(incident.startedAt),
          lastUpdatedAt: parseUtcTimeLabel(incident.lastUpdated),
          notificationsQueued: incident.notificationsQueued,
          complianceState: incident.complianceState,
          affectedSkus: incident.affectedSkus,
          affectedOrders: incident.affectedOrders,
          affectedLocations: incident.affectedLocations,
          impactedRevenue: incident.impactedRevenue,
          metrics: {
            create: incident.metrics.map((metric, index) => ({
              label: metric.label,
              value: metric.value,
              delta: metric.delta,
              sortOrder: index,
            })),
          },
          locations: {
            create: incident.locations.map((location, index) => ({
              name: location.name,
              type: location.type,
              region: location.region,
              status: location.status,
              affectedUnits: location.affectedUnits,
              owner: location.owner,
              sortOrder: index,
            })),
          },
          tasks: {
            create: incident.tasks.map((task, index) => ({
              id: task.id,
              title: task.title,
              team: task.team,
              dueIn: task.dueIn,
              status: task.status,
              assignee: task.assignee,
              sortOrder: index,
            })),
          },
          timeline: {
            create: incident.timeline.map((event, index) => ({
              timeLabel: event.time,
              title: event.title,
              detail: event.detail,
              sortOrder: index,
            })),
          },
          architectureNotes: {
            create: incident.architecture.map((body, index) => ({
              body,
              sortOrder: index,
            })),
          },
        },
      });
    }
  });
}

export async function getImportSummary(): Promise<ImportSummary> {
  const incidents = await getIncidents();
  const readiness = await getBackendReadiness();

  return {
    databaseConfigured: readiness.databaseConfigured,
    persistenceMode: readiness.persistenceMode,
    storageLabel: readiness.storageLabel,
    incidentCount: incidents.length,
    taskCount: incidents.reduce((sum, incident) => sum + incident.tasks.length, 0),
    locationCount: incidents.reduce(
      (sum, incident) => sum + incident.locations.length,
      0,
    ),
    notificationCount: incidents.reduce(
      (sum, incident) => sum + incident.notificationsQueued,
      0,
    ),
  };
}

export async function seedDemoData(): Promise<SeedDemoResult> {
  if (!hasPrimaryDatabaseConfig()) {
    const incidents = getFallbackIncidents();
    await replaceFallbackIncidents(incidents);
    await appendImportActivity({
      action: "Demo reset",
      persistenceMode: "fallback",
      detail: `Reset the fallback store to ${incidents.length} demo incidents.`,
    });

    return {
      ok: true,
      persistenceMode: "fallback",
      storageLabel: "Fallback store",
      incidentCount: incidents.length,
      message:
        "Loaded the demo incidents into the file-backed fallback store for this app workspace.",
    };
  }

  if (hasDynamoDbConfig()) {
    const incidents = getFallbackIncidents();

    try {
      await replaceIncidentsInDynamoDb(incidents);
      await appendImportActivity({
        action: "Demo seed",
        persistenceMode: "database",
        detail: `Seeded ${incidents.length} demo incidents into DynamoDB.`,
      });

      return {
        ok: true,
        persistenceMode: "database",
        storageLabel: "DynamoDB",
        incidentCount: incidents.length,
        message: `Seeded ${incidents.length} demo incidents into DynamoDB.`,
      };
    } catch (error) {
      console.error("Failed to seed DynamoDB demo data, using fallback store.", error);
      await replaceFallbackIncidents(incidents);
      await appendImportActivity({
        action: "Demo reset",
        persistenceMode: "fallback",
        detail: `DynamoDB was unavailable, so the fallback store was reset to ${incidents.length} demo incidents.`,
      });

      return {
        ok: true,
        persistenceMode: "fallback",
        storageLabel: "Fallback store",
        incidentCount: incidents.length,
        message:
          "DynamoDB was unavailable, so the demo incidents were loaded into the file-backed fallback store.",
      };
    }
  }

  if (!getPrismaClient()) {
    return {
      ok: false,
      persistenceMode: "fallback",
      storageLabel: "Fallback store",
      incidentCount: 0,
      message: "Prisma client could not be initialized.",
    };
  }

  const incidents = getFallbackIncidents();
  await replaceIncidentsInDatabase(incidents);
  await appendImportActivity({
    action: "Demo seed",
    persistenceMode: "database",
    detail: `Seeded ${incidents.length} demo incidents into PostgreSQL.`,
  });

  return {
    ok: true,
    persistenceMode: "database",
    storageLabel: "PostgreSQL",
    incidentCount: incidents.length,
    message: `Seeded ${incidents.length} demo incidents into PostgreSQL.`,
  };
}

export async function importGeneratedIncidentsFromSourceCsv(
  content: string,
  fileName: string,
): Promise<GeneratedImportResult> {
  const incidents = buildIncidentsFromSourceCsv(content);
  const previewIncidents = incidents.map((incident) => ({
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    supplier: incident.supplier,
    supplierLot: incident.supplierLot,
    affectedOrders: incident.affectedOrders,
    affectedLocations: incident.affectedLocations,
    impactedRevenue: incident.impactedRevenue,
    taskCount: incident.tasks.length,
  }));

  if (!hasPrimaryDatabaseConfig()) {
    await replaceFallbackIncidents(incidents);
    await appendImportActivity({
      action: "Source import",
      persistenceMode: "fallback",
      detail: `Generated ${incidents.length} incidents from ${fileName} into the file-backed fallback store.`,
    });

    return {
      ok: true,
      persistenceMode: "fallback",
      storageLabel: "Fallback store",
      parsedCount: incidents.length,
      importedCount: incidents.length,
      message: `Generated ${incidents.length} incidents from ${fileName} and loaded them into the file-backed fallback store. Configure DynamoDB or DATABASE_URL to persist them to an AWS-backed database.`,
      fileName,
      previewIncidents,
    };
  }

  if (hasDynamoDbConfig()) {
    try {
      await replaceIncidentsInDynamoDb(incidents);
      await appendImportActivity({
        action: "Source import",
        persistenceMode: "database",
        detail: `Generated and stored ${incidents.length} incidents from ${fileName} in DynamoDB.`,
      });

      return {
        ok: true,
        persistenceMode: "database",
        storageLabel: "DynamoDB",
        parsedCount: incidents.length,
        importedCount: incidents.length,
        message: `Generated and stored ${incidents.length} incidents from ${fileName} in DynamoDB.`,
        fileName,
        previewIncidents,
      };
    } catch (error) {
      console.error("Failed to store source import in DynamoDB, using fallback store.", error);
      await replaceFallbackIncidents(incidents);
      await appendImportActivity({
        action: "Source import",
        persistenceMode: "fallback",
        detail: `DynamoDB was unavailable, so ${incidents.length} generated incidents from ${fileName} were loaded into the fallback store.`,
      });

      return {
        ok: true,
        persistenceMode: "fallback",
        storageLabel: "Fallback store",
        parsedCount: incidents.length,
        importedCount: incidents.length,
        message: `DynamoDB was unavailable, so ${incidents.length} generated incidents from ${fileName} were loaded into the file-backed fallback store.`,
        fileName,
        previewIncidents,
      };
    }
  }

  await replaceIncidentsInDatabase(incidents);
  await appendImportActivity({
    action: "Source import",
    persistenceMode: "database",
    detail: `Generated and stored ${incidents.length} incidents from ${fileName}.`,
  });

  return {
    ok: true,
    persistenceMode: "database",
    storageLabel: "PostgreSQL",
    parsedCount: incidents.length,
    importedCount: incidents.length,
    message: `Generated and stored ${incidents.length} incidents from ${fileName}.`,
    fileName,
    previewIncidents,
  };
}

export function getExecutiveAnalytics(incidents: RecallIncident[]): ExecutiveAnalytics {
  const teamTotals = new Map<string, number>();
  const regionTotals = new Map<string, number>();

  for (const incident of incidents) {
    for (const task of incident.tasks) {
      teamTotals.set(task.team, (teamTotals.get(task.team) ?? 0) + 1);
    }

    for (const location of incident.locations) {
      regionTotals.set(
        location.region,
        (regionTotals.get(location.region) ?? 0) + location.affectedUnits,
      );
    }
  }

  return {
    revenueProtected: `$${Math.round(incidents.reduce((sum, incident) => sum + incident.impactedRevenue, 0) * 0.68 / 1000)}k`,
    activeAlerts: incidents.filter((incident) => incident.severity === "Severity A").length,
    teamUtilization: Array.from(teamTotals.entries())
      .slice(0, 4)
      .map(([label, value]) => ({ label, value })),
    regionalExposure: Array.from(regionTotals.entries())
      .slice(0, 4)
      .map(([label, value]) => ({ label, value })),
    slaHealth: [
      { label: "Initial response", value: "9m", trend: "Within target" },
      { label: "Store acknowledgement", value: "87%", trend: "+12% today" },
      { label: "Customer outreach prep", value: "74%", trend: "2 queues pending" },
    ],
  };
}

export function getRoleBrief(role: DashboardRole, incidents: RecallIncident[]): RoleBrief {
  const affectedOrders = incidents.reduce((sum, incident) => sum + incident.affectedOrders, 0);

  switch (role) {
    case "ops":
      return {
        title: "Operations mode",
        summary: "Focus on locked inventory, response queues, and store pull coordination.",
        priorities: [
          "Confirm warehouse holds across active incidents.",
          "Unblock store pull acknowledgements in highest-risk regions.",
          `Track ${affectedOrders} affected orders through fulfillment and retail workflows.`,
        ],
      };
    case "compliance":
      return {
        title: "Compliance mode",
        summary: "Prioritize audit trails, notification evidence, and regulator-ready documentation.",
        priorities: [
          "Export incident timelines for legal review.",
          "Verify customer notification language across open incidents.",
          "Ensure each incident retains source-of-truth supplier lot evidence.",
        ],
      };
    case "store":
      return {
        title: "Store manager mode",
        summary: "Review pull lists, regional store actions, and completion progress by location.",
        priorities: [
          "Acknowledge pull instructions for affected stores.",
          "Track unresolved retail clusters with pending review status.",
          "Escalate inventory discrepancies before the next sync cycle.",
        ],
      };
    default:
      return {
        title: "Executive mode",
        summary: "Monitor exposure, SLA health, and cross-functional response readiness.",
        priorities: [
          "Review revenue at risk and protected inventory coverage.",
          "Watch Severity A incidents and leadership digest updates.",
          "Track response SLAs and regional exposure concentration.",
        ],
      };
  }
}

function sortByNumericSuffix<T extends { [key: string]: unknown }>(items: T[], key: keyof T) {
  return [...items].sort((left, right) => {
    const leftValue = Number(left[key] ?? 0);
    const rightValue = Number(right[key] ?? 0);

    return leftValue - rightValue;
  });
}

function syncLocationMetric(incident: RecallIncident) {
  const nextValue = `${incident.affectedLocations}`;
  const metricIndex = incident.metrics.findIndex(
    (metric) => metric.label === "Locations impacted",
  );

  if (metricIndex >= 0) {
    incident.metrics[metricIndex] = {
      ...incident.metrics[metricIndex],
      value: nextValue,
      delta: "Derived from imported location rows",
    };
    return;
  }

  incident.metrics.push({
    label: "Locations impacted",
    value: nextValue,
    delta: "Derived from imported location rows",
  });
}

function buildFallbackIncidentFromRow(row: Record<string, string>): RecallIncident | null {
  const id = row.incident_id || row.id;
  const title = row.title;

  if (!id || !title) {
    return null;
  }

  const affectedSkus = Number(row.affected_skus || 0);
  const affectedOrders = Number(row.affected_orders || 0);
  const affectedLocations = Number(row.affected_locations || 0);
  const impactedRevenue = Number(row.impacted_revenue || 0);

  return {
    id,
    title,
    summary: row.summary || "Imported incident record",
    supplier: row.supplier || "Unknown supplier",
    supplierLot: row.supplier_lot || row.lot || "UNKNOWN-LOT",
    severity: (row.severity as RecallIncident["severity"]) || "Severity B",
    affectedSkus,
    affectedOrders,
    affectedLocations,
    impactedRevenue,
    startedAt: row.started_at || "08:00 UTC",
    lastUpdated: row.last_updated || "08:15 UTC",
    notificationsQueued: Number(row.notifications_queued || 0),
    complianceState: row.compliance_state || "Imported from CSV",
    metrics: [
      {
        label: "Orders traced",
        value: `${affectedOrders}`,
        delta: "Imported from incident CSV",
      },
      {
        label: "Locations impacted",
        value: `${affectedLocations}`,
        delta: "Derived from incident import",
      },
      {
        label: "Revenue at risk",
        value: `$${Math.round(impactedRevenue / 1000)}k`,
        delta: "Updated from imported values",
      },
    ],
    locations: [],
    tasks: [],
    timeline: [
      {
        time: row.started_at || "08:00",
        title: "CSV incident imported",
        detail: `Incident ${id} was loaded through the fallback CSV import workflow.`,
      },
    ],
    architecture: [
      "Fallback CSV imports write into the file-backed demo store when DATABASE_URL is absent.",
      "The same incident shape is reused by the dashboard, APIs, and war-room views.",
    ],
  };
}

async function importFallbackCsvDataset(
  dataset: CsvDataset,
  rows: Array<Record<string, string>>,
): Promise<CsvImportResult> {
  const incidents = await getFallbackIncidentStore();

  if (dataset === "incidents") {
    const importedIncidents = rows
      .map(buildFallbackIncidentFromRow)
      .filter((incident): incident is RecallIncident => incident !== null);

    if (!importedIncidents.length) {
      return {
        ok: false,
        persistenceMode: "fallback",
        storageLabel: "Fallback store",
        importedRows: 0,
        message: "No valid incident rows were found. Required columns: incident_id or id, and title.",
      };
    }

    await replaceFallbackIncidents(importedIncidents);
    await appendImportActivity({
      action: "CSV incidents import",
      persistenceMode: "fallback",
      detail: `Imported ${importedIncidents.length} incident rows into the file-backed fallback store.`,
    });

    return {
      ok: true,
      persistenceMode: "fallback",
      storageLabel: "Fallback store",
      importedRows: importedIncidents.length,
      message: `Imported ${importedIncidents.length} incident rows into the file-backed fallback store.`,
    };
  }

  const incidentMap = new Map(incidents.map((incident) => [incident.id, incident]));
  let importedRows = 0;

  for (const row of rows) {
    const incidentId = row.incident_id;

    if (!incidentId) {
      continue;
    }

    const incident = incidentMap.get(incidentId);

    if (!incident) {
      continue;
    }

    if (dataset === "locations") {
      const name = row.name;

      if (!name) {
        continue;
      }

      const location = {
        name,
        type: (row.type as RecallIncident["locations"][number]["type"]) || "Retail",
        region: row.region || "Unknown",
        status: (row.status as RecallIncident["locations"][number]["status"]) || "Pending review",
        affectedUnits: Number(row.affected_units || 0),
        owner: row.owner || "Unassigned",
      };
      const sortOrder = Number(row.sort_order || incident.locations.length);
      const nextLocations = [...incident.locations];

      nextLocations[sortOrder] = location;
      incident.locations = sortByNumericSuffix(
        nextLocations.filter(Boolean).map((entry, index) => ({ ...entry, sortOrder: index })),
        "sortOrder",
      ).map((entry) => ({
        name: entry.name,
        type: entry.type,
        region: entry.region,
        status: entry.status,
        affectedUnits: entry.affectedUnits,
        owner: entry.owner,
      }));
      incident.affectedLocations = incident.locations.length;
      syncLocationMetric(incident);

      importedRows += 1;
      continue;
    }

    const id = row.task_id || row.id;
    const title = row.title;

    if (!id || !title) {
      continue;
    }

    const task = {
      id,
      title,
      team: row.team || "Imported Ops",
      dueIn: row.due_in || "TBD",
      status: (row.status as RecallIncident["tasks"][number]["status"]) || "Queued",
      assignee: row.assignee || "Unassigned",
    };
    const sortOrder = Number(row.sort_order || incident.tasks.length);
    const nextTasks = [...incident.tasks];

    nextTasks[sortOrder] = task;
    incident.tasks = sortByNumericSuffix(
      nextTasks.filter(Boolean).map((entry, index) => ({ ...entry, sortOrder: index })),
      "sortOrder",
    ).map((entry) => ({
      id: entry.id,
      title: entry.title,
      team: entry.team,
      dueIn: entry.dueIn,
      status: entry.status,
      assignee: entry.assignee,
    }));

    importedRows += 1;
  }

  if (!importedRows) {
    return {
      ok: false,
      persistenceMode: "fallback",
      storageLabel: "Fallback store",
      importedRows: 0,
      message:
        dataset === "locations"
          ? "No valid location rows were found. Required columns: incident_id and name."
          : "No valid task rows were found. Required columns: incident_id, task_id or id, and title.",
    };
  }

  await replaceFallbackIncidents(Array.from(incidentMap.values()));

  await appendImportActivity({
    action: dataset === "locations" ? "CSV locations import" : "CSV tasks import",
    persistenceMode: "fallback",
    detail:
      dataset === "locations"
        ? `Imported ${importedRows} impacted location rows into the file-backed fallback store.`
        : `Imported ${importedRows} task rows into the file-backed fallback store.`,
  });

  return {
    ok: true,
    persistenceMode: "fallback",
    storageLabel: "Fallback store",
    importedRows,
    message:
      dataset === "locations"
        ? `Imported ${importedRows} impacted location rows into the file-backed fallback store.`
        : `Imported ${importedRows} task rows into the file-backed fallback store.`,
  };
}

async function importDynamoDbCsvDataset(
  dataset: CsvDataset,
  rows: Array<Record<string, string>>,
): Promise<CsvImportResult> {
  const incidents = (await getDynamoDbIncidentStore()) ?? [];

  if (dataset === "incidents") {
    const importedIncidents = rows
      .map(buildFallbackIncidentFromRow)
      .filter((incident): incident is RecallIncident => incident !== null);

    if (!importedIncidents.length) {
      return {
        ok: false,
        persistenceMode: "database",
        storageLabel: "DynamoDB",
        importedRows: 0,
        message: "No valid incident rows were found. Required columns: incident_id or id, and title.",
      };
    }

    await replaceIncidentsInDynamoDb(importedIncidents);
    await appendImportActivity({
      action: "CSV incidents import",
      persistenceMode: "database",
      detail: `Imported ${importedIncidents.length} incident rows into DynamoDB.`,
    });

    return {
      ok: true,
      persistenceMode: "database",
      storageLabel: "DynamoDB",
      importedRows: importedIncidents.length,
      message: `Imported ${importedIncidents.length} incident rows into DynamoDB.`,
    };
  }

  const incidentMap = new Map(incidents.map((incident) => [incident.id, incident]));
  let importedRows = 0;

  for (const row of rows) {
    const incidentId = row.incident_id;

    if (!incidentId) {
      continue;
    }

    const incident = incidentMap.get(incidentId);

    if (!incident) {
      continue;
    }

    if (dataset === "locations") {
      const name = row.name;

      if (!name) {
        continue;
      }

      const location = {
        name,
        type: (row.type as RecallIncident["locations"][number]["type"]) || "Retail",
        region: row.region || "Unknown",
        status: (row.status as RecallIncident["locations"][number]["status"]) || "Pending review",
        affectedUnits: Number(row.affected_units || 0),
        owner: row.owner || "Unassigned",
      };
      const sortOrder = Number(row.sort_order || incident.locations.length);
      const nextLocations = [...incident.locations];

      nextLocations[sortOrder] = location;
      incident.locations = sortByNumericSuffix(
        nextLocations.filter(Boolean).map((entry, index) => ({ ...entry, sortOrder: index })),
        "sortOrder",
      ).map((entry) => ({
        name: entry.name,
        type: entry.type,
        region: entry.region,
        status: entry.status,
        affectedUnits: entry.affectedUnits,
        owner: entry.owner,
      }));
      incident.affectedLocations = incident.locations.length;
      syncLocationMetric(incident);

      importedRows += 1;
      continue;
    }

    const id = row.task_id || row.id;
    const title = row.title;

    if (!id || !title) {
      continue;
    }

    const task = {
      id,
      title,
      team: row.team || "Imported Ops",
      dueIn: row.due_in || "TBD",
      status: (row.status as RecallIncident["tasks"][number]["status"]) || "Queued",
      assignee: row.assignee || "Unassigned",
    };
    const sortOrder = Number(row.sort_order || incident.tasks.length);
    const nextTasks = [...incident.tasks];

    nextTasks[sortOrder] = task;
    incident.tasks = sortByNumericSuffix(
      nextTasks.filter(Boolean).map((entry, index) => ({ ...entry, sortOrder: index })),
      "sortOrder",
    ).map((entry) => ({
      id: entry.id,
      title: entry.title,
      team: entry.team,
      dueIn: entry.dueIn,
      status: entry.status,
      assignee: entry.assignee,
    }));

    importedRows += 1;
  }

  if (!importedRows) {
    return {
      ok: false,
      persistenceMode: "database",
      storageLabel: "DynamoDB",
      importedRows: 0,
      message:
        dataset === "locations"
          ? "No valid location rows were found. Required columns: incident_id and name."
          : "No valid task rows were found. Required columns: incident_id, task_id or id, and title.",
    };
  }

  await replaceIncidentsInDynamoDb(Array.from(incidentMap.values()));
  await appendImportActivity({
    action: dataset === "locations" ? "CSV locations import" : "CSV tasks import",
    persistenceMode: "database",
    detail:
      dataset === "locations"
        ? `Imported ${importedRows} impacted location rows into DynamoDB.`
        : `Imported ${importedRows} task rows into DynamoDB.`,
  });

  return {
    ok: true,
    persistenceMode: "database",
    storageLabel: "DynamoDB",
    importedRows,
    message:
      dataset === "locations"
        ? `Imported ${importedRows} impacted location rows into DynamoDB.`
        : `Imported ${importedRows} task rows into DynamoDB.`,
  };
}

export async function importCsvDataset(
  dataset: CsvDataset,
  content: string,
): Promise<CsvImportResult> {
  const rows = parseCsv(content);

  if (!rows.length) {
    return {
      ok: false,
      persistenceMode: getPrimaryPersistenceMode(),
      storageLabel: getStorageLabel(getPrimaryPersistenceMode()),
      importedRows: 0,
      message: "The CSV file did not contain any importable rows.",
    };
  }

  if (!hasPrimaryDatabaseConfig()) {
    return importFallbackCsvDataset(dataset, rows);
  }

  if (hasDynamoDbConfig()) {
    try {
      return await importDynamoDbCsvDataset(dataset, rows);
    } catch (error) {
      console.error("Failed to import CSV dataset into DynamoDB, using fallback store.", error);
      return importFallbackCsvDataset(dataset, rows);
    }
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      ok: false,
      persistenceMode: "fallback",
      storageLabel: "Fallback store",
      importedRows: 0,
      message: "Prisma client could not be initialized.",
    };
  }

  if (dataset === "incidents") {
    let importedRows = 0;

    for (const row of rows) {
      const id = row.incident_id || row.id;
      const title = row.title;

      if (!id || !title) {
        continue;
      }

      const summary = row.summary || "Imported incident record";
      const supplier = row.supplier || "Unknown supplier";
      const supplierLot = row.supplier_lot || row.lot || "UNKNOWN-LOT";
      const severity = row.severity || "Severity B";
      const affectedSkus = Number(row.affected_skus || 0);
      const affectedOrders = Number(row.affected_orders || 0);
      const affectedLocations = Number(row.affected_locations || 0);
      const impactedRevenue = Number(row.impacted_revenue || 0);
      const complianceState = row.compliance_state || "Imported from CSV";
      const notificationsQueued = Number(row.notifications_queued || 0);

      await prisma.incident.upsert({
        where: { id },
        update: {
          title,
          summary,
          supplier,
          supplierLot,
          severity,
          affectedSkus,
          affectedOrders,
          affectedLocations,
          impactedRevenue,
          complianceState,
          notificationsQueued,
          lastUpdatedAt: new Date(),
        },
        create: {
          id,
          title,
          summary,
          supplier,
          supplierLot,
          severity,
          affectedSkus,
          affectedOrders,
          affectedLocations,
          impactedRevenue,
          complianceState,
          notificationsQueued,
          startedAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      importedRows += 1;
    }

    const result: CsvImportResult = {
      ok: importedRows > 0,
      persistenceMode: "database",
      storageLabel: "PostgreSQL",
      importedRows,
      message:
        importedRows > 0
          ? `Imported ${importedRows} incident rows into PostgreSQL.`
          : "No valid incident rows were found. Required columns: incident_id or id, and title.",
    };

    if (result.ok) {
      await appendImportActivity({
        action: "CSV incidents import",
        persistenceMode: "database",
        detail: result.message,
      });
    }

    return result;
  }

  if (dataset === "locations") {
    let importedRows = 0;

    for (const row of rows) {
      const incidentId = row.incident_id;
      const name = row.name;

      if (!incidentId || !name) {
        continue;
      }

      const incident = await prisma.incident.findUnique({ where: { id: incidentId } });

      if (!incident) {
        continue;
      }

      await prisma.impactLocation.create({
        data: {
          incidentId,
          name,
          type: row.type || "Retail",
          region: row.region || "Unknown",
          status: row.status || "Pending review",
          affectedUnits: Number(row.affected_units || 0),
          owner: row.owner || "Unassigned",
          sortOrder: Number(row.sort_order || importedRows),
        },
      });

      const affectedLocationsCount = await prisma.impactLocation.count({
        where: { incidentId },
      });

      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          affectedLocations: affectedLocationsCount,
        },
      });

      importedRows += 1;
    }

    const result: CsvImportResult = {
      ok: importedRows > 0,
      persistenceMode: "database",
      storageLabel: "PostgreSQL",
      importedRows,
      message:
        importedRows > 0
          ? `Imported ${importedRows} impacted location rows.`
          : "No valid location rows were found. Required columns: incident_id and name.",
    };

    if (result.ok) {
      await appendImportActivity({
        action: "CSV locations import",
        persistenceMode: "database",
        detail: result.message,
      });
    }

    return result;
  }

  let importedRows = 0;

  for (const row of rows) {
    const incidentId = row.incident_id;
    const id = row.task_id || row.id;
    const title = row.title;

    if (!incidentId || !id || !title) {
      continue;
    }

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });

    if (!incident) {
      continue;
    }

    await prisma.recallTask.upsert({
      where: { id },
      update: {
        incidentId,
        title,
        team: row.team || "Imported Ops",
        dueIn: row.due_in || "TBD",
        status: row.status || "Queued",
        assignee: row.assignee || "Unassigned",
        sortOrder: Number(row.sort_order || importedRows),
      },
      create: {
        id,
        incidentId,
        title,
        team: row.team || "Imported Ops",
        dueIn: row.due_in || "TBD",
        status: row.status || "Queued",
        assignee: row.assignee || "Unassigned",
        sortOrder: Number(row.sort_order || importedRows),
      },
    });

    importedRows += 1;
  }

  const result: CsvImportResult = {
    ok: importedRows > 0,
    persistenceMode: "database",
    storageLabel: "PostgreSQL",
    importedRows,
    message:
      importedRows > 0
        ? `Imported ${importedRows} task rows.`
        : "No valid task rows were found. Required columns: incident_id, task_id or id, and title.",
  };

  if (result.ok) {
    await appendImportActivity({
      action: "CSV tasks import",
      persistenceMode: "database",
      detail: result.message,
    });
  }

  return result;
}