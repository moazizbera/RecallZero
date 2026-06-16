import { NextResponse } from "next/server"
import { getAppConfig } from "@/lib/app-config"
import { createIncident, deleteAllIncidents } from "@/lib/db"
import { getCurrentSession } from "@/lib/workspace-context"
import type { Decision, IntakeMethod } from "@/lib/types"

interface Seed {
  title: string
  source: string
  intakeMethod: IntakeMethod
  rawSignal: string
  decision: Decision
  lotReference?: string
  affectedRegions?: string[]
}

const SEEDS: Seed[] = [
  {
    title: "Undeclared peanut protein — granola lot",
    source: "NorthRiver Foods supplier inbox",
    intakeMethod: "connector",
    rawSignal:
      "Shared roasting line ran peanut product before lot NR-GRN-4471. Allergen wash-down log incomplete, no completion signature. 18,400 units shipped to 3 DCs. Label does not declare peanut. No complaints yet. Lab results 24-48h out.",
    lotReference: "NR-GRN-4471",
    affectedRegions: ["Northeast", "Mid-Atlantic", "Southeast"],
    decision: {
      posture: "ACTIVATE",
      confidence: "MODERATE",
      confidenceScore: 71,
      severity: "A",
      headline: "Initiate containment now — undeclared allergen with active distribution",
      rationale:
        "An undeclared peanut allergen on a shipped product is a Class I safety risk. The incomplete wash-down record means cross-contact cannot be ruled out, and 18,400 units are already in distribution. Delay risk dominates the uncertainty here, so containment should begin in parallel with lab confirmation.",
      exposureEstimate: "$2.4M - $6.1M",
      evidenceGaps: [
        { label: "Lab confirmation pending", detail: "ATP swab and protein assay results are 24-48h out.", kind: "missing" },
        { label: "Wash-down completion record", detail: "Cleaning cycle has a start signature but no completion or verification.", kind: "missing" },
      ],
      flipConditions: [
        { condition: "Lab results return below detectable peanut protein on retained samples", flipsTo: "HOLD" },
        { condition: "Completed and verified wash-down record is located confirming line was clean", flipsTo: "REJECT" },
      ],
      delayRisk: {
        trajectory: "critical",
        hoursUntilCritical: 6,
        narrative:
          "Every hour of delay increases consumer exposure and the regulatory cost of a reactive recall versus a proactive one.",
      },
    },
  },
  {
    title: "Beverage pH mismatch — supplier CoA vs sampling",
    source: "Internal QA platform",
    intakeMethod: "connector",
    rawSignal:
      "Supplier CoA reports lot NR-BEV-2208 in spec. Internal sampling on 2 of 6 pallets shows pH 4.9-5.1, above 4.6 control limit. Microbial stability concern. Lot on QA hold, not shipped. No distribution exposure.",
    lotReference: "NR-BEV-2208",
    affectedRegions: [],
    decision: {
      posture: "HOLD",
      confidence: "MODERATE",
      confidenceScore: 64,
      severity: "B",
      headline: "Hold lot and resolve the CoA contradiction before any release decision",
      rationale:
        "The supplier certificate and internal sampling directly contradict each other on a microbial-stability-relevant parameter. Because the lot is on QA hold with zero distribution exposure, there is no consumer risk yet — time pressure is low, which favors resolving the contradiction with confirmatory testing before acting.",
      exposureEstimate: "$180K - $520K",
      evidenceGaps: [
        { label: "Conflicting pH data", detail: "Supplier CoA conforms; internal sampling exceeds the 4.6 control limit.", kind: "conflicting" },
        { label: "Microbial testing", detail: "No micro results yet to confirm stability impact.", kind: "missing" },
      ],
      flipConditions: [
        { condition: "Confirmatory pH testing reproduces out-of-spec results across pallets", flipsTo: "ACTIVATE" },
        { condition: "Calibration error found in internal sampling equipment", flipsTo: "REJECT" },
      ],
      delayRisk: {
        trajectory: "steady",
        hoursUntilCritical: 72,
        narrative: "Lot is contained on hold, so delay carries low risk until release is contemplated.",
      },
    },
  },
  {
    title: "Cosmetic label misprint — carton sleeve",
    source: "Operator note",
    intakeMethod: "paste",
    rawSignal:
      "Marketing flagged that carton sleeve for lot NR-SNK-1190 has a faded promotional logo. Ingredient panel, allergen statement, and net weight all correct and legible. No safety or regulatory fields affected.",
    lotReference: "NR-SNK-1190",
    affectedRegions: ["National"],
    decision: {
      posture: "REJECT",
      confidence: "HIGH",
      confidenceScore: 92,
      severity: "D",
      headline: "No recall warranted — defect is cosmetic, all regulated fields correct",
      rationale:
        "The defect is limited to a faded promotional logo. All safety- and regulation-relevant label fields (ingredients, allergens, net weight) are correct and legible. There is no consumer safety or compliance exposure, so a recall is not justified. Route to packaging quality for supplier corrective action.",
      exposureEstimate: "< $25K",
      evidenceGaps: [],
      flipConditions: [
        { condition: "Allergen or ingredient panel found to be affected on inspection", flipsTo: "ACTIVATE" },
      ],
      delayRisk: {
        trajectory: "steady",
        hoursUntilCritical: 240,
        narrative: "No safety dimension; timing is not a risk factor.",
      },
    },
  },
  {
    title: "Foreign material complaint cluster — frozen entrée",
    source: "Returns / complaints feed",
    intakeMethod: "webhook",
    rawSignal:
      "3 consumer complaints in 36h reporting hard plastic fragments in lot NR-FRZ-7732 frozen lasagna. 1 reported a minor mouth injury. Fragments consistent with a conveyor scraper. Lot is in retail distribution across 5 states.",
    lotReference: "NR-FRZ-7732",
    affectedRegions: ["CA", "NV", "AZ", "OR", "WA"],
    decision: {
      posture: "ACTIVATE",
      confidence: "HIGH",
      confidenceScore: 86,
      severity: "A",
      headline: "Initiate recall — corroborated foreign material with an injury report",
      rationale:
        "Three independent complaints within 36 hours plus a reported injury establish a credible, corroborated foreign-material hazard. The fragment source is plausibly identified (conveyor scraper) and the lot is in active retail distribution. This meets the threshold for an immediate Class I recall.",
      exposureEstimate: "$3.8M - $9.5M",
      evidenceGaps: [
        { label: "Root cause confirmation", detail: "Conveyor scraper suspected but not yet physically confirmed as the source.", kind: "missing" },
      ],
      flipConditions: [
        { condition: "Fragments determined to originate post-purchase rather than in production", flipsTo: "HOLD" },
      ],
      delayRisk: {
        trajectory: "critical",
        hoursUntilCritical: 3,
        narrative: "Product is on shelves and an injury has already occurred; each hour raises injury and liability exposure.",
      },
    },
  },
]

export async function POST() {
  const config = getAppConfig()
  if (!config.demoSeedingEnabled) {
    return NextResponse.json(
      { error: "Demo seeding is disabled in this deployment mode." },
      { status: 403 },
    )
  }

  try {
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: "Sign in before loading sample incidents." }, { status: 401 })
    }
    await deleteAllIncidents(session.workspaceId)
    const created = []
    for (const seed of SEEDS) {
      created.push(await createIncident({ ...seed, workspaceId: session.workspaceId }))
    }
    return NextResponse.json({ ok: true, count: created.length })
  } catch (error) {
    console.error("[recallzero] seed error:", error)
    return NextResponse.json({ error: "Could not seed demo data." }, { status: 500 })
  }
}
