'use client'

import { DecisionCockpitScene } from './experience-components'
import { useScenarioDemo } from './scenario/use-scenario-demo'

export function DecisionCockpitApp() {
  const {
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
  } = useScenarioDemo()

  return (
    <DecisionCockpitScene
      viewModel={viewModel}
      inputForm={inputForm}
      processedForm={processedForm}
      hasPendingChanges={hasPendingChanges}
      runtimeNoticeHref={runtimeNoticeHref}
      onInputFormChange={updateInputForm}
      onInputFormSubmit={submitInputForm}
      onPrimaryAction={nextStep}
      onSecondaryAction={viewModel.actions.secondaryLabel ? resetDemo : undefined}
      isGuidedPlayback={isGuidedPlayback}
      canGuidedPlayback={canGuidedPlayback}
      onToggleGuidedPlayback={toggleGuidedPlayback}
    />
  )
}