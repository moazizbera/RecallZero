import type { RecallIncident } from "@/lib/recall-data";

type CsvRow = Record<string, string>;

const requiredHeaders = [
  "supplier",
  "supplier_lot",
  "product_family",
  "severity",
  "affected_orders",
  "affected_locations",
  "revenue_at_risk",
  "regions",
] as const;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function parseRows(content: string): CsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Source CSV must include a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Source CSV is missing required columns: ${missingHeaders.join(", ")}.`);
  }

  return lines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line);

    if (values.length !== headers.length) {
      throw new Error(`Row ${lineIndex + 2} has ${values.length} columns, expected ${headers.length}.`);
    }

    return headers.reduce<CsvRow>((row, header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
      return row;
    }, {});
  });
}

function parseInteger(value: string, field: string, rowLabel: string) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`${rowLabel}: ${field} must be an integer.`);
  }

  return parsed;
}

function parseSeverity(value: string, rowLabel: string): RecallIncident["severity"] {
  if (value === "Severity A" || value === "Severity B" || value === "Severity C") {
    return value;
  }

  throw new Error(`${rowLabel}: severity must be Severity A, Severity B, or Severity C.`);
}

function slugify(input: string) {
  return input.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase();
}

export function buildIncidentsFromSourceCsv(content: string): RecallIncident[] {
  const rows = parseRows(content);

  return rows.map((row, index) => {
    const rowLabel = `Row ${index + 2}`;
    const affectedOrders = parseInteger(row.affected_orders, "affected_orders", rowLabel);
    const affectedLocations = parseInteger(row.affected_locations, "affected_locations", rowLabel);
    const impactedRevenue = parseInteger(row.revenue_at_risk, "revenue_at_risk", rowLabel);
    const affectedSkus = parseInteger(row.affected_skus || "1", "affected_skus", rowLabel);
    const regions = row.regions.split("|").map((region) => region.trim()).filter(Boolean);
    const incidentId = row.incident_id?.trim() || `INC-${slugify(row.supplier)}-${String(index + 1).padStart(2, "0")}`;

    return {
      id: incidentId,
      supplier: row.supplier.trim(),
      supplierLot: row.supplier_lot.trim(),
      title: `${row.product_family.trim()} exposure generated from source imports`,
      summary: `Generated from supplier lot ${row.supplier_lot.trim()} with order exposure across ${regions.join(", ") || "multiple regions"}.`,
      severity: parseSeverity(row.severity.trim(), rowLabel),
      affectedSkus,
      affectedOrders,
      affectedLocations,
      impactedRevenue,
      startedAt: row.started_at?.trim() || "08:00 UTC",
      lastUpdated: row.last_updated?.trim() || "08:15 UTC",
      notificationsQueued: parseInteger(row.notifications_queued || String(Math.max(1, Math.ceil(affectedOrders / 40))), "notifications_queued", rowLabel),
      complianceState: row.compliance_state?.trim() || "Source import ready for review",
      metrics: [
        { label: "Orders traced", value: `${affectedOrders}`, delta: "Derived from uploaded order exposure" },
        { label: "Regions impacted", value: `${Math.max(1, regions.length)}`, delta: "Computed from source CSV" },
        { label: "Revenue at risk", value: `$${Math.round(impactedRevenue / 1000)}k`, delta: "Generated from imported exposure values" },
      ],
      locations: Array.from({ length: affectedLocations }, (_, locationIndex) => ({
        name: regions[locationIndex] ? `${regions[locationIndex]} response cluster` : `Response cluster ${locationIndex + 1}`,
        type: locationIndex === 0 ? "Warehouse" : "Retail",
        region: regions[locationIndex] || `Region ${locationIndex + 1}`,
        status: locationIndex === 0 ? "Locked" : "Pending review",
        affectedUnits: Math.max(40, Math.round(affectedOrders * 3.5 / Math.max(1, affectedLocations))),
        owner: locationIndex === 0 ? "Regional Warehouse Ops" : "Regional Store Ops",
      })),
      tasks: [
        {
          id: `${incidentId}-TASK-01`,
          title: "Lock affected inventory",
          team: "Warehouse Ops",
          dueIn: "15 min",
          status: "In progress",
          assignee: "Regional Warehouse Lead",
        },
        {
          id: `${incidentId}-TASK-02`,
          title: "Review store pull plan",
          team: "Field Ops",
          dueIn: "30 min",
          status: "Queued",
          assignee: "Regional Store Manager",
        },
        {
          id: `${incidentId}-TASK-03`,
          title: "Prepare compliance briefing",
          team: "Compliance",
          dueIn: "45 min",
          status: "Queued",
          assignee: "Compliance Lead",
        },
      ],
      timeline: [
        {
          time: row.started_at?.trim() || "08:00",
          title: "Source files ingested",
          detail: `Supplier lot ${row.supplier_lot.trim()} and related order exposure were imported into RecallZero.`,
        },
        {
          time: row.last_updated?.trim() || "08:15",
          title: "Incident generated",
          detail: `The system created an operational incident for ${row.product_family.trim()} using imported supplier and order data.`,
        },
      ],
      architecture: [
        "Operational source CSVs are transformed into incident records before reaching the dashboard.",
        "The generation flow uses the same repository boundary and Prisma persistence as manual seeds.",
        "This demonstrates how imported supplier and order data can trigger a real recall workflow.",
      ],
    };
  });
}