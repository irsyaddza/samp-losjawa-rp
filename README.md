# Los Jawa Roleplay — Server Infrastructure

A production-grade open.mp (SA-MP) roleplay server stack built on Docker Compose, featuring automated database backup, disaster recovery validation, a Next.js web portal, and a GitHub Container Registry delivery pipeline.

![CI Status](https://github.com/irsyaddza/samp-losjawa-rp/actions/workflows/ci.yml/badge.svg)
![CD Status](https://github.com/irsyaddza/samp-losjawa-rp/actions/workflows/cd.yml/badge.svg)

---

## Architecture

The stack consists of six services orchestrated via Docker Compose:

| Container | Image | Port | Purpose |
| :--- | :--- | :--- | :--- |
| `ljrp-mysql` | mysql:5.7 | 127.0.0.1:3306 | Primary database (localhost-only) |
| `ljrp-samp` | custom build / GHCR | 7777/udp, 7777/tcp | open.mp game server |
| `ljrp-web` | custom build / GHCR | 127.0.0.1:3000 | Next.js web portal and UCP (served through Caddy) |
| `ljrp-caddy` | caddy:2-alpine | 80, 443 | Reverse proxy and automatic TLS termination |
| `ljrp-models-cdn` | nginx:alpine | 7778 | Static file CDN for client model downloads |
| `ljrp-playit` | playit-agent | — | Network tunnel via Playit.gg (optional, profile-gated) |

All services communicate through an internal Docker bridge network (`samp_net`). The MySQL and web ports are bound exclusively to `127.0.0.1`; the portal is reachable from the internet only through Caddy on port 443.

The stack ships with two Compose definitions:

| File | Purpose |
| :--- | :--- |
| `docker-compose.yml` | Local development. Builds images from source and bind-mounts the gamemode for fast iteration. |
| `docker-compose.prod.yml` | Production. Pulls immutable images from GitHub Container Registry and mounts no source code. |

The `playit` service is gated behind the `playit` profile, so it only starts when explicitly requested (`docker compose --profile playit up -d`).

---

## Core Systems & Gameplay Architecture

Los Jawa Roleplay is engineered on a high-performance **modular Pawn architecture** (`gamemodes/modules/`) backed by an asynchronous MySQL persistence engine and a Next.js 14 Web UCP. The codebase prioritizes data integrity, real-time spatial synchronization, and distributed operations:

| System Domain | Technical Complexity & Highlights | Primary Modules |
| :--- | :--- | :--- |
| **Living Economy & Real Estate** | Dynamic property instances (virtual worlds), real-time 3D raycast furniture customization engine, multi-tier industrial refining supply chains, and agricultural farming loops. | `Furniture.pwn`, `Property.pwn`, `Industry.pwn`, `Store.pwn` |
| **Law Enforcement Technology** | Interactive in-game Mobile Data Computer (MDC) with citizen record indexing, live CCTV spectator stream interpolation, automated penal sentencing, and static vehicle fleet management. | `MobileDataComputer.pwn`, `CCTV.pwn`, `Prison.pwn`, `Faction.pwn` |
| **Autonomous Transit & World** | Autonomous statewide railway transit network (`TrainSystem`), modular vehicle component health (engine, transmission, tires), trunk storage, and dynamic emergency strobes (ELM). | `TrainSystem.pwn`, `VehicleParts.pwn`, `ELM.pwn` |
| **Illicit Markets & Gang Warfare** | Multi-phase contraband chemical synthesis, black market firearm assembly with serial tracking, dynamic spray-paint graffiti tagging, and gang turf boundary control. | `Drugs.pwn`, `IllegalWeapon.pwn`, `Graffiti.pwn`, `Zones.pwn` |
| **Full-Stack Web Portal (UCP)** | Modern Next.js 14 App Router portal featuring JWT stateless auth, bcrypt password parity with open.mp, automated SMTP transactional emails, and real-time player telemetry. | Next.js 14, Tailwind, TypeScript, MySQL |
| **Staff Live-Ops & Tooling** | In-game 3D world map editor with live review/approval pipeline, heuristic anticheat (teleport, speed, weapon spoofing), and live in-game SQL query diagnostic engine. | `MapEditor.pwn`, `MappingRequest.pwn`, `Anticheat.pwn`, `Queries.pwn` |

> 📖 **Deep-Dive Technical Reference:**  
> For complete domain specifications, database models, and source module breakdowns, see the **[Comprehensive Feature Architecture Guide](docs/FEATURES.md)**.

---

## Prerequisites

- Docker >= 24.0
- Docker Compose >= 2.0
- Git
- Linux host (for the 32-bit game server binary)

To build the gamemode locally:
- `pawncc` (included in `qawno/`)
- libc6:i386 and libstdc++6:i386

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/irsyaddza/samp-losjawa-rp.git
cd samp-losjawa-rp
```

### 2. Configure environment variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env
```

Edit `.env` with your values. See the [Environment Variables Reference](#environment-variables-reference) section below.

### 3. Create the gamemode credential include

`gamemodes/modules/misc/Config.pwn` includes `db_credentials.inc` to obtain its MySQL credentials. That file is excluded from version control, so create it from the template before compiling:

```bash
cp gamemodes/modules/db_credentials.example.inc \
   gamemodes/modules/db_credentials.inc
```

Then set the values to match your `.env`. `SQL_HOSTNAME` is the Compose service name (`mysql`).

### 4. Provide the AI NPC configuration (optional)

The in-game AI NPC system reads `scriptfiles/ai_config.json`, which is also excluded from version control because it stores an API key:

```bash
cat > scriptfiles/ai_config.json <<'EOF'
{
  "openrouter_api_key": "your-openrouter-api-key",
  "openrouter_model": "your-model"
}
EOF
```

### 5. Start the stack

```bash
docker compose up -d
```

Docker Compose starts MySQL first, waits until it passes its healthcheck, then starts the game server and web portal.

To rebuild images after code changes:

```bash
docker compose up -d --build
```

### 6. Compile the gamemode (local development)

On Linux:

```bash
./build.sh
```

On Windows:

```bash
build.bat
```

The compiled binary (`gamemodes/roleplay.amx`) is picked up by the game server container through the bind mount.

> The compiler is invoked with `-i../qawno/include -imodules`. If you compile from an IDE instead of `build.sh`, configure those include paths as well, otherwise `db_credentials.inc` will not be found.

---

## Environment Variables Reference

### Required

These variables must be set. The stack will refuse to start if any of them are empty.

| Variable | Description |
| :--- | :--- |
| `MYSQL_ROOT_PASSWORD` | MySQL root account password |
| `MYSQL_USER` | Application database user |
| `MYSQL_DATABASE` | `jawa` | Database name |
| `MYSQL_PASSWORD` | Application database user password |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens (minimum 32 characters) |

### Optional — Web Portal

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Public-facing URL of the web portal |
| `SMTP_HOST` | — | SMTP server hostname for sending emails |
| `SMTP_PORT` | — | SMTP server port (typically 587 for TLS) |
| `SMTP_USER` | — | SMTP authentication username |
| `SMTP_PASS` | — | SMTP authentication password |
| `SMTP_FROM` | — | Sender address for outgoing emails |

### Optional — Container Images (Production)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SAMP_IMAGE` | `ghcr.io/irsyaddza/ljrp-samp:main` | Game server image reference |
| `WEB_IMAGE` | `ghcr.io/irsyaddza/ljrp-web:main` | Web portal image reference |

The deployment workflow sets both to the exact commit SHA being released, so these values only matter when starting the production stack by hand. Pin a previous SHA here to roll back.

### Optional — Tunneling

| Variable | Description |
| :--- | :--- |
| `PLAYIT_SECRET_KEY` | API key from your Playit.gg account |

### Optional — Remote Backup (SSH)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `REMOTE_BACKUP_ENABLED` | `false` | Set to `true` to enable off-site backup transfer |
| `REMOTE_SSH_HOST` | — | Hostname or IP of the remote backup server |
| `REMOTE_SSH_USER` | — | SSH username on the remote server |
| `REMOTE_SSH_PORT` | `22` | SSH port on the remote server |
| `REMOTE_SSH_KEY` | `~/.ssh/id_rsa` | Path to the SSH private key on the local machine |
| `REMOTE_BACKUP_DIR` | `/var/backups/samp_db` | Target directory on the remote server |

---

## Domain and TLS

The production host serves the web portal over HTTPS through Caddy, which obtains and renews Let's Encrypt certificates automatically.

TLS termination is a functional requirement, not a nicety. The session cookie set by `web/src/lib/auth.ts` carries the `Secure` flag whenever `NODE_ENV=production`, and browsers silently discard `Secure` cookies received over plain HTTP. Without HTTPS, login appears to succeed — the API returns `200` — but no session is ever established and the user is bounced back to the sign-in page.

### DNS records

Create two records in Cloudflare, both set to **DNS only** (grey cloud):

| Type | Name | Content | Purpose |
| :--- | :--- | :--- | :--- |
| A | `ucp` | production host IP | Web portal (UCP) |
| A | `play` | production host IP | Game server and model CDN |

Both records must remain unproxied. The Cloudflare free plan proxies HTTP and HTTPS on a fixed list of ports (80, 443, 8080, 8443, and a few others) and does not proxy UDP at all. The game server listens on UDP 7777 and the model CDN on TCP 7778, so neither can pass through the proxy. The web portal is unproxied as well, which keeps Let's Encrypt's HTTP-01 challenge reachable.

### Reverse proxy

`caddy/Caddyfile` holds the entire proxy configuration:

```caddyfile
ucp.losjawa-rp.fun {
	encode zstd gzip

	reverse_proxy web:3000 {
		header_up X-Real-IP {remote_host}
	}
}
```

Caddy requests a certificate on first start and renews it automatically. Key material and issued certificates live in the `caddy_data` volume, so they survive container recreation and are never re-issued unnecessarily.

### Firewall

Two independent layers must allow inbound traffic.

**Oracle Cloud VCN security list** — add ingress rules for TCP 80 and TCP 443. The existing rules for UDP 7777, TCP 7777, and TCP 7778 stay in place. Port 3000 no longer needs to be reachable from the internet.

**Host firewall** — on images that ship with restrictive `iptables` rules, insert the new rules ahead of the default rejection:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Values that depend on the domain

Two settings reference the public domain and are baked into immutable images. Both require a rebuild through the CD pipeline; editing them on the host has no effect.

| Value | Where it lives | Correct value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | GitHub repository variable, inlined into the browser bundle during `npm run build` | `https://ucp.losjawa-rp.fun` |
| `config.json` → `artwork.cdn` | Copied into the game server image | `http://play.losjawa-rp.fun:7778` |

### Verification

```bash
# Certificate issuance and renewal activity
docker compose -f docker-compose.prod.yml logs caddy | grep -i certificate

# Portal reachable over TLS
curl -sS -o /dev/null -w '%{http_code}\n' https://ucp.losjawa-rp.fun

# Courteous redirect from plain HTTP
curl -sS -o /dev/null -w '%{http_code}\n' http://ucp.losjawa-rp.fun
```

A `200` from the first request and a `308` from the second indicate the proxy, the certificate, and the redirect are all working.

### Optional: Cloudflare proxy in front of Caddy

To add WAF rules and DDoS mitigation, switch the `ucp` record to proxied (orange cloud) and set the SSL/TLS mode to **Full (strict)**. Because Let's Encrypt's HTTP-01 challenge cannot reach the origin through the proxy, issue a Cloudflare Origin Certificate instead, mount it into the Caddy container, and point the site block's `tls` directive at it. Origin certificates are valid for 15 years.

Once the proxy is enabled, configure `trusted_proxies` in the Caddy global block so the application logs the real client address rather than the Cloudflare edge node.

---

## Database Operations

### Manual backup

Run a compressed, integrity-verified backup of the active database:

```bash
./scripts/backup/db_backup.sh
```

This script will:
- Dump the database using `--single-transaction` (no table locks, zero downtime)
- Compress the output with gzip
- Generate a SHA-256 checksum file alongside the archive
- Sync the archive to a secondary isolated directory (`~/.secure_backups/samp_db`)
- Transfer to a remote server via SSH if `REMOTE_BACKUP_ENABLED=true`
- Delete local archives older than 7 days

Backup archives are stored in `backups/mysql/`.

### Disaster recovery verification

Validate that the latest backup is intact and restorable:

```bash
./scripts/backup/db_restore_test.sh
```

This script performs a dry-run restore into a temporary database (`jawa_restore_test`), verifies the SHA-256 checksum and gzip integrity, reports the recovered table count, and drops the test database automatically. It does not touch the production database.

---

## CI/CD Pipeline

Two GitHub Actions workflows drive the repository. Continuous integration validates every change; continuous delivery publishes immutable images and deploys them.

```
pull request ──► CI (validate) ──► merge to main ──► CD (build → push → deploy)
```

### Continuous Integration — `ci.yml`

Runs on every push to `development` or `main`, and on every pull request targeting `main`.

| Job | What it does |
| :--- | :--- |
| `compile-gamemode` | Installs 32-bit dependencies and compiles `roleplay.pwn` to `roleplay.amx` |
| `validate-web` | Runs ESLint and a production build check on the Next.js web portal |
| `validate-docker` | Builds the SA-MP and web Docker images to confirm the build succeeds |

The compiled `roleplay.amx` is uploaded as a build artifact and can be downloaded from the Actions tab for 7 days.

Pull requests from forks cannot read repository secrets, so the compile job falls back to `db_credentials.example.inc`. Validation therefore still runs on untrusted contributions.

### Continuous Delivery — `cd.yml`

Runs on pushes to `main` and `development`, and supports manual dispatch.

| Job | What it does |
| :--- | :--- |
| `compile` | Generates `db_credentials.inc` from repository secrets and compiles the gamemode |
| `build-samp` | Builds the game server image and pushes it to GHCR |
| `build-web` | Builds the web portal image with `NEXT_PUBLIC_BASE_URL` inlined, and pushes it to GHCR |
| `deploy` | Runs for `main` only. Connects to the production host over SSH, pulls the new images, and recreates the containers |

Each image is published under two tags:

```
ghcr.io/irsyaddza/ljrp-samp:<commit-sha>    ghcr.io/irsyaddza/ljrp-web:<commit-sha>
ghcr.io/irsyaddza/ljrp-samp:main           ghcr.io/irsyaddza/ljrp-web:main
```

The `deploy` job targets the `production` GitHub environment and therefore pauses for manual approval before touching the host. A merged pull request only queues a deployment; it is never applied silently.

### Required repository configuration

Secrets (Settings → Secrets and variables → Actions):

| Name | Scope | Consumed by |
| :--- | :--- | :--- |
| `DB_SQL_HOSTNAME` | Repository | `compile` |
| `DB_SQL_USERNAME` | Repository | `compile` |
| `DB_SQL_DATABASE` | Repository | `compile` |
| `DB_SQL_PASSWORD` | Repository | `compile` |
| `VPS_HOST` | `production` environment | `deploy` |
| `VPS_USER` | `production` environment | `deploy` |
| `VPS_SSH_KEY` | `production` environment | `deploy` |
| `VPS_PORT` | `production` environment | `deploy` |
| `GHCR_PULL_TOKEN` | `production` environment | `deploy` |

Variables:

| Name | Description |
| :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the web portal. Inlined into the browser bundle at build time. |

`GITHUB_TOKEN` is provided automatically and authenticates the image push to GHCR. Only the deploy job holds host credentials, and build jobs run without environment protection.

### Production deployment

Images are built once in CI and promoted unchanged. The host only pulls and restarts:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

The running server stays identical to the artifact that was validated, and rolling back means redeploying an earlier image tag.

---

## Directory Structure

```
.
├── docker-compose.yml            # Local development orchestration
├── docker-compose.prod.yml       # Production orchestration (GHCR images)
├── Dockerfile                    # SA-MP server image
├── build.sh / build.bat          # Local gamemode compiler scripts
├── caddy/
│   └── Caddyfile                 # Reverse proxy and automatic TLS configuration
├── docs/                         # Technical architecture & feature deep-dives
├── gamemodes/                    # Pawn source files (.pwn)
│   └── modules/
│       ├── db_credentials.example.inc  # Credential template (copy to db_credentials.inc)
│       └── db_credentials.inc          # Local credentials (git-ignored)
├── filterscripts/                # Filterscript source files
├── scriptfiles/                  # Server-side data files
│   └── ai_config.json            # AI NPC configuration (git-ignored, holds an API key)
├── models/                       # Custom model files (served via CDN)
├── plugins/                      # SA-MP plugin binaries (.so)
├── components/                   # open.mp components
├── qawno/                        # Pawn compiler and IDE
├── web/                          # Next.js web portal source
├── scripts/
│   └── backup/
│       ├── db_backup.sh          # Automated backup script
│       └── db_restore_test.sh    # Disaster recovery verification
├── mysql/
│   └── init/                     # SQL files executed on first database start
├── backups/
│   └── mysql/                    # Local backup archive storage (git-ignored)
└── .github/
    └── workflows/
        ├── ci.yml                # Validation pipeline
        └── cd.yml                # Build, publish, and deploy pipeline
```

---

## Connecting to the Database (Local Development)

The MySQL port is bound to `127.0.0.1:3306` only. To connect with a GUI tool (e.g., DBeaver, TablePlus):

- **Host:** 127.0.0.1
- **Port:** 3306
- **User:** value of `MYSQL_USER` in your `.env`
- **Password:** value of `MYSQL_PASSWORD` in your `.env`
- **Database:** value of `MYSQL_DATABASE` in your `.env` (default: `jawa`)

---

## Useful Commands

Local development:

```bash
# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f samp

# Restart only the game server container
docker compose restart samp

# Stop all services
docker compose down

# Stop all services and remove volumes (destructive — data will be lost)
docker compose down -v
```

Production host:

```bash
# Show container status
docker compose -f docker-compose.prod.yml ps

# Stream game server logs
docker compose -f docker-compose.prod.yml logs -f samp

# Stream reverse proxy logs (certificate issuance failures appear here)
docker compose -f docker-compose.prod.yml logs -f caddy

# Recreate a single service without touching the others
docker compose -f docker-compose.prod.yml up -d --force-recreate samp
```

---

## Contributing

1. Create a branch from `development`.
2. Test your changes locally before pushing.
3. Open a pull request targeting `development`.
4. Ensure all CI checks pass before requesting a review.
5. Merging into `development` builds and publishes images without deploying.
6. Promote to `main` with a pull request to trigger a deployment, then approve it in the `production` environment.

Direct commits to `main` are not permitted.