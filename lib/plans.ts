export type PlanKey = "free" | "pilot" | "program" | "enterprise"

export interface PlanDef {
  key: PlanKey
  name: string
  price: string
  cadence: string
  credits: string
  decisionsPerMonth: number | "custom" | "unlimited"
  connectorLimit: number | "custom"
  blurb: string
  features: string[]
  cta: string
  featured?: boolean
}

export const PLANS: PlanDef[] = [
  {
    key: "free",
    name: "Free demo",
    price: "$0",
    cadence: "",
    credits: "10 demo credits",
    decisionsPerMonth: 10,
    connectorLimit: 1,
    blurb: "For hackathon judges and operators trying the cockpit with sample signals.",
    features: [
      "10 demo decisions",
      "Sample connector signals",
      "Decision cockpit access",
      "No production data required",
    ],
    cta: "Start free demo",
  },
  {
    key: "pilot",
    name: "Pilot",
    price: "$2,500",
    cadence: "/mo",
    credits: "50 credits / month",
    decisionsPerMonth: 50,
    connectorLimit: 2,
    blurb: "For a single plant or quality team validating decision speed.",
    features: [
      "50 recall decisions / month",
      "2 production connector lanes",
      "Posture, confidence & evidence gaps",
      "DynamoDB-backed audit trail",
      "Single-region distribution mapping",
    ],
    cta: "Choose Pilot",
  },
  {
    key: "program",
    name: "Program",
    price: "$9,000",
    cadence: "/mo",
    credits: "500 credits / month",
    decisionsPerMonth: 500,
    connectorLimit: 4,
    blurb: "For multi-plant recall programs that need defensible decisions at scale.",
    features: [
      "500 recall decisions / month",
      "Supplier inbox, QA, ERP & complaints connectors",
      "Delay-risk trajectory modeling",
      "Multi-region exposure mapping",
      "Full incident war rooms",
      "Exportable audit packages",
    ],
    cta: "Choose Program",
    featured: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    credits: "Custom credits",
    decisionsPerMonth: "custom",
    connectorLimit: "custom",
    blurb: "For regulated enterprises with bespoke systems and compliance review.",
    features: [
      "Custom decision volume",
      "Custom connectors & data residency",
      "Private model routing",
      "SSO, roles & retention controls",
      "Dedicated response advisor",
    ],
    cta: "Contact sales",
  },
]

export function getPlan(planKey?: string) {
  return PLANS.find((plan) => plan.key === planKey) || PLANS[0]
}
