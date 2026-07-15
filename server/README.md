# Fleetora API

NestJS service for the Fleetora Transport ERP. It includes PostgreSQL/Prisma, JWT access and refresh tokens, company-scoped RBAC, Redis/BullMQ queues, Socket.io events, rate limiting, request validation, Helmet, Swagger, soft deletes, and audit-ready data models.

## Local start

1. Copy `.env.example` to `.env` and replace the JWT secrets.
2. From the repository root, run `docker compose up --build`.
3. Open Swagger at `http://localhost:4000/docs`.

The web app remains independently deployable. Configure its API base URL to point at this service when moving from the current Supabase transition layer to the NestJS API.

## Scheduled report worker

The standalone worker polls `report_schedules`, atomically leases due rows, runs
the server-only reporting RPC, creates an XLSX or PDF, uploads it to the private
`fleetora-reports` Supabase Storage bucket, and records the result in
`report_runs`. If Resend is configured, recipients receive a short-lived signed
download link.

Apply all Supabase migrations before starting the worker. In particular,
`20260715170000_scalable_fuel_reporting.sql` must run before
`20260715180000_scheduled_report_worker.sql`.

Required private environment variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional configuration is documented in `server/.env.example`. Email delivery
requires both `RESEND_API_KEY` and a verified `REPORT_FROM_EMAIL`. Generated
reports still complete and remain available in Storage when email is not
configured.

Build and start locally:

```bash
pnpm --dir server build
pnpm --dir server start:reports
```

Set `REPORT_WORKER_RUN_ONCE=true` to claim one batch and exit, which is useful
for smoke tests. Daily schedules report the previous day, weekly schedules the
previous seven days, and monthly schedules the previous calendar month. Failed
runs use exponential retry backoff. A database lease and unique
schedule/period constraint make processing safe across restarts and multiple
worker instances.

To bound memory usage, XLSX generation defaults to 50,000 rows and PDF
generation to 10,000 rows. These are operational safety limits, not database
aggregation limits, and can be adjusted with `REPORT_MAX_ROWS` and
`REPORT_MAX_PDF_ROWS`. Database/API calls time out after 120 seconds by default.

The root `render.yaml` declares a separate Render background worker. Render
does not offer its free instance type for background workers, so the Blueprint
uses the `starter` instance type.
