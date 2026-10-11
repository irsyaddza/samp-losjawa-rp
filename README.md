# Los Jawa Roleplay — Server Infrastructure

A production-grade open.mp (SA-MP) roleplay server stack built on Docker Compose, featuring automated database backup, disaster recovery validation, and a Next.js web portal.

![CI Status](https://github.com/irsyaddza/samp-losjawa-rp/actions/workflows/ci.yml/badge.svg)

---

## Architecture

The stack consists of five services orchestrated via Docker Compose:

| Container | Image | Port | Purpose |
| :--- | :--- | :--- | :--- |
| `ljrp-mysql` | mysql:5.7 | 127.0.0.1:3306 | Primary database (localhost-only) |
| `ljrp-samp` | custom build | 7777/udp, 7777/tcp | open.mp game server |
| `ljrp-web` | custom build | 3000 | Next.js web portal and UCP |
| `ljrp-models-cdn` | nginx:alpine | 7778 | Static file CDN for client model downloads |
| `ljrp-playit` | playit-agent | — | Network tunnel via Playit.gg |

All services communicate through an internal Docker bridge network (`samp_net`). The MySQL port is bound exclusively to `127.0.0.1` to prevent external access.

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

### 3. Start the stack

```bash
docker compose up -d
```

Docker Compose will start MySQL first, wait until it passes the healthcheck, then start the game server and web portal.

To rebuild images after code changes:

```bash
docker compose up -d --build
```

### 4. Compile the gamemode (local development)

On Linux:
```bash
./build.sh
```

On Windows:
```bash
build.bat
```

The compiled binary (`gamemodes/roleplay.amx`) is automatically picked up by the game server container.

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

Continuous Integration runs automatically on every push to `development` or `main`, and on all pull requests targeting `main`.

### Pipeline jobs

| Job | What it does |
| :--- | :--- |
| `compile-gamemode` | Installs 32-bit dependencies and compiles `roleplay.pwn` to `roleplay.amx` on a GitHub-hosted Linux runner |
| `validate-web` | Runs ESLint and a production build check on the Next.js web portal |
| `validate-docker` | Builds the SA-MP and web Docker images to verify no build errors exist |

The compiled `roleplay.amx` is uploaded as a build artifact and available for download from the Actions tab for 7 days.

---

## Directory Structure

```
.
├── docker-compose.yml       # Service orchestration
├── Dockerfile               # SA-MP server image
├── build.sh / build.bat     # Local gamemode compiler scripts
├── gamemodes/               # Pawn source files (.pwn)
├── filterscripts/           # Filterscript source files
├── scriptfiles/             # Server-side data files
├── models/                  # Custom model files (served via CDN)
├── plugins/                 # SA-MP plugin binaries (.so)
├── components/              # open.mp components
├── qawno/                   # Pawn compiler and IDE
├── web/                     # Next.js web portal source
├── scripts/
│   └── backup/
│       ├── db_backup.sh     # Automated backup script
│       └── db_restore_test.sh # Disaster recovery verification
├── mysql/
│   └── init/                # SQL files executed on first database start
├── backups/
│   └── mysql/               # Local backup archive storage (git-ignored)
└── .github/
    └── workflows/
        └── ci.yml           # GitHub Actions CI pipeline
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

---

## Contributing

1. Create a branch from `development` for your changes.
2. Test your changes locally before pushing.
3. Open a pull request targeting `development`.
4. Ensure all CI checks pass before requesting a review.

Direct commits to `main` are not permitted.
