# Production deployment

This runbook targets a single DigitalOcean Droplet running `docker-compose.prod.yml`. The production stack exposes only Caddy on ports 80 and 443. PostgreSQL, Redis, the API, and the web container stay on the private Compose network.

## Before deployment

- Point the application domain's DNS A/AAAA records to the Droplet.
- Allow inbound TCP 80 and 443 and UDP 443. Restrict SSH to trusted operator addresses.
- Install current Docker Engine and the Docker Compose plugin.
- Provision DigitalOcean Spaces as a private bucket, a Mux environment, a verified Resend sender/domain, and Google OAuth credentials.
- Back up the PostgreSQL volume before every upgrade that includes migrations.
- Never run the development seed in production.

Create `/path/to/bid_communication_platform/.env` on the host and set its permissions to `0600`. Do not commit it. Start from the variable names in `.env.docker.example`, but replace every development value. At minimum, production must use:

```dotenv
POSTGRES_DB=bid_hub
POSTGRES_USER=bid
POSTGRES_PASSWORD=<long-random-password>
DATABASE_URL=postgresql://bid:<url-encoded-password>@postgres:5432/bid_hub?schema=public
REDIS_URL=redis://redis:6379

APP_WEB_URL=https://hub.example.com
WEB_ORIGIN=https://hub.example.com
API_PUBLIC_URL=https://hub.example.com
NEXT_PUBLIC_API_BASE_URL=https://hub.example.com/api

EMAIL_TRANSPORT=resend
RESEND_API_KEY=<secret>
MAIL_FROM=BID Hub <no-reply@verified.example.com>

GOOGLE_CLIENT_ID=<secret>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=https://hub.example.com/api/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://hub.example.com/api/calendar/google/callback
CALENDAR_TOKEN_ENCRYPTION_KEY=<at-least-32-random-characters>

DO_SPACES_BUCKET=<private-bucket>
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_ACCESS_KEY_ID=<secret>
DO_SPACES_SECRET_ACCESS_KEY=<secret>
DO_SPACES_FORCE_PATH_STYLE=false

MUX_TOKEN_ID=<secret>
MUX_TOKEN_SECRET=<secret>
MUX_WEBHOOK_SECRET=<secret>
MUX_SIGNING_KEY_ID=<secret>
MUX_SIGNING_PRIVATE_KEY=<private-key-value>
```

`APP_WEB_URL`, `WEB_ORIGIN`, and `API_PUBLIC_URL` deliberately share one HTTPS origin because Caddy routes `/api/*` to NestJS and everything else to Next.js. Register the two callback URLs shown above in Google. Configure the Mux webhook URL as `https://hub.example.com/api/webhooks/mux`.

Production startup validates all essential integration settings and fails closed when a required secret, HTTPS URL, verified sender, or storage configuration is missing. Keep `DO_SPACES_INTERNAL_ENDPOINT` unset in production.

## Deploy

From the repository root:

```bash
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
npm run check
docker compose --env-file .env -f docker-compose.prod.yml build api web
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

The one-shot `migrate` service runs `prisma migrate deploy`. The API and worker start only after migrations succeed; the web starts only after the API is healthy; Caddy starts serving only after both application services are healthy. Do not use `prisma migrate dev` in production.

## Verify

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 migrate api worker web caddy
curl --fail https://hub.example.com/health
curl --fail https://hub.example.com/api/health
```

The API health response must report PostgreSQL, Redis/background jobs, object storage, email configuration, and the worker heartbeat as healthy. Verify login, one private file upload, one calendar connection, and one queued test email before opening the deployment to users.

All application email is asynchronous. Auth and invitation services enqueue the `transactional-email` queue; notification creation persists delivery records consumed by the notification worker. The send-capable `EmailService` is registered only in `WorkerModule`, so an API request never waits for Resend or SMTP. BullMQ retries transactional email up to five times with exponential backoff, and Redis uses AOF persistence with a `noeviction` policy.

## Operations

Follow logs without allowing Docker logs to grow without bounds:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f --tail=200 api worker web caddy
```

The Compose file retains five 10 MB JSON log files per service. Add external uptime monitoring for `/health` and `/api/health`, and alert when either fails.

Take scheduled encrypted PostgreSQL backups and periodically test a restore into a separate database. DigitalOcean volume snapshots are useful as a second layer, not a substitute for database-aware backups. Retain the previous application image tag until post-deploy verification is complete.

## Rollback

1. Stop user traffic or enable a maintenance page when a schema rollback would be unsafe.
2. Restore the pre-deploy database backup if the migration is not backward compatible.
3. Set `API_IMAGE` and `WEB_IMAGE` to the previous matching immutable image tags.
4. Run `docker compose --env-file .env -f docker-compose.prod.yml up -d`.
5. Repeat all health and smoke checks.

Never attempt rollback by deleting migration records or editing a production database manually.
