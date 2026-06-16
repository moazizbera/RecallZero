import type { ConnectorSignal } from "./types"

export interface ConnectorDef {
  key: string
  name: string
  description: string
  status: "live" | "pilot" | "queued"
  source: string
}

export const CONNECTORS: ConnectorDef[] = [
  {
    key: "supplier-inbox",
    name: "Supplier inbox",
    description: "Latest unread supplier escalation notice from connected plant inboxes.",
    status: "live",
    source: "NorthRiver Foods supplier inbox",
  },
  {
    key: "qa-system",
    name: "QA system",
    description: "Latest open inspection alert, including contradiction signals.",
    status: "live",
    source: "Internal QA platform",
  },
  {
    key: "erp-traceability",
    name: "ERP / lot traceability",
    description: "Live lot exposure, warehouse movement, and downstream location mapping.",
    status: "live",
    source: "ERP traceability module",
  },
  {
    key: "complaints-feed",
    name: "Returns / complaints feed",
    description: "Live complaint velocity, returns clustering, and adverse-event pattern detection.",
    status: "live",
    source: "Returns & complaints feed",
  },
]

export const CONNECTOR_SIGNALS: Record<string, ConnectorSignal> = {
  "supplier-inbox": {
    connectorKey: "supplier-inbox",
    source: "NorthRiver Foods supplier inbox",
    subject: "URGENT: Possible undeclared peanut protein - granola lot",
    lotReference: "NR-GRN-4471",
    body: `From: quality@northriverfoods.com
Subject: URGENT: Possible undeclared peanut protein - granola lot NR-GRN-4471

Team,

During a line changeover review this morning we found that the shared roasting line ran a peanut-containing product immediately before lot NR-GRN-4471 (Honey Oat Granola). The allergen wash-down log for that changeover is incomplete - the operator signed the start of the cleaning cycle but there is no completion signature or ATP swab result on file.

This lot has already shipped to 3 regional DCs (Northeast, Mid-Atlantic, Southeast). Approximately 18,400 units. The product label does NOT declare peanut.

We have not had any consumer complaints yet. We are pulling retained samples for lab testing now but results are 24-48 hours out.

Please advise on posture.

- QA, NorthRiver`,
    receivedAt: Date.now() - 1000 * 60 * 42,
  },
  "qa-system": {
    connectorKey: "qa-system",
    source: "Internal QA platform",
    subject: "Inspection mismatch - Severity B - supplier claim contradicts sampling",
    lotReference: "NR-BEV-2208",
    body: `QA ALERT #A-2208
Type: Inspection mismatch
Severity band: B
Plant: Plant 2 (Beverage)
Lot: NR-BEV-2208 (Sparkling Citrus, 12oz)

The supplier (certificate of analysis) reports brix and acidity within spec and declares the lot fully conforming. However, internal incoming sampling on 2 of 6 pallets shows pH readings of 4.9-5.1, above our 4.6 control limit for this product. Out-of-spec pH raises a microbial stability concern for a low-acid-adjacent beverage.

Supplier CoA and our sampling directly contradict each other. Retain samples available. Lot is on QA hold in the warehouse and has NOT shipped to customers.

No distribution exposure at this time.`,
    receivedAt: Date.now() - 1000 * 60 * 130,
  },
  "erp-traceability": {
    connectorKey: "erp-traceability",
    source: "ERP traceability module",
    subject: "Lot movement exposure - affected granola units already reached 3 DCs",
    lotReference: "NR-GRN-4471",
    body: `ERP TRACEABILITY SNAPSHOT
Lot: NR-GRN-4471
Product: Honey Oat Granola 14oz
Supplier: NorthRiver Foods
Movement status: distributed

Inventory movement shows the affected lot has left the supplier quarantine zone and reached three regional distribution centers: Newark DC, Richmond DC, and Atlanta DC. Total shipped quantity: 18,400 retail units across 92 outbound orders.

Current downstream exposure:
- Northeast: 7,200 units across 31 orders
- Mid-Atlantic: 5,900 units across 28 orders
- Southeast: 5,300 units across 33 orders

Retail allocation has started for 41 stores. The next scheduled transfer wave leaves Atlanta DC in 6 hours. No hold flag is currently active in ERP for this lot.

Operational risk: if containment is not activated before the next transfer wave, store-level exposure will widen from 41 stores to an estimated 73 stores.`,
    receivedAt: Date.now() - 1000 * 60 * 18,
  },
  "complaints-feed": {
    connectorKey: "complaints-feed",
    source: "Returns & complaints feed",
    subject: "Complaint cluster - allergic reaction reports tied to same granola lot",
    lotReference: "NR-GRN-4471",
    body: `RETURNS / COMPLAINTS FEED ALERT
Signal type: complaint velocity spike
Product: Honey Oat Granola 14oz
Lot: NR-GRN-4471
Window: last 42 minutes

The complaints feed detected 11 consumer contacts and 4 return notes tied to the same SKU and lot reference. Six contacts mention allergic reaction language, including "peanut reaction", "hives", and "used epipen". Three reports came from the Northeast retail cluster and two from Mid-Atlantic stores that received the affected lot.

Complaint velocity is above the configured safety threshold for this product class. Customer support has not yet issued a public advisory. Store teams have not confirmed shelf pull completion.

Operational risk: complaint pattern now corroborates the supplier allergen-control gap. Delay increases consumer exposure because units are already at store level and complaint language indicates possible health impact.`,
    receivedAt: Date.now() - 1000 * 60 * 7,
  },
}
