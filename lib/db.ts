import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb"
import { awsCredentialsProvider } from "@vercel/functions/oidc"
import { nanoid } from "nanoid"
import { getPlan, type PlanKey } from "./plans"
import type { AuditEvent, Decision, Incident, IncidentStatus, IntakeMethod, Posture } from "./types"

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME

/**
 * Single-table design on a composite (pk + sk) key.
 *
 *   pk = RECALLZERO   sk = INCIDENT#<id>                    -> the incident record
 *   pk = RECALLZERO   sk = AUDIT#<incidentId>#<ts>#<id>      -> audit timeline event
 *   pk = RECALLZERO   sk = WORKSPACE#default                 -> customer workspace and credit state
 *   pk = RECALLZERO   sk = WORKSPACE_ADMIN#default           -> workspace admin/security controls
 *   pk = RECALLZERO   sk = CONNECTOR#<key>                   -> non-secret connector configuration
 *
 * This matches the existing AWS table already provisioned for the hackathon
 * app and avoids table-wide Scan permissions in production.
 */
const APP_PK = "RECALLZERO"
const INCIDENT_SK_PREFIX = "INCIDENT#"
const AUDIT_SK_PREFIX = "AUDIT#"
const WORKSPACE_SK = "WORKSPACE#default"
const WORKSPACE_ADMIN_SK = "WORKSPACE_ADMIN#default"
const CONNECTOR_SK_PREFIX = "CONNECTOR#"
const incidentSk = (id: string) => `${INCIDENT_SK_PREFIX}${id}`
const auditSkPrefix = (incidentId: string) => `${AUDIT_SK_PREFIX}${incidentId}#`
const auditSk = (incidentId: string, at: number, id: string) => `${auditSkPrefix(incidentId)}${String(at).padStart(15, "0")}#${id}`
const connectorSk = (key: string) => `${CONNECTOR_SK_PREFIX}${key}`
const workspacePk = (workspaceId?: string) => (workspaceId && workspaceId !== "default" ? `WORKSPACE#${workspaceId}` : APP_PK)

const credentials = process.env.AWS_ROLE_ARN
  ? awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN,
      clientConfig: { region: process.env.AWS_REGION },
    })
  : undefined

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials,
})

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

interface IncidentItem extends Incident {
  [key: string]: unknown
  pk: string
  sk: string
  entity: "incident"
}

interface AuditItem extends AuditEvent {
  [key: string]: unknown
  pk: string
  sk: string
  entity: "audit"
}

export interface WorkspaceProfile {
  id: string
  name: string
  planKey: PlanKey
  monthlyCredits: number
  creditsUsed: number
  billingStatus: "demo" | "active" | "past_due" | "canceled"
  currentPeriodStart: number
  currentPeriodEnd: number
  createdAt: number
  updatedAt: number
}

export interface ConnectorConfigRecord {
  key: string
  authMethod: string
  sourceEndpoint: string
  secretReference?: string
  syncCadence: string
  routingQueue: string
  fieldMapping: string
  status: "draft" | "saved" | "connected"
  lastTestedAt?: number
  updatedAt: number
}

export interface WorkspaceAdminRecord {
  workspaceId: string
  webhookSecretHash?: string
  webhookSecretPreview?: string
  webhookSecretRotatedAt?: number
  webhookSecretRotatedBy?: string
  updatedAt: number
}

interface WorkspaceItem extends WorkspaceProfile {
  [key: string]: unknown
  pk: string
  sk: string
  entity: "workspace"
}

interface ConnectorConfigItem extends ConnectorConfigRecord {
  [key: string]: unknown
  pk: string
  sk: string
  entity: "connector_config"
}

interface WorkspaceAdminItem extends WorkspaceAdminRecord {
  [key: string]: unknown
  pk: string
  sk: string
  entity: "workspace_admin"
}

function creditLimitForPlan(planKey: PlanKey) {
  const plan = getPlan(planKey)
  return typeof plan.decisionsPerMonth === "number" ? plan.decisionsPerMonth : 1000
}

export async function getWorkspace(workspaceId?: string): Promise<WorkspaceProfile> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: workspacePk(workspaceId), sk: WORKSPACE_SK },
    }),
  )
  if (result.Item) return stripKeys(result.Item as WorkspaceItem) as unknown as WorkspaceProfile
  return upsertWorkspace(workspaceId ? "free" : "program", workspaceId)
}

export async function upsertWorkspace(planKey: PlanKey, workspaceId?: string, options?: { name?: string }): Promise<WorkspaceProfile> {
  const now = Date.now()
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: workspacePk(workspaceId), sk: WORKSPACE_SK },
    }),
  )
  const current = existing.Item ? (stripKeys(existing.Item as WorkspaceItem) as unknown as WorkspaceProfile) : null
  const monthlyCredits = creditLimitForPlan(planKey)
  const workspace: WorkspaceProfile = {
    id: workspaceId || "default",
    name: current?.name || options?.name || (workspaceId ? `${workspaceId} workspace` : "NorthRiver Foods workspace"),
    planKey,
    monthlyCredits,
    creditsUsed: current?.planKey === planKey ? current.creditsUsed : 0,
    billingStatus: planKey === "free" ? "demo" : "active",
    currentPeriodStart: current?.currentPeriodStart || now,
    currentPeriodEnd: current?.currentPeriodEnd || now + 1000 * 60 * 60 * 24 * 30,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(workspaceId), sk: WORKSPACE_SK, entity: "workspace", ...workspace },
    }),
  )
  return workspace
}

export async function updateWorkspaceBilling(input: {
  planKey?: PlanKey
  billingStatus: WorkspaceProfile["billingStatus"]
  workspaceId?: string
}): Promise<WorkspaceProfile> {
  const current = await getWorkspace(input.workspaceId)
  const planKey = input.planKey || current.planKey
  const workspace: WorkspaceProfile = {
    ...current,
    planKey,
    monthlyCredits: creditLimitForPlan(planKey),
    billingStatus: input.billingStatus,
    updatedAt: Date.now(),
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(input.workspaceId), sk: WORKSPACE_SK, entity: "workspace", ...workspace },
    }),
  )
  return workspace
}

export async function consumeWorkspaceCredit(workspaceId?: string): Promise<{ ok: true; workspace: WorkspaceProfile } | { ok: false; workspace: WorkspaceProfile }> {
  const workspace = await getWorkspace(workspaceId)
  if (workspace.creditsUsed >= workspace.monthlyCredits) {
    return { ok: false, workspace }
  }
  const updated: WorkspaceProfile = {
    ...workspace,
    creditsUsed: workspace.creditsUsed + 1,
    updatedAt: Date.now(),
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(workspaceId), sk: WORKSPACE_SK, entity: "workspace", ...updated },
    }),
  )
  return { ok: true, workspace: updated }
}

export async function getConnectorConfig(key: string, workspaceId?: string): Promise<ConnectorConfigRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: workspacePk(workspaceId), sk: connectorSk(key) },
    }),
  )
  if (!result.Item) return null
  return stripKeys(result.Item as ConnectorConfigItem) as unknown as ConnectorConfigRecord
}

export async function listConnectorConfigs(workspaceId?: string): Promise<ConnectorConfigRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": workspacePk(workspaceId),
        ":sk": CONNECTOR_SK_PREFIX,
      },
    }),
  )
  return ((result.Items || []) as ConnectorConfigItem[]).map((item) => stripKeys(item) as unknown as ConnectorConfigRecord)
}

export async function saveConnectorConfig(input: Omit<ConnectorConfigRecord, "updatedAt">, workspaceId?: string): Promise<ConnectorConfigRecord> {
  const config: ConnectorConfigRecord = { ...input, updatedAt: Date.now() }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(workspaceId), sk: connectorSk(input.key), entity: "connector_config", ...config },
    }),
  )
  return config
}

export async function getWorkspaceAdmin(workspaceId?: string): Promise<WorkspaceAdminRecord> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: workspacePk(workspaceId), sk: WORKSPACE_ADMIN_SK },
    }),
  )
  if (result.Item) return stripKeys(result.Item as WorkspaceAdminItem) as unknown as WorkspaceAdminRecord
  return {
    workspaceId: workspaceId || "default",
    updatedAt: Date.now(),
  }
}

export async function saveWorkspaceAdmin(input: WorkspaceAdminRecord, workspaceId?: string): Promise<WorkspaceAdminRecord> {
  const record: WorkspaceAdminRecord = { ...input, workspaceId: workspaceId || "default", updatedAt: Date.now() }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(workspaceId), sk: WORKSPACE_ADMIN_SK, entity: "workspace_admin", ...record },
    }),
  )
  return record
}

export async function listIncidents(workspaceId?: string): Promise<Incident[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": workspacePk(workspaceId),
        ":sk": INCIDENT_SK_PREFIX,
      },
    }),
  )
  const items = (result.Items || []) as IncidentItem[]
  return items
    .map(normalizeIncidentItem)
    .filter((incident): incident is Incident => Boolean(incident))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getIncident(incidentId: string, workspaceId?: string): Promise<Incident | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: workspacePk(workspaceId), sk: incidentSk(incidentId) },
    }),
  )
  if (!result.Item) return null
  return normalizeIncidentItem(result.Item as IncidentItem)
}

export async function createIncident(input: {
  title: string
  source: string
  intakeMethod: IntakeMethod
  rawSignal: string
  decision: Decision
  lotReference?: string
  affectedRegions?: string[]
  workspaceId?: string
}): Promise<Incident> {
  const now = Date.now()
  const id = nanoid(10)
  const incident: Incident = {
    id,
    title: input.title,
    source: input.source,
    intakeMethod: input.intakeMethod,
    rawSignal: input.rawSignal,
    status: "OPEN",
    decision: input.decision,
    lotReference: input.lotReference,
    affectedRegions: input.affectedRegions,
    createdAt: now,
    updatedAt: now,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(input.workspaceId), sk: incidentSk(id), entity: "incident", ...incident },
    }),
  )

  await appendAudit({
    incidentId: id,
    kind: "intake",
    summary: `Signal received via ${labelMethod(input.intakeMethod)} from ${input.source}. Initial posture: ${input.decision.posture}.`,
    posture: input.decision.posture,
    actor: "RecallZero Engine",
    workspaceId: input.workspaceId,
  })

  return incident
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  workspaceId?: string,
): Promise<Incident | null> {
  const existing = await getIncident(incidentId, workspaceId)
  if (!existing) return null

  const incident: Incident = {
    ...existing,
    status,
    updatedAt: Date.now(),
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(workspaceId), sk: incidentSk(incidentId), entity: "incident", ...incident },
    }),
  )

  await appendAudit({
    incidentId,
    kind: "note",
    summary: `Incident status changed to ${status}.`,
    actor: "Operator",
    workspaceId,
  })
  return incident
}

/**
 * Re-analyzes an incident after a follow-up signal arrives, folding the new
 * evidence into the incident's decision and writing a posture_change /
 * evidence_update audit event that records how the recommendation moved.
 */
export async function reviseDecision(input: {
  incidentId: string
  newDecision: Decision
  combinedSignal: string
  previousPosture: Posture
  newSignalSummary: string
  workspaceId?: string
}): Promise<Incident | null> {
  const now = Date.now()
  const existing = await getIncident(input.incidentId, input.workspaceId)
  if (!existing) return null

  const incident: Incident = {
    ...existing,
    decision: input.newDecision,
    rawSignal: input.combinedSignal,
    signalCount: (existing.signalCount || 1) + 1,
    updatedAt: now,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(input.workspaceId), sk: incidentSk(input.incidentId), entity: "incident", ...incident },
    }),
  )

  const moved = input.previousPosture !== input.newDecision.posture
  await appendAudit({
    incidentId: input.incidentId,
    kind: moved ? "posture_change" : "evidence_update",
    summary: moved
      ? `New signal folded in: ${input.newSignalSummary} Posture revised ${input.previousPosture} → ${input.newDecision.posture} (confidence ${input.newDecision.confidenceScore}/100).`
      : `New signal folded in: ${input.newSignalSummary} Posture held at ${input.newDecision.posture}; confidence now ${input.newDecision.confidenceScore}/100.`,
    posture: input.newDecision.posture,
    actor: "RecallZero Engine",
    at: now,
    workspaceId: input.workspaceId,
  })
  return incident
}

/** Records an operator action (acknowledge / override / escalate / resolve / export) on the audit trail. */
export async function recordAction(input: {
  incidentId: string
  action: NonNullable<AuditEvent["action"]>
  summary: string
  actor: string
  posture?: Posture
  setStatus?: IncidentStatus
  setAcknowledged?: boolean
  workspaceId?: string
}): Promise<{ incident: Incident | null; event: AuditEvent }> {
  const now = Date.now()
  const existing = await getIncident(input.incidentId, input.workspaceId)
  if (!existing) {
    const event = await appendAudit({
      incidentId: input.incidentId,
      kind: "action",
      action: input.action,
      summary: input.summary,
      posture: input.posture,
      actor: input.actor,
      at: now,
      workspaceId: input.workspaceId,
    })
    return { incident: null, event }
  }

  const incident: Incident = {
    ...existing,
    ...(input.setStatus ? { status: input.setStatus } : {}),
    ...(input.setAcknowledged !== undefined ? { acknowledged: input.setAcknowledged } : {}),
    updatedAt: now,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: workspacePk(input.workspaceId), sk: incidentSk(input.incidentId), entity: "incident", ...incident },
    }),
  )

  const event = await appendAudit({
    incidentId: input.incidentId,
    kind: "action",
    action: input.action,
    summary: input.summary,
    posture: input.posture,
    actor: input.actor,
    at: now,
    workspaceId: input.workspaceId,
  })
  return { incident, event }
}

export async function appendAudit(input: {
  incidentId: string
  kind: AuditEvent["kind"]
  action?: AuditEvent["action"]
  summary: string
  posture?: AuditEvent["posture"]
  actor: string
  at?: number
  workspaceId?: string
}): Promise<AuditEvent> {
  const now = input.at ?? Date.now()
  const id = nanoid(10)
  const event: AuditEvent = {
    id,
    incidentId: input.incidentId,
    kind: input.kind,
    action: input.action,
    summary: input.summary,
    posture: input.posture,
    actor: input.actor,
    createdAt: now,
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: workspacePk(input.workspaceId),
        sk: auditSk(input.incidentId, now, id),
        entity: "audit",
        ...event,
      },
    }),
  )
  return event
}

export async function getAuditTrail(incidentId: string, workspaceId?: string): Promise<AuditEvent[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": workspacePk(workspaceId),
        ":sk": auditSkPrefix(incidentId),
      },
      ScanIndexForward: false, // newest first
    }),
  )
  const items = (result.Items || []) as AuditItem[]
  return items.map(stripKeys) as unknown as AuditEvent[]
}

export async function deleteAllIncidents(workspaceId?: string): Promise<void> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": workspacePk(workspaceId) },
    }),
  )
  const items = ((result.Items || []) as { pk: string; sk: string }[]).filter(
    (item) => item.sk.startsWith(INCIDENT_SK_PREFIX) || item.sk.startsWith(AUDIT_SK_PREFIX),
  )
  // BatchWrite handles up to 25 items per request.
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME as string]: chunk.map((item) => ({
            DeleteRequest: { Key: { pk: item.pk, sk: item.sk } },
          })),
        },
      }),
    )
  }
}

function stripKeys<T extends Record<string, unknown>>(item: T): Omit<T, "pk" | "sk" | "entity"> {
  const copy = { ...item }
  delete copy.pk
  delete copy.sk
  delete copy.entity
  return copy
}

function normalizeIncidentItem(item: IncidentItem): Incident | null {
  const unwrapped = stripKeys(item) as Incident | { incident?: Record<string, unknown> }
  if ("decision" in unwrapped && typeof unwrapped.decision === "object" && unwrapped.decision) {
    return unwrapped as Incident
  }

  const legacy = "incident" in unwrapped ? unwrapped.incident : null
  if (!legacy || typeof legacy !== "object") {
    return null
  }

  const now = Date.now()
  const id = String(legacy.id ?? item.sk?.replace(INCIDENT_SK_PREFIX, "") ?? nanoid(10))
  const title = String(legacy.title ?? "Legacy recall incident")
  const severityText = String(legacy.severity ?? "Severity C")
  const severity = severityText.includes("A") ? "A" : severityText.includes("B") ? "B" : severityText.includes("D") ? "D" : "C"
  const impactedRevenue = typeof legacy.impactedRevenue === "number" ? legacy.impactedRevenue : 0
  const affectedLocations = typeof legacy.affectedLocations === "number" ? legacy.affectedLocations : 0
  const affectedOrders = typeof legacy.affectedOrders === "number" ? legacy.affectedOrders : 0
  const posture: Posture = severity === "A" ? "ACTIVATE" : "HOLD"

  return {
    id,
    title,
    source: String(legacy.supplier ?? "Imported legacy incident"),
    intakeMethod: "connector",
    rawSignal: String(legacy.summary ?? title),
    status: String(legacy.complianceState ?? "").toLowerCase().includes("resolved") ? "RESOLVED" : "OPEN",
    decision: {
      posture,
      confidence: severity === "A" ? "HIGH" : "MODERATE",
      confidenceScore: severity === "A" ? 86 : 72,
      severity,
      headline: posture === "ACTIVATE" ? "Activate containment for legacy incident" : "Hold pending supporting evidence",
      rationale: String(legacy.summary ?? "Legacy incident imported from the previous RecallZero dashboard dataset."),
      exposureEstimate: impactedRevenue > 0 ? `$${Math.round(impactedRevenue / 1000)}K` : "Unknown exposure",
      evidenceGaps: [
        {
          label: "Legacy evidence format",
          detail: "This incident was imported from the previous dashboard schema and should be re-analyzed before final disposition.",
          kind: "missing",
        },
      ],
      flipConditions: [
        {
          condition: "Fresh supplier, QA, or connector evidence confirms consumer exposure.",
          flipsTo: "ACTIVATE",
        },
      ],
      delayRisk: {
        trajectory: affectedLocations > 5 || affectedOrders > 50 ? "rising" : "steady",
        hoursUntilCritical: affectedLocations > 5 ? 8 : 24,
        narrative: "Legacy incident remains visible while the team gathers current evidence and confirms downstream exposure.",
      },
    },
    lotReference: typeof legacy.supplierLot === "string" ? legacy.supplierLot : undefined,
    affectedRegions: Array.isArray(legacy.locations)
      ? legacy.locations.map((location) => String((location as { region?: unknown }).region ?? "Unknown"))
      : undefined,
    createdAt: now,
    updatedAt: now,
  }
}

function labelMethod(method: IntakeMethod): string {
  switch (method) {
    case "paste":
      return "pasted text"
    case "email":
      return "forwarded email"
    case "webhook":
      return "webhook payload"
    case "connector":
      return "connected system"
  }
}
