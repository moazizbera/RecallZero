# RecallZero Submission Package

## Live Links

- Live app: https://recallzero-app.vercel.app
- Judge review workspace: https://recallzero-app.vercel.app/judge
- Direct Analyze workflow: https://recallzero-app.vercel.app/?skipSplash=1
- Source code: https://github.com/moazizbera/RecallZero
- Health check: https://recallzero-app.vercel.app/api/health

## Elevator Pitch

RecallZero turns fragmented supplier, QA, ERP, and complaint signals into faster, defensible recall decisions with audit trails, credits, and production-ready connectors.

## What Is Included

- README.md: full project story, setup details, NotebookLM video brief, and demo guidance.
- .env.example: safe environment template for deployment.
- package.json and package-lock.json: project dependencies.
- Selected screenshots: product cockpit, decision result, dashboard, connectors, and incident workflow proof.

## Recommended Judge Flow

1. Open https://recallzero-app.vercel.app/judge.
2. Enter the review workspace.
3. Click Analyze.
4. Paste this signal:

```text
Supplier QA alert: Chocolate protein bars SKU CPB-442 lot L-8821 may contain undeclared peanut allergen. 18,400 units shipped to three regional distributors. Two customer complaints reported allergic reaction symptoms. QA has placed remaining inventory on hold and ERP shows 7,200 units already delivered to stores.
```

5. Review the generated recall posture, confidence, missing evidence, delay risk, next actions, and incident/audit trail.

## Production Proof

- Deployed on Vercel.
- Backed by AWS DynamoDB.
- Signed sessions and role-based access.
- Admin page restricted to the configured project owner email.
- Judge role cannot access admin.
- Credits and workspace plan state persist across sign-in.
- Connector webhooks support workspace-scoped ingestion and hashed secret rotation.