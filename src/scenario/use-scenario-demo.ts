'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { createDefaultDecisionState } from '../decision/default-state'
import type { DecisionState } from '../decision/types'
import type { EngineInput } from '../engine/types'
import { getTriageState } from '../engine/triage-adapter'
import { mapToCockpitViewModel } from '../view-model/cockpit-mapper'
import type { CockpitInputForm } from '../view-model/types'
import { createScenarioController, type ScenarioState } from './scenario-controller'

const PROCESSING_STAGES = [
  'Ingesting source signal...',
  'Normalizing incident into a decision frame...',
  'Updating recommendation and timeline...',
] as const

const GUIDED_PLAYBACK_DELAY_MS = 2200
const AUTOPLAY_QUERY_KEY = 'autoplay'
const CONNECTOR_API_PROXY_BASE = '/connector-api'

type ConnectorImportResponse = {
  ok: boolean
  persistenceMode: 'database' | 'fallback'
  storageLabel: string
  parsedCount: number
  importedCount: number
  message: string
  fileName: string
  previewIncidents: Array<{
    id: string
    title: string
  }>
}

function inputToForm(input: EngineInput): CockpitInputForm {
  return {
    label: input.label,
    sourceType: input.sourceType,
    receivedAt: input.receivedAt,
    elapsedMinutes: String(input.elapsedMinutes ?? 0),
    rawSummary: input.rawSummary ?? '',
    rawSignal: input.rawSignal,
    scenario: input.scenario ?? 'baseline',
    intakeMethod: 'paste',
    connectorKey: 'none',
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'live-incident'
}

function connectorLabelForForm(form: CockpitInputForm) {
  if (form.connectorKey === 'supplier-email') {
    return 'Supplier inbox'
  }

  if (form.connectorKey === 'qa-system') {
    return 'QA system'
  }

  if (form.connectorKey === 'erp-lot') {
    return 'ERP export'
  }

  if (form.connectorKey === 'returns-feed') {
    return 'Returns feed'
  }

  return form.sourceType.trim() || 'Connected system'
}

function resolveConnectorApiBaseUrl() {
  const configuredBaseUrl = (process.env.NEXT_PUBLIC_CONNECTOR_API_BASE_URL as string | undefined)?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '')
  }

  return process.env.NODE_ENV === 'development' ? CONNECTOR_API_PROXY_BASE : null
}

function resolveConnectorAppBaseUrl() {
  const configuredAppBaseUrl = (process.env.NEXT_PUBLIC_CONNECTOR_APP_BASE_URL as string | undefined)?.trim()
  if (configuredAppBaseUrl) {
    return configuredAppBaseUrl.replace(/\/+$/, '')
  }

  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_CONNECTOR_API_BASE_URL as string | undefined)?.trim()
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  }

  return process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3000' : null
}

function formToInput(form: CockpitInputForm): EngineInput {
  const defaultSourceType =
    form.intakeMethod === 'email'
      ? 'Forwarded email intake'
      : form.intakeMethod === 'api'
        ? 'Webhook payload'
        : form.intakeMethod === 'connector'
          ? 'Connected system'
          : 'Manual form'

  return {
    signalId: `manual-${slugify(form.label)}`,
    label: form.label.trim() || 'Manual incident submission',
    sourceType: form.sourceType.trim() || defaultSourceType,
    receivedAt: form.receivedAt.trim() || 'Now',
    rawSignal: form.rawSignal.trim(),
    rawSummary: form.rawSummary.trim() || undefined,
    elapsedMinutes: Number.isFinite(Number(form.elapsedMinutes)) ? Math.max(0, Number(form.elapsedMinutes)) : 0,
    scenario: form.scenario,
    refreshReason: 'initial-load',
  }
}

function sameForm(left: CockpitInputForm, right: CockpitInputForm) {
  return left.label === right.label
    && left.sourceType === right.sourceType
    && left.receivedAt === right.receivedAt
    && left.elapsedMinutes === right.elapsedMinutes
    && left.rawSummary === right.rawSummary
    && left.rawSignal === right.rawSignal
    && left.scenario === right.scenario
    && left.intakeMethod === right.intakeMethod
    && left.connectorKey === right.connectorKey
}

async function importConnectorSignal(form: CockpitInputForm) {
  const connectorApiBaseUrl = resolveConnectorApiBaseUrl()
  if (!connectorApiBaseUrl) {
    return null
  }

  const response = await fetch(`${connectorApiBaseUrl}/api/import/signal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connectorLabel: connectorLabelForForm(form),
      noticeText: form.rawSignal,
    }),
  })

  return await response.json() as ConnectorImportResponse
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function manualScenario(input: EngineInput, notice = 'Manual input submitted and processed through the current decision pipeline.'): ScenarioState {
  return {
    step: 'manual-input',
    stepIndex: 0,
    totalSteps: 0,
    screen: 'triage',
    title: 'Live form analysis',
    subtitle: 'A real submitted incident is being processed through the decision engine.',
    notice,
    primaryActionLabel: 'Return to Demo',
    secondaryActionLabel: 'Reset Demo',
    input,
  }
}

export function useScenarioDemo() {
  const controllerRef = useRef(createScenarioController())
  const hasCompletedLoadRef = useRef(false)
  const pendingGuidedPlaybackRef = useRef(false)
  const hasConsumedAutoplayRef = useRef(false)
  const initialScenario = controllerRef.current.getScenarioState()
  const [scenario, setScenario] = useState<ScenarioState>(() => initialScenario)
  const [decisionState, setDecisionState] = useState<DecisionState>(() => createDefaultDecisionState())
  const [previousDecisionState, setPreviousDecisionState] = useState<DecisionState | null>(null)
  const [inputForm, setInputForm] = useState<CockpitInputForm>(() => inputToForm(initialScenario.input))
  const [isLoading, setIsLoading] = useState(true)
  const [runtimeNotice, setRuntimeNotice] = useState<string | null>(scenario.notice)
  const [runtimeNoticeHref, setRuntimeNoticeHref] = useState<string | null>(null)
  const [isGuidedPlayback, setIsGuidedPlayback] = useState(false)

  const canGuidedPlayback = scenario.totalSteps > 0

  useEffect(() => {
    void loadScenario(controllerRef.current.getScenarioState())
  }, [])

  useEffect(() => {
    if (!isGuidedPlayback || isLoading || scenario.step === 'decision-history' || scenario.step === 'manual-input') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      nextStep()
    }, GUIDED_PLAYBACK_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [canGuidedPlayback, isGuidedPlayback, isLoading, scenario.stepIndex])

  useEffect(() => {
    if (scenario.step === 'manual-input' && isGuidedPlayback) {
      setIsGuidedPlayback(false)
    }
  }, [isGuidedPlayback, scenario.step])

  useEffect(() => {
    if (hasConsumedAutoplayRef.current || isLoading || scenario.stepIndex !== 0 || !canGuidedPlayback) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get(AUTOPLAY_QUERY_KEY) !== '1') {
      hasConsumedAutoplayRef.current = true
      return
    }

    hasConsumedAutoplayRef.current = true
    setIsGuidedPlayback(true)
  }, [canGuidedPlayback, isLoading, scenario.stepIndex])

  async function loadScenario(nextScenario: ScenarioState) {
    setIsLoading(true)
    setRuntimeNotice(nextScenario.notice)

    try {
      for (const stage of PROCESSING_STAGES) {
        setRuntimeNotice(stage)
        await wait(150)
      }

      const nextDecisionState = await getTriageState(nextScenario.input)
      if (hasCompletedLoadRef.current) {
        setPreviousDecisionState(decisionState)
      }
      setScenario(nextScenario)
      setDecisionState(nextDecisionState)
      setRuntimeNotice(nextScenario.notice)
      if (pendingGuidedPlaybackRef.current) {
        setIsGuidedPlayback(true)
        pendingGuidedPlaybackRef.current = false
      }
      hasCompletedLoadRef.current = true
    } catch {
      setScenario(nextScenario)
      setDecisionState(createDefaultDecisionState())
      setRuntimeNotice('The demo fell back to a safe local state because the engine response was unavailable.')
      pendingGuidedPlaybackRef.current = false
    } finally {
      setIsLoading(false)
    }
  }

  function nextStep() {
    if (scenario.step === 'manual-input') {
      setIsGuidedPlayback(false)
      const currentScenario = controllerRef.current.getScenarioState()
      setInputForm(inputToForm(currentScenario.input))
      void loadScenario(currentScenario)
      return
    }

    const nextScenario = controllerRef.current.nextStep()
    setInputForm(inputToForm(nextScenario.input))
    void loadScenario(nextScenario)
  }

  function resetDemo() {
    setIsGuidedPlayback(false)
    const resetScenario = controllerRef.current.resetDemo()
    setInputForm(inputToForm(resetScenario.input))
    void loadScenario(resetScenario)
  }

  function updateInputForm<K extends keyof CockpitInputForm>(field: K, value: CockpitInputForm[K]) {
    setInputForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function submitInputForm() {
    setIsGuidedPlayback(false)
    setRuntimeNoticeHref(null)

    let nextForm = inputForm
    let scenarioNotice = 'Manual input submitted and processed through the current decision pipeline.'

    if (inputForm.intakeMethod === 'connector' && inputForm.connectorKey !== 'none') {
      setRuntimeNotice('Importing connector signal into the live incident API...')

      try {
        const connectorImport = await importConnectorSignal(inputForm)

        if (connectorImport?.ok) {
          const previewIncident = connectorImport.previewIncidents[0]
          nextForm = {
            ...inputForm,
            label: previewIncident?.title || inputForm.label,
            rawSummary: inputForm.rawSummary.trim() || connectorImport.message,
          }
          setInputForm(nextForm)

          const connectorAppBaseUrl = resolveConnectorAppBaseUrl()
          setRuntimeNoticeHref(connectorAppBaseUrl && previewIncident ? `${connectorAppBaseUrl}/incidents/${encodeURIComponent(previewIncident.id)}` : null)

          scenarioNotice = `${connectorImport.message} Stored in ${connectorImport.storageLabel}${previewIncident ? ` as ${previewIncident.id}` : ''}.`
        } else if (connectorImport) {
          scenarioNotice = `${connectorImport.message} Continued with local analysis only.`
        } else {
          scenarioNotice = 'Live connector API is not configured here. Continued with local analysis only.'
        }
      } catch {
        scenarioNotice = 'Live connector import is unavailable right now. Continued with local analysis only.'
      }
    }

    const nextInput = formToInput(nextForm)
    const nextScenario = manualScenario(nextInput, scenarioNotice)
    void loadScenario(nextScenario)
  }

  function toggleGuidedPlayback() {
    if (!canGuidedPlayback) {
      return
    }

    if (isGuidedPlayback) {
      pendingGuidedPlaybackRef.current = false
      setIsGuidedPlayback(false)
      return
    }

    if (scenario.stepIndex > 0 || scenario.step === 'decision-history') {
      pendingGuidedPlaybackRef.current = true
      const resetScenario = controllerRef.current.resetDemo()
      setInputForm(inputToForm(resetScenario.input))
      void loadScenario(resetScenario)
      return
    }

    setIsGuidedPlayback(true)
  }

  const viewModel = useMemo(
    () => mapToCockpitViewModel({ scenario, decisionState, previousDecisionState, isLoading, runtimeNotice }),
    [decisionState, isLoading, previousDecisionState, runtimeNotice, scenario],
  )

  const processedForm = useMemo(() => inputToForm(scenario.input), [scenario])
  const hasPendingChanges = useMemo(() => !sameForm(inputForm, processedForm), [inputForm, processedForm])

  return {
    viewModel,
    inputForm,
    processedForm,
    hasPendingChanges,
    runtimeNoticeHref,
    updateInputForm,
    submitInputForm,
    nextStep,
    resetDemo,
    isGuidedPlayback,
    canGuidedPlayback,
    toggleGuidedPlayback,
  }
}