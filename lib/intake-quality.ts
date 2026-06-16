export interface IntakeQualityResult {
  ok: boolean
  error?: string
  reason?: string
  missing?: string[]
}

const operationalTerms = [
  "recall",
  "withdrawal",
  "quarantine",
  "hold",
  "containment",
  "supplier",
  "qa",
  "quality",
  "complaint",
  "consumer",
  "illness",
  "reaction",
  "injury",
  "adverse event",
  "contamination",
  "allergen",
  "undeclared",
  "pathogen",
  "listeria",
  "salmonella",
  "e. coli",
  "ecoli",
  "metal",
  "glass",
  "foreign material",
  "mislabel",
  "wrong label",
  "temperature",
  "abuse",
  "shipment",
  "shipped",
  "distributed",
  "retail",
  "dc",
  "warehouse",
  "lot",
  "batch",
  "sku",
  "upc",
  "product",
]

const productEvidencePatterns = [
  /\b(?:lot|batch|sku|upc|item|product|material)\s*[:#-]?\s*[a-z0-9][a-z0-9-]{2,}/i,
  /\b\d{2,}[,\d]*\s*(?:units|cases|bottles|packages|pallets|cartons)\b/i,
  /\b(?:granola|milk|formula|capsule|tablet|device|food|beverage|medicine|drug|package|label)\b/i,
]

const testOnlyPatterns = [
  /\bare you real\b/i,
  /\bjust\s+(?:a\s+)?test\b/i,
  /\btesting\s+(?:the\s+)?(?:app|system|bot|ai)\b/i,
  /\bhello\s+(?:world|test)\b/i,
  /\btry(?:ing)?\s+to\s+see\b/i,
  /\bfake\s+(?:email|message|signal)\b/i,
]

function countMatches(signal: string, terms: string[]) {
  const text = signal.toLowerCase()
  return terms.filter((term) => text.includes(term)).length
}

function hasProductEvidence(signal: string) {
  return productEvidencePatterns.some((pattern) => pattern.test(signal))
}

export function validateIncidentSignal(signal: string, options?: { followUp?: boolean }): IntakeQualityResult {
  const normalized = signal.replace(/\s+/g, " ").trim()
  if (normalized.length < 40) {
    return {
      ok: false,
      reason: "too_short",
      error: "This does not look like an operational recall signal yet. Include the product, lot/SKU or source, observed issue, and what is at risk.",
      missing: ["product or lot", "observed issue", "operational impact"],
    }
  }

  const operationalMatchCount = countMatches(normalized, operationalTerms)
  const productEvidence = hasProductEvidence(normalized)
  const testOnly = testOnlyPatterns.some((pattern) => pattern.test(normalized))

  if (testOnly && operationalMatchCount < 2 && !productEvidence) {
    return {
      ok: false,
      reason: "test_message",
      error: "This looks like a test or non-operational email, not a recall signal. RecallZero only analyzes product, supplier, QA, ERP, or complaint evidence.",
      missing: ["product/lot evidence", "hazard or quality issue", "business or consumer impact"],
    }
  }

  if (!options?.followUp && operationalMatchCount < 2 && !productEvidence) {
    return {
      ok: false,
      reason: "missing_recall_context",
      error: "RecallZero needs recall-relevant context before creating an incident. Add a product/lot, supplier or QA source, suspected hazard, complaint, shipment, or containment detail.",
      missing: ["product/lot or source", "suspected issue", "shipment, complaint, or containment detail"],
    }
  }

  if (options?.followUp && operationalMatchCount === 0 && !productEvidence) {
    return {
      ok: false,
      reason: "missing_follow_up_context",
      error: "The follow-up does not add operational evidence. Add a lab result, complaint, shipment update, containment action, or lot/product detail.",
      missing: ["new evidence", "operational update"],
    }
  }

  return { ok: true }
}
