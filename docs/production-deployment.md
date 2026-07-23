# Production deployment

This runbook targets a single DigitalOcean Droplet running `docker-compose.prod.yml`. The production stack exposes only Caddy on ports 80 and 443. PostgreSQL, Redis, the API, and the web container stay on the private Compose network.

## 1. Create the Droplet and SSH access

For the simplest first deployment, create a **Docker 1-Click Droplet** from the DigitalOcean Marketplace. It includes Docker Engine and the Docker Compose plugin. Choose a region close to the BID team and users, enable monitoring and automated backups, and start with at least 4 GB RAM. Use 8 GB when builds and the database will share this server under real traffic.

Create an SSH key on your computer if you do not already have one:

```bash
ssh-keygen -t ed25519 -C "bid-hub-deploy"
cat ~/.ssh/id_ed25519.pub
```

In DigitalOcean, open **Settings -> Security -> SSH Keys**, choose **Add SSH Key**, and paste the public key. Select that key while creating the Droplet. Never upload or share `~/.ssh/id_ed25519`; that is the private key.

After DigitalOcean shows the Droplet's public IPv4 address, connect from your computer:

```bash
ssh root@YOUR_DROPLET_IP
docker version
docker compose version
```

Create a non-root deployment user and copy the SSH authorization to it:

```bash
adduser deploy
usermod -aG sudo,docker deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
exit
ssh deploy@YOUR_DROPLET_IP
```

After confirming the `deploy` login works, disable password SSH authentication and root SSH login according to the DigitalOcean production-Droplet hardening guide. Keep the DigitalOcean recovery console available before changing SSH settings.

## 2. Add the domain

DigitalOcean is not the domain registrar, so first buy or use a domain from a registrar. Choose one public hostname, for example `hub.example.org`. The application, API, callbacks, and Caddy configuration intentionally share this origin.

If DigitalOcean manages the domain's DNS:

1. Open **Networking -> Domains -> Add a domain** and enter `example.org`.
2. At the company where the domain was purchased, replace the current nameservers with the DigitalOcean nameservers shown in the Domains page. Nameserver changes can take time to propagate.
3. Back in **Networking -> Domains -> example.org**, create an **A** record with hostname `hub` and value `YOUR_DROPLET_IP`. To serve the root domain itself, use `@` instead of `hub`.
4. If IPv6 is enabled on the Droplet, add the matching **AAAA** record. Do not add an AAAA record that points nowhere.

If the registrar or Cloudflare continues to manage DNS, do not move the nameservers. Create the same `hub` A record in that provider's DNS panel instead. When using Cloudflare, keep the record DNS-only until Caddy has issued the first certificate.

Verify that public DNS points to the Droplet before starting Caddy:

```bash
dig +short hub.example.org A
```

Create a DigitalOcean Cloud Firewall and attach it to the Droplet:

- SSH TCP 22: only your trusted public IP addresses.
- HTTP TCP 80: all IPv4 and IPv6 sources.
- HTTPS TCP 443: all IPv4 and IPv6 sources.
- HTTP/3 UDP 443: all IPv4 and IPv6 sources.
- Outbound traffic: allow all, because the app calls Google, Mux, Resend, and DigitalOcean Spaces.

Do not expose ports 3000, 4000, 5432, or 6379. Those services remain private inside Docker Compose.

## 3. Put the application on the Droplet

Push the commit or release tag you intend to deploy to the remote Git repository. On the Droplet:

```bash
sudo mkdir -p /opt/bid-hub
sudo chown deploy:deploy /opt/bid-hub
git clone YOUR_GIT_REPOSITORY_URL /opt/bid-hub/app
cd /opt/bid-hub/app
git checkout YOUR_RELEASE_TAG_OR_BRANCH
```

Install Git first with `sudo apt update && sudo apt install -y git` if the Marketplace image does not include it. For a private repository, use a read-only repository deploy key. Do not put a personal access token in the clone URL or `.env` file.

## Before deployment

- Point the application domain's DNS A/AAAA records to the Droplet.
- Allow inbound TCP 80 and 443 and UDP 443. Restrict SSH to trusted operator addresses.
- Install current Docker Engine and the Docker Compose plugin.
- Provision DigitalOcean Spaces as a private bucket, a Mux environment, a verified Resend sender/domain, and Google OAuth credentials.
- Back up the PostgreSQL volume before every upgrade that includes migrations.
- Never run `prisma/seed.js` in production; it contains local demo accounts.

Create `/opt/bid-hub/app/.env` on the host and set its permissions to `0600`. Do not commit it:

```bash
cd /opt/bid-hub/app
cp .env.production.example .env
chmod 600 .env
nano .env
```

Replace every development value. At minimum, production must use:

```dotenv
POSTGRES_DB=bid_hub
POSTGRES_USER=bid
POSTGRES_PASSWORD=<long-random-password>
DATABASE_URL=postgresql://bid:<url-encoded-password>@postgres:5432/bid_hub?schema=public
REDIS_URL=redis://redis:6379

APP_WEB_URL=https://hub.example.org
WEB_ORIGIN=https://hub.example.org
API_PUBLIC_URL=https://hub.example.org
NEXT_PUBLIC_API_BASE_URL=https://hub.example.org/api

EMAIL_TRANSPORT=resend
RESEND_API_KEY=<secret>
MAIL_FROM=BID Hub <no-reply@verified.example.com>

GOOGLE_CLIENT_ID=<secret>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=https://hub.example.org/api/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://hub.example.org/api/calendar/google/callback
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
MUX_SIGNING_PRIVATE_KEY=<base64-encoded-private-key-value>
VIDEO_RECONCILIATION_INTERVAL_MS=300000
VIDEO_PROCESSING_TIMEOUT_MS=86400000
VIDEO_RECONCILIATION_BATCH_SIZE=25

PRODUCTION_ADMIN_EMAIL=<real-admin-email>
PRODUCTION_ADMIN_FIRST_NAME=<first-name>
PRODUCTION_ADMIN_LAST_NAME=<last-name>
PRODUCTION_ADMIN_PHONE=
PRODUCTION_ADMIN_INITIAL_PASSWORD=<random-16+-character-password>
```

`APP_WEB_URL`, `WEB_ORIGIN`, and `API_PUBLIC_URL` deliberately share one HTTPS origin because Caddy routes `/api/*` to NestJS and everything else to Next.js. Register the two callback URLs shown above in Google. Configure the Mux webhook URL as `https://hub.example.org/api/webhooks/mux`.

Production startup validates all essential integration settings and fails closed when a required secret, HTTPS URL, verified sender, or storage configuration is missing. Keep `DO_SPACES_INTERNAL_ENDPOINT` unset in production.

Generate the initial password with `openssl rand -base64 24` so it is strong and safe to place in a Compose env file. The `PRODUCTION_ADMIN_*` variables are required only for the first successful bootstrap. Use a unique generated password, sign in, change or reset it, then remove `PRODUCTION_ADMIN_INITIAL_PASSWORD` from `.env`. Later deploys still succeed without it because the bootstrap checks its database ledger before reading those variables.

## Deploy

Run `npm run check` on your development machine before pushing the release. The Docker Droplet does not need Node.js installed on its host. From the repository root on the Droplet:

```bash
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
docker compose --env-file .env -f docker-compose.prod.yml build --pull api web
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

The one-shot `migrate` service runs `prisma migrate deploy`, then the one-shot `bootstrap` service runs the production bootstrap. The API and worker start only after both succeed; the web starts only after the API is healthy; Caddy starts serving only after both application services are healthy. Do not use `prisma migrate dev` in production.

The bootstrap is not a container-file marker. PostgreSQL stores `production-bootstrap-v1` in `deployment_task_runs` inside the same transaction as the initial admin and core settings. A PostgreSQL advisory lock prevents concurrent deployments from running it twice. On every later deployment the service starts, sees the completed key, changes nothing, and exits successfully.

Do not replace this with an API entrypoint that runs migrations or seeds. The API and worker could start concurrently and race. Separate one-shot Compose services provide ordering, isolated logs, failure visibility, and safe restarts.

## Verify

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 migrate bootstrap api worker web caddy
curl --fail https://hub.example.org/health
curl --fail https://hub.example.org/api/health
```

Caddy requests and renews the HTTPS certificate automatically after DNS resolves and ports 80 and 443 are reachable. If HTTPS is not ready, inspect `docker compose --env-file .env -f docker-compose.prod.yml logs caddy` before changing DNS or proxy settings.

The public API health response is intentionally minimal and returns only overall readiness. After signing in as an admin, open `/admin/health` directly to inspect PostgreSQL, Redis/background jobs, object storage, email delivery, worker heartbeat, queue counts, and integration configuration. This route is intentionally not listed in workspace navigation, and its detailed `/api/health/details` endpoint is admin-only. Verify login, one private file upload, one calendar connection, and one queued test email before opening the deployment to users.

All application email is asynchronous. Auth and invitation services enqueue the `transactional-email` queue; notification creation persists delivery records consumed by the notification worker. The send-capable `EmailService` is registered only in `WorkerModule`, so an API request never waits for Resend or SMTP. BullMQ retries transactional email up to five times with exponential backoff, and Redis uses AOF persistence with a `noeviction` policy.

## Deploy an update

Create a database-aware PostgreSQL backup before applying migrations. Then deploy an immutable tag or reviewed commit:

```bash
cd /opt/bid-hub/app
git fetch --tags --prune
git checkout YOUR_NEW_RELEASE_TAG_OR_COMMIT
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
docker compose --env-file .env -f docker-compose.prod.yml build --pull api web
docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
docker compose --env-file .env -f docker-compose.prod.yml ps
```

The migration job applies only unapplied Prisma migrations, and the production bootstrap remains skipped because its database run key already exists.

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
