import "server-only"
import { generateText, Output } from "ai"
import { z } from "zod"
import type { Decision } from "./types"

const MODEL = "openai/gpt-5.5"

type AnalyzeResult = Decision & {
  title: string
  lotReference?: string
  affectedRegions: string[]
  engine: "model" | "heuristic"
}

const decisionSchema = z.object({
  posture: z
    .enum(["HOLD", "ACTIVATE", "REJECT"])
    .describe(
      "HOLD: gather more evidence before acting. ACTIVATE: initiate the recall/containment now. REJECT: evidence does not support a recall.",
    ),
  confidence: z.enum(["LOW", "MODERATE", "HIGH"]),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Numeric confidence 0-100 aligned with the confidence band."),
  severity: z
    .enum(["A", "B", "C", "D"])
    .describe("A = imminent safety/regulatory risk, D = low/cosmetic."),
  headline: z.string().describe("One-line recommended action, max 90 chars."),
  rationale: z
    .string()
    .describe("2-4 sentences explaining why this posture is correct given the signal."),
  exposureEstimate: z
    .string()
    .describe("Human-readable financial exposure range, e.g. '$1.2M - $4M'."),
  evidenceGaps: z
    .array(
      z.object({
        label: z.string(),
        detail: z.string(),
        kind: z.enum(["missing", "conflicting"]),
      }),
    )
    .describe("What evidence is missing or contradictory and blocking confidence."),
  flipConditions: z
    .array(
      z.object({
        condition: z.string(),
        flipsTo: z.enum(["HOLD", "ACTIVATE", "REJECT"]),
      }),
    )
    .describe("Specific new facts that would change the recommended posture."),
  delayRisk: z.object({
    trajectory: z.enum(["rising", "steady", "critical"]),
    hoursUntilCritical: z
      .number()
      .describe("Estimated hours until waiting materially worsens the decision."),
    narrative: z.string().describe("1-2 sentences on how delay shifts the risk profile."),
  }),
  title: z.string().describe("Short incident title, max 60 chars."),
  lotReference: z.string().nullable().describe("Lot/batch reference if present in the signal."),
  affectedRegions: z
    .array(z.string())
    .describe("Geographic regions or markets implicated, empty if unknown."),
})

const SYSTEM = `You are RecallZero, an AI decision engine for product recall and incident response teams in regulated consumer industries (food, pharma, consumer goods, medical devices).

You receive messy, partial incident signals: supplier emails, QA alerts, webhook payloads, complaint summaries, operator notes. They are often incomplete or contradictory.

Your job is to convert the raw signal into a defensible operational decision under uncertainty. You must:
1. Recommend exactly one posture: HOLD (gather evidence), ACTIVATE (initiate recall/containment now), or REJECT (no recall warranted).
2. Be explicit and honest about confidence. If evidence is thin or conflicting, confidence must be LOW or MODERATE, never HIGH.
3. Name the specific missing or conflicting evidence that is blocking certainty.
4. State the concrete facts that would flip your recommendation.
5. Assess how delay changes risk. When there is a plausible safety or regulatory exposure, waiting is itself a risk and you must say so.

Decision principles:
- Imminent safety risk to consumers (allergens, pathogens, sharp foreign material, dosage errors) with credible evidence pushes toward ACTIVATE even with incomplete data, because delay risk dominates.
- A single unverified or contradicted claim with no corroboration pushes toward HOLD, not ACTIVATE.
- Clearly cosmetic, out-of-scope, or already-contained issues push toward REJECT.
- Never invent facts not present or reasonably inferable from the signal. If a detail is unknown, treat it as a gap.

Be precise, calm, and defensible. A compliance team will read this later.`

/**
 * Runs a live model over arbitrary incident signal text and returns a
 * structured, defensible decision. If the AI Gateway is unavailable (e.g.
 * missing billing/credits), falls back to a deterministic heuristic analyzer
 * so the product never hard-fails. The `engine` field reports which path ran.
 */
export async function analyzeSignal(signal: string): Promise<AnalyzeResult> {
  try {
    const { experimental_output } = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: `Analyze the following incident signal and produce a structured recall decision.\n\n--- SIGNAL START ---\n${signal}\n--- SIGNAL END ---`,
      experimental_output: Output.object({ schema: decisionSchema }),
    })

    const o = experimental_output
    return {
      posture: o.posture,
      confidence: o.confidence,
      confidenceScore: o.confidenceScore,
      severity: o.severity,
      headline: o.headline,
      rationale: o.rationale,
      exposureEstimate: o.exposureEstimate,
      evidenceGaps: o.evidenceGaps,
      flipConditions: o.flipConditions,
      delayRisk: o.delayRisk,
      title: o.title,
      lotReference: o.lotReference ?? undefined,
      affectedRegions: o.affectedRegions,
      engine: "model",
    }
  } catch (err) {
    const e = err as { statusCode?: number; message?: string }
    // 403 here typically means the AI Gateway has no billing/credits yet.
    // We never hard-fail: fall back to the deterministic analyzer.
    console.log("[v0] live model unavailable, using heuristic fallback. status:", e?.statusCode)
    return heuristicAnalyze(signal)
  }
}

/* -------------------------------------------------------------------------- */
/* Deterministic fallback                                                      */
/* -------------------------------------------------------------------------- */

const SAFETY_TERMS = [
  "allergen", "peanut", "tree nut", "milk", "egg", "soy", "gluten", "undeclared",
  "listeria", "salmonella", "e. coli", "ecoli", "botulism", "pathogen", "contamination",
  "metal", "glass", "plastic", "shaving", "foreign material", "foreign object", "sharp",
  "dosage", "overdose", "mislabel", "wrong label", "choking", "injury", "hospital",
]
const CONTAINED_TERMS = ["contained", "quarantined", "held", "not shipped", "destroyed", "intercepted", "recalled already"]
const COSMETIC_TERMS = ["cosmetic", "minor", "discolor", "label typo", "packaging dent", "aesthetic", "scuff"]
const COMPLAINT_TERMS = ["complaint", "consumer report", "illness", "sick", "reaction", "adverse event"]

function findLot(signal: string): string | undefined {
  const m = signal.match(/\b(?:lot|batch|lot#|batch#)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i)
  return m ? m[1].toUpperCase() : undefined
}

function findUnits(signal: string): number | undefined {
  const m = signal.match(/([\d,]{2,})\s*(?:units|cases|bottles|packages|pallets)/i)
  if (!m) return undefined
  const n = Number(m[1].replace(/,/g, ""))
  return Number.isFinite(n) ? n : undefined
}

function findRegions(signal: string): string[] {
  const regions = ["Northeast", "Mid-Atlantic", "Southeast", "Midwest", "Southwest", "West", "Northwest", "National", "Canada", "EU", "UK"]
  return regions.filter((r) => signal.toLowerCase().includes(r.toLowerCase()))
}

function heuristicAnalyze(signal: string): AnalyzeResult {
  const text = signal.toLowerCase()
  const hits = (terms: string[]) => terms.filter((t) => text.includes(t))

  const safety = hits(SAFETY_TERMS)
  const contained = hits(CONTAINED_TERMS)
  const cosmetic = hits(COSMETIC_TERMS)
  const complaints = hits(COMPLAINT_TERMS)
  const shipped = /(shipped|distributed|on shelf|in market|retail|stores|palletized|in transit)/i.test(signal)
  const lab = /(lab|test|swab|result|confirmed|verified|ppm|cfu)/i.test(signal)
  const unverified = /(no completion signature|incomplete|unconfirmed|awaiting|results are|24-48 hours|pending|not yet)/i.test(signal)

  const lot = findLot(signal)
  const units = findUnits(signal)
  const regions = findRegions(signal)

  let posture: Decision["posture"]
  let severity: Decision["severity"]
  let confidenceScore: number
  let trajectory: Decision["delayRisk"]["trajectory"]
  let hoursUntilCritical: number

  if (cosmetic.length > 0 && safety.length === 0) {
    posture = "REJECT"
    severity = "D"
    confidenceScore = 78
    trajectory = "steady"
    hoursUntilCritical = 168
  } else if (contained.length > 0 && !shipped) {
    posture = "REJECT"
    severity = "C"
    confidenceScore = 72
    trajectory = "steady"
    hoursUntilCritical = 120
  } else if (safety.length > 0 && shipped) {
    // Credible safety exposure already in market: delay risk dominates.
    posture = "ACTIVATE"
    severity = "A"
    confidenceScore = lab ? 82 : 64
    trajectory = "critical"
    hoursUntilCritical = complaints.length > 0 ? 6 : 18
  } else if (safety.length > 0) {
    posture = "HOLD"
    severity = "B"
    confidenceScore = 58
    trajectory = "rising"
    hoursUntilCritical = 24
  } else {
    posture = "HOLD"
    severity = "C"
    confidenceScore = 50
    trajectory = "rising"
    hoursUntilCritical = 36
  }

  // Unverified single-source claims pull an ACTIVATE back toward HOLD unless
  // there are already consumer complaints.
  if (posture === "ACTIVATE" && unverified && !lab && complaints.length === 0) {
    posture = "HOLD"
    confidenceScore = Math.min(confidenceScore, 60)
  }

  const confidence: Decision["confidence"] =
    confidenceScore >= 78 ? "HIGH" : confidenceScore >= 60 ? "MODERATE" : "LOW"

  const exposureLow = units ? Math.round((units * 12) / 1000) / 10 : 0.4
  const exposureHigh = units ? Math.round((units * 60) / 1000) / 10 : 3
  const exposureEstimate =
    severity === "A"
      ? `$${Math.max(0.8, exposureLow)}M - $${Math.max(4, exposureHigh)}M`
      : severity === "B"
        ? `$${Math.max(0.3, exposureLow)}M - $${Math.max(1.5, exposureHigh / 2)}M`
        : `$50K - $400K`

  const evidenceGaps: Decision["evidenceGaps"] = []
  if (!lab && safety.length > 0)
    evidenceGaps.push({
      label: "Lab confirmation pending",
      detail: "No analytical result (swab/PPM/CFU) on file to confirm the hazard. Decision rests on circumstantial signal.",
      kind: "missing",
    })
  if (unverified)
    evidenceGaps.push({
      label: "Incomplete process record",
      detail: "Source record is unsigned or unconfirmed, so the claim is single-source and not yet corroborated.",
      kind: "missing",
    })
  if (shipped && regions.length === 0)
    evidenceGaps.push({
      label: "Distribution scope unknown",
      detail: "Product is reported in market but the affected regions / DCs are not enumerated.",
      kind: "missing",
    })
  if (evidenceGaps.length === 0)
    evidenceGaps.push({
      label: "Corroborating signal",
      detail: "Only one source is present. A second independent signal would raise confidence.",
      kind: "missing",
    })

  const flipConditions: Decision["flipConditions"] = []
  if (posture !== "ACTIVATE")
    flipConditions.push({ condition: "Lab confirms the hazard above action threshold", flipsTo: "ACTIVATE" })
  if (posture !== "HOLD")
    flipConditions.push({ condition: "Source record turns out to be incomplete or single-source", flipsTo: "HOLD" })
  if (posture !== "REJECT")
    flipConditions.push({ condition: "Affected lots confirmed contained and never shipped", flipsTo: "REJECT" })

  const headline =
    posture === "ACTIVATE"
      ? `Activate containment${lot ? ` on ${lot}` : ""} — delay risk dominates`
      : posture === "HOLD"
        ? `Hold ${lot ? lot + " " : ""}pending confirmation — do not ship further`
        : `Reject recall${lot ? ` for ${lot}` : ""} — risk does not meet threshold`

  const rationale =
    posture === "ACTIVATE"
      ? `A credible safety hazard (${safety.slice(0, 2).join(", ")}) is indicated and product has already entered distribution${units ? ` (~${units.toLocaleString()} units)` : ""}. With consumers potentially exposed, the cost of waiting exceeds the cost of acting, so containment should begin while confirmation is in progress.`
      : posture === "HOLD"
        ? `The signal raises a plausible concern but rests on an unverified or single-source claim. Acting now risks an unnecessary recall; ignoring it risks a real hazard. The defensible move is to freeze further shipment and close the named evidence gaps before committing.`
        : `The reported issue is either contained, out of market, or cosmetic in nature, and does not present a credible safety or regulatory exposure. A recall is not warranted, but the decision and its basis are logged for audit.`

  const delayNarrative =
    trajectory === "critical"
      ? "Every hour of delay expands consumer exposure and narrows the window for a voluntary (vs. mandated) recall."
      : trajectory === "rising"
        ? "Risk is climbing slowly; the main cost of delay is reduced optionality if a hazard is later confirmed."
        : "Delay has limited downside given current containment, but the clock still matters for regulatory reporting."

  const firstLine = signal.trim().split(/\n/)[0].replace(/^(from:|subject:|to:)/i, "").trim()
  const title = (lot ? `${lot}: ` : "") + (firstLine.slice(0, 48) || "Incident signal") + (firstLine.length > 48 ? "…" : "")

  return {
    posture,
    confidence,
    confidenceScore,
    severity,
    headline: headline.slice(0, 90),
    rationale,
    exposureEstimate,
    evidenceGaps,
    flipConditions,
    delayRisk: { trajectory, hoursUntilCritical, narrative: delayNarrative },
    title: title.slice(0, 60),
    lotReference: lot,
    affectedRegions: regions,
    engine: "heuristic",
  }
}
