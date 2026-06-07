# RecallZero

RecallZero is a recall-response operating system for consumer brands and distributors. It turns one supplier quality alert into a traceable operational workflow across inventory, warehouses, stores, customer orders, task coordination, and compliance evidence.

The app is built for the H0: Hack the Zero Stack with Vercel v0 and AWS Databases hackathon. It runs in two modes:

- Fallback mode: file-backed demo data for local walkthroughs without infrastructure
- Database mode: DynamoDB or Aurora PostgreSQL for persistent full-stack demos on AWS

## Product Surface

- Executive dashboard with KPI cards, activity feed, and role-based views
- Incident war room pages for traceability, location impact, tasks, and timeline evidence
- Import center for demo reset, source-driven incident generation, and CSV ingestion
- File-backed fallback store so imports visibly mutate the app without a configured database
- Import activity log and copyable judge summary for live demo support

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Prisma 7
- DynamoDB or PostgreSQL / Aurora PostgreSQL

## Local Development

From `recallzero-app/`, install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Important Routes

- `/` dashboard and judge walkthrough surface
- `/import` import center for demo reset, CSV uploads, and source-driven incident generation
- `/incidents/[incidentId]` incident war room
- `/api/dashboard` dashboard payload
- `/api/incidents` incident payloads
- `/api/import/demo` reset to demo dataset
- `/api/import/csv` generic CSV imports
- `/api/import/source` source CSV to generated incidents
- `/api/session/role` role selection persistence

## Demo Modes

### Fallback mode

No `DATABASE_URL` is required. The app uses a file-backed workspace store under `.demo-store/` so the dashboard still changes when you:

- reset the demo dataset
- import source-generated incidents
- upload incidents, locations, or tasks CSVs

### Database mode

Use one of these AWS-backed options:

- DynamoDB: set `AWS_REGION` and `DYNAMODB_TABLE_NAME`
- Aurora PostgreSQL: set `DATABASE_URL` and run the Prisma schema push

For Aurora PostgreSQL, run:

```bash
npm run db:generate
npm run db:push
```

In database mode, the same demo flows write into DynamoDB or PostgreSQL through the repository layer.

## Validation

Use these commands before a demo or deploy:

```bash
npm run lint
npm run build
```

## Demo Flow

1. Open the dashboard and frame the business risk with the KPI cards.
2. Switch roles to show executive, operations, compliance, and store views.
3. Open the import center and load a source or CSV dataset.
4. Return to the dashboard to show the dataset badge, recent activity, and changed incident state.
5. Open an incident war room and finish on traceability, task orchestration, and audit evidence.

## Submission Notes

The companion hackathon planning docs live in the workspace `docs/` folder and include:

- product framing
- architecture
- demo script
- submission checklist
