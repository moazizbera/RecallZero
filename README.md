# RecallZero

RecallZero is a recall decision cockpit for regulated commerce teams. It turns supplier, QA, ERP lot traceability, and complaints signals into a defensible recall posture with persistent incidents and audit history.

## Live Hackathon App

Production alias:

```text
https://recallzero-app.vercel.app
```

Judge access address:

```text
https://recallzero-app.vercel.app/judge
```

The judge address creates a controlled reviewer session for a dedicated judge workspace. Product administration remains under `/admin` for signed workspace admins.

Before submission, set the owner/admin allow-list in Vercel so only project owners can access `/admin`:

```env
RECALLZERO_ADMIN_EMAILS=owner@example.com
```

Optionally protect judge entry with a shared code:

```env
RECALLZERO_JUDGE_ACCESS_CODE=judge-review-code
```

## NotebookLM Video Brief

Use this section as source material for NotebookLM, video narration, and the final hackathon submission edit. The goal is a polished product demo under 3 minutes, focused on the story judges need to understand quickly.

### One-Line Product Story

RecallZero is a recall decision cockpit for regulated commerce teams. It converts scattered supplier inbox, QA, ERP lot traceability, and returns or complaints signals into a defensible recall posture with confidence, missing evidence, delay risk, next actions, incident records, and audit history.

### What Judges Should Understand

- Recall decisions are high-risk because evidence is fragmented across many operational systems.
- RecallZero is not a chatbot and does not claim to make the final legal recall decision alone.
- RecallZero gives recall teams decision support: posture, confidence, evidence gaps, delay risk, recommended next actions, and auditability.
- The app is live at `https://recallzero-app.vercel.app`, backed by DynamoDB, with signed sessions, tenant workspaces, credits, connectors, admin controls, and judge access.
- The product has a customer path: free review, Pilot, Program, and Enterprise plans.

### Best Screens To Capture

Capture short video clips, not only screenshots. Keep transitions fast.

1. `/` - animated splash and product panorama. Show the brand, product promise, security and production-readiness messaging, then click Start RecallZero.
2. `/judge` - controlled judge entry. Show that judges get a reviewer workspace without admin access.
3. `/?skipSplash=1` - Analyze workflow. Paste a realistic recall signal and run analysis.
4. Decision result - show recall posture, confidence, missing evidence, delay risk, and recommended next action.
5. `/incidents` and an incident detail page - show that RecallZero creates persisted operational records and an audit trail.
6. `/connectors?mode=configure` - show supplier inbox, QA system, ERP / lot traceability, and returns / complaints feed configuration.
7. `/settings` - show workspace plan, credits, usage, and settings.
8. `/admin` - show restricted admin access, webhook endpoints, secret rotation, readiness checks, and DynamoDB-backed status.
9. `/pricing` - show Free, Pilot, Program, and Enterprise packaging.
10. `/api/health` - optional quick technical proof that health is live and storage is DynamoDB.

### Demo Signal For The Video

```text
Supplier QA alert: Chocolate protein bars SKU CPB-442 lot L-8821 may contain undeclared peanut allergen. 18,400 units shipped to three regional distributors. Two customer complaints reported allergic reaction symptoms. QA has placed remaining inventory on hold and ERP shows 7,200 units already delivered to stores.
```

### Recommended Under-3-Minute Storyboard

- `0:00-0:15` - Problem: delayed or wrong recall decisions create safety, regulatory, liability, and brand risk.
- `0:15-0:35` - Show the RecallZero splash and panorama. State that this is a live product at the production URL.
- `0:35-1:15` - Show judge access and the Analyze screen. Paste the realistic signal and run analysis.
- `1:15-1:50` - Show the generated posture, confidence, evidence gaps, delay risk, and recommended action.
- `1:50-2:15` - Show incidents and dashboard. Explain that the decision becomes an operational record and audit trail, not a one-off answer.
- `2:15-2:35` - Show connectors, settings, credits, and admin readiness.
- `2:35-2:55` - Show pricing and business model.
- `2:55-3:00` - Close with the live URL and judge URL.

### Voiceover Script Draft

```text
Every recall decision starts messy.

A supplier email says one thing. QA has another signal. ERP knows which lots shipped. Customer complaints arrive late. And every hour of delay increases safety, liability, and brand risk.

This is RecallZero.

RecallZero is a recall decision cockpit for regulated commerce teams. It turns fragmented supplier, QA, ERP lot traceability, and complaint signals into a defensible decision record.

Judges can enter through a controlled review workspace, while real customers can sign in, choose a plan, and operate inside their own tenant workspace.

Here is the core workflow.

We paste a realistic supplier QA alert: an undeclared peanut allergen, affected SKU and lot, shipped units, customer complaints, inventory hold, and ERP delivery data.

RecallZero analyzes the signal and returns a recall posture, confidence, missing evidence, delay risk, and recommended next actions.

The important part is that this is not just a chat answer.

The decision becomes an incident record with an audit trail, so teams can track what was known, what was missing, and why the posture changed over time.

RecallZero is built around the systems recall teams already use: supplier inboxes, QA systems, ERP and lot traceability, and returns or complaints feeds.

Customers can configure connectors, manage workspace settings, track credits and usage, and upgrade through Pilot, Program, or Enterprise plans.

Admins get production controls: webhook endpoints, secret rotation, restricted access, DynamoDB persistence, and readiness checks.

RecallZero helps teams move from scattered signals to faster, more defensible recall decisions.

Live now at recallzero-app.vercel.app.
```

### NotebookLM Prompt

```text
Create a high-impact hackathon demo video script under 3 minutes for RecallZero.

Audience:
Hackathon judges, technical evaluators, and potential enterprise customers.

Product:
RecallZero is a recall decision cockpit for regulated commerce teams. It turns messy supplier, QA, ERP lot traceability, and customer complaint signals into a defensible recall posture with confidence, missing evidence, delay risk, next actions, audit trail, tenant workspaces, credits, connector setup, admin controls, and DynamoDB persistence.

Tone:
Confident, urgent, polished, enterprise-ready, and credible. The video should feel like a real SaaS product demo, not a hackathon toy.

Core message:
Recall decisions are high-risk and often delayed because evidence lives across supplier inboxes, QA systems, ERP lot traceability, and returns or complaints feeds. RecallZero brings those signals together and helps teams make faster, defensible, auditable decisions.

Video length:
Maximum 2 minutes 45 seconds.

Required video flow:
1. Open with the problem: delayed or wrong recall decisions can create regulatory, safety, liability, and brand damage.
2. Show the RecallZero splash and product panorama, and state that this is a live product at https://recallzero-app.vercel.app.
3. Show controlled judge access through /judge.
4. Show the Analyze workflow using this realistic signal: "Supplier QA alert: Chocolate protein bars SKU CPB-442 lot L-8821 may contain undeclared peanut allergen. 18,400 units shipped to three regional distributors. Two customer complaints reported allergic reaction symptoms. QA has placed remaining inventory on hold and ERP shows 7,200 units already delivered to stores."
5. Explain the generated decision: recall posture, confidence, missing evidence, delay risk, and recommended next action.
6. Show that the decision becomes an incident record and audit trail, not just a chat response.
7. Show connector configuration for supplier inbox, QA system, ERP / lot traceability, and returns / complaints feeds.
8. Show settings, credits, plans, and usage control.
9. Show admin readiness: webhook endpoints, secret rotation, production readiness, DynamoDB-backed persistence, and restricted admin access.
10. Close with the business model: Free review, Pilot, Program, and Enterprise.
11. End with the live app URL and judge URL.

Important positioning:
Do not claim RecallZero makes a final legal recall decision alone. Say it provides decision support, evidence gaps, delay risk, and auditability for recall teams.
Do not describe it as a chatbot. Describe it as a recall decision cockpit.
Do not over-explain technical implementation. Mention DynamoDB, tenant workspaces, credits, connectors, and admin controls only as proof that this is production-style software.

Style:
Use short powerful sentences.
Make the first 10 seconds very strong.
Use captions for the key moments.
Create a voiceover script plus on-screen text suggestions.
Keep the final script under 390 spoken words.
```

## Deployment Modes

RecallZero supports two runtime modes through environment variables.

## Product Onboarding Flow

RecallZero is presented like a real SaaS product:

- Free demo: hackathon judges and evaluators can use sample signals and limited demo credits.
- Sign up: customers create a workspace from `/signup`.
- Plan choice: customers choose Free demo, Pilot, Program, or Enterprise.
- Credits: each plan controls monthly recall-decision usage.
- Billing: paid plans use Stripe Checkout in production and simulated checkout in demo mode.
- Workspace persistence: checkout activates a DynamoDB-backed workspace profile with plan and credit state.
- Workspace isolation: signed sessions map to a workspace ID, and workspace-owned API data is stored under tenant-scoped DynamoDB partitions.
- Workspace settings: customers manage plan usage, connector configuration, notifications, and team roles from `/settings`.
- Workspace admin: admins can review workspace identity, usage, connector webhook URLs, and rotate hashed workspace webhook secrets from `/admin`.
- Setup checklist: `/setup` guides customers through connector setup, connection testing, and team readiness.
- Connectors: customers configure source endpoints, auth method, sync cadence, routing, and field mapping. Non-secret config is persisted in DynamoDB.
- Inbound ingestion: connected sources can POST signals to `/api/connectors/{key}/webhook` to create incidents from real customer systems.
- Intake quality gate: obvious test emails and messages without product, lot/SKU, QA, complaint, shipment, hazard, or containment context are rejected before credits are spent or incidents are created.

### Hackathon Demo Mode

Use this while submitting, judging, or presenting the hackathon project.

```env
RECALLZERO_MODE=demo
NEXT_PUBLIC_RECALLZERO_MODE=demo
RECALLZERO_DEMO_SEEDING=true
```

Demo mode enables:

- sample incident seeding from the dashboard
- Hackathon demo labels in the UI
- the Judge Brief page as a demo/pitch guide
- all four live connector lanes

### Production Mode

Use this for customer or production deployment.

```env
RECALLZERO_MODE=production
NEXT_PUBLIC_RECALLZERO_MODE=production
RECALLZERO_DEMO_SEEDING=false
```

Production mode changes:

- hides the sample incident seed button
- blocks `/api/demo` with `403`
- labels the app as Production in the header
- exposes `/signin` and `/settings` as production operations pages
- reports production readiness through `/api/health` and `/api/config`

## Required Production Environment

```env
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=your-dynamodb-table-name
RECALLZERO_SESSION_SECRET=change-me-long-random-value
RECALLZERO_CONNECTOR_WEBHOOK_SECRET=change-me
```

Use one of the credential options below.

Vercel OIDC role:

```env
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/your-vercel-role
```

Or static AWS credentials:

```env
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

## Sign In Configuration

The sign-in page creates a signed RecallZero app session. Configure a strong session secret for any customer deployment, and connect the identity provider before production SSO use:

```env
RECALLZERO_SIGNIN_ENABLED=true
RECALLZERO_SESSION_SECRET=change-me-long-random-value
RECALLZERO_AUTH_PROVIDER=azure-ad
RECALLZERO_ADMIN_EMAILS=owner@example.com
```

Accepted provider labels are deployment conventions, for example `azure-ad`, `auth0`, `cognito`, or `vercel-oidc`. Until this value is set, `/signin` still creates a signed app session but marks SSO setup as needed.

## Billing Configuration

RecallZero uses Stripe Checkout for paid plan subscriptions. Demo mode simulates checkout so the hackathon flow stays complete without live payment keys.

```env
RECALLZERO_BILLING_PROVIDER=stripe
NEXT_PUBLIC_APP_URL=https://recallzero-app.vercel.app
RECALLZERO_APP_URL=https://recallzero-app.vercel.app
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PILOT=price_...
STRIPE_PRICE_PROGRAM=price_...
```

Payment flow:

- `/signup?plan=free` activates a free demo workspace.
- `/signup?plan=pilot` starts Pilot checkout.
- `/signup?plan=program` starts Program checkout.
- `/billing/success` activates the selected workspace plan after demo or Stripe checkout.
- `/api/billing/webhook` receives Stripe subscription and invoice events.

Credit enforcement:

- `/api/analyze` consumes one workspace credit before creating a decision.
- If the workspace has no credits left, the API returns `402` with an upgrade/renewal message.
- Billing success and workspace APIs update the persisted plan and monthly credit allowance.

## Connector Webhooks

After a connector is configured and tested, a customer system can send a signal into RecallZero:

```http
POST /api/connectors/complaints-feed/webhook
Content-Type: application/json
x-recallzero-workspace-id: customer-domain-com
x-recallzero-webhook-secret: rz_whsec_...

{
  "signal": "Customer complaint cluster: 6 allergic reaction reports tied to lot NR-GRN-4471...",
  "lotReference": "NR-GRN-4471"
}
```

The webhook consumes one workspace credit, analyzes the signal, creates an incident, and writes the normal audit trail. For customer pilots, rotate a workspace-specific secret from `/admin` and send it in the `x-recallzero-webhook-secret` header. RecallZero stores only the secret hash plus a short preview; the raw secret is shown once after rotation.

If a workspace-specific secret has not been rotated yet, production deployments can still use `RECALLZERO_CONNECTOR_WEBHOOK_SECRET` as a global fallback.

Payloads that are just probes, fake emails, or generic chat messages return `422` instead of creating an incident.

For multi-tenant ingestion, include the workspace ID assigned during sign-in or copied from `/admin`:

```http
x-recallzero-workspace-id: customer-domain-com
```

Stripe webhook events handled by the billing endpoint:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Health And Configuration Checks

Read-only health endpoint:

```text
/api/health
```

Configuration endpoint:

```text
/api/config
```

Expected demo response fields include:

```json
{
  "ok": true,
  "mode": "demo",
  "storage": "dynamodb",
  "demoSeedingEnabled": true,
  "productionReady": true,
  "liveConnectors": 4
}
```

## Validation Commands

Run these before deployment:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Deploy To Vercel

```powershell
npx vercel@latest --prod --yes
```

## Recommended Hackathon Demo Path

1. Open `/brief` to frame the story.
2. Go to `/connectors`.
3. Pull ERP lot traceability or Returns / complaints feed.
4. Send the signal to the cockpit.
5. Analyze the signal.
6. Open the created incident.
7. Show status/actions/export audit packet.
8. End on `/dashboard`.
