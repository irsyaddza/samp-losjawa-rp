# Los Jawa Roleplay — Comprehensive Systems & Feature Architecture

This document provides an in-depth technical breakdown of the gameplay systems, domain architecture, and engineering design implemented in the **Los Jawa Roleplay** open.mp (SA-MP) gamemode and accompanying Next.js Web Portal.

---

## Architecture Overview

The gamemode source is engineered using a **modular Pawn architecture** (`gamemodes/modules/`), decoupling concerns across domain modules, persistent data stores, and event hooks:

```
gamemodes/
├── roleplay.pwn                 # Core initialization, gamemode callbacks & tick routing
└── modules/
    ├── player/                  # Authentication, persistent player state, login UI
    ├── system/                  # World simulation, public transit, agricultural cycles
    ├── vehicle/                 # Physics, modular damage, custom sirens (ELM), modding
    ├── police/                  # Surveillance, citations, tactical law enforcement
    ├── Business.pwn             # Commercial establishments & profit pools
    ├── Property.pwn             # Dynamic real estate, virtual worlds & keys
    ├── Furniture.pwn            # Real-time 3D furniture customization engine
    ├── Industry.pwn             # Industrial supply chains & refining pipelines
    ├── Store.pwn                # Retail distribution & inventory stocking
    ├── MobileDataComputer.pwn   # In-game police terminal & database lookup (215 KB)
    ├── Faction.pwn              # Faction RBAC, duty statuses, static fleet
    ├── Prison.pwn               # Sentence processing, bail calculations & cells
    ├── Drugs.pwn                # Contraband synthesis, pharmacology & trafficking
    ├── IllegalWeapon.pwn        # Firearm component crafting & serial indexing
    ├── Graffiti.pwn             # In-game spray rendering & territory influence
    ├── Zones.pwn                # Gang turf boundaries & conquest state
    ├── TrainSystem.pwn          # Autonomous scheduled railway transit network
    ├── MapEditor.pwn            # In-game 3D world map editor with live review
    ├── MappingRequest.pwn       # Player mapping submission & approval pipeline
    ├── Anticheat.pwn            # Heuristic telemetry & anti-tamper defenses
    ├── Phone.pwn                # Interactive smartphone, SMS & telephony routing
    ├── HudV2.pwn                # Modern vector-style TextDraw HUD
    └── Queries.pwn              # In-game SQL query execution & diagnostic engine
```

All game data is asynchronously committed and queried against **MySQL 5.7** using connection pooling and prepared statements (`samp-mysql` plugin). Real-time telemetry, user management, and email workflows synchronize with the **Next.js 16.4.3 App Router** web portal.

---

## 1. Macro Economy & Real Estate Engine

### Dynamic Real Estate & Property Instances (`Property.pwn`)
- **Complex Hierarchies:** Supports standalone houses, residential estates, and complex multi-unit apartment complexes.
- **Interior Virtual Worlds:** Utilizes SA-MP virtual worlds and interior IDs to dynamically allocate and isolate player living spaces without collision conflicts.
- **Key & Access Delegation:** Players can assign sub-keys to housemates, set access passwords, configure lock states, and collect tenant rent.
- **Persistent Data Storage:** Coordinates, interior layouts, safe contents, lock status, and purchase prices are stored in MySQL (`property_mappings`).

### Real-Time 3D Furniture Placement Engine (`Furniture.pwn`)
- **Interactive In-Game Editing:** Players can purchase and customize hundreds of interior furniture objects with full 6-axis 3D freedom (X, Y, Z coordinates, roll, pitch, and yaw rotation).
- **Raycast Object Manipulation:** Implements SA-MP object editing handles allowing precise repositioning and surface snapping.
- **Coordinate Serialization:** Object indices, models, spatial vectors, and material attachments serialize dynamically into MySQL records linked directly to the parent property ID.

### Industrial Supply Chains & Production Logistics (`Industry.pwn`, `Store.pwn`, `Business.pwn`)
- **Multi-Tier Economic Pipeline:**
  1. **Raw Resource Extraction:** Agricultural produce, timber, or metal ore collected by players.
  2. **Industrial Processing:** Factories refine raw goods into consumer stock (e.g., flour into bread, metal into vehicle parts).
  3. **Logistical Hauling:** Truckers transport finished goods from manufacturing plants to retail stores across San Andreas.
  4. **Retail Distribution:** Stores (`Store.pwn`) consume stock to serve consumer purchases, dynamically adjusting prices based on stock levels.
- **Business Profit Pools:** Business owners manage employee payroll, customize item catalog markups, and withdraw accrued revenue directly through in-game management dialogs.

### Agricultural & Farming Cycle (`Farmer.pwn`, `HarvesterRental.pwn`)
- **Plant Growth Timers:** Farmland zones track crop maturity states across scheduled server timers.
- **Machinery Leasing:** Players lease specialized combine harvesters via `HarvesterRental.pwn`, calculating lease fees, operational wear, and harvest volume yield.

---

## 2. Tactical Law Enforcement Operations

### Mobile Data Computer (MDC) (`MobileDataComputer.pwn` — 215 KB)
A fully interactive in-game police terminal rendered entirely through interactive TextDraws, accessible from law enforcement vehicles and headquarters:
- **Citizen Database Search:** Query citizen records by name or National ID, displaying driving licenses, weapon permits, registered addresses, and historical arrest records.
- **Vehicle Registry Lookup:** Search license plates to inspect vehicle registration status, registered owners, reported stolen flags, and outstanding traffic tickets.
- **Warrants & APB Broadcasts:** Issue active arrest warrants and city-wide All-Points Bulletins (APB) that notify all online law enforcement units.
- **Citation & Ticketing System:** Direct integration with `Fines.pwn`, instantly logging traffic or criminal citations and debiting or pending against the offender's bank balance.

### Real-Time CCTV Surveillance Network (`CCTV.pwn`)
- **Camera Network:** Strategically deployed surveillance cameras across high-crime junctions, banks, and government facilities.
- **Live Stream Interpolation:** Law enforcement officers can access camera consoles, interpolating the player's spectator camera to fixed camera vectors with pan, zoom, and tilt controls.

### Faction Management & Static Vehicle Fleet (`Faction.pwn`, `FactionStaticVeh.pwn`)
- **Role-Based Access Control (RBAC):** Granular permission ranks, duty toggling (`/duty`), specialized gear distribution, and encrypted departmental radio frequencies.
- **Static Fleet Engine:** Pre-configured emergency and faction vehicles persist in designated station bays, auto-respawning with predefined liveries, fuel capacities, and siren configurations.

### Penal & Correctional Engine (`Prison.pwn`)
- **Automated Cell Routing:** Automatically calculates sentences, routes inmates to secure correctional cells, and updates jail timers in the database to prevent avoidance via disconnection.
- **Bail Calculations:** Configurable bail amounts processed through bail bond transactions, freeing eligible suspects while recording legal outcomes.

---

## 3. Underworld & Contraband Operations

### Contraband Synthesis & Trafficking (`Drugs.pwn`, `DrugStore.pwn`)
- **Chemical Processing:** Players acquire precursors, craft compounds at clandestine laboratory locations, and synthesize distinct drug variants (Cannabis, Methamphetamine, Cocaine).
- **Pharmacological Effects:** Consuming substances triggers transient character stat boosts (temporary health buffers, stamina boosts, visual screen shaders) paired with withdrawal penalties and addiction levels.
- **Black Market Drug Stores:** Underground distribution networks allowing organized crime syndicates to wholesale bulk narcotics.

### Black Market Firearm Assembly (`IllegalWeapon.pwn`, `Weapons.pwn`)
- **Component Crafting:** Smuggled weapon frames, barrels, and receivers can be assembled into functioning firearms.
- **Serial Tracking & Ballistics:** Tracks weapon serial numbers, enabling law enforcement ballistic investigations on recovered guns.

### Turf Warfare & Dynamic World Graffiti (`Graffiti.pwn`, `Zones.pwn`)
- **In-Game Spray Mechanics:** Real-time spray can mechanics render custom gang tags onto building facades using dynamic world textdraws and objects.
- **Territory Influence:** Spraying tags inside faction turf boundaries increases gang influence, providing passive respect and revenue bonuses.

---

## 4. Living World Simulation & Transit Infrastructure

### Autonomous Railway Network (`TrainSystem.pwn` — 87 KB)
- **Automated Train Transit:** Autonomous passenger trains loop around the statewide railway network on calculated schedules.
- **Station Synchronizations:** Trains decelerate, stop, open passenger doors at designated rail stations (Market Station, Cranberry Station, etc.), allowing players to board and ride as a realistic public transit alternative.

### Modular Vehicle Damage, Parts & Tuning (`VehicleParts.pwn`, `Player.pwn`, `ELM.pwn`, `Modshop.pwn`)
- **Modular Component Degradation:** Tracks discrete health values for engines, transmissions, batteries, and tires.
- **Trunk & Glovebox Storage:** Players can store weapons, tools, and contraband inside vehicle trunks, persisting across server restarts.
- **Emergency Lights Mod (ELM):** Dynamic strobe and siren light sequences simulated via vehicle light toggles, replicating realistic multi-phase emergency flashes for police cruisers and ambulances.
- **Custom Modshop Engine:** Modshop integrations allowing players to customize rims, hydraulics, paint jobs, and nitro boosters.

### Ambient AI & NPC Ecosystem (`AiNpc.pwn`)
- Automated NPC agents positioned throughout the world for retail interactions, dynamic transit ticket dispensers, and immersive ambient life.

### In-Game Smartphone & Telephony (`Phone.pwn` — 100 KB)
- **TextDraw Smartphone UI:** Custom graphical smartphone on player screen.
- **Features:** Contact address book, real-time SMS messaging between online players, direct 911 emergency dispatch calls, bank transfers, and taxi service hailing.

---

## 5. Full-Stack UCP, Community Operations & Moderation (`web/`)

Built with **Next.js 16.4.3 (App Router)**, **TypeScript**, and **Tailwind CSS**, using a shared **mysql2** connection pool against the same MySQL database as the open.mp game server.

```mermaid
flowchart LR
    Client["Player Browser"] <-->|HTTPS / REST| NextApp["Next.js 16.4.3 Web Portal"]
    NextApp <-->|JWT / Bcrypt| Auth["Auth Engine"]
    NextApp <-->|mysql2 / Connection Pool| MySQL[("Primary MySQL DB")]
    openmp["open.mp Game Server"] <-->|samp-mysql plugin| MySQL
```

### 5.1 Portal Foundation

- **Stateless JWT Authentication:** Secure session management via signed JSON Web Tokens (`JWT_SECRET`).
- **Synchronized Password Hashing:** Uses bcrypt password hashes compatible with the Pawn gamemode authentication routine, allowing seamless login between web and game client.
- **Automated Transactional Emails:** Nodemailer integration (`SMTP_*`) handles email verification on registration and secure token-based password reset links.
- **Live Character Telemetry:** Players inspect their in-game persona status, bank accounts, registered vehicles, property deeds, and faction ranks directly on the web dashboard.
- **Donator & Supporter Portal:** Web-based interface for managing supporter packages and unlocking perks.
- **Automated Server Status & Changelog:** Displays real-time server health, player counts, and update history.
- **Responsive Admin UI:** Dashboard and Navbar use a dark, card-based layout with admin stat cards, quick actions, and an unread notification badge.

### 5.2 Player Self-Service

- **Unified Dashboard:** Players can reach character telemetry, support tickets, player reports, ban appeals, notifications, and account settings from one place.
- **Support Center:** Players submit general helpdesk tickets and follow the conversation thread with staff.
- **Player Reports:** Dedicated report flow for rule violations, separate from general support tickets.
- **Ban Appeals:** Dedicated appeal flow for active bans, separate from general support tickets.
- **Active Limits:** A player may have at most **5 active support tickets**, **5 active player reports**, and **1 appeal per ban record**.

### 5.3 Support Desk (`ucp_tickets`, `ucp_ticket_messages`)

- **Ticket Categories:** Report player, bug report, ban appeal, refund request, name change, and other.
- **Workflow States:** `open`, `in_progress`, `resolved`, and `closed`.
- **Priority Levels:** `low`, `normal`, `high`, and `urgent`.
- **Staff Assignment:** Admins can assign or unassign a ticket to themselves.
- **Threaded Conversation:** Player and staff messages are stored separately with author identity and staff flag.
- **Notifications:** Status changes notify the ticket owner and link back to the ticket.
- **Audit Trail:** Ticket status, priority, assignment, and unassignment actions are recorded in the admin audit log.

### 5.4 System Notifications (`ucp_notifications`)

- **In-App Notification Center:** Players see ticket replies, application results, moderation outcomes, and system messages.
- **Unread Badge:** The Navbar polls the unread count and displays a badge.
- **Read Controls:** Players can mark one notification or all notifications as read.
- **Deep Links:** Notifications can point to the related ticket, report, appeal, or application page.
- **Game-to-Web Bridge:** In-game actions such as an unban can insert a notification for the affected account.

### 5.5 Moderation Center

- **Account Search:** Staff search by UCP username before taking action.
- **Web Ban:** Ban an entire UCP account with a reason and duration from **0 to 3650 days**; `0` means permanent.
- **Web Unban:** Remove an active ban by its ban record ID.
- **Safety Checks:** Staff cannot ban their own account, cannot ban an administrator with the same or higher level, and cannot create a second active ban for an already-banned account.
- **Ban Source:** Bans created from the UCP set `bans.source = 'web'`; in-game bans default to `game`.
- **Side Effects:** A web ban writes `logs_ban`, creates a moderation notification for the target, and records an audit entry.
- **Login Enforcement:** UCP-created bans are enforced when the account next attempts to log in to the game.

### 5.6 Player Directory & Moderation Timeline

- **Account 360 View:** Staff inspect characters, online state, active bans, ban history, connection history, appeals, and reports for one account.
- **Moderation Timeline:** Reports, bans, and appeals are merged into one chronological view with links to the relevant queue.
- **Ban Provenance:** Active bans show whether they originated from the UCP or in-game.
- **Quick Actions:** Staff can jump from an account to the moderation center, report queue, or appeal queue with the relevant search already applied.

### 5.7 Ban Appeals (`ucp_ban_appeals`)

- **One Appeal per Ban:** A unique `ban_id` constraint prevents duplicate appeals for the same ban record.
- **Ban Snapshot:** Reason, banning admin, IP, permanent flag, expiry, creation time, and source are copied into the appeal so the case remains readable after the ban row is removed.
- **Player Submission:** The appeal message must be between 20 and 3000 characters.
- **Admin Review:** Staff can accept or reject an appeal; rejection requires a written explanation.
- **Accept Flow:** Accepting an appeal removes the ban if it is still active and notifies the player.
- **Audit Trail:** Accept and reject actions are recorded as `appeal.accept` and `appeal.reject`.
- **In-Game Closure:** When an administrator unbans an account in-game, any open appeal for that username is automatically marked `accepted`, stamped with the reviewer and response, and the player receives a notification.

### 5.8 Player Reports (`ucp_player_reports`)

- **Report Categories:** Cheating/exploiting, harassment/toxicity, scamming, deathmatching, bug abuse, advertising/spam, and other.
- **Report Payload:** Subject, chronology, evidence text/URLs, reported character or UCP username, and an optional reporting character.
- **Target Resolution:** The API resolves a reported character name to its account and character IDs, or falls back to a UCP username lookup.
- **Anti-Spam Limit:** A player may have at most **5 active reports** (`open` or `investigating`) at once.
- **Admin Queue:** Filters by status, assignee (`all`, `me`, `unassigned`), search, and sort order.
- **Aging Triage:** Reports display `New` (<24 hours), `1d old` (<72 hours), or `3d+ old` badges.
- **Assignment & Notes:** Staff can assign a report to themselves, unassign it, and keep internal staff-only notes.
- **Resolution:** `resolved` and `rejected` require a player-facing response; the reporter receives a notification.
- **Report-to-Ban:** Staff can ban the reported account directly from the report modal. The ban is created with `source = 'web'`, the report becomes `resolved`, `ban_id` is linked, the reporter is notified, and the action is audited as `report.ban`.

### 5.9 Admin Audit Trail (`ucp_admin_audit`)

- **Unified Web and Game Audit:** Web actions and in-game moderation actions share one audit table.
- **Recorded Context:** Admin ID, username, action, target type, target ID, details, IP/source marker, and timestamp.
- **Web Actions:** Moderation, reports, appeals, tickets, applications, mappings, donators, roster, changelog, and radio changes.
- **Game Actions:** `game.ban` and `game.unban` entries written by the Pawn gamemode.
- **Audit Viewer:** Search by admin, action, target, or details; filter by Web/In-Game; paginate 50 entries per page.
- **Access Control:** The audit viewer requires `adminLevel >= 4`.
- **Non-Blocking Writes:** Audit failures are logged but never block the underlying admin action.

### 5.10 Admin Overview

- **Operational Counters:** Pending applications, active tickets, pending mappings, online players, active bans, pending appeals, and pending reports.
- **Quick Navigation:** Direct links to tickets, moderation, appeals, reports, player directory, mappings, audit log, and changelog.
- **Role-Aware UI:** Audit links require `adminLevel >= 4`; head-admin tools require level `1337`.

### 5.11 Data Model, Access Control & Integration Boundaries

| Table / Column | Purpose |
|---|---|
| `ucp_tickets` | Support ticket header and assignment state |
| `ucp_ticket_messages` | Threaded player/staff replies |
| `ucp_notifications` | In-app notification inbox |
| `ucp_admin_audit` | Web and in-game staff action audit |
| `ucp_ban_appeals` | Ban appeal with immutable ban snapshot |
| `ucp_player_reports` | Player report, triage, resolution, and ban link |
| `bans.source` | Ban origin: `game` or `web` |

- **Player access:** Submit and view their own tickets, reports, appeals, and notifications.
- **Staff access (`adminLevel > 0`):** Tickets, moderation, appeals, and player reports.
- **Senior staff (`adminLevel >= 4`):** Admin audit viewer.
- **Head admin (`adminLevel 1337`):** Changelog and other head-admin-only controls.
- **Current boundary:** The in-game `/report` command still alerts online administrators but does **not** persist a row into `ucp_player_reports`. UCP reports are persisted; in-game report persistence remains a future integration point.
- **Ban timing:** UCP bans block the account at the next game login; they do not live-kick an already-connected player.

---

## 6. Staff Live-Ops, Anticheat & Developer Tooling

### In-Game 3D Map Editor & Live Approval Pipeline (`MapEditor.pwn`, `MappingRequest.pwn`)
- **Live World Builder:** Administrators and approved mappers can spawn, transform, scale, and align 3D world objects in real time without recompiling or rebooting the server.
- **Mapping Request Workflow:** Players submit custom interior mapping requests in-game; administrators review, test, and merge approved submissions into the production world database dynamically.

### Heuristic Anticheat Defenses (`Anticheat.pwn`)
- Server-side heuristic monitoring detecting client tampering:
  - Movement speedhack and unnatural velocity detection.
  - Airbreak and illegal coordinate teleportation.
  - Client-side money or ammo spoofing.
  - Rapid-fire and illegal weapon spawning.

### In-Game SQL Diagnostic Suite (`Queries.pwn`, `AdminCommands.pwn` — 350 KB)
- Senior administrators and developers can execute diagnostic queries, inspect live table rows, reload configurations, and hot-fix player state bugs directly from the in-game console with audit logging.

---

## 7. Core Immersion & UI/UX

- **Modern Vector-Style HUD (`HudV2.pwn`):** Clean, minimalist on-screen indicators for health, armor, hunger, thirst, cash, and vehicle telemetry.
- **Dynamic Wardrobe & Accessory Attachment (`Clothing.pwn`):** Precise 3D bone attachment editor allowing players to wear and position glasses, hats, badges, and holsters with custom offset vectors.
- **Integrated Death & Medical Flow (`Death.pwn`):** Incapacitated states, emergency paramedic triage, revival mechanics, and death penalty processing.

---

## 8. Operational & Deployment Tooling

### Database Backup (`scripts/backup/db_backup.sh`)

- Streams `mysqldump` through `gzip` without locking InnoDB tables (`--single-transaction`, `--quick`).
- Produces a SHA-256 checksum alongside every archive.
- Applies a 7-day retention window to local archives.
- Copies the archive and checksum to a secondary isolated directory (`~/.secure_backups/samp_db`).
- Optionally transfers backups to a remote SSH host when `REMOTE_BACKUP_ENABLED=true`.
- Requires Bash, Docker access, and `rsync`.

### Disaster Recovery Verification (`scripts/backup/db_restore_test.sh`)

- Selects the newest archive in `backups/mysql/`.
- Verifies SHA-256 and gzip integrity before importing.
- Restores into an isolated test database (`jawa_restore_test`).
- Reports the recovered table count and drops the test database automatically.
- Never touches the production database.

### Live Restore (`scripts/backup/db_restore_live.sh`)

- Interactive backup selection or an explicit archive path.
- Validates that the archive lives under `backups/mysql/`.
- Verifies SHA-256 and gzip integrity before any destructive step.
- Requires the operator to type the live database name before proceeding.
- Creates a safety backup in `backups/mysql/pre_restore/` before dropping the live database.
- Stops `ljrp-samp` and `ljrp-web` during the import, then starts the services that were previously running.
- Rolls back from the safety backup if database reset or import fails.

### CI/CD Delivery (`.github/workflows/cd.yml`)

- Compiles the Pawn gamemode in CI.
- Builds and pushes immutable `ljrp-samp` and `ljrp-web` images to GHCR.
- Deploys to the VPS over SSH with `git reset --hard`, `docker compose pull`, and `docker compose up -d --remove-orphans`.
- Preserves git-ignored runtime data such as `.env`, `scriptfiles/`, and `backups/`.

### Script Execution Notes

- The backup scripts are Bash scripts; invoke them with `./script.sh` or `bash script.sh`, not `sh`.
- The executable bit must be tracked in Git so a fresh VPS checkout or `git reset --hard` does not reset the scripts to mode `644`.
- `db_backup.sh` additionally requires `rsync`; `db_restore_live.sh` requires Docker access to the `ljrp-mysql`, `ljrp-samp`, and `ljrp-web` containers.
