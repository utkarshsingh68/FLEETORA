# Fleetora API

NestJS service for the Fleetora Transport ERP. It includes PostgreSQL/Prisma, JWT access and refresh tokens, company-scoped RBAC, Redis/BullMQ queues, Socket.io events, rate limiting, request validation, Helmet, Swagger, soft deletes, and audit-ready data models.

## Local start

1. Copy `.env.example` to `.env` and replace the JWT secrets.
2. From the repository root, run `docker compose up --build`.
3. Open Swagger at `http://localhost:4000/docs`.

The web app remains independently deployable. Configure its API base URL to point at this service when moving from the current Supabase transition layer to the NestJS API.
