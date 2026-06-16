'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { CockpitBadge, CockpitConnectorKey, CockpitInputForm, CockpitTimelineItem, CockpitViewModel, ViewTone } from './view-model/types'

type SupplierInboxConnectorResponse = {
  ok: boolean
  message: string
  connectorLabel: string
  sourceType: string
  unreadCount: number
  lastSyncedAt: string | null
  latestNotice: {
    id: string
    threadId: string
    sender: string
    subject: string
    receivedAt: string
    summary: string
    noticeText: string
    supplier: string
    tags: string[]
  } | null
}

type QaSystemConnectorResponse = {
  ok: boolean
  message: string
  connectorLabel: string
  sourceType: string
  openAlertCount: number
  lastSyncedAt: string | null
  latestEvent: {
    id: string
    eventId: string
    plant: string
    alertType: string
    severity: string
    receivedAt: string
    summary: string
    noticeText: string
    supplier: string
    lotReference: string
    tags: string[]
  } | null
}

type ConnectorSettingsResponse = {
  ok: boolean
  setting: {
    connectorKey: string
    enabled: boolean
    tested: boolean
    lastTestStatus: 'success' | 'error' | null
    lastTestMessage: string | null
    lastCheckedAt: string | null
    lastEnabledAt: string | null
  }
}

const CONNECTOR_API_PROXY_BASE = '/connector-api'

function resolveConnectorApiBaseUrl() {
  const configuredBaseUrl = (process.env.NEXT_PUBLIC_CONNECTOR_API_BASE_URL as string | undefined)?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '')
  }

  return process.env.NODE_ENV === 'development' ? CONNECTOR_API_PROXY_BASE : null
}

async function fetchLatestSupplierInboxNotice() {
  const connectorApiBaseUrl = resolveConnectorApiBaseUrl()
  if (!connectorApiBaseUrl) {
    return null
  }

  const response = await fetch(`${connectorApiBaseUrl}/api/connectors/supplier-inbox`)
  return await response.json() as SupplierInboxConnectorResponse
}

async function fetchLatestQaSystemEvent() {
  const connectorApiBaseUrl = resolveConnectorApiBaseUrl()
  if (!connectorApiBaseUrl) {
    return null
  }

  const response = await fetch(`${connectorApiBaseUrl}/api/connectors/qa-system`)
  return await response.json() as QaSystemConnectorResponse
}

async function fetchConnectorSetting(connectorKey: Exclude<CockpitConnectorKey, 'none'>) {
  const connectorApiBaseUrl = resolveConnectorApiBaseUrl()
  if (!connectorApiBaseUrl) {
    return null
  }

  const response = await fetch(`${connectorApiBaseUrl}/api/connectors/settings/${connectorKey}`)
  return await response.json() as ConnectorSettingsResponse
}

async function persistConnectorSetting(
  connectorKey: Exclude<CockpitConnectorKey, 'none'>,
  patch: Partial<ConnectorSettingsResponse['setting']>,
) {
  const connectorApiBaseUrl = resolveConnectorApiBaseUrl()
  if (!connectorApiBaseUrl) {
    return null
  }

  const response = await fetch(`${connectorApiBaseUrl}/api/connectors/settings/${connectorKey}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  return await response.json() as ConnectorSettingsResponse
}

const intakeMethodOptions: Array<{
  value: CockpitInputForm['intakeMethod']
  label: string
  detail: string
  sourceType: string
  summary: string
  sample: string
}> = [
  {
    value: 'paste',
    label: 'Paste text',
    detail: 'Manual intake for judge-entered escalations and call notes.',
    sourceType: 'Manual operator intake',
    summary: 'Operator pasted a raw escalation note into RecallZero for immediate triage.',
    sample: 'Supplier escalation: Lot A14 may contain undeclared allergen exposure. Distribution scope unclear. Awaiting proof packet from plant QA.',
  },
  {
    value: 'email',
    label: 'Forwarded email',
    detail: 'Use a supplier or QA email body as the starting incident signal.',
    sourceType: 'Forwarded supplier email',
    summary: 'Forwarded inbox message converted into a triage-ready incident signal.',
    sample: 'From: supplier.alerts@northriver.example\nSubject: urgent lot hold review\nBody: We detected a packaging mismatch on shipped units. Retail distribution may already be active in two regions.',
  },
  {
    value: 'api',
    label: 'Webhook payload',
    detail: 'Paste an ops or marketplace event payload from another system.',
    sourceType: 'Incident webhook',
    summary: 'Webhook event arrived from an external monitoring or fulfillment system.',
    sample: '{\n  "event": "quality_incident",\n  "source": "marketplace-monitor",\n  "severity": "high",\n  "lots": ["A14", "A15"],\n  "regions": ["US-East", "US-South"],\n  "note": "Customer complaints spiked above threshold within 18 minutes."\n}',
  },
  {
    value: 'connector',
    label: 'Connected system',
    detail: 'Start with a connected source and prefill the incident details.',
    sourceType: 'Connected system',
    summary: 'Connected signal pulled into RecallZero so the case starts already filled in.',
    sample: 'Connected record ready. Choose a connector below to fill in the incident details.',
  },
]

const connectorOptions: Array<{
  value: Exclude<CockpitConnectorKey, 'none'>
  label: string
  detail: string
  status: string
  sourceType: string
  summary: string
  sample: string
}> = [
  {
    value: 'supplier-email',
    label: 'Supplier inbox',
    detail: 'Pulls escalations from shared supplier and plant inboxes.',
    status: 'Live connector',
    sourceType: 'Connected supplier inbox',
    summary: 'Supplier inbox escalation normalized into a triage packet.',
    sample: 'Connector: Supplier Inbox\nThread: NorthRiver escalation\nDetected issue: undeclared allergen on packaging variant\nAffected lots: A14, A15\nCurrent blocker: certificate packet missing',
  },
  {
    value: 'qa-system',
    label: 'QA system',
    detail: 'Imports internal quality holds and contradiction signals from QA teams.',
    status: 'Live connector',
    sourceType: 'Connected QA system',
    summary: 'Internal QA event imported to challenge or confirm the active posture.',
    sample: 'Connector: QA System\nAlert: line inspection mismatch\nPlant stance: hold shipment pending verification\nContradiction: severity lower than supplier claim according to internal sampling',
  },
  {
    value: 'erp-lot',
    label: 'ERP / lot traceability',
    detail: 'Brings lot exposure and distribution scope into the same decision surface.',
    status: 'Pilot connector',
    sourceType: 'Connected ERP traceability',
    summary: 'Traceability system exposed where affected lots already moved.',
    sample: 'Connector: ERP Traceability\nLots exposed: A14, A15\nWarehouses: Memphis, Newark\nRetail destinations: 42 stores\nNext trigger: outbound transfer scheduled in 35 minutes',
  },
  {
    value: 'returns-feed',
    label: 'Returns / complaints feed',
    detail: 'Aggregates customer complaints and returns spikes as an early-warning source.',
    status: 'Queued connector',
    sourceType: 'Connected complaints feed',
    summary: 'Customer complaints feed added timing pressure to the decision.',
    sample: 'Connector: Complaints Feed\nVelocity: 19 complaints in 14 minutes\nPattern: same SKU, same region cluster\nRisk note: signal may widen if retail stock remains active',
  },
]

const connectorActivity: Record<Exclude<CockpitConnectorKey, 'none'>, {
  syncLabel: string
  latency: string
  volume: string
  events: Array<{ time: string; title: string; detail: string }>
}> = {
  'supplier-email': {
    syncLabel: 'Synced 18 seconds ago',
    latency: 'Inbox to triage in 24s',
    volume: '12 supplier threads monitored',
    events: [
      {
        time: '08:12',
        title: 'Urgent supplier escalation detected',
        detail: 'Thread tagged for allergen exposure and forwarded into RecallZero intake.',
      },
      {
        time: '08:13',
        title: 'Lot references extracted',
        detail: 'A14 and A15 were normalized from the email body and attached to the incident packet.',
      },
      {
        time: '08:14',
        title: 'Proof packet still missing',
        detail: 'Connector kept the case live and flagged that certificate evidence is still outstanding.',
      },
    ],
  },
  'qa-system': {
    syncLabel: 'Synced 41 seconds ago',
    latency: 'QA alert to cockpit in 31s',
    volume: '4 active plant alerts',
    events: [
      {
        time: '08:10',
        title: 'Inspection mismatch imported',
        detail: 'QA hold event arrived from the plant line inspection system.',
      },
      {
        time: '08:11',
        title: 'Contradiction detected',
        detail: 'Internal sampling reduced the severity level compared with the supplier claim.',
      },
      {
        time: '08:13',
        title: 'Operator review required',
        detail: 'RecallZero flagged the case as a conflict review rather than a simple missing-data hold.',
      },
    ],
  },
  'erp-lot': {
    syncLabel: 'Synced 9 seconds ago',
    latency: 'Traceability refresh in 12s',
    volume: '42 downstream locations mapped',
    events: [
      {
        time: '08:09',
        title: 'Lot exposure expanded',
        detail: 'ERP traceability added warehouse and store destinations for the affected lots.',
      },
      {
        time: '08:10',
        title: 'Transfer deadline surfaced',
        detail: 'The next outbound movement created a timing trigger for the decision engine.',
      },
      {
        time: '08:12',
        title: 'Decision refreshed',
        detail: 'New distribution scope was pushed into the same recommendation contract without manual re-entry.',
      },
    ],
  },
  'returns-feed': {
    syncLabel: 'Synced 27 seconds ago',
    latency: 'Complaints signal in 19s',
    volume: '19 complaints in the last 14m',
    events: [
      {
        time: '08:08',
        title: 'Complaint spike detected',
        detail: 'Regional complaint velocity exceeded the configured threshold and opened a live incident.',
      },
      {
        time: '08:11',
        title: 'Pattern clustered',
        detail: 'Matching SKU and region pattern increased the timing pressure on the case.',
      },
      {
        time: '08:13',
        title: 'Escalation prioritized',
        detail: 'RecallZero elevated the incident in the queue because delay risk was rising.',
      },
    ],
  },
}

const connectorSetupProfiles: Record<Exclude<CockpitConnectorKey, 'none'>, {
  authLabel: string
  syncMode: string
  destination: string
  mappedFields: string[]
  setupSteps: Array<{ title: string; detail: string }>
}> = {
  'supplier-email': {
    authLabel: 'Shared inbox OAuth',
    syncMode: 'Thread polling every 30s',
    destination: 'Supplier escalation queue',
    mappedFields: ['sender -> source type', 'subject -> signal label', 'body -> incident payload', 'attachments -> evidence status'],
    setupSteps: [
      {
        title: 'Connect mailbox',
        detail: 'Authorize the supplier inbox and choose which labels or folders RecallZero should watch.',
      },
      {
        title: 'Map message fields',
        detail: 'Turn sender, subject, body, and attachment presence into a normalized incident packet.',
      },
      {
        title: 'Set escalation rules',
        detail: 'Define which suppliers, keywords, or severity markers should auto-open a recall review.',
      },
    ],
  },
  'qa-system': {
    authLabel: 'Service account token',
    syncMode: 'Event push with 15s refresh',
    destination: 'Internal quality contradiction lane',
    mappedFields: ['plant alert -> signal label', 'inspection result -> short summary', 'severity band -> scenario hint', 'hold state -> decision context'],
    setupSteps: [
      {
        title: 'Connect QA workspace',
        detail: 'Register the QA environment and choose which plants or inspection streams feed RecallZero.',
      },
      {
        title: 'Map contradiction signals',
        detail: 'Mark which QA fields can confirm or challenge a supplier claim inside the same case.',
      },
      {
        title: 'Enable live refresh',
        detail: 'Push new inspection events into the active recommendation without waiting for manual re-entry.',
      },
    ],
  },
  'erp-lot': {
    authLabel: 'ERP API key',
    syncMode: 'Lot trace refresh every 60s',
    destination: 'Exposure and traceability lane',
    mappedFields: ['lot id -> trace key', 'warehouse moves -> exposure path', 'store destinations -> affected locations', 'transfer deadline -> next trigger'],
    setupSteps: [
      {
        title: 'Connect traceability API',
        detail: 'Authorize the ERP or traceability endpoint and select the lot movement tables to monitor.',
      },
      {
        title: 'Map downstream footprint',
        detail: 'Translate locations, transfers, and destinations into the exposure model shown in RecallZero.',
      },
      {
        title: 'Set alert thresholds',
        detail: 'Trigger a review when lot movement reaches new warehouses, stores, or timing cutoffs.',
      },
    ],
  },
  'returns-feed': {
    authLabel: 'Webhook signing secret',
    syncMode: 'Event stream with rolling 5m aggregation',
    destination: 'Complaint velocity lane',
    mappedFields: ['complaint cluster -> signal label', 'SKU + region -> exposure clue', 'velocity score -> urgency', 'trend break -> reopen trigger'],
    setupSteps: [
      {
        title: 'Register the feed',
        detail: 'Point the complaints or returns stream at RecallZero and validate signed delivery.',
      },
      {
        title: 'Map pattern fields',
        detail: 'Map SKU, region, count, and complaint timing into the incident record.',
      },
      {
        title: 'Tune monitoring rules',
        detail: 'Choose the thresholds that should open or escalate a live incident automatically.',
      },
    ],
  },
}

function toneClasses(tone: ViewTone) {
  switch (tone) {
    case 'accent':
      return 'border-[#65d8ff]/25 bg-[#65d8ff]/12 text-[#9deaff]'
    case 'warning':
      return 'border-[#ffcb6b]/25 bg-[#ffcb6b]/12 text-[#ffe29c]'
    case 'critical':
      return 'border-[#ff6d6d]/25 bg-[#ff6d6d]/12 text-[#ffadad]'
    case 'safe':
      return 'border-[#48d28d]/25 bg-[#48d28d]/12 text-[#95f4c1]'
    default:
      return 'border-white/10 bg-white/[0.04] text-white/72'
  }
}

function actionToneClasses(tone: 'primary' | 'secondary') {
  return tone === 'primary'
    ? 'bg-[linear-gradient(135deg,#8de8ff_0%,#65d8ff_45%,#339bc2_100%)] text-[#041019] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(45,155,194,0.28)]'
    : 'border border-white/10 bg-white/[0.04] text-white/78 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:text-white'
}

function heroToneClasses(tone: ViewTone) {
  switch (tone) {
    case 'critical':
      return 'border-[#ff6d6d]/22 bg-[radial-gradient(circle_at_top,#452125_0%,rgba(18,11,12,0.96)_62%)]'
    case 'warning':
      return 'border-[#ffcb6b]/22 bg-[radial-gradient(circle_at_top,#4a3720_0%,rgba(18,13,8,0.96)_62%)]'
    case 'safe':
      return 'border-[#48d28d]/22 bg-[radial-gradient(circle_at_top,#1f4332_0%,rgba(9,14,12,0.96)_62%)]'
    default:
      return 'border-[#65d8ff]/18 bg-[radial-gradient(circle_at_top,#1a3442_0%,rgba(8,15,21,0.96)_62%)]'
  }
}

function indicatorToneClasses(tone: ViewTone) {
  switch (tone) {
    case 'critical':
      return 'bg-[#ff6d6d]'
    case 'warning':
      return 'bg-[#ffcb6b]'
    case 'safe':
      return 'bg-[#48d28d]'
    default:
      return 'bg-[#65d8ff]'
  }
}

function ShellCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass soft-panel-shadow rounded-[1.6rem] border border-white/6 bg-[var(--panel)] p-5 md:p-6 ${className}`}>{children}</section>
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8de8ff]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white md:text-[1.85rem]">{title}</h2>
      {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{description}</p> : null}
    </div>
  )
}

function Badge({ badge }: { badge: CockpitBadge }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${toneClasses(badge.tone)}`}>{badge.label}</span>
}

function ActionButton({ children, tone, onClick, disabled = false }: { children: ReactNode; tone: 'primary' | 'secondary'; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:border disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-white/34 ${actionToneClasses(tone)}`}
    >
      {children}
    </button>
  )
}

function SelectCard({ title, detail, active, meta, onClick }: { title: string; detail: string; active: boolean; meta?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition-all duration-200 ${active ? 'border-[#65d8ff]/40 bg-[#65d8ff]/10 shadow-[0_12px_28px_rgba(31,122,156,0.18)]' : 'border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        {meta ? <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8de8ff]">{meta}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-white/68">{detail}</p>
    </button>
  )
}

function ConnectorOperationsPanel({ connectorKey }: { connectorKey: Exclude<CockpitConnectorKey, 'none'> }) {
  const activity = connectorActivity[connectorKey]

  return (
    <div className="rounded-[1.4rem] border border-[#65d8ff]/20 bg-[linear-gradient(180deg,rgba(101,216,255,0.08),rgba(255,255,255,0.03))] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Connector operations</p>
          <p className="mt-2 text-sm leading-6 text-white/72">View sync status, update speed, and recent connector activity in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: activity.syncLabel, tone: 'accent' }} />
          <Badge badge={{ label: activity.latency, tone: 'neutral' }} />
          <Badge badge={{ label: activity.volume, tone: 'warning' }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {activity.events.map((event) => (
          <div key={`${event.time}-${event.title}`} className="rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{event.time}</p>
            <p className="mt-3 text-sm font-semibold text-white">{event.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/68">{event.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectorSettingsPanel({ connectorKey, onConnectorEnabled }: { connectorKey: Exclude<CockpitConnectorKey, 'none'>; onConnectorEnabled?: () => void }) {
  const connector = connectorOptions.find((item) => item.value === connectorKey)
  const profile = connectorSetupProfiles[connectorKey]
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [isHydratingState, setIsHydratingState] = useState(false)
  const [isConnectionTesting, setIsConnectionTesting] = useState(false)
  const [isConnectionTested, setIsConnectionTested] = useState(false)
  const [connectionTestNotice, setConnectionTestNotice] = useState<string | null>(null)
  const [supplierInboxTestResult, setSupplierInboxTestResult] = useState<SupplierInboxConnectorResponse | null>(null)
  const [isPersistingEnable, setIsPersistingEnable] = useState(false)
  const [isConnectorEnabled, setIsConnectorEnabled] = useState(false)

  if (!connector) {
    return null
  }

  useEffect(() => {
    let isMounted = true

    const hydrateConnectorState = async () => {
      setIsHydratingState(true)

      try {
        const payload = await fetchConnectorSetting(connectorKey)
        if (!isMounted || !payload?.ok) {
          return
        }

        setIsConnectorEnabled(payload.setting.enabled)
        setIsConnectionTested(payload.setting.tested)
        setConnectionTestNotice(payload.setting.lastTestMessage)
      } finally {
        if (isMounted) {
          setIsHydratingState(false)
        }
      }
    }

    void hydrateConnectorState()

    return () => {
      isMounted = false
    }
  }, [connectorKey])

  const [qaSystemTestResult, setQaSystemTestResult] = useState<QaSystemConnectorResponse | null>(null)

  const testConnection = async () => {
    if (connectorKey === 'qa-system') {
      setIsConnectionTesting(true)
      setConnectionTestNotice('Checking the live QA system feed...')

      try {
        const payload = await fetchLatestQaSystemEvent()
        setQaSystemTestResult(payload)

        if (payload?.ok && payload.latestEvent) {
          setIsConnectionTested(true)
          setConnectionTestNotice(payload.message)
          await persistConnectorSetting(connectorKey, {
            tested: true,
            lastTestStatus: 'success',
            lastTestMessage: payload.message,
            lastCheckedAt: payload.lastSyncedAt ?? new Date().toISOString(),
          })
          return
        }

        setIsConnectionTested(false)
        setConnectionTestNotice(payload?.message ?? 'QA system feed is unavailable right now.')
        await persistConnectorSetting(connectorKey, {
          tested: false,
          lastTestStatus: 'error',
          lastTestMessage: payload?.message ?? 'QA system feed is unavailable right now.',
          lastCheckedAt: new Date().toISOString(),
        })
      } catch {
        setIsConnectionTested(false)
        setConnectionTestNotice('QA system feed is unavailable right now.')
        await persistConnectorSetting(connectorKey, {
          tested: false,
          lastTestStatus: 'error',
          lastTestMessage: 'QA system feed is unavailable right now.',
          lastCheckedAt: new Date().toISOString(),
        })
      } finally {
        setIsConnectionTesting(false)
      }

      return
    }

    if (connectorKey !== 'supplier-email') {
      setIsConnectionTested(true)
      setConnectionTestNotice('Connection verified.')
      await persistConnectorSetting(connectorKey, {
        tested: true,
        lastTestStatus: 'success',
        lastTestMessage: 'Connection verified.',
        lastCheckedAt: new Date().toISOString(),
      })
      return
    }

    setIsConnectionTesting(true)
    setConnectionTestNotice('Checking the live supplier inbox feed...')

    try {
      const payload = await fetchLatestSupplierInboxNotice()
      setSupplierInboxTestResult(payload)

      if (payload?.ok && payload.latestNotice) {
        setIsConnectionTested(true)
        setConnectionTestNotice(payload.message)
        await persistConnectorSetting(connectorKey, {
          tested: true,
          lastTestStatus: 'success',
          lastTestMessage: payload.message,
          lastCheckedAt: payload.lastSyncedAt ?? new Date().toISOString(),
        })
        return
      }

      setIsConnectionTested(false)
      setConnectionTestNotice(payload?.message ?? 'Supplier inbox feed is unavailable right now.')
      await persistConnectorSetting(connectorKey, {
        tested: false,
        lastTestStatus: 'error',
        lastTestMessage: payload?.message ?? 'Supplier inbox feed is unavailable right now.',
        lastCheckedAt: new Date().toISOString(),
      })
    } catch {
      setIsConnectionTested(false)
      setConnectionTestNotice('Supplier inbox feed is unavailable right now.')
      await persistConnectorSetting(connectorKey, {
        tested: false,
        lastTestStatus: 'error',
        lastTestMessage: 'Supplier inbox feed is unavailable right now.',
        lastCheckedAt: new Date().toISOString(),
      })
    } finally {
      setIsConnectionTesting(false)
    }
  }

  const enableConnector = async () => {
    setIsPersistingEnable(true)

    try {
      const payload = await persistConnectorSetting(connectorKey, {
        enabled: true,
        tested: isConnectionTested,
        lastEnabledAt: new Date().toISOString(),
      })

      setIsConnectorEnabled(payload?.setting.enabled ?? true)
      onConnectorEnabled?.()
    } finally {
      setIsPersistingEnable(false)
    }
  }

  return (
    <div className="rounded-[1.4rem] border border-[#48d28d]/20 bg-[linear-gradient(180deg,rgba(72,210,141,0.08),rgba(255,255,255,0.03))] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#95f4c1]">Connector settings</p>
          <p className="mt-2 text-sm leading-6 text-white/72">Review access, field mapping, sync rules, and destination for {connector.label}.</p>
          {isHydratingState ? <p className="mt-2 text-xs leading-5 text-white/56">Loading saved connector state...</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge badge={{ label: profile.authLabel, tone: 'safe' }} />
          <Badge badge={{ label: profile.syncMode, tone: 'accent' }} />
          <ActionButton tone="secondary" onClick={() => setIsSetupOpen((value) => !value)}>{isSetupOpen ? 'Hide setup' : 'Add connector'}</ActionButton>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Connector type</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{connector.label}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Destination</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{profile.destination}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Status</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{isConnectorEnabled ? 'Enabled in RecallZero' : connector.status}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Setup flow</p>
          <div className="mt-4 space-y-3">
            {profile.setupSteps.map((step, index) => (
              <div key={step.title} className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-white">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Field mapping</p>
          <div className="mt-4 space-y-2">
            {profile.mappedFields.map((field) => (
              <div key={field} className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-white/74">
                {field}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isSetupOpen ? (
        <div className="mt-4 rounded-[1.2rem] border border-[#8de8ff]/18 bg-[linear-gradient(135deg,rgba(101,216,255,0.12),rgba(255,255,255,0.03))] px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Connector setup drawer</p>
              <p className="mt-2 text-sm leading-6 text-white/72">Set up {connector.label} so it is ready for connected intake.</p>
            </div>
            <Badge badge={{ label: 'Setup steps', tone: 'accent' }} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]">Step 1</p>
              <p className="mt-2 text-sm font-semibold text-white">Authorize source</p>
              <p className="mt-2 text-sm leading-6 text-white/70">Grant {profile.authLabel} access so RecallZero can read this source.</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]">Step 2</p>
              <p className="mt-2 text-sm font-semibold text-white">Map fields</p>
              <p className="mt-2 text-sm leading-6 text-white/70">Choose how source fields fill the incident details.</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]">Step 3</p>
              <p className="mt-2 text-sm font-semibold text-white">Enable sync rules</p>
              <p className="mt-2 text-sm leading-6 text-white/70">Turn on refresh timing, alert rules, and the destination for incoming incidents.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton tone="primary" onClick={() => void testConnection()} disabled={isConnectionTesting}>{isConnectionTesting ? 'Testing connection...' : isConnectionTested ? 'Connection verified' : 'Test connection'}</ActionButton>
            <ActionButton tone="secondary" onClick={() => void enableConnector()} disabled={!isConnectionTested || isConnectorEnabled || isPersistingEnable}>{isPersistingEnable ? 'Saving connector...' : isConnectorEnabled ? 'Connector enabled' : 'Enable connector'}</ActionButton>
          </div>

          {connectionTestNotice ? (
            <p className="mt-3 text-sm leading-6 text-[#d9f8ff]">{connectionTestNotice}</p>
          ) : null}

          {isConnectionTested ? (
            <div className="mt-4 rounded-[1.1rem] border border-[#48d28d]/20 bg-[#48d28d]/10 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#95f4c1]">Connection test result</p>
                  <p className="mt-2 text-sm font-semibold text-white">{connector.label} authenticated successfully.</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{connectorKey === 'supplier-email' ? 'RecallZero reached the live supplier inbox feed and loaded the latest notice successfully.' : connectorKey === 'qa-system' ? 'RecallZero reached the live QA system feed and loaded the latest inspection alert successfully.' : 'RecallZero received a sample payload and confirmed the mapped fields fill the incident record correctly.'}</p>
                </div>
                <Badge badge={{ label: isConnectorEnabled ? 'Live in workspace' : 'Ready to enable', tone: isConnectorEnabled ? 'safe' : 'accent' }} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">Authenticated</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">{profile.authLabel}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">Last sync</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">{connectorKey === 'supplier-email' ? (supplierInboxTestResult?.lastSyncedAt ?? 'Live inbox check completed') : connectorKey === 'qa-system' ? (qaSystemTestResult?.lastSyncedAt ?? 'Live QA check completed') : 'Moments ago during connector test'}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">Latest payload</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">{connectorKey === 'supplier-email' ? (supplierInboxTestResult?.latestNotice?.subject ?? 'Validated and ready for live intake') : connectorKey === 'qa-system' ? (qaSystemTestResult?.latestEvent ? `${qaSystemTestResult.latestEvent.alertType} — ${qaSystemTestResult.latestEvent.plant}` : 'Validated and ready for live intake') : 'Validated and ready for live intake'}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function QaSystemSyncPanel({
  onSync,
  isSyncing,
  syncNotice,
}: {
  onSync: () => void
  isSyncing: boolean
  syncNotice: string | null
}) {
  return (
    <div className="rounded-[1.25rem] border border-[#65d8ff]/22 bg-[linear-gradient(135deg,rgba(76,184,255,0.12),rgba(255,255,255,0.03))] px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">QA system sync</p>
          <p className="mt-2 text-sm leading-6 text-white/74">Load the latest QA inspection alert from the connected QA platform into this intake form.</p>
          {syncNotice ? <p className="mt-2 text-sm leading-6 text-[#d9f8ff]">{syncNotice}</p> : null}
        </div>
        <ActionButton tone="secondary" onClick={onSync} disabled={isSyncing}>{isSyncing ? 'Syncing QA alerts...' : 'Sync latest alert'}</ActionButton>
      </div>
    </div>
  )
}

function SupplierInboxSyncPanel({
  onSync,
  isSyncing,
  syncNotice,
}: {
  onSync: () => void
  isSyncing: boolean
  syncNotice: string | null
}) {
  return (
    <div className="rounded-[1.25rem] border border-[#8de8ff]/20 bg-[linear-gradient(135deg,rgba(101,216,255,0.12),rgba(255,255,255,0.03))] px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Supplier inbox sync</p>
          <p className="mt-2 text-sm leading-6 text-white/74">Load the latest supplier inbox notice from the live connector feed into this intake form.</p>
          {syncNotice ? <p className="mt-2 text-sm leading-6 text-[#d9f8ff]">{syncNotice}</p> : null}
        </div>
        <ActionButton tone="secondary" onClick={onSync} disabled={isSyncing}>{isSyncing ? 'Syncing inbox...' : 'Sync latest notice'}</ActionButton>
      </div>
    </div>
  )
}

function intakeMethodLabel(inputForm: CockpitInputForm) {
  if (inputForm.intakeMethod === 'connector') {
    const connector = connectorOptions.find((item) => item.value === inputForm.connectorKey)
    return connector ? connector.label : 'Connected system'
  }

  const option = intakeMethodOptions.find((item) => item.value === inputForm.intakeMethod)
  return option?.label ?? 'Manual intake'
}

function LiveConnectorBanner({ connectorKey }: { connectorKey: Exclude<CockpitConnectorKey, 'none'> }) {
  const connector = connectorOptions.find((item) => item.value === connectorKey)
  const profile = connectorSetupProfiles[connectorKey]

  if (!connector) {
    return null
  }

  return (
    <div className="rounded-[1.3rem] border border-[#48d28d]/20 bg-[linear-gradient(135deg,rgba(72,210,141,0.14),rgba(255,255,255,0.03))] px-4 py-4 md:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#95f4c1]">Live connector enabled</p>
          <p className="mt-2 text-sm font-semibold text-white">{connector.label} is now active in RecallZero.</p>
          <p className="mt-2 text-sm leading-6 text-white/72">New incidents from this source will now appear in {profile.destination.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: 'Authenticated', tone: 'safe' }} />
          <Badge badge={{ label: 'Live sync on', tone: 'accent' }} />
        </div>
      </div>
    </div>
  )
}

function SourceFlowStrip({ viewModel, inputForm }: { viewModel: CockpitViewModel; inputForm: CockpitInputForm }) {
  const flowItems = [
    {
      title: 'Source input',
      detail: intakeMethodLabel(inputForm),
    },
    {
      title: 'Normalized intake',
      detail: inputForm.sourceType || 'Unified incident packet',
    },
    {
      title: 'AI reasoning',
      detail: 'Conflict, delay, and confidence analysis',
    },
    {
      title: 'Decision output',
      detail: viewModel.decisionState.recommendation,
    },
  ]

  return (
    <section className="rounded-[1.6rem] border border-[#65d8ff]/18 bg-[linear-gradient(135deg,rgba(101,216,255,0.08),rgba(255,255,255,0.03))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8de8ff]">What came in</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white md:text-[1.5rem]">How the signal becomes a decision</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">This strip shows the path from raw signal to structured decision before the user inspects the form or the recommendation details.</p>
        </div>
        <Badge badge={{ label: viewModel.header.stepLabel, tone: 'neutral' }} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {flowItems.map((item, index) => (
          <div key={item.title} className="relative rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">0{index + 1}</p>
            <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/68">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PendingRefreshBanner({ inputForm, processedForm }: { inputForm: CockpitInputForm; processedForm: CockpitInputForm }) {
  return (
    <div className="rounded-[1.4rem] border border-[#ffcb6b]/20 bg-[linear-gradient(135deg,rgba(255,203,107,0.12),rgba(255,255,255,0.03))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffe29c]">Pending recommendation refresh</p>
          <p className="mt-2 text-sm leading-6 text-white/78">
            The draft intake has changed from {intakeMethodLabel(processedForm)} to {intakeMethodLabel(inputForm)}. Process input to refresh the recommendation and timeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: `Live decision: ${processedForm.sourceType}`, tone: 'neutral' }} />
          <Badge badge={{ label: `Draft input: ${inputForm.sourceType || intakeMethodLabel(inputForm)}`, tone: 'warning' }} />
        </div>
      </div>
    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/48">
        <span>{label}</span>
        {hint ? <span>{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

function InputControl({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-[#65d8ff]/40 ${className}`} />
}

function SelectControl({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#65d8ff]/40 ${className}`} />
}

function TextareaControl({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-[#65d8ff]/40 ${className}`} />
}

function Header({
  viewModel,
  onPrimaryAction,
  onSecondaryAction,
  onOpenConnectors,
  isGuidedPlayback,
  canGuidedPlayback,
  onToggleGuidedPlayback,
}: {
  viewModel: CockpitViewModel
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
  onOpenConnectors: () => void
  isGuidedPlayback: boolean
  canGuidedPlayback: boolean
  onToggleGuidedPlayback: () => void
}) {
  const refreshHighlights = viewModel.refreshDelta.items.slice(0, 3)
  const hasRefreshChanges = refreshHighlights.length > 0
  const headlineExposureMetrics = viewModel.exposureStrip.metrics.filter((metric) => metric.label !== 'Primary lot').slice(0, 2)
  const guidedPlaybackLabel = isGuidedPlayback
    ? 'Pause guided tour'
    : viewModel.header.stepLabel !== 'Step 1 of 6' && canGuidedPlayback
      ? 'Replay guided tour'
      : 'Start guided tour'
  const primaryExposureMetric = headlineExposureMetrics[0]
  const secondaryExposureMetric = headlineExposureMetrics[1]

  return (
    <header className="rounded-[1.8rem] border border-white/8 bg-[rgba(8,15,21,0.9)] px-5 py-4 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Badge badge={{ label: viewModel.header.stepLabel, tone: 'neutral' }} />
            <Badge badge={{ label: `Posture ${viewModel.decisionState.recommendation}`, tone: decisionTone(viewModel.decisionState.recommendation) }} />
            <Badge badge={{ label: `${viewModel.responseClock.minutesSinceSignal} min live`, tone: dominantSideTone(viewModel.responseClock.dominantSide) }} />
          </div>
          <div className="mt-3">
            <RecallZeroBrand size="md" eyebrow="Product" subtitle="Live recall decisions from messy incoming signals." />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">Live recall decision workspace</h1>
          <p className="mt-2.5 text-xl font-medium tracking-[-0.03em] text-white md:text-[1.7rem]">{viewModel.header.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{viewModel.header.subtitle}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">This screen shows what came in, what changed in the decision, and what teams should do next.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-[1.35rem] border border-[#8de8ff]/20 bg-[linear-gradient(135deg,rgba(101,216,255,0.12),rgba(255,255,255,0.04))] px-5 py-5 shadow-[0_18px_42px_rgba(24,97,124,0.16)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8de8ff]">Main decision</p>
              <p className="mt-3 text-lg font-semibold leading-8 tracking-[-0.02em] text-white md:text-[1.35rem]">{viewModel.decisionState.whyNow}</p>
              <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">What could change this</p>
                <p className="mt-2 text-sm leading-6 text-white/74">{viewModel.decisionState.whatChanges}</p>
              </div>
            </div>

            {(primaryExposureMetric || secondaryExposureMetric) ? (
              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-1">
                {primaryExposureMetric ? (
                  <div className={`rounded-[1rem] border px-4 py-3 transition-all duration-300 ${primaryExposureMetric.changed ? 'border-[#8de8ff]/24 bg-[#8de8ff]/10 shadow-[0_10px_24px_rgba(24,97,124,0.14)]' : 'border-white/10 bg-black/16'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">{primaryExposureMetric.label}</p>
                      {primaryExposureMetric.changed ? <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff]" /> : null}
                    </div>
                    <p className={`mt-2 text-base font-semibold tracking-[-0.03em] text-white ${primaryExposureMetric.changed ? 'animate-pulse' : ''}`}>{primaryExposureMetric.value}</p>
                  </div>
                ) : null}
                {secondaryExposureMetric ? (
                  <div className={`rounded-[1rem] border px-4 py-3 transition-all duration-300 ${secondaryExposureMetric.changed ? 'border-[#8de8ff]/24 bg-[#8de8ff]/10 shadow-[0_10px_24px_rgba(24,97,124,0.14)]' : 'border-white/10 bg-black/16'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">{secondaryExposureMetric.label}</p>
                      {secondaryExposureMetric.changed ? <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff]" /> : null}
                    </div>
                    <p className={`mt-2 text-base font-semibold tracking-[-0.03em] text-white ${secondaryExposureMetric.changed ? 'animate-pulse' : ''}`}>{secondaryExposureMetric.value}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {hasRefreshChanges ? (
            <div className="mt-3 rounded-[1.1rem] border border-[#8de8ff]/18 bg-[linear-gradient(135deg,rgba(101,216,255,0.1),rgba(255,255,255,0.02))] px-4 py-3 shadow-[0_12px_24px_rgba(24,97,124,0.12)]">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff]" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8de8ff]">Latest refresh changed the call</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/56">{refreshHighlights.length} fields updated</span>
                <div className="flex flex-wrap gap-2">
                {refreshHighlights.map((item, index) => (
                  <span key={item.label} className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] animate-pulse ${toneClasses(item.tone)} [animation-delay:${index * 140}ms]`}>
                    {item.label}
                  </span>
                ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">What you can do here</p>
              <p className="mt-2 text-sm leading-6 text-white/72">Move to the next step, restart the story, or run a guided tour while keeping the current decision in view.</p>
            </div>
            <div className="rounded-[1.05rem] border border-[#48d28d]/18 bg-[linear-gradient(135deg,rgba(72,210,141,0.12),rgba(255,255,255,0.03))] px-4 py-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#95f4c1]">Connected systems</p>
                  <p className="mt-2 text-sm leading-6 text-white/74">Open supplier inbox, QA, ERP traceability, and complaints connectors from the first screen.</p>
                </div>
                <ActionButton tone="secondary" onClick={onOpenConnectors}>Open connected systems</ActionButton>
              </div>
            </div>
            <div className="grid gap-3">
              <ActionButton tone="primary" onClick={onPrimaryAction} disabled={viewModel.actions.primaryDisabled}>{viewModel.actions.primaryLabel}</ActionButton>
              {viewModel.actions.secondaryLabel ? <ActionButton tone="secondary" onClick={onSecondaryAction}>{viewModel.actions.secondaryLabel}</ActionButton> : null}
              <ActionButton tone="secondary" onClick={onToggleGuidedPlayback} disabled={!canGuidedPlayback}>{guidedPlaybackLabel}</ActionButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">Confidence</p>
                <p className="mt-2 text-sm font-semibold text-white">{viewModel.decisionState.confidenceScore}/100</p>
              </div>
              <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">What could change this</p>
                <p className="mt-2 text-sm leading-6 text-white/78">{viewModel.responseClock.nextTrigger}</p>
              </div>
              <div className={`rounded-[1.1rem] border px-4 py-3 ${isGuidedPlayback ? 'border-[#8de8ff]/24 bg-[#8de8ff]/10 shadow-[0_12px_28px_rgba(24,97,124,0.16)]' : 'border-white/10 bg-black/18'}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">Tour mode</p>
                <p className="mt-2 text-sm font-semibold text-white">{isGuidedPlayback ? 'Guided tour live' : canGuidedPlayback ? 'Manual exploration' : 'Tour unavailable'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function intakeScenarioLabel(scenario: CockpitInputForm['scenario']) {
  switch (scenario) {
    case 'missing-data':
      return 'Missing proof expected'
    case 'conflict':
      return 'Conflict expected'
    case 'resolved':
      return 'Resolved evidence expected'
    default:
      return 'Baseline evaluation'
  }
}

function IntakePacketPreview({ inputForm }: { inputForm: CockpitInputForm }) {
  const elapsedMinutes = Number.isFinite(Number(inputForm.elapsedMinutes)) ? Math.max(0, Number(inputForm.elapsedMinutes)) : 0
  const payloadLength = inputForm.rawSignal.trim().length
  const summaryReady = inputForm.rawSummary.trim().length > 0
  const packetItems = [
    {
      label: 'Source channel',
      value: inputForm.sourceType.trim() || intakeMethodLabel(inputForm),
    },
    {
      label: 'Incident age',
      value: `${elapsedMinutes} minutes since signal`,
    },
    {
      label: 'Decision assumption',
      value: intakeScenarioLabel(inputForm.scenario),
    },
    {
      label: 'Packet completeness',
      value: `${summaryReady ? 'Summary ready' : 'Summary pending'} • ${payloadLength} chars in payload`,
    },
  ]

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Normalized intake packet</p>
          <p className="mt-2 text-sm leading-6 text-white/72">This preview shows how RecallZero frames the draft input before the engine processes it.</p>
        </div>
        <Badge badge={{ label: intakeMethodLabel(inputForm), tone: 'accent' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {packetItems.map((item) => (
          <div key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-white/78">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function IntakeReadinessPanel({ inputForm }: { inputForm: CockpitInputForm }) {
  const checks = [
    {
      title: 'Signal identity',
      detail: inputForm.label.trim() ? `Label set to ${inputForm.label.trim()}.` : 'Add a signal label so the case can be identified.',
      tone: inputForm.label.trim() ? 'safe' : 'warning',
    },
    {
      title: 'Time context',
      detail: inputForm.receivedAt.trim() && inputForm.elapsedMinutes.trim() ? `Received at ${inputForm.receivedAt.trim()} with elapsed time captured.` : 'Add received time and elapsed minutes to show operational urgency.',
      tone: inputForm.receivedAt.trim() && inputForm.elapsedMinutes.trim() ? 'safe' : 'warning',
    },
    {
      title: 'Decision framing',
      detail: inputForm.rawSummary.trim() ? 'Summary added to guide the recommendation frame.' : 'Add a short summary so judges can see the framing before processing.',
      tone: inputForm.rawSummary.trim() ? 'safe' : 'warning',
    },
    {
      title: 'Payload readiness',
      detail: inputForm.rawSignal.trim().length > 80 ? 'Payload looks substantial enough for live analysis.' : 'Add more payload detail so the incident feels realistic and judge-ready.',
      tone: inputForm.rawSignal.trim().length > 80 ? 'safe' : 'critical',
    },
  ] as const

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/16 p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Intake readiness</p>
          <p className="mt-2 text-sm leading-6 text-white/72">Use this checklist to make sure the intake has enough detail to review.</p>
        </div>
        <Badge badge={{ label: `${checks.filter((item) => item.tone === 'safe').length}/4 ready`, tone: checks.every((item) => item.tone === 'safe') ? 'safe' : 'warning' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {checks.map((item) => (
          <div key={item.title} className={`rounded-[1.1rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/76">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function IntakeModeBriefing({ inputForm }: { inputForm: CockpitInputForm }) {
  const briefing =
    inputForm.intakeMethod === 'email'
      ? {
          eyebrow: 'Email workflow',
          title: 'Forwarded escalation review',
          summary: 'Use this mode when a supplier or QA email is the starting point for the incident.',
          tone: 'border-[#8de8ff]/20 bg-[linear-gradient(135deg,rgba(101,216,255,0.1),rgba(255,255,255,0.03))]',
          items: [
            'Best for supplier alerts, QA escalations, and internal incident threads.',
            'Shows the sender, received time, and subject clearly before review.',
          ],
        }
      : inputForm.intakeMethod === 'api'
        ? {
            eyebrow: 'Webhook workflow',
            title: 'System-to-system incident ingestion',
            summary: 'Use this mode when another system sends a structured event into RecallZero.',
            tone: 'border-[#65d8ff]/20 bg-[linear-gradient(135deg,rgba(76,184,255,0.12),rgba(255,255,255,0.03))]',
            items: [
              'Best for monitoring alerts, marketplace events, and internal automation triggers.',
              'Shows the incoming event source, timing, and payload format before review.',
            ],
          }
        : inputForm.intakeMethod === 'connector'
          ? {
              eyebrow: 'Connector workflow',
              title: 'Connected operational source',
              summary: 'Use this mode when the incident starts from a connected source that already has live context attached.',
              tone: 'border-[#48d28d]/20 bg-[linear-gradient(135deg,rgba(72,210,141,0.12),rgba(255,255,255,0.03))]',
              items: [
                'Best for supplier inboxes, QA platforms, traceability tools, and complaints feeds.',
                'Keeps connector activity, source events, and incident details together.',
              ],
            }
          : {
              eyebrow: 'Manual workflow',
              title: 'Operator-led incident framing',
              summary: 'Use this mode when someone needs to turn a rough note into a clear incident record.',
              tone: 'border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]',
              items: [
                'Best for phone-call notes, copied escalation text, and ad hoc incident reports.',
                'Helps organize the signal before review and recommendation.',
              ],
            }

  return (
    <div className={`rounded-[1.4rem] border px-5 py-4 md:px-6 ${briefing.tone}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">{briefing.eyebrow}</p>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-semibold tracking-[-0.03em] text-white">{briefing.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{briefing.summary}</p>
        </div>
        <Badge badge={{ label: intakeMethodLabel(inputForm), tone: 'accent' }} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {briefing.items.map((item) => (
          <div key={item} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="text-sm leading-6 text-white/78">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function draftFieldToneClasses(changed: boolean) {
  return changed ? 'border-[#ffcb6b]/35 bg-[#ffcb6b]/8 focus:border-[#ffcb6b]/46' : ''
}

function draftValuePreview(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 'Empty'
  }

  return normalized.length > 52 ? `${normalized.slice(0, 49)}...` : normalized
}

function EmailEnvelopePreview({ inputForm }: { inputForm: CockpitInputForm }) {
  return (
    <div className="rounded-[1.4rem] border border-[#8de8ff]/20 bg-[linear-gradient(135deg,rgba(101,216,255,0.1),rgba(255,255,255,0.03))] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Email envelope</p>
          <p className="mt-2 text-sm leading-6 text-white/72">Review the email details before processing the message.</p>
        </div>
        <Badge badge={{ label: 'Forwarded escalation', tone: 'accent' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">From</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.sourceType || 'supplier.alerts@northriver.example'}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Received</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.receivedAt || '08:12 UTC'}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Subject</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.label || 'Urgent recall escalation'}</p>
        </div>
      </div>
    </div>
  )
}

function WebhookEnvelopePreview({ inputForm }: { inputForm: CockpitInputForm }) {
  const payloadLooksJson = inputForm.rawSignal.trim().startsWith('{') || inputForm.rawSignal.trim().startsWith('[')

  return (
    <div className="rounded-[1.4rem] border border-[#65d8ff]/20 bg-[linear-gradient(135deg,rgba(76,184,255,0.12),rgba(255,255,255,0.03))] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Webhook envelope</p>
          <p className="mt-2 text-sm leading-6 text-white/72">Review the event details before processing the incoming payload.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: inputForm.sourceType || 'Incident webhook', tone: 'accent' }} />
          <Badge badge={{ label: payloadLooksJson ? 'JSON payload' : 'Freeform payload', tone: payloadLooksJson ? 'safe' : 'warning' }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Event source</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.sourceType || 'marketplace-monitor'}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Signal age</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.elapsedMinutes || '0'} minutes</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Assumption</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{intakeScenarioLabel(inputForm.scenario)}</p>
        </div>
      </div>
    </div>
  )
}

function ConnectorRecordPreview({ inputForm }: { inputForm: CockpitInputForm }) {
  if (inputForm.connectorKey === 'none') {
    return null
  }

  const connector = connectorOptions.find((item) => item.value === inputForm.connectorKey)
  const activity = connectorActivity[inputForm.connectorKey]
  const recordId = `CR-${inputForm.connectorKey.toUpperCase()}-${String(inputForm.label.length || 27).padStart(3, '0')}`

  if (!connector) {
    return null
  }

  return (
    <div className="rounded-[1.5rem] border border-[#48d28d]/20 bg-[linear-gradient(135deg,rgba(72,210,141,0.12),rgba(255,255,255,0.03))] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#95f4c1]">Connected record</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{connector.label} incident snapshot</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">Review the connected incident details, confirm the intake, and continue to the decision.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: connector.status, tone: 'safe' }} />
          <Badge badge={{ label: activity.syncLabel, tone: 'accent' }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Record ID</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{recordId}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">System</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{connector.sourceType}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Latency</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{activity.latency}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Observed volume</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{activity.volume}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Connected summary</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.rawSummary || connector.summary}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Latest source event</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{activity.events[0]?.title ?? 'No source event available.'}</p>
          <p className="mt-1 text-sm leading-6 text-white/60">{activity.events[0]?.detail ?? ''}</p>
        </div>
      </div>
    </div>
  )
}

function ManualMemoPreview({ inputForm }: { inputForm: CockpitInputForm }) {
  if (inputForm.intakeMethod !== 'paste') {
    return null
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Operator memo</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">Manual call note / escalation capture</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">Capture a call note, chat message, or copied escalation and turn it into a clear incident record.</p>
        </div>
        <Badge badge={{ label: 'Manual intake', tone: 'neutral' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Captured by</p>
          <p className="mt-2 text-sm leading-6 text-white/80">Recall operator</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Context time</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.receivedAt || 'Now'}</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Urgency clock</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.elapsedMinutes || '0'} minutes since signal</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Memo framing</p>
        <p className="mt-2 text-sm leading-6 text-white/80">{inputForm.rawSummary || 'Add a short operator summary to frame the incoming escalation before processing.'}</p>
      </div>
    </div>
  )
}

function IncidentFormSection({
  inputForm,
  processedForm,
  hasPendingChanges,
  onInputFormChange,
  onInputFormSubmit,
  isLoading,
}: {
  inputForm: CockpitInputForm
  processedForm: CockpitInputForm
  hasPendingChanges: boolean
  onInputFormChange: <K extends keyof CockpitInputForm>(field: K, value: CockpitInputForm[K]) => void
  onInputFormSubmit: () => void
  isLoading: boolean
}) {
  const [enabledConnectorKey, setEnabledConnectorKey] = useState<Exclude<CockpitConnectorKey, 'none'> | null>(null)
  const [isSupplierInboxSyncing, setIsSupplierInboxSyncing] = useState(false)
  const [supplierInboxSyncNotice, setSupplierInboxSyncNotice] = useState<string | null>(null)
  const [isQaSystemSyncing, setIsQaSystemSyncing] = useState(false)
  const [qaSystemSyncNotice, setQaSystemSyncNotice] = useState<string | null>(null)
  const fieldCopy =
    inputForm.intakeMethod === 'email'
      ? {
          sourceLabel: 'Mailbox or sender',
          sourcePlaceholder: 'supplier.alerts@northriver.example',
          signalLabel: 'Forwarded email body',
          signalPlaceholder: 'Paste the forwarded supplier or QA email body here.',
        }
      : inputForm.intakeMethod === 'api'
        ? {
            sourceLabel: 'System source',
            sourcePlaceholder: 'Marketplace webhook',
            signalLabel: 'Webhook payload',
            signalPlaceholder: 'Paste the webhook or event JSON payload here.',
          }
        : inputForm.intakeMethod === 'connector'
          ? {
              sourceLabel: 'Connector source',
              sourcePlaceholder: 'Connected ERP traceability',
              signalLabel: 'Connector incident packet',
              signalPlaceholder: 'Choose a connector below to prefill a realistic incident packet, then edit it if needed.',
            }
          : {
              sourceLabel: 'Source type',
              sourcePlaceholder: 'Supplier inbox',
              signalLabel: 'Raw incident payload',
              signalPlaceholder: 'Paste the actual incident message, escalation email, or recall packet here.',
            }

  const applyMethod = (method: CockpitInputForm['intakeMethod']) => {
    const option = intakeMethodOptions.find((item) => item.value === method)
    if (!option) {
      return
    }

    onInputFormChange('intakeMethod', method)
    onInputFormChange('connectorKey', method === 'connector' ? inputForm.connectorKey : 'none')
    onInputFormChange('sourceType', option.sourceType)

    if (!inputForm.rawSummary.trim()) {
      onInputFormChange('rawSummary', option.summary)
    }

    if (!inputForm.rawSignal.trim() || inputForm.intakeMethod !== method) {
      onInputFormChange('rawSignal', option.sample)
    }
  }

  const syncSupplierInboxNotice = async () => {
    setIsSupplierInboxSyncing(true)
    setSupplierInboxSyncNotice('Syncing the latest supplier inbox notice...')

    try {
      const payload = await fetchLatestSupplierInboxNotice()

      if (payload?.ok && payload.latestNotice) {
        onInputFormChange('intakeMethod', 'connector')
        onInputFormChange('connectorKey', 'supplier-email')
        onInputFormChange('label', payload.latestNotice.subject)
        onInputFormChange('sourceType', payload.sourceType)
        onInputFormChange('receivedAt', payload.latestNotice.receivedAt)
        onInputFormChange('rawSummary', payload.latestNotice.summary)
        onInputFormChange('rawSignal', payload.latestNotice.noticeText)
        setSupplierInboxSyncNotice(payload.message)
        return
      }

      setSupplierInboxSyncNotice(payload?.message ?? 'Supplier inbox feed is unavailable right now.')
    } catch {
      setSupplierInboxSyncNotice('Supplier inbox feed is unavailable right now.')
    } finally {
      setIsSupplierInboxSyncing(false)
    }
  }

  const syncQaSystemAlert = async () => {
    setIsQaSystemSyncing(true)
    setQaSystemSyncNotice('Syncing the latest QA inspection alert...')

    try {
      const payload = await fetchLatestQaSystemEvent()

      if (payload?.ok && payload.latestEvent) {
        onInputFormChange('intakeMethod', 'connector')
        onInputFormChange('connectorKey', 'qa-system')
        onInputFormChange('label', `${payload.latestEvent.alertType} — ${payload.latestEvent.plant}`)
        onInputFormChange('sourceType', payload.sourceType)
        onInputFormChange('receivedAt', payload.latestEvent.receivedAt)
        onInputFormChange('rawSummary', payload.latestEvent.summary)
        onInputFormChange('rawSignal', payload.latestEvent.noticeText)
        setQaSystemSyncNotice(payload.message)
        return
      }

      setQaSystemSyncNotice(payload?.message ?? 'QA system feed is unavailable right now.')
    } catch {
      setQaSystemSyncNotice('QA system feed is unavailable right now.')
    } finally {
      setIsQaSystemSyncing(false)
    }
  }

  const applyConnector = (connectorValue: Exclude<CockpitConnectorKey, 'none'>) => {
    const connector = connectorOptions.find((item) => item.value === connectorValue)
    if (!connector) {
      return
    }

    onInputFormChange('intakeMethod', 'connector')
    onInputFormChange('connectorKey', connector.value)
    onInputFormChange('sourceType', connector.sourceType)
    onInputFormChange('rawSummary', connector.summary)
    onInputFormChange('rawSignal', connector.sample)

    if (connector.value === 'supplier-email') {
      void syncSupplierInboxNotice()
    }

    if (connector.value === 'qa-system') {
      void syncQaSystemAlert()
    }
  }

  const openConnectorPath = () => {
    if (inputForm.connectorKey !== 'none') {
      applyMethod('connector')
      return
    }

    applyConnector('supplier-email')
  }

  const changedFields = [
    {
      id: 'label',
      label: 'Signal label',
      changed: inputForm.label !== processedForm.label,
      live: processedForm.label,
      draft: inputForm.label,
    },
    {
      id: 'sourceType',
      label: fieldCopy.sourceLabel,
      changed: inputForm.sourceType !== processedForm.sourceType,
      live: processedForm.sourceType,
      draft: inputForm.sourceType,
    },
    {
      id: 'receivedAt',
      label: 'Received at',
      changed: inputForm.receivedAt !== processedForm.receivedAt,
      live: processedForm.receivedAt,
      draft: inputForm.receivedAt,
    },
    {
      id: 'elapsedMinutes',
      label: 'Minutes since signal',
      changed: inputForm.elapsedMinutes !== processedForm.elapsedMinutes,
      live: processedForm.elapsedMinutes,
      draft: inputForm.elapsedMinutes,
    },
    {
      id: 'scenario',
      label: 'Processing assumption',
      changed: inputForm.scenario !== processedForm.scenario,
      live: intakeScenarioLabel(processedForm.scenario),
      draft: intakeScenarioLabel(inputForm.scenario),
    },
    {
      id: 'rawSummary',
      label: inputForm.intakeMethod === 'email' ? 'Message summary' : inputForm.intakeMethod === 'api' ? 'Event interpretation' : 'Short summary',
      changed: inputForm.rawSummary !== processedForm.rawSummary,
      live: processedForm.rawSummary,
      draft: inputForm.rawSummary,
    },
    {
      id: 'rawSignal',
      label: inputForm.intakeMethod === 'paste' ? 'Operator memo transcript' : fieldCopy.signalLabel,
      changed: inputForm.rawSignal !== processedForm.rawSignal,
      live: processedForm.rawSignal,
      draft: inputForm.rawSignal,
    },
  ].filter((item) => item.changed)

  const changedFieldIds = new Set(changedFields.map((item) => item.id))
  const selectedConnectorKey = inputForm.connectorKey === 'none' ? null : inputForm.connectorKey
  const fieldHint = (fieldId: string) => changedFieldIds.has(fieldId)
    ? <span className="rounded-full border border-[#ffcb6b]/30 bg-[#ffcb6b]/10 px-2 py-1 text-[10px] tracking-[0.16em] text-[#ffe29c]">Draft changed</span>
    : <span className="rounded-full border border-[#48d28d]/25 bg-[#48d28d]/10 px-2 py-1 text-[10px] tracking-[0.16em] text-[#95f4c1]">Live</span>

  return (
    <ShellCard>
      <SectionTitle eyebrow="Process this signal" title="Incident intake form" description="Start with pasted text, a forwarded email, a webhook payload, or a connected system." />
      <div className="mt-5 space-y-4">
        {hasPendingChanges ? (
          <div className="rounded-[1.4rem] border border-[#ffcb6b]/22 bg-[linear-gradient(135deg,rgba(255,203,107,0.12),rgba(255,255,255,0.03))] px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffe29c]">Draft vs live packet</p>
                <p className="mt-2 text-sm font-semibold text-white">{changedFields.length} field{changedFields.length === 1 ? '' : 's'} changed since the last processed run</p>
                <p className="mt-2 text-sm leading-6 text-white/74">The recommendation below still reflects the live packet until you process this draft.</p>
              </div>
              <Badge badge={{ label: `Pending refresh: ${changedFields.length}`, tone: 'warning' }} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {changedFields.map((item) => (
                <div key={item.id} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{item.label}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/40">Live</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">{draftValuePreview(item.live)}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#ffe29c]">Draft</p>
                  <p className="mt-1 text-sm leading-6 text-white">{draftValuePreview(item.draft)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rounded-[1.35rem] border border-[#48d28d]/20 bg-[linear-gradient(135deg,rgba(72,210,141,0.12),rgba(255,255,255,0.03))] px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#95f4c1]">Looking for connectors?</p>
              <p className="mt-2 text-sm leading-6 text-white/74">Open supplier inbox, QA, ERP traceability, and complaints connectors here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge badge={{ label: '4 connector types', tone: 'safe' }} />
              <ActionButton tone="primary" onClick={openConnectorPath}>Open connected systems</ActionButton>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/48">Input path</p>
          <div className="grid gap-3 md:grid-cols-2">
            {intakeMethodOptions.map((option) => (
              <SelectCard
                key={option.value}
                title={option.label}
                detail={option.detail}
                active={inputForm.intakeMethod === option.value}
                onClick={() => applyMethod(option.value)}
              />
            ))}
          </div>
        </div>
        <IntakeModeBriefing inputForm={inputForm} />
        <ManualMemoPreview inputForm={inputForm} />
        {inputForm.intakeMethod === 'email' ? <EmailEnvelopePreview inputForm={inputForm} /> : null}
        {inputForm.intakeMethod === 'api' ? <WebhookEnvelopePreview inputForm={inputForm} /> : null}
        {inputForm.intakeMethod === 'connector' ? (
          <div className="space-y-3">
            {enabledConnectorKey ? <LiveConnectorBanner connectorKey={enabledConnectorKey} /> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/48">Starter connectors</p>
              <p className="text-xs leading-5 text-white/44">Choose a connector to pull in incident details from an existing source.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {connectorOptions.map((connector) => (
                <SelectCard
                  key={connector.value}
                  title={connector.label}
                  detail={connector.detail}
                  meta={connector.status}
                  active={inputForm.connectorKey === connector.value}
                  onClick={() => applyConnector(connector.value)}
                />
              ))}
            </div>
            {selectedConnectorKey === 'supplier-email' ? <SupplierInboxSyncPanel onSync={() => void syncSupplierInboxNotice()} isSyncing={isSupplierInboxSyncing} syncNotice={supplierInboxSyncNotice} /> : null}
            {selectedConnectorKey === 'qa-system' ? <QaSystemSyncPanel onSync={() => void syncQaSystemAlert()} isSyncing={isQaSystemSyncing} syncNotice={qaSystemSyncNotice} /> : null}
            {selectedConnectorKey ? <ConnectorSettingsPanel connectorKey={selectedConnectorKey} onConnectorEnabled={() => setEnabledConnectorKey(selectedConnectorKey)} /> : null}
            <ConnectorRecordPreview inputForm={inputForm} />
            {selectedConnectorKey ? <ConnectorOperationsPanel connectorKey={selectedConnectorKey} /> : null}
          </div>
        ) : null}
        <IntakePacketPreview inputForm={inputForm} />
        <IntakeReadinessPanel inputForm={inputForm} />
        <div className={`grid gap-4 ${inputForm.intakeMethod === 'email' ? 'md:grid-cols-3' : inputForm.intakeMethod === 'api' ? 'md:grid-cols-2' : inputForm.intakeMethod === 'paste' ? 'md:grid-cols-2' : ''}`}>
          <FormField label="Signal label" hint={fieldHint('label')}>
            <InputControl className={draftFieldToneClasses(changedFieldIds.has('label'))} value={inputForm.label} onChange={(event) => onInputFormChange('label', event.target.value)} placeholder="NorthRiver supplier escalation" />
          </FormField>
          <FormField label={fieldCopy.sourceLabel} hint={fieldHint('sourceType')}>
            <InputControl className={draftFieldToneClasses(changedFieldIds.has('sourceType'))} value={inputForm.sourceType} onChange={(event) => onInputFormChange('sourceType', event.target.value)} placeholder={fieldCopy.sourcePlaceholder} />
          </FormField>
          <FormField label="Received at" hint={fieldHint('receivedAt')}>
            <InputControl className={draftFieldToneClasses(changedFieldIds.has('receivedAt'))} value={inputForm.receivedAt} onChange={(event) => onInputFormChange('receivedAt', event.target.value)} placeholder="08:12 UTC" />
          </FormField>
          <FormField label="Minutes since signal" hint={fieldHint('elapsedMinutes')}>
            <InputControl className={draftFieldToneClasses(changedFieldIds.has('elapsedMinutes'))} type="number" min="0" value={inputForm.elapsedMinutes} onChange={(event) => onInputFormChange('elapsedMinutes', event.target.value)} placeholder="18" />
          </FormField>
        </div>
        <FormField label="Processing assumption" hint={fieldHint('scenario')}>
          <SelectControl className={draftFieldToneClasses(changedFieldIds.has('scenario'))} value={inputForm.scenario} onChange={(event) => onInputFormChange('scenario', event.target.value as CockpitInputForm['scenario'])}>
            <option value="baseline">Baseline</option>
            <option value="missing-data">Missing data</option>
            <option value="conflict">Conflict</option>
            <option value="resolved">Resolved</option>
          </SelectControl>
        </FormField>
        <FormField label={inputForm.intakeMethod === 'email' ? 'Message summary' : inputForm.intakeMethod === 'api' ? 'Event interpretation' : 'Short summary'} hint={fieldHint('rawSummary')}>
          <TextareaControl className={draftFieldToneClasses(changedFieldIds.has('rawSummary'))} rows={inputForm.intakeMethod === 'api' ? 4 : 3} value={inputForm.rawSummary} onChange={(event) => onInputFormChange('rawSummary', event.target.value)} placeholder="Supplier escalation arrived with incomplete proof and active distribution scope." />
        </FormField>
        <FormField label={inputForm.intakeMethod === 'paste' ? 'Operator memo transcript' : fieldCopy.signalLabel} hint={fieldHint('rawSignal')}>
          <TextareaControl className={draftFieldToneClasses(changedFieldIds.has('rawSignal'))} rows={inputForm.intakeMethod === 'api' ? 11 : inputForm.intakeMethod === 'email' ? 8 : 9} value={inputForm.rawSignal} onChange={(event) => onInputFormChange('rawSignal', event.target.value)} placeholder={fieldCopy.signalPlaceholder} />
        </FormField>
        <div>
          <ActionButton tone="primary" onClick={onInputFormSubmit} disabled={isLoading || !inputForm.rawSignal.trim() || (inputForm.intakeMethod === 'connector' && inputForm.connectorKey === 'none')}>
            {isLoading ? 'Processing...' : inputForm.intakeMethod === 'connector' ? 'Import from connector' : 'Process Input'}
          </ActionButton>
        </div>
      </div>
    </ShellCard>
  )
}

function NoticeBanner({ notice, isLoading, noticeHref }: { notice: string | null; isLoading: boolean; noticeHref?: string | null }) {
  if (!notice) {
    return null
  }

  return (
    <div className={`rounded-[1.1rem] border px-4 py-3 text-sm leading-6 ${isLoading ? 'border-[#8de8ff]/26 bg-[linear-gradient(135deg,rgba(101,216,255,0.14),rgba(255,255,255,0.03))] text-[#e7fbff]' : 'border-[#65d8ff]/18 bg-[#65d8ff]/8 text-[#d9f8ff]'}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className={isLoading ? 'animate-pulse' : ''}>{notice}</span>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff] [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff] [animation-delay:240ms]" />
          </div>
        ) : noticeHref ? (
          <a href={noticeHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-[#8de8ff]/30 bg-[#8de8ff]/12 px-3 py-1.5 text-xs font-semibold tracking-[0.04em] text-[#e7fbff] transition-colors duration-200 hover:border-[#8de8ff]/48 hover:bg-[#8de8ff]/18">
            Open imported incident
          </a>
        ) : null}
      </div>
    </div>
  )
}

function progressionToneClasses(status: 'completed' | 'current' | 'upcoming') {
  if (status === 'current') {
    return 'border-[#8de8ff]/30 bg-[#8de8ff]/12 text-white shadow-[0_16px_36px_rgba(44,136,170,0.18)]'
  }

  if (status === 'completed') {
    return 'border-[#48d28d]/22 bg-[#48d28d]/10 text-white/86'
  }

  return 'border-white/10 bg-white/[0.03] text-white/58'
}

function currentProgressionToneClasses(tone: ViewTone) {
  switch (tone) {
    case 'critical':
      return 'border-[#ff6d6d]/30 bg-[#ff6d6d]/12 text-white shadow-[0_16px_36px_rgba(140,48,48,0.18)]'
    case 'warning':
      return 'border-[#ffcb6b]/30 bg-[#ffcb6b]/12 text-white shadow-[0_16px_36px_rgba(148,111,32,0.18)]'
    case 'safe':
      return 'border-[#48d28d]/30 bg-[#48d28d]/12 text-white shadow-[0_16px_36px_rgba(35,120,78,0.18)]'
    default:
      return progressionToneClasses('current')
  }
}

function progressionFillClasses(tone: ViewTone) {
  switch (tone) {
    case 'critical':
      return 'bg-[linear-gradient(90deg,#ff8b8b_0%,#ff6d6d_100%)]'
    case 'warning':
      return 'bg-[linear-gradient(90deg,#ffe29c_0%,#ffcb6b_100%)]'
    case 'safe':
      return 'bg-[linear-gradient(90deg,#9df4c5_0%,#48d28d_100%)]'
    default:
      return 'bg-[linear-gradient(90deg,#c1f4ff_0%,#65d8ff_100%)]'
  }
}

function DemoProgressionStrip({ viewModel }: { viewModel: CockpitViewModel }) {
  const currentTone = decisionTone(viewModel.decisionState.recommendation)
  const totalSteps = viewModel.progression.items.length
  const currentIndex = Math.max(
    viewModel.progression.items.findIndex((item) => item.status === 'current'),
    0,
  )
  const currentItem = viewModel.progression.items[currentIndex]
  const nextItem = viewModel.progression.items.find((item) => item.status === 'upcoming')
  const progressPercent = totalSteps <= 1 ? 100 : Math.round(((currentIndex + 1) / totalSteps) * 100)

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8de8ff]">Story progression</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.progression.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{viewModel.progression.summary}</p>
        </div>
        <Badge badge={{ label: viewModel.header.stepLabel, tone: 'neutral' }} />
      </div>

      <div className={`mt-4 grid gap-3 ${totalSteps === 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'}`}>
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Current stage</p>
              <p className="mt-2 text-sm font-semibold text-white">{currentItem?.label ?? viewModel.progression.title}</p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">{String(currentIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div className={`h-full rounded-full transition-[width] duration-500 ${progressionFillClasses(currentTone)}`} style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-white/72">{currentItem?.detail ?? viewModel.progression.summary}</p>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Next shift</p>
          <p className="mt-2 text-sm font-semibold text-white">{nextItem ? `${currentItem?.label ?? 'Current'} -> ${nextItem.label}` : 'Decision trail preserved'}</p>
          <p className="mt-3 text-sm leading-6 text-white/72">{nextItem ? nextItem.detail : 'The story is at its final state, so the strip now serves as an audit marker rather than a transition cue.'}</p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${viewModel.progression.items.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-6'}`}>
        {viewModel.progression.items.map((item, index) => (
          <div key={item.id} className={`rounded-[1.2rem] border px-4 py-4 ${item.status === 'current' ? currentProgressionToneClasses(currentTone) : progressionToneClasses(item.status)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">{String(index + 1).padStart(2, '0')}</p>
              {item.status === 'current' ? <span className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${toneClasses(currentTone)}`}>Now</span> : null}
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-2 text-sm leading-6">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function dominantSideTone(side: 'inaction' | 'action' | 'balanced'): ViewTone {
  if (side === 'action') {
    return 'critical'
  }

  if (side === 'inaction') {
    return 'warning'
  }

  return 'accent'
}

function ResponseClockSection({ viewModel }: { viewModel: CockpitViewModel }) {
  const tone = dominantSideTone(viewModel.responseClock.dominantSide)

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">What changes if we wait</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.responseClock.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{viewModel.responseClock.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: `${viewModel.responseClock.minutesSinceSignal} min since signal`, tone }} />
          <Badge badge={{ label: viewModel.responseClock.delayStage, tone }} />
          {viewModel.responseClock.postureShift ? <Badge badge={{ label: `Posture shift: ${viewModel.responseClock.postureShift}`, tone: 'accent' }} /> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(tone)}`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Next trigger</p>
          <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.responseClock.nextTrigger}</p>
          <p className="mt-2 text-sm leading-6 text-white/78">The team should treat this as the next moment most likely to change execution pressure.</p>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Cost of acting</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{viewModel.responseClock.actionScore}</p>
          <p className="mt-2 text-sm leading-6 text-white/66">Current downside if the team acts now.</p>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Cost of waiting</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{viewModel.responseClock.inactionScore}</p>
          <p className="mt-2 text-sm leading-6 text-white/66">Current downside if the team delays the response.</p>
        </div>
      </div>
    </section>
  )
}

function ForecastStripSection({ viewModel }: { viewModel: CockpitViewModel }) {
  if (viewModel.forecastStrip.items.length === 0) {
    return null
  }

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">What may happen next</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.forecastStrip.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{viewModel.forecastStrip.summary}</p>
        </div>
        <Badge badge={{ label: 'Simulation-backed', tone: 'accent' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {viewModel.forecastStrip.items.map((item) => (
          <div key={`${item.horizon}-${item.projectedPosture}`} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">{item.horizon}</p>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/56">Gap {item.consequenceGap}</span>
            </div>
            <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">Projected posture: {item.projectedPosture}</p>
            <p className="mt-2 text-sm leading-6 text-white/78">{item.confidenceShift}</p>
            <p className="mt-3 text-sm leading-6 text-white/64">{item.riskLine}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PostureShiftBanner({ viewModel }: { viewModel: CockpitViewModel }) {
  if (!viewModel.postureShift) {
    return null
  }

  return (
    <section className={`rounded-[1.8rem] border px-5 py-5 md:px-6 ${toneClasses(viewModel.postureShift.tone)} shadow-[0_18px_44px_rgba(0,0,0,0.18)]`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/56">Posture shift detected</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{viewModel.postureShift.previous} {'->'} {viewModel.postureShift.current}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/82">{viewModel.postureShift.reason}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: viewModel.postureShift.title, tone: viewModel.postureShift.tone }} />
          <Badge badge={{ label: 'Latest refresh changed the call', tone: 'accent' }} />
        </div>
      </div>
    </section>
  )
}

function ExposureStripSection({ viewModel }: { viewModel: CockpitViewModel }) {
  if (viewModel.exposureStrip.items.length === 0) {
    return null
  }

  const changedMetrics = viewModel.exposureStrip.metrics.filter((metric) => metric.changed && metric.previousValue)

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">Who and what is exposed</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.exposureStrip.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{viewModel.exposureStrip.summary}</p>
        </div>
        <Badge badge={{ label: 'Engine-ranked exposure', tone: 'accent' }} />
      </div>

      {changedMetrics.length > 0 ? (
        <div className={`mt-4 rounded-[1.2rem] border px-4 py-4 shadow-[0_14px_32px_rgba(24,97,124,0.14)] ${viewModel.exposureStrip.trend ? toneClasses(viewModel.exposureStrip.trend.tone) : 'border-[#8de8ff]/24 bg-[linear-gradient(135deg,rgba(101,216,255,0.12),rgba(255,255,255,0.03))]'}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Exposure trend</p>
              <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.exposureStrip.trend?.title ?? 'Live footprint update'}</p>
              <p className="mt-2 text-sm leading-6 text-white/78">{viewModel.exposureStrip.trend?.summary ?? 'The latest refresh changed the downstream footprint, not just the recommendation label.'}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8de8ff]" />
              Live footprint update
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {changedMetrics.map((metric, index) => (
              <div key={metric.label} className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">{metric.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {metric.previousValue} {'->'} {metric.value}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]" style={{ animationDelay: `${index * 140}ms` }}>
                  Updated in latest refresh
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`mt-4 rounded-[1.2rem] border px-4 py-4 ${toneClasses(viewModel.exposureStrip.customerImpact.tone)}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">Customer impact</p>
            <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.exposureStrip.customerImpact.title}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/78">{viewModel.exposureStrip.customerImpact.summary}</p>
          </div>
          <Badge badge={{ label: 'Buyer-facing summary', tone: viewModel.exposureStrip.customerImpact.tone }} />
        </div>
      </div>

      {viewModel.exposureStrip.path.length > 0 ? (
        <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/16 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Exposure trajectory</p>
              <p className="mt-2 text-sm leading-6 text-white/72">The footprint path across the demo makes it obvious when exposure widened and when it was later contained.</p>
            </div>
            <Badge badge={{ label: 'Story-backed trend', tone: 'accent' }} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-6">
            {viewModel.exposureStrip.path.map((item) => (
              <div key={item.id} className={`rounded-[1rem] border px-3 py-3 ${item.status === 'current' ? 'border-[#8de8ff]/28 bg-[#8de8ff]/10 shadow-[0_12px_28px_rgba(24,97,124,0.16)]' : item.status === 'completed' ? 'border-white/12 bg-white/[0.05]' : 'border-white/8 bg-black/18'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">{item.status === 'current' ? 'Now' : item.status === 'completed' ? 'Seen' : 'Next'}</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/52">{item.regions}r</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{item.orders}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/62">orders • {item.locations} loc</p>
                <p className="mt-2 text-[11px] leading-5 text-white/52">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {viewModel.exposureStrip.metrics.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {viewModel.exposureStrip.metrics.map((metric) => (
            <div key={metric.label} className={`rounded-[1.05rem] border px-4 py-3 transition-all duration-300 ${metric.changed ? 'border-[#8de8ff]/28 bg-[#8de8ff]/10 shadow-[0_14px_32px_rgba(24,97,124,0.16)]' : 'border-white/10 bg-black/18'}`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">{metric.label}</p>
              <p className={`mt-2 text-lg font-semibold tracking-[-0.03em] text-white ${metric.changed ? 'animate-pulse' : ''}`}>{metric.value}</p>
              {metric.changed && metric.previousValue ? (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]">
                  {metric.previousValue} {'->'} {metric.value}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {viewModel.exposureStrip.items.map((item) => (
          <div key={item.label} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">{item.label}</p>
              <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/64">Score {item.score}</span>
            </div>
            <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">{item.basis}</p>
            <p className="mt-2 text-sm leading-6 text-white/78">{item.summary}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function decisionTone(recommendation: string): ViewTone {
  if (recommendation === 'activate') {
    return 'critical'
  }

  if (recommendation === 'hold') {
    return 'warning'
  }

  return 'safe'
}

function sensitivityTone(label: string): ViewTone {
  if (label === 'Stable') {
    return 'safe'
  }

  if (label === 'Sensitive') {
    return 'warning'
  }

  return 'critical'
}

function deltaLookup(viewModel: CockpitViewModel, label: string) {
  return viewModel.refreshDelta.items.find((item) => item.label === label)
}

function KeyMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: ViewTone }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className={`mt-3 text-xl font-semibold tracking-[-0.03em] ${tone === 'neutral' ? 'text-white' : toneClasses(tone).split(' ').at(-1)}`}>{value}</p>
    </div>
  )
}

function ExecutiveSummaryStrip({ viewModel }: { viewModel: CockpitViewModel }) {
  const recommendationToneValue = decisionTone(viewModel.decisionState.recommendation)

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8de8ff]">What changed</p>
          <p className="mt-2 max-w-4xl text-base leading-7 text-white/82 md:text-lg">
            <span className="font-semibold text-white">Act now:</span> the recommended posture is{' '}
            <span className="font-semibold uppercase text-white">{viewModel.decisionState.recommendation}</span>
            {' '}because {viewModel.decisionState.whyNow.toLowerCase()}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Next decision trigger: {viewModel.decisionState.whatChanges}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge badge={{ label: `Action: ${viewModel.decisionState.recommendation}`, tone: recommendationToneValue }} />
          <Badge badge={{ label: `Confidence: ${viewModel.decisionState.confidenceScore}/100`, tone: 'accent' }} />
          <Badge badge={{ label: `Sensitivity: ${viewModel.decisionState.sensitivityLabel}`, tone: sensitivityTone(viewModel.decisionState.sensitivityLabel) }} />
        </div>
      </div>
    </section>
  )
}

function DecisionStakesSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">Decision stakes</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.impactBoard.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{viewModel.impactBoard.summary}</p>
        </div>
        <Badge badge={{ label: 'Buyer-value view', tone: 'accent' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {viewModel.impactBoard.items.map((item) => (
          <div key={item.label} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">{item.label}</p>
            <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-white/78">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function NextActionPanel({ viewModel }: { viewModel: CockpitViewModel }) {
  const recommendation = viewModel.decisionState.recommendation
  const tone = decisionTone(recommendation)
  const actions =
    recommendation === 'activate'
      ? [
          'Escalate the incident to the active recall-response lead and trigger containment steps now.',
          'Freeze affected distribution paths while the team verifies downstream exposure and customer impact.',
          `Track this closely because the current blocker profile is still sensitive: ${viewModel.decisionState.whatChanges}`,
        ]
      : recommendation === 'reject'
        ? [
            'Document the evidence that supports standing down the recall posture and preserve the reasoning trail.',
            'Continue lightweight monitoring so the team can reopen quickly if contradictory evidence arrives.',
            `Keep the review boundary explicit: ${viewModel.decisionState.whatChanges}`,
          ]
        : [
            'Hold the decision posture and assign owners to gather the missing proof or resolve the conflict now.',
            'Use the blocker panel to focus the next evidence request before escalating the response unnecessarily.',
            `The quickest path to a stronger decision is: ${viewModel.decisionState.whatChanges}`,
          ]

  return (
    <section className={`rounded-[1.6rem] border px-5 py-4 md:px-6 ${toneClasses(tone)}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/52">Recommended next action</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">What the operator should do now</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/76">This makes the recommendation operational by turning it into immediate next steps instead of leaving the outcome as a static label.</p>
        </div>
        <Badge badge={{ label: `Current posture: ${recommendation}`, tone }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {actions.map((action, index) => (
          <div key={action} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Step 0{index + 1}</p>
            <p className="mt-2 text-sm leading-6 text-white/82">{action}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function StakeholderBriefingSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">Stakeholder briefing</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.stakeholderBriefing.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">{viewModel.stakeholderBriefing.summary}</p>
        </div>
        <Badge badge={{ label: `${viewModel.stakeholderBriefing.items.length} team briefs`, tone: 'accent' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {viewModel.stakeholderBriefing.items.map((item) => (
          <div key={item.role} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{item.role}</p>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/52">{item.due}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{item.headline}</p>
            <p className="mt-2 text-sm leading-6 text-white/80">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function TaskOwnershipStrip({ viewModel }: { viewModel: CockpitViewModel }) {
  const recommendation = viewModel.decisionState.recommendation
  const tasks =
    recommendation === 'activate'
      ? [
          { owner: 'Recall lead', task: 'Trigger active containment workflow', due: 'Due now', tone: 'critical' as const },
          { owner: 'Operations', task: 'Pause exposed distribution lanes', due: 'Due in 15 min', tone: 'warning' as const },
          { owner: 'Compliance', task: 'Prepare regulatory posture summary', due: 'Due in 30 min', tone: 'accent' as const },
        ]
      : recommendation === 'reject'
        ? [
            { owner: 'Quality lead', task: 'Record stand-down rationale', due: 'Due now', tone: 'safe' as const },
            { owner: 'Operations', task: 'Keep passive monitoring active', due: 'Due in 30 min', tone: 'accent' as const },
            { owner: 'Compliance', task: 'Archive audit-ready decision note', due: 'Due today', tone: 'neutral' as const },
          ]
        : [
            { owner: 'Recall analyst', task: 'Request missing proof packet', due: 'Due now', tone: 'warning' as const },
            { owner: 'QA lead', task: 'Resolve contradictory evidence', due: 'Due in 20 min', tone: 'accent' as const },
            { owner: 'Ops manager', task: 'Hold execution posture pending update', due: 'Due in 30 min', tone: 'neutral' as const },
          ]

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">Assigned execution</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">Who owns the next move</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">This turns the decision into accountable operational work with named owners and expected timing.</p>
        </div>
        <Badge badge={{ label: `${tasks.length} active tasks`, tone: 'accent' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {tasks.map((task) => (
          <div key={`${task.owner}-${task.task}`} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(task.tone)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{task.owner}</p>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/52">{task.due}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/82">{task.task}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function BlockerSummaryPanel({ viewModel }: { viewModel: CockpitViewModel }) {
  const topBlockers = viewModel.reasoning.confidenceFactors.slice(0, 2)
  const nextUnblocks = viewModel.reasoning.nextTriggers.slice(0, 2)

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[1.5rem] border border-[#ffcb6b]/20 bg-[linear-gradient(135deg,rgba(255,203,107,0.12),rgba(255,255,255,0.03))] px-5 py-4 md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffe29c]">What is blocking confidence</p>
        <p className="mt-2 text-sm leading-6 text-white/74">These are the main reasons the system is not more certain yet.</p>
        <div className="mt-4 space-y-3">
          {topBlockers.map((item) => (
            <div key={item} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="text-sm leading-6 text-white/80">{item}</p>
            </div>
          ))}
          {topBlockers.length === 0 ? (
            <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="text-sm leading-6 text-white/80">No major blockers are currently dominating the confidence picture.</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[#65d8ff]/18 bg-[linear-gradient(135deg,rgba(101,216,255,0.1),rgba(255,255,255,0.03))] px-5 py-4 md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">What would unblock higher confidence</p>
        <p className="mt-2 text-sm leading-6 text-white/74">These are the next evidence or timing triggers that would make the decision clearer.</p>
        <div className="mt-4 space-y-3">
          {nextUnblocks.map((item) => (
            <div key={item} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="text-sm leading-6 text-white/80">{item}</p>
            </div>
          ))}
          {nextUnblocks.length === 0 ? (
            <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="text-sm leading-6 text-white/80">The current evidence picture is relatively stable, with no immediate unblockers required.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function DecisionHero({ viewModel }: { viewModel: CockpitViewModel }) {
  const tone = decisionTone(viewModel.decisionState.recommendation)
  const recommendationDelta = deltaLookup(viewModel, 'Recommendation')
  const confidenceDelta = deltaLookup(viewModel, 'Confidence')
  const whyNowDelta = deltaLookup(viewModel, 'Why now')
  const exposureLead = viewModel.exposureStrip.items[0]
  const pressureTone = dominantSideTone(viewModel.responseClock.dominantSide)
  const consequenceGap = Math.abs(viewModel.responseClock.inactionScore - viewModel.responseClock.actionScore)

  return (
    <section className={`rounded-[2rem] border p-6 md:p-8 ${heroToneClasses(tone)}`}>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)] lg:items-start">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/55">Current decision</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge badge={{ label: viewModel.decisionState.confidenceLabel, tone: 'accent' }} />
            <Badge badge={{ label: viewModel.decisionState.toneLabel, tone }} />
            {recommendationDelta ? <Badge badge={{ label: 'Recommendation updated', tone: recommendationDelta.tone }} /> : null}
            {confidenceDelta ? <Badge badge={{ label: 'Confidence changed', tone: confidenceDelta.tone }} /> : null}
          </div>

          <div className="mt-6 space-y-4">
            <div className={recommendationDelta ? 'rounded-[1.6rem] border border-white/14 bg-white/[0.05] px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]' : ''}>
              <h1 className={`text-5xl font-semibold uppercase tracking-[-0.06em] text-white md:text-7xl ${recommendationDelta ? 'animate-pulse' : ''}`}>{viewModel.decisionState.recommendation}</h1>
            </div>
            <div className={whyNowDelta ? 'rounded-[1.3rem] border border-white/12 bg-white/[0.04] px-4 py-4' : ''}>
              <p className="max-w-3xl text-base leading-8 text-white/74 md:text-lg">{viewModel.decisionState.whyNow}</p>
              {whyNowDelta ? <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8de8ff]">Reasoning updated from previous result</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.3rem] border border-white/12 bg-black/18 px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Next decision trigger</p>
                <p className="mt-3 text-sm leading-6 text-white/82">{viewModel.decisionState.whatChanges}</p>
              </div>
              <div className={`rounded-[1.3rem] border px-4 py-4 ${toneClasses(pressureTone)}`}>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Execution pressure</p>
                <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">Gap {consequenceGap}</p>
                <p className="mt-2 text-sm leading-6 text-white/78">{viewModel.responseClock.nextTrigger}</p>
              </div>
            </div>
          </div>
      </div>

        <div className="space-y-3 lg:pt-8">
          <div className={`rounded-[1.6rem] border px-4 py-4 ${toneClasses(pressureTone)}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Pressure window</p>
              <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/64">{viewModel.responseClock.minutesSinceSignal} min live</span>
            </div>
            <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">{viewModel.responseClock.delayStage}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">Act now</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{viewModel.responseClock.actionScore}</p>
              </div>
              <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/44">Wait</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{viewModel.responseClock.inactionScore}</p>
              </div>
            </div>
          </div>

          {exposureLead ? (
            <div className={`rounded-[1.6rem] border px-4 py-4 ${toneClasses(exposureLead.tone)}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">Top exposed dimension</p>
                <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/64">Score {exposureLead.score}</span>
              </div>
              <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">{exposureLead.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/78">{exposureLead.basis}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={confidenceDelta ? 'rounded-[1.4rem] border border-[#8de8ff]/24 bg-[#8de8ff]/8 p-1' : ''}>
              <KeyMetric label="Confidence" value={`${viewModel.decisionState.confidenceScore}/100`} tone="accent" />
            </div>
            <KeyMetric label="Sensitivity" value={viewModel.decisionState.sensitivityLabel} tone={sensitivityTone(viewModel.decisionState.sensitivityLabel)} />
            <KeyMetric label="Recommendation tone" value={viewModel.decisionState.toneLabel} tone={tone} />
            <KeyMetric label="Decision posture" value={viewModel.decisionState.recommendation} tone={tone} />
          </div>
        </div>
      </div>
    </section>
  )
}

function KeySignalSection({ viewModel }: { viewModel: CockpitViewModel }) {
  const primaryDetail = viewModel.keySignal.highlights[0] ?? viewModel.keySignal.summary
  const secondaryDetail = viewModel.decisionState.whatChanges

  return (
    <ShellCard>
      <SectionTitle eyebrow="Why it changed" title={viewModel.keySignal.title} description={viewModel.keySignal.summary} />
      <div className="mt-5 space-y-3 text-base leading-8 text-white/78">
        <p>{primaryDetail}</p>
        <p className="text-[var(--muted)]">{secondaryDetail}</p>
      </div>
    </ShellCard>
  )
}

function ValueStorySection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="How RecallZero helps" title={viewModel.valueStory.title} description={viewModel.valueStory.summary} />
      <div className="mt-5 space-y-3">
        {viewModel.valueStory.items.map((item) => (
          <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function LiveInputSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="What came in" title={viewModel.liveInput.title} description={viewModel.liveInput.summary} />
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge badge={{ label: viewModel.liveInput.sourceType, tone: 'accent' }} />
        <Badge badge={{ label: viewModel.liveInput.receivedAt, tone: 'neutral' }} />
      </div>
      <pre className="mt-5 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-black/22 px-4 py-4 text-xs leading-6 text-white/74 whitespace-pre-wrap">
        {viewModel.liveInput.rawSignal}
      </pre>
    </ShellCard>
  )
}

function SystemOutputSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="What we can send" title={viewModel.systemOutput.title} description={viewModel.systemOutput.summary} />
      <div className="mt-5 space-y-3">
        {viewModel.systemOutput.items.map((item) => (
          <div key={item.label} className={`rounded-[1.2rem] border px-4 py-4 ${deltaLookup(viewModel, item.label) ? `${toneClasses(deltaLookup(viewModel, item.label)?.tone ?? 'accent')} shadow-[0_0_0_1px_rgba(255,255,255,0.03)]` : 'border-white/10 bg-white/[0.03]'}`}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{item.label}</p>
            <p className="mt-3 text-sm leading-6 text-white/78">{item.value}</p>
            {deltaLookup(viewModel, item.label) ? <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/52">Updated in latest refresh</p> : null}
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function RefreshDeltaSection({ viewModel }: { viewModel: CockpitViewModel }) {
  if (viewModel.refreshDelta.items.length === 0) {
    return null
  }

  return (
    <ShellCard>
      <SectionTitle eyebrow="What changed in this step" title={viewModel.refreshDelta.title} description={viewModel.refreshDelta.summary} />
      <div className="mt-5 space-y-3">
        {viewModel.refreshDelta.items.map((item) => (
          <div key={item.label} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{item.label}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">Previous</p>
                <p className="mt-2 text-sm leading-6 text-white/68">{item.previous}</p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/22 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">Current</p>
                <p className="mt-2 text-sm leading-6 text-white">{item.current}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function AiRoleSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="How AI helps" title={viewModel.aiRole.title} description={viewModel.aiRole.summary} />
      <div className="mt-5 space-y-3">
        {viewModel.aiRole.items.map((item) => (
          <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function InteractionStorySection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="How a user works here" title={viewModel.interactionStory.title} description={viewModel.interactionStory.summary} />
      <div className="mt-5 space-y-3">
        {viewModel.interactionStory.items.map((item) => (
          <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function ConnectorStorySection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="What connects here" title={viewModel.connectorStory.title} description={viewModel.connectorStory.summary} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {viewModel.connectorStory.items.map((item) => (
          <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8de8ff]">{item.status}</span>
            <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function OutputValueSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="Why this output matters" title={viewModel.outputValue.title} description={viewModel.outputValue.summary} />
      <div className="mt-5 space-y-3">
        {viewModel.outputValue.items.map((item) => (
          <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  )
}

function TimelineItemCard({ item, isLast, isLatest }: { item: CockpitTimelineItem; isLast: boolean; isLatest: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex w-6 flex-col items-center">
        <div className={`mt-1 h-3 w-3 rounded-full ${indicatorToneClasses(item.tone)} ${isLatest ? 'ring-4 ring-white/12' : ''}`} />
        {!isLast ? <div className="mt-2 h-full w-px bg-white/10" /> : null}
      </div>
      <div className={`flex-1 rounded-[1.2rem] border px-4 py-4 ${isLatest ? 'shadow-[0_18px_40px_rgba(0,0,0,0.18)]' : ''} ${toneClasses(item.tone)}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            {isLatest ? <span className="rounded-full border border-[#8de8ff]/30 bg-[#8de8ff]/12 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8f4ff]">Latest update</span> : null}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/46">{item.at}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/76">{item.detail}</p>
      </div>
    </div>
  )
}

function TimelineSection({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <ShellCard>
      <SectionTitle eyebrow="How it evolved" title="Decision timeline" description={viewModel.timeline.summary} />
      <div className="mt-6 space-y-4">
        {viewModel.timeline.items.map((item, index) => (
          <TimelineItemCard key={item.id} item={item} isLast={index === viewModel.timeline.items.length - 1} isLatest={index === 0} />
        ))}
      </div>
    </ShellCard>
  )
}

function DecisionPackageFooter({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <section className={`rounded-[1.6rem] border px-5 py-4 md:px-6 ${toneClasses(viewModel.executiveDispatch.tone)}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/56">Decision package ready</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.executiveDispatch.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/78">{viewModel.executiveDispatch.summary}</p>
        </div>
        <Badge badge={{ label: 'Leadership-ready artifact', tone: viewModel.executiveDispatch.tone }} />
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Leadership action</p>
        <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.executiveDispatch.callToAction}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {viewModel.executiveDispatch.items.map((item) => (
          <div key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-white/80">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function MessagePreviewSection({ viewModel }: { viewModel: CockpitViewModel }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const messageText = [`Subject: ${viewModel.messagePreview.subject}`, '', ...viewModel.messagePreview.body].join('\n')

  useEffect(() => {
    if (copyState === 'idle') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle')
    }, 1800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copyState])

  async function handleCopyBrief() {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <section className={`rounded-[1.6rem] border px-5 py-4 md:px-6 ${toneClasses(viewModel.messagePreview.tone)}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/56">Outbound brief</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{viewModel.messagePreview.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/78">{viewModel.messagePreview.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge badge={{ label: viewModel.messagePreview.audience, tone: viewModel.messagePreview.tone }} />
          <ActionButton tone="secondary" onClick={() => { void handleCopyBrief() }}>Copy brief</ActionButton>
        </div>
      </div>

      {copyState !== 'idle' ? (
        <div className={`mt-4 rounded-[1rem] border px-4 py-3 ${copyState === 'copied' ? toneClasses('safe') : toneClasses('warning')}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/56">{copyState === 'copied' ? 'Clipboard ready' : 'Copy unavailable'}</p>
          <p className="mt-2 text-sm leading-6 text-white/82">{copyState === 'copied' ? 'The incident brief was copied and is ready to paste into email, Slack, or an incident channel.' : 'Clipboard access failed in this browser context. You can still copy the brief manually from the preview below.'}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Subject</p>
        <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.messagePreview.subject}</p>
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/22 px-4 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Message preview</p>
        <div className="mt-3 space-y-3 text-sm leading-6 text-white/82">
          {viewModel.messagePreview.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

function HandoffCenterSection({ viewModel }: { viewModel: CockpitViewModel }) {
  const [activeTab, setActiveTab] = useState<'operator' | 'leadership' | 'outbound'>('operator')

  const tabs = [
    { id: 'operator' as const, label: 'Operator handoff', tone: 'accent' as const },
    { id: 'leadership' as const, label: 'Leadership brief', tone: viewModel.executiveDispatch.tone },
    { id: 'outbound' as const, label: 'Outbound message', tone: viewModel.messagePreview.tone },
  ]

  return (
    <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-5 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8de8ff]">Handoff center</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">One decision, three ready-to-use outputs</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">RecallZero now turns the same recommendation into an operator handoff, a leadership brief, and an outbound message without forcing the team to rewrite the story for each audience.</p>
        </div>
        <Badge badge={{ label: 'Audience-ready outputs', tone: 'accent' }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-200 ${activeTab === tab.id ? toneClasses(tab.tone) : 'border-white/10 bg-black/18 text-white/60 hover:border-white/18 hover:text-white/82'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'operator' ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {viewModel.stakeholderBriefing.items.map((item) => (
            <div key={item.role} className={`rounded-[1.2rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{item.role}</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/52">{item.due}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{item.headline}</p>
              <p className="mt-2 text-sm leading-6 text-white/80">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'leadership' ? (
        <div className={`mt-4 rounded-[1.4rem] border px-4 py-4 ${toneClasses(viewModel.executiveDispatch.tone)}`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">Leadership action</p>
          <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.executiveDispatch.callToAction}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {viewModel.executiveDispatch.items.slice(0, 4).map((item) => (
              <div key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-white/80">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'outbound' ? (
        <div className={`mt-4 rounded-[1.4rem] border px-4 py-4 ${toneClasses(viewModel.messagePreview.tone)}`}>
          <div className="rounded-[1.1rem] border border-white/10 bg-black/18 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Subject</p>
            <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">{viewModel.messagePreview.subject}</p>
          </div>
          <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-black/22 px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Message body</p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/82">
              {viewModel.messagePreview.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function DetailsList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{title}</p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-white/72">
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  )
}

function OptionalDetails({ viewModel }: { viewModel: CockpitViewModel }) {
  return (
    <details className="group rounded-[1.6rem] border border-white/8 bg-black/14 px-5 py-4 open:bg-black/18 md:px-6">
      <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.28em] text-white/58">
        Optional details
      </summary>
      <div className="mt-5 space-y-4">
        <DetailsList title="Reasoning drivers" items={viewModel.reasoning.drivers} />
        <DetailsList title="Confidence factors" items={viewModel.reasoning.confidenceFactors} />
        <DetailsList title="Next triggers" items={viewModel.reasoning.nextTriggers} />
        <DetailsList title="Alerts" items={viewModel.decisionState.alerts} />
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/72">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">Temporal note</p>
          <p className="mt-3">{viewModel.reasoning.temporalNote}</p>
        </div>
      </div>
    </details>
  )
}

type StepDialogKind = 'intake' | 'triage' | 'conflict' | 'delay' | 'evidence' | 'commit'
type WorkspaceTabKey = 'overview' | 'intake' | 'execution' | 'outputs' | 'platform'

const workspaceTabs: Array<{
  key: WorkspaceTabKey
  label: string
  description: string
  sections: string
}> = [
  {
    key: 'overview',
    label: 'What changed',
    description: 'See the current decision, risk, and story shift for this step.',
    sections: 'Story progression, urgency, forward view, exposure, summary, decision, blockers, timeline',
  },
  {
    key: 'intake',
    label: 'What came in',
    description: 'See the incoming signal and how RecallZero interpreted it.',
    sections: 'Source flow, real signal form, end-user interaction, connected systems, real input',
  },
  {
    key: 'execution',
    label: 'What to do',
    description: 'See the next actions for operators, leadership, and comms.',
    sections: 'Next action, stakeholder briefing, assigned execution, handoff center, outbound brief',
  },
  {
    key: 'outputs',
    label: 'What we can send',
    description: 'See the ready-to-use outputs, briefs, and decision package.',
    sections: 'Real output, output value, decision package ready, why it changed',
  },
  {
    key: 'platform',
    label: 'How RecallZero helps',
    description: 'See what AI and the product layer are adding to the workflow.',
    sections: 'AI role, project value',
  },
]

function recommendedTabForViewModel(viewModel: CockpitViewModel): {
  tab: WorkspaceTabKey
  reason: string
} {
  if (viewModel.screen === 'intake') {
    return {
      tab: 'intake',
      reason: 'Start here to see what arrived and how the system turned it into a structured case.',
    }
  }

  const title = viewModel.header.title.toLowerCase()

  if (title.includes('committed')) {
    return {
      tab: 'outputs',
      reason: 'This final step is best read through the package, brief, and send-ready outputs now available.',
    }
  }

  if (title.includes('evidence')) {
    return {
      tab: 'execution',
      reason: 'Fresh evidence changed the call, so the next important question is what teams should do now.',
    }
  }

  return {
    tab: 'overview',
    reason: 'This step mainly changes the decision, exposure, or urgency picture.',
  }
}

function stepDialogKind(viewModel: CockpitViewModel): StepDialogKind {
  const title = `${viewModel.header.title} ${viewModel.header.subtitle}`.toLowerCase()

  if (title.includes('conflict')) {
    return 'conflict'
  }

  if (title.includes('delay')) {
    return 'delay'
  }

  if (title.includes('evidence')) {
    return 'evidence'
  }

  if (title.includes('committed')) {
    return 'commit'
  }

  if (title.includes('triage')) {
    return 'triage'
  }

  return 'intake'
}

function stepDialogTheme(kind: StepDialogKind) {
  switch (kind) {
    case 'triage':
      return {
        eyebrow: 'Decision framed',
        callout: 'RecallZero has turned the intake signal into a visible working posture.',
        shellClassName: 'border-[#ffcb6b]/24 bg-[linear-gradient(145deg,rgba(43,31,10,0.98),rgba(19,16,11,0.96))]',
        railClassName: 'bg-[linear-gradient(90deg,#ffcb6b_0%,#f39b45_100%)]',
        panelClassName: 'border-[#ffcb6b]/18 bg-[#ffcb6b]/10',
        badgeTone: 'warning' as const,
      }
    case 'conflict':
      return {
        eyebrow: 'Contradiction detected',
        callout: 'A new source changed the story, so the operator needs a clearer explanation of the shift.',
        shellClassName: 'border-[#ff6d6d]/24 bg-[linear-gradient(145deg,rgba(50,18,24,0.98),rgba(21,11,15,0.96))]',
        railClassName: 'bg-[linear-gradient(90deg,#ff6d6d_0%,#ff8b6a_100%)]',
        panelClassName: 'border-[#ff6d6d]/18 bg-[#ff6d6d]/10',
        badgeTone: 'critical' as const,
      }
    case 'delay':
      return {
        eyebrow: 'Exposure widened',
        callout: 'Waiting changed the operating picture, not just the headline recommendation.',
        shellClassName: 'border-[#ff9f5a]/24 bg-[linear-gradient(145deg,rgba(55,28,10,0.98),rgba(24,14,9,0.96))]',
        railClassName: 'bg-[linear-gradient(90deg,#ffcb6b_0%,#ff7e45_100%)]',
        panelClassName: 'border-[#ff9f5a]/18 bg-[#ff9f5a]/10',
        badgeTone: 'warning' as const,
      }
    case 'evidence':
      return {
        eyebrow: 'Evidence resolved',
        callout: 'The newest proof packet collapsed uncertainty and changed the final operating call.',
        shellClassName: 'border-[#48d28d]/24 bg-[linear-gradient(145deg,rgba(18,49,35,0.98),rgba(10,19,15,0.96))]',
        railClassName: 'bg-[linear-gradient(90deg,#48d28d_0%,#8de8ff_100%)]',
        panelClassName: 'border-[#48d28d]/18 bg-[#48d28d]/10',
        badgeTone: 'safe' as const,
      }
    case 'commit':
      return {
        eyebrow: 'Decision trail preserved',
        callout: 'The final state is now locked with a visible explanation of how the call evolved.',
        shellClassName: 'border-[#8de8ff]/24 bg-[linear-gradient(145deg,rgba(12,30,39,0.98),rgba(12,22,20,0.96))]',
        railClassName: 'bg-[linear-gradient(90deg,#8de8ff_0%,#48d28d_100%)]',
        panelClassName: 'border-[#8de8ff]/18 bg-[#8de8ff]/10',
        badgeTone: 'accent' as const,
      }
    default:
      return {
        eyebrow: 'Signal captured',
        callout: 'A new stage has started, so the popup frames the operator around the most important live changes.',
        shellClassName: 'border-[#65d8ff]/24 bg-[linear-gradient(145deg,rgba(8,15,21,0.98),rgba(16,25,34,0.96))]',
        railClassName: 'bg-[linear-gradient(90deg,#8de8ff_0%,#65d8ff_100%)]',
        panelClassName: 'border-[#65d8ff]/18 bg-[#65d8ff]/10',
        badgeTone: 'accent' as const,
      }
  }
}

function stepDialogDelta(viewModel: CockpitViewModel, label: string) {
  return viewModel.refreshDelta.items.find((item) => item.label === label)
}

function RecallZeroMark({ size = 'lg', gradientId }: { size?: 'md' | 'lg'; gradientId: string }) {
  const shellClassName = size === 'md'
    ? 'h-12 w-12 rounded-[1rem]'
    : 'h-16 w-16 rounded-[1.4rem]'
  const iconClassName = size === 'md' ? 'h-7 w-7' : 'h-10 w-10'

  return (
    <div className={`flex items-center justify-center border border-[#8de8ff]/26 bg-[radial-gradient(circle_at_30%_30%,rgba(141,232,255,0.32),rgba(101,216,255,0.12)_45%,rgba(10,16,24,0.9)_100%)] shadow-[0_16px_34px_rgba(24,97,124,0.2)] ${shellClassName}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true" className={iconClassName}>
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#8de8ff" />
            <stop offset="100%" stopColor="#48d28d" />
          </linearGradient>
        </defs>
        <path d="M15 20c0-3.3 2.7-6 6-6h22l6 6v24c0 3.3-2.7 6-6 6H21c-3.3 0-6-2.7-6-6V20Z" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.5" />
        <path d="M43 14v8h8" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 28h16M24 36h10" stroke={`url(#${gradientId})`} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="45" cy="41" r="7" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.5" />
        <path d="M45 37.5v4.5l3 2" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function RecallZeroBrand({ size = 'lg', eyebrow = 'Product intro', subtitle = 'Live recall decisions from messy incoming signals.' }: {
  size?: 'md' | 'lg'
  eyebrow?: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-4">
      <RecallZeroMark size={size} gradientId={`recallzero-mark-${size}-${eyebrow.replace(/\s+/g, '-').toLowerCase()}`} />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8de8ff]">{eyebrow}</p>
        <h1 className={`${size === 'md' ? 'mt-1 text-xl md:text-[1.6rem]' : 'mt-2 text-3xl md:text-[2.3rem]'} font-semibold tracking-[-0.05em] text-white`}>RecallZero</h1>
        <p className="mt-2 text-sm leading-6 text-white/72">{subtitle}</p>
      </div>
    </div>
  )
}

function JourneySplash({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,8,13,0.82)] px-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-white/10 bg-[linear-gradient(145deg,rgba(9,15,22,0.98),rgba(16,26,35,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:p-6">
        <RecallZeroBrand />

        <p className="mt-5 max-w-3xl text-base leading-7 text-white/76">
          RecallZero helps teams understand what is happening, what decision is recommended now, and what future trigger would change that decision.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/46">1. Input</p>
            <p className="mt-2 text-sm font-semibold text-white">Bring in a real signal</p>
            <p className="mt-1 text-sm leading-6 text-white/68">Supplier emails, QA contradictions, webhook payloads, and connected systems all feed the same flow.</p>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/46">2. Reasoning</p>
            <p className="mt-2 text-sm font-semibold text-white">See why the call was made</p>
            <p className="mt-1 text-sm leading-6 text-white/68">The engine weighs exposure, uncertainty, and timing pressure.</p>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/46">3. Action</p>
            <p className="mt-2 text-sm font-semibold text-white">Ship usable outputs</p>
            <p className="mt-1 text-sm leading-6 text-white/68">The workspace turns the decision into actions, briefs, and outbound communication.</p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-[#8de8ff]/16 bg-[#8de8ff]/8 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8de8ff]">How to read it</p>
          <p className="mt-2 text-sm leading-6 text-white/78">The tabs stay the same across every step. Only the content inside them changes.</p>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-white/62">Start journey to see what came in, what changed, and what to do next.</p>
          <ActionButton tone="primary" onClick={onStart}>Start journey</ActionButton>
        </div>
      </div>
    </div>
  )
}

function ConnectorQuickDialog({
  selectedConnectorKey,
  isOpen,
  onSelectConnector,
  onOpenWorkspace,
  onClose,
}: {
  selectedConnectorKey: Exclude<CockpitConnectorKey, 'none'>
  isOpen: boolean
  onSelectConnector: (connectorKey: Exclude<CockpitConnectorKey, 'none'>) => void
  onOpenWorkspace: () => void
  onClose: () => void
}) {
  if (!isOpen) {
    return null
  }

  const selectedConnector = connectorOptions.find((item) => item.value === selectedConnectorKey)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,8,13,0.72)] px-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Connected systems" className="w-full max-w-3xl rounded-[1.8rem] border border-[#48d28d]/20 bg-[linear-gradient(145deg,rgba(9,15,22,0.98),rgba(16,26,35,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#95f4c1]">Connected systems</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Choose a connector to open</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">Pick a connector, open its intake path, and review the incoming incident details.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge badge={{ label: '4 connector types', tone: 'safe' }} />
            <Badge badge={{ label: 'Setup + intake', tone: 'accent' }} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {connectorOptions.map((connector) => (
            <SelectCard
              key={connector.value}
              title={connector.label}
              detail={connector.detail}
              meta={connector.status}
              active={selectedConnectorKey === connector.value}
              onClick={() => onSelectConnector(connector.value)}
            />
          ))}
        </div>

        {selectedConnector ? (
          <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8de8ff]">Selected connector</p>
                <p className="mt-2 text-sm font-semibold text-white">{selectedConnector.label}</p>
                <p className="mt-2 text-sm leading-6 text-white/72">{selectedConnector.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge badge={{ label: selectedConnector.sourceType, tone: 'neutral' }} />
                <Badge badge={{ label: selectedConnector.status, tone: 'accent' }} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-white/62">Open connected systems to jump into the intake flow with this connector preselected.</p>
          <div className="flex flex-wrap gap-3">
            <ActionButton tone="secondary" onClick={onClose}>Close</ActionButton>
            <ActionButton tone="primary" onClick={onOpenWorkspace}>Open connected systems</ActionButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkspaceTabs({ activeTab, recommendedTab, recommendationReason, onChange }: {
  activeTab: WorkspaceTabKey
  recommendedTab: WorkspaceTabKey
  recommendationReason: string
  onChange: (tab: WorkspaceTabKey) => void
}) {
  const activeConfig = workspaceTabs.find((tab) => tab.key === activeTab) ?? workspaceTabs[0]

  return (
    <section className="rounded-[1.6rem] border border-white/8 bg-black/18 px-4 py-4 md:px-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8de8ff]">How to read this screen</p>
          <p className="mt-2 text-sm leading-6 text-white/72">Use the same tabs on every step. The scenario changes the content inside each tab, not the structure itself.</p>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-white/56">
          <span className="font-mono uppercase tracking-[0.16em] text-white/44">You are viewing</span>
          <p className="mt-1 text-sm font-semibold text-white">{activeConfig.label}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {workspaceTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-full border px-3 py-2 text-left transition-all duration-200 ${tab.key === activeTab ? 'border-[#8de8ff]/28 bg-[#8de8ff]/12 text-white shadow-[0_14px_28px_rgba(24,97,124,0.16)]' : 'border-white/10 bg-white/[0.03] text-white/66 hover:border-white/14 hover:bg-white/[0.05] hover:text-white'}`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">{tab.label}</span>
            {tab.key === recommendedTab ? <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8de8ff]">Focus</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-4">
        <p className="text-sm font-semibold text-white">{activeConfig.description}</p>
        <p className="mt-2 text-sm leading-6 text-white/64">Grouped sections: {activeConfig.sections}</p>
        <p className="mt-3 text-sm leading-6 text-[#8de8ff]">Best place to look in this step: {workspaceTabs.find((tab) => tab.key === recommendedTab)?.label ?? 'What changed'}</p>
        <p className="mt-1 text-sm leading-6 text-white/58">{recommendationReason}</p>
      </div>
    </section>
  )
}

function StepChangeDialog({
  viewModel,
  isGuidedPlayback,
  isOpen,
  onClose,
}: {
  viewModel: CockpitViewModel
  isGuidedPlayback: boolean
  isOpen: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!isOpen || !isGuidedPlayback) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onClose()
    }, 1700)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isGuidedPlayback, isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const changeItems = viewModel.refreshDelta.items.slice(0, 3)
  const dialogKind = stepDialogKind(viewModel)
  const dialogTheme = stepDialogTheme(dialogKind)
  const recommendationDelta = stepDialogDelta(viewModel, 'Recommendation')
  const confidenceDelta = stepDialogDelta(viewModel, 'Confidence')
  const currentRecommendation = recommendationDelta?.current ?? `${viewModel.decisionState.recommendation} (${viewModel.decisionState.toneLabel})`
  const previousRecommendation = recommendationDelta?.previous ?? 'No earlier decision to compare yet'
  const summaryLine = recommendationDelta
    ? `The decision moved from ${previousRecommendation} to ${currentRecommendation} because ${viewModel.decisionState.whyNow.toLowerCase()}`
    : `The current decision is ${currentRecommendation} because ${viewModel.decisionState.whyNow.toLowerCase()}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(3,8,13,0.68)] px-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Scenario step update" className={`w-full max-w-2xl rounded-[1.8rem] border px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:px-6 ${dialogTheme.shellClassName}`} onClick={(event) => event.stopPropagation()}>
        <div className={`h-1 w-full rounded-full ${dialogTheme.railClassName}`} />
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="pt-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/56">{dialogTheme.eyebrow}</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{viewModel.header.title}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/76">{dialogTheme.callout}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            <Badge badge={{ label: viewModel.header.stepLabel, tone: dialogTheme.badgeTone }} />
            <Badge badge={{ label: `Posture ${viewModel.decisionState.recommendation}`, tone: decisionTone(viewModel.decisionState.recommendation) }} />
          </div>
        </div>

        <div className={`mt-4 rounded-[1.2rem] border px-4 py-4 ${dialogTheme.panelClassName}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/44">Step summary</p>
              <p className="mt-2 text-base leading-7 text-white/88">{summaryLine}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-black/18 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/62">
                Source: {viewModel.keySignal.sourceType}
              </span>
              {confidenceDelta ? <Badge badge={{ label: `Confidence ${confidenceDelta.current}`, tone: confidenceDelta.tone }} /> : null}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className={`rounded-[1.1rem] border px-4 py-4 ${dialogTheme.panelClassName}`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/46">Decision now</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">{currentRecommendation}</p>
            <p className="mt-2 text-[11px] leading-5 text-white/64">Current posture after this step</p>
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/46">Watch next</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/88">{viewModel.decisionState.whatChanges}</p>
            <p className="mt-2 text-[11px] leading-5 text-white/58">This is the next trigger that can change the call again</p>
          </div>
        </div>

        {changeItems.length > 0 ? (
          <details className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-4 open:bg-black/20">
            <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.18em] text-white/52">See exact field changes</summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {changeItems.map((item) => (
                <div key={item.label} className={`rounded-[1.1rem] border px-4 py-4 ${toneClasses(item.tone)}`}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/46">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/90">{item.previous} {'->'} {item.current}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-white/68">{isGuidedPlayback ? 'This update will close automatically so the walkthrough can continue.' : 'Close this dialog to continue exploring the updated decision state.'}</p>
          <ActionButton tone="primary" onClick={onClose}>{isGuidedPlayback ? 'Continue playback' : 'Review update'}</ActionButton>
        </div>
      </div>
    </div>
  )
}

export function DecisionCockpitScene({
  viewModel,
  inputForm,
  processedForm,
  hasPendingChanges,
  runtimeNoticeHref,
  onInputFormChange,
  onInputFormSubmit,
  onPrimaryAction,
  onSecondaryAction,
  isGuidedPlayback,
  canGuidedPlayback,
  onToggleGuidedPlayback,
}: {
  viewModel: CockpitViewModel
  inputForm: CockpitInputForm
  processedForm: CockpitInputForm
  hasPendingChanges: boolean
  runtimeNoticeHref?: string | null
  onInputFormChange: <K extends keyof CockpitInputForm>(field: K, value: CockpitInputForm[K]) => void
  onInputFormSubmit: () => void
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
  isGuidedPlayback: boolean
  canGuidedPlayback: boolean
  onToggleGuidedPlayback: () => void
}) {
  const [showJourneySplash, setShowJourneySplash] = useState(!isGuidedPlayback)
  const [isConnectorDialogOpen, setIsConnectorDialogOpen] = useState(false)
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false)
  const [lastSeenStepLabel, setLastSeenStepLabel] = useState(viewModel.header.stepLabel)
  const initialRecommendation = recommendedTabForViewModel(viewModel)
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(initialRecommendation.tab)
  const currentTabRecommendation = recommendedTabForViewModel(viewModel)
  const intakeTabRef = useRef<HTMLDivElement | null>(null)
  const [connectorDialogKey, setConnectorDialogKey] = useState<Exclude<CockpitConnectorKey, 'none'>>(inputForm.connectorKey === 'none' ? 'supplier-email' : inputForm.connectorKey)

  const applyConnectedSystemSelection = (connectorKey: Exclude<CockpitConnectorKey, 'none'>) => {
    const connector = connectorOptions.find((item) => item.value === connectorKey)

    setActiveTab('intake')
    onInputFormChange('intakeMethod', 'connector')
    onInputFormChange('connectorKey', connectorKey)

    if (connector) {
      onInputFormChange('sourceType', connector.sourceType)
      onInputFormChange('rawSummary', connector.summary)
      onInputFormChange('rawSignal', connector.sample)
    }

    requestAnimationFrame(() => {
      intakeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openConnectedSystems = () => {
    setConnectorDialogKey(inputForm.connectorKey === 'none' ? 'supplier-email' : inputForm.connectorKey)
    setIsConnectorDialogOpen(true)
  }

  const openSelectedConnectorWorkspace = () => {
    applyConnectedSystemSelection(connectorDialogKey)
    setIsConnectorDialogOpen(false)
  }

  useEffect(() => {
    if (viewModel.isLoading) {
      return
    }

    if (lastSeenStepLabel !== viewModel.header.stepLabel) {
      setLastSeenStepLabel(viewModel.header.stepLabel)
      setActiveTab(currentTabRecommendation.tab)
      if (viewModel.progression.items.length > 0 && viewModel.refreshDelta.items.length > 0) {
        setIsStepDialogOpen(true)
      }
    }
  }, [currentTabRecommendation.tab, lastSeenStepLabel, viewModel.header.stepLabel, viewModel.isLoading, viewModel.progression.items.length, viewModel.refreshDelta.items.length])

  return (
    <div className="experience-shell px-4 py-5 md:px-6 xl:px-8">
      {showJourneySplash ? <JourneySplash onStart={() => setShowJourneySplash(false)} /> : null}
      <ConnectorQuickDialog selectedConnectorKey={connectorDialogKey} isOpen={isConnectorDialogOpen} onSelectConnector={setConnectorDialogKey} onOpenWorkspace={openSelectedConnectorWorkspace} onClose={() => setIsConnectorDialogOpen(false)} />
      <StepChangeDialog viewModel={viewModel} isGuidedPlayback={isGuidedPlayback} isOpen={isStepDialogOpen} onClose={() => setIsStepDialogOpen(false)} />
      <div className="mx-auto flex max-w-[920px] flex-col gap-5 md:gap-6">
        <Header
          viewModel={viewModel}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
          onOpenConnectors={openConnectedSystems}
          isGuidedPlayback={isGuidedPlayback}
          canGuidedPlayback={canGuidedPlayback}
          onToggleGuidedPlayback={onToggleGuidedPlayback}
        />
        <NoticeBanner notice={viewModel.notice} isLoading={viewModel.isLoading} noticeHref={runtimeNoticeHref} />
        <WorkspaceTabs activeTab={activeTab} recommendedTab={currentTabRecommendation.tab} recommendationReason={currentTabRecommendation.reason} onChange={setActiveTab} />
        {activeTab === 'overview' ? (
          <>
            <DemoProgressionStrip viewModel={viewModel} />
            <ResponseClockSection viewModel={viewModel} />
            <ForecastStripSection viewModel={viewModel} />
            <PostureShiftBanner viewModel={viewModel} />
            <ExposureStripSection viewModel={viewModel} />
            <ExecutiveSummaryStrip viewModel={viewModel} />
            <DecisionStakesSection viewModel={viewModel} />
            <BlockerSummaryPanel viewModel={viewModel} />
            <DecisionHero viewModel={viewModel} />
            <RefreshDeltaSection viewModel={viewModel} />
            <TimelineSection viewModel={viewModel} />
          </>
        ) : null}
        {activeTab === 'intake' ? (
          <div ref={intakeTabRef} className="contents">
            <SourceFlowStrip viewModel={viewModel} inputForm={inputForm} />
            {hasPendingChanges ? <PendingRefreshBanner inputForm={inputForm} processedForm={processedForm} /> : null}
            <IncidentFormSection inputForm={inputForm} processedForm={processedForm} hasPendingChanges={hasPendingChanges} onInputFormChange={onInputFormChange} onInputFormSubmit={onInputFormSubmit} isLoading={viewModel.isLoading} />
            <InteractionStorySection viewModel={viewModel} />
            <ConnectorStorySection viewModel={viewModel} />
            <LiveInputSection viewModel={viewModel} />
            <KeySignalSection viewModel={viewModel} />
          </div>
        ) : null}
        {activeTab === 'execution' ? (
          <>
            <NextActionPanel viewModel={viewModel} />
            <StakeholderBriefingSection viewModel={viewModel} />
            <TaskOwnershipStrip viewModel={viewModel} />
            <HandoffCenterSection viewModel={viewModel} />
            <MessagePreviewSection viewModel={viewModel} />
          </>
        ) : null}
        {activeTab === 'outputs' ? (
          <>
            <SystemOutputSection viewModel={viewModel} />
            <OutputValueSection viewModel={viewModel} />
            <DecisionPackageFooter viewModel={viewModel} />
          </>
        ) : null}
        {activeTab === 'platform' ? (
          <>
            <AiRoleSection viewModel={viewModel} />
            <ValueStorySection viewModel={viewModel} />
          </>
        ) : null}
        <OptionalDetails viewModel={viewModel} />
      </div>
    </div>
  )
}