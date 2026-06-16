export type Posture = "HOLD" | "ACTIVATE" | "REJECT"

export type ConfidenceBand = "LOW" | "MODERATE" | "HIGH"

export type IntakeMethod = "paste" | "email" | "webhook" | "connector"

export type IncidentStatus = "OPEN" | "MONITORING" | "ESCALATED" | "RESOLVED"

export interface EvidenceGap {
  /** Short label for the missing or conflicting evidence */
  label: string
  /** Why this matters to the decision */
  detail: string
  /** "missing" | "conflicting" */
  kind: "missing" | "conflicting"
}

export interface FlipCondition {
  /** What new evidence or condition would change the recommendation */
  condition: string
  /** Which posture it would flip toward */
  flipsTo: Posture
}

export interface DelayRisk {
  /** Risk level if the team waits: "rising" | "steady" | "critical" */
  trajectory: "rising" | "steady" | "critical"
  /** Hours until delay materially changes the recommended posture */
  hoursUntilCritical: number
  /** Narrative on how waiting shifts the risk */
  narrative: string
}

export interface Decision {
  posture: Posture
  confidence: ConfidenceBand
  /** 0-100 numeric confidence used for visualizations */
  confidenceScore: number
  /** One-line headline recommendation */
  headline: string
  /** The reasoning behind the recommended posture */
  rationale: string
  evidenceGaps: EvidenceGap[]
  flipConditions: FlipCondition[]
  delayRisk: DelayRisk
  /** Severity band derived by the model: A (highest) - D */
  severity: "A" | "B" | "C" | "D"
  /** Estimated financial exposure range, human readable */
  exposureEstimate: string
}

export interface AuditEvent {
  id: string
  incidentId: string
  /** Type of state transition */
  kind: "intake" | "posture_change" | "evidence_update" | "note" | "action"
  summary: string
  /** Posture at the time of this event, if relevant */
  posture?: Posture
  /** For action events: the operator action taken */
  action?: "acknowledge" | "override" | "escalate" | "resolve" | "export"
  actor: string
  createdAt: number
}

export interface Incident {
  id: string
  title: string
  source: string
  intakeMethod: IntakeMethod
  /** Raw signal text submitted by the operator or connector */
  rawSignal: string
  status: IncidentStatus
  decision: Decision
  lotReference?: string
  affectedRegions?: string[]
  /** Number of signals folded into this incident (1 + follow-ups) */
  signalCount?: number
  /** Whether an operator has acknowledged the recommendation */
  acknowledged?: boolean
  createdAt: number
  updatedAt: number
}

export interface ConnectorSignal {
  connectorKey: string
  source: string
  subject: string
  lotReference?: string
  body: string
  receivedAt: number
}
