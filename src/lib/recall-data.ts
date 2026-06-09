export type IncidentSeverity = "Severity A" | "Severity B" | "Severity C";
export type TaskStatus = "In progress" | "Queued" | "Completed";
export type LocationStatus = "Locked" | "Pending review" | "Cleared";

export type IncidentMetric = {
  label: string;
  value: string;
  delta: string;
};

export type ImpactLocation = {
  name: string;
  type: "Warehouse" | "Retail";
  region: string;
  status: LocationStatus;
  affectedUnits: number;
  owner: string;
};

export type RecallTask = {
  id: string;
  title: string;
  team: string;
  dueIn: string;
  status: TaskStatus;
  assignee: string;
};

export type TimelineEvent = {
  time: string;
  title: string;
  detail: string;
};

export type RecallIncident = {
  id: string;
  supplier: string;
  supplierLot: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  affectedSkus: number;
  affectedOrders: number;
  affectedLocations: number;
  impactedRevenue: number;
  startedAt: string;
  lastUpdated: string;
  notificationsQueued: number;
  complianceState: string;
  metrics: IncidentMetric[];
  locations: ImpactLocation[];
  tasks: RecallTask[];
  timeline: TimelineEvent[];
  architecture: string[];
};

export type DashboardSnapshot = {
  headline: string;
  subheadline: string;
  summary: string;
  kpis: IncidentMetric[];
  incidents: RecallIncident[];
  architecturePrinciples: string[];
};

const incidents: RecallIncident[] = [
  {
    id: "INC-240601-A",
    supplier: "NorthRiver Ingredients",
    supplierLot: "NR-ACV-2406-19",
    title: "Contaminated apple cider vinegar concentrate",
    summary:
      "A supplier quality alert flagged one ingredient lot used in wellness gummies and protein bars across two fulfillment regions.",
    severity: "Severity A",
    affectedSkus: 12,
    affectedOrders: 186,
    affectedLocations: 16,
    impactedRevenue: 48250,
    startedAt: "08:12 UTC",
    lastUpdated: "10:04 UTC",
    notificationsQueued: 4,
    complianceState: "Regulatory review package in progress",
    metrics: [
      { label: "Response target", value: "9 min", delta: "-42% faster" },
      { label: "Units isolated", value: "4,280", delta: "+3 sites locked" },
      { label: "Orders traced", value: "186", delta: "100% coverage" },
    ],
    locations: [
      {
        name: "Atlanta Fulfillment Hub",
        type: "Warehouse",
        region: "US-East",
        status: "Locked",
        affectedUnits: 1430,
        owner: "Maya Patel",
      },
      {
        name: "Phoenix Distribution Center",
        type: "Warehouse",
        region: "US-West",
        status: "Locked",
        affectedUnits: 980,
        owner: "Chris Long",
      },
      {
        name: "14 Retail Stores",
        type: "Retail",
        region: "Multi-region",
        status: "Pending review",
        affectedUnits: 1870,
        owner: "Field Operations",
      },
    ],
    tasks: [
      {
        id: "TASK-01",
        title: "Lock sellable inventory for affected SKUs",
        team: "Warehouse Ops",
        dueIn: "15 min",
        status: "In progress",
        assignee: "Maya Patel",
      },
      {
        id: "TASK-02",
        title: "Prepare retail pull list and store instructions",
        team: "Field Ops",
        dueIn: "30 min",
        status: "Queued",
        assignee: "Jordan Hayes",
      },
      {
        id: "TASK-03",
        title: "Generate customer notification drafts",
        team: "Customer Support",
        dueIn: "45 min",
        status: "Queued",
        assignee: "Lina Hart",
      },
      {
        id: "TASK-04",
        title: "Export compliance event log for legal review",
        team: "Compliance",
        dueIn: "60 min",
        status: "Completed",
        assignee: "Sam Reid",
      },
    ],
    timeline: [
      {
        time: "08:12",
        title: "Supplier alert received",
        detail: "NorthRiver uploaded a contamination notice linked to lot NR-ACV-2406-19.",
      },
      {
        time: "08:19",
        title: "Blast-radius job completed",
        detail: "Recall graph linked 12 SKUs, 2 warehouses, 14 stores, and 186 orders.",
      },
      {
        time: "09:03",
        title: "Inventory lock issued",
        detail: "Warehouse holds published to east and west regional systems.",
      },
      {
        time: "10:04",
        title: "Executive digest refreshed",
        detail: "Revenue-at-risk and store pull status pushed to leadership dashboard.",
      },
    ],
    architecture: [
      "DynamoDB stores incident, activity, and response state for the submitted AWS-backed build with low-latency access.",
      "Vercel-hosted Next.js surfaces incident state through server-rendered dashboards and route handlers.",
      "Async workers compute blast radius, queue notifications, and keep incident metrics updated.",
    ],
  },
  {
    id: "INC-240531-B",
    supplier: "ClearSpring Labs",
    supplierLot: "CS-MGN-2405-04",
    title: "Packaging seal integrity anomaly",
    summary:
      "Seal failure risk detected in magnesium sachets shipped to retail and marketplace channels.",
    severity: "Severity B",
    affectedSkus: 4,
    affectedOrders: 54,
    affectedLocations: 7,
    impactedRevenue: 12800,
    startedAt: "14:40 UTC",
    lastUpdated: "16:10 UTC",
    notificationsQueued: 2,
    complianceState: "Monitoring in progress",
    metrics: [
      { label: "Orders held", value: "54", delta: "+12 since last sync" },
      { label: "Stores cleared", value: "5/7", delta: "71% complete" },
      { label: "Support load", value: "Low", delta: "No escalations" },
    ],
    locations: [
      {
        name: "Chicago Retail Cluster",
        type: "Retail",
        region: "Midwest",
        status: "Pending review",
        affectedUnits: 260,
        owner: "Field Operations",
      },
      {
        name: "Marketplace Reserve",
        type: "Warehouse",
        region: "US-Central",
        status: "Cleared",
        affectedUnits: 110,
        owner: "Nina Cho",
      },
    ],
    tasks: [
      {
        id: "TASK-05",
        title: "Complete retailer acknowledgement sweep",
        team: "Retail Success",
        dueIn: "20 min",
        status: "In progress",
        assignee: "Devon Price",
      },
      {
        id: "TASK-06",
        title: "Update compliance case note",
        team: "Compliance",
        dueIn: "1 hr",
        status: "Queued",
        assignee: "Rae Moss",
      },
    ],
    timeline: [
      {
        time: "14:40",
        title: "Quality signal detected",
        detail: "Seal pressure readings diverged outside tolerance on one line.",
      },
      {
        time: "15:05",
        title: "Retail pull initiated",
        detail: "Store supervisors received action lists and confirmation prompts.",
      },
    ],
    architecture: [
      "Same incident model reused across lower-severity events for consistent operations.",
      "Task orchestration stays isolated from customer messaging workflows.",
    ],
  },
];

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    headline: "RecallZero command center",
    subheadline: "Full-stack recall operations for brands that cannot afford blind spots.",
    summary:
      "A production-shaped incident workflow that turns one supplier alert into traceability, task orchestration, customer readiness, and compliance evidence.",
    kpis: [
      { label: "Open incidents", value: `${incidents.length}`, delta: "1 critical, 1 monitored" },
      { label: "Affected orders", value: "240", delta: "Across all active recalls" },
      { label: "Revenue at risk", value: "$61k", delta: "Updated every sync cycle" },
      { label: "Teams activated", value: "6", delta: "Ops, retail, support, legal" },
    ],
    incidents,
    architecturePrinciples: [
      "Traceability is modeled as core product data, not an afterthought.",
      "Every operator action becomes part of an auditable event stream.",
      "Front-end state reflects real operational workflows instead of generic dashboard chrome.",
    ],
  };
}

export function getIncidents(): RecallIncident[] {
  return incidents;
}

export function getIncidentById(incidentId: string) {
  return incidents.find((incident) => incident.id === incidentId);
}
