# CloudSim Web UI — Design Document

## 1. Overview

This document describes the architecture, API contract, parameter set, auth model, and storage design for the CloudSim Web UI — a browser-based interface around CloudSim 7.0.1 that lets users configure and run cloud computing simulations without editing Java source files.

**Hard constraint**: `modules/cloudsim/` and `modules/cloudsim-examples/` are treated as read-only libraries. All new code lives in two new top-level additions:
- `modules/cloudsim-web/` — Spring Boot REST API that wraps CloudSim
- `web/` — React + TypeScript frontend

---

## 2. CloudSim Version & Runtime Facts

| Property | Value |
|---|---|
| CloudSim version | 7.0.1 |
| Java version | 21 |
| Build system | Maven 4.0.0 (multi-module) |
| Key deps | Guava 33, Commons Math3, Apache Commons IO |

### Static-State Constraint

CloudSim uses static global state: `CloudSim.init(numUsers, calendar, traceFlag)` reinitializes a shared event queue and entity registry. **Two simulations cannot run concurrently in the same JVM.**

**Resolution**: A `newSingleThreadExecutor` serializes all simulation `Callable`s. `POST /api/simulations` enqueues the job and immediately returns HTTP 202 with a job ID. The frontend polls `GET /api/simulations/{id}` until `status` is `COMPLETED` or `FAILED`. This is simpler and more debuggable than subprocess forking and avoids all process-management overhead.

**Log capture**: CloudSim writes to `System.out` via its `Log` class. The runner redirects `System.out` to a `ByteArrayOutputStream` for the duration of the simulation, then restores it. Log output is capped at **5 MB per run**; if the captured bytes exceed 5 MB the stored string is truncated and `"\n[log truncated]"` is appended before saving to the DB and returning in the `logs` field of `SimulationResult`.

---

## 3. Full Simulation Parameter Set

These are every knob the UI will expose, derived from reading all CloudSim core classes and Example 1–9.

### 3.1 Per Datacenter

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `name` | string | "Datacenter_0" | Unique within simulation |
| `architecture` | string | "x86" | e.g. "x86", "ARM" |
| `os` | string | "Linux" | e.g. "Linux", "Windows" |
| `vmm` | string | "Xen" | Hypervisor label |
| `timeZone` | double | 10.0 | GMT offset, −12 to +13 |
| `costPerSec` | double | 3.0 | Cost per CPU-second |
| `costPerMem` | double | 0.05 | Cost per MB RAM |
| `costPerStorage` | double | 0.001 | Cost per MB storage |
| `costPerBw` | double | 0.0 | Cost per Mbps BW |
| `schedulingInterval` | double | 0.0 | Datacenter event scheduling delay |
| `vmAllocationPolicy` | enum | SIMPLE | `SIMPLE` \| `SIMPLER` |

### 3.2 Per Host (inside each Datacenter)

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `mips` | double | 1000 | MIPS rating per PE |
| `numberOfPes` | int | 1 | Number of CPU cores |
| `ram` | int | 2048 | MB |
| `bw` | long | 10000 | Mbps |
| `storage` | long | 1000000 | MB |
| `vmScheduler` | enum | TIME_SHARED | `TIME_SHARED` \| `SPACE_SHARED` \| `TIME_SHARED_OVERSUBSCRIPTION` |

Provisioners are always `RamProvisionerSimple`, `BwProvisionerSimple`, `PeProvisionerSimple` — not user-configurable. **Verified from source**: the entire codebase (including `provisioners/`, `EX/`, `container/`, `power/`, `network/` subdirectories) contains exactly one concrete implementation per provisioner type. All three use a best-effort HashMap-backed allocation strategy with no behavioral knobs.

### 3.3 Per VM

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `mips` | double | 1000 | MIPS capacity per PE |
| `numberOfPes` | int | 1 | Number of PEs requested |
| `ram` | int | 512 | MB |
| `bw` | long | 1000 | Mbps |
| `size` | long | 10000 | MB disk image |
| `vmm` | string | "Xen" | Hypervisor label |
| `cloudletScheduler` | enum | TIME_SHARED | `TIME_SHARED` \| `SPACE_SHARED` \| `DYNAMIC_WORKLOAD` |

### 3.4 Per Cloudlet

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `length` | long | 400000 | Million instructions (MI) |
| `numberOfPes` | int | 1 | PEs required |
| `fileSize` | long | 300 | Input file size (bytes) |
| `outputSize` | long | 300 | Output file size (bytes) |
| `utilizationModelCpu` | enum | FULL | `FULL` \| `NULL` \| `STOCHASTIC` |
| `utilizationModelRam` | enum | FULL | `FULL` \| `NULL` \| `STOCHASTIC` |
| `utilizationModelBw` | enum | FULL | `FULL` \| `NULL` \| `STOCHASTIC` |
| `assignedVmId` | int? | null | Optional VM binding; null = auto-schedule |

### 3.5 Simulation Global

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `numberOfUsers` | int | 1 | Broker count |
| `simulationClock` | double | 11.0 | Passed to `CloudSim.init` |
| `traceFlag` | boolean | false | Enable CloudSim event trace logging |

### 3.6 Server-Side Input Caps

The following hard limits are enforced on `POST /api/simulations` (and `POST /api/configs`). Violations return **HTTP 400** with a JSON error body `{ "error": "<description>" }`.

| Limit | Cap | Error message |
|---|---|---|
| Datacenters per simulation | 10 | "Simulation may not exceed 10 datacenters" |
| Hosts per datacenter | 20 | "Datacenter '{name}' may not exceed 20 hosts" |
| VMs per simulation | 100 | "Simulation may not exceed 100 VMs" |
| Cloudlets per simulation | 1000 | "Simulation may not exceed 1,000 cloudlets" |

Validation is performed in a dedicated `SimulationConfigValidator` component before any CloudSim objects are constructed, so the executor queue is never touched for invalid inputs.

---

## 4. Template Presets (Example 1–9)

| ID | Name | DC | Hosts | VMs | Cloudlets | Notable |
|---|---|---|---|---|---|---|
| `example1` | Basic — 1 VM, 1 Cloudlet | 1 | 1 | 1 | 1 | Simplest case |
| `example2` | 2 VMs, bound cloudlets | 1 | 1 | 2 | 2 | Explicit VM binding |
| `example3` | Heterogeneous VMs | 1 | 2 | 2 | 2 | Different MIPS per VM |
| `example4` | Multi-datacenter | 2 | 1 each | 2 | 2 | SpaceShared VM scheduler |
| `example5` | Multi-broker | 2 | 1 each | 2 | 2 | Two separate users |
| `example6` | Scale — 20 VMs | 2 | 4+2 | 20 | 40 | Bulk generation |
| `example7` | Dynamic broker at t=200 | 2 | quad+dual | 10 | 20 | Pause/resume |
| `example8` | GlobalBroker | 2 | quad+dual | 10 | 20 | Runtime broker creation |
| `example9` | Scheduler comparison | 1 | 2 | 2 | 6 | TimeShared vs SpaceShared |
| `blank` | Custom | — | — | — | — | Empty form |

---

## 5. Architecture

```
┌───────────────────────────────────┐          HTTP/JSON (port 8080)
│  React Frontend  (web/)           │ ◄──────────────────────────────►
│  Vite + TypeScript + Tailwind CSS │                                  │
│  shadcn/ui + lucide-react icons   │                            ┌─────┴──────────────────────────────┐
│  TanStack Query (server state)    │                            │  Spring Boot 3.x  (port 8080)      │
│  React Router (navigation)        │                            │  modules/cloudsim-web/              │
│  react-hook-form + zod (forms)    │                            │                                    │
│  Recharts (charts)                │                            │  Spring Security — JWT httpOnly    │
│  Zustand (client state)           │                            │  cookie auth                       │
└───────────────────────────────────┘                            │                                    │
                                                                 │  Spring Data JPA → SQLite          │
                                                                 │                                    │
                                                                 │  SimulationRunner                  │
                                                                 │  (SingleThreadExecutor)            │
                                                                 │     ↓                              │
                                                                 │  CloudSim 7.0.1 (local dep)        │
                                                                 └────────────────────────────────────┘
```

### Package layout (`modules/cloudsim-web/src/main/java/org/cloudbus/cloudsim/web/`)

```
CloudSimWebApplication.java
auth/
  AuthController.java
  AuthService.java
  JwtUtil.java
  User.java              (JPA entity)
  UserRepository.java
simulation/
  SimulationController.java
  SimulationService.java
  SimulationRunner.java        ← wraps CloudSim.init + startSimulation; captures + caps logs
  SimulationMapper.java        ← SimulationConfigDto → CloudSim objects (TESTED)
  SimulationConfigValidator.java  ← enforces DC/host/VM/cloudlet caps, throws 400
  SimulationRun.java           (JPA entity)
  SimulationRunRepository.java
config/
  SecurityConfig.java
  ExecutorConfig.java     ← declares the single-threaded ExecutorService bean
  WebMvcConfig.java       ← CORS
model/
  SimulationConfigDto.java
  SimulationResultDto.java
  SimulationSummaryDto.java
  DatacenterConfigDto.java
  HostConfigDto.java
  VmConfigDto.java
  CloudletConfigDto.java
  CloudletResultDto.java
templates/
  TemplateService.java    ← returns hardcoded Example 1–9 SimulationConfigDto defaults
  SavedConfig.java        (JPA entity)
  SavedConfigRepository.java
  SavedConfigController.java
```

---

## 6. API Contract

All endpoints are under `/api`. Auth state is carried in an `httpOnly; SameSite=Strict` cookie named `access_token`.

### 6.1 Auth

```
POST /api/auth/register
  Body:    { "email": string, "password": string }
  Returns: 201  { "userId": long, "email": string }
  Errors:  409 if email already taken

POST /api/auth/login
  Body:    { "email": string, "password": string }
  Returns: 200  { "userId": long, "email": string }
           Sets-Cookie: access_token=<JWT>; HttpOnly; SameSite=Strict; Path=/
  Errors:  401 on bad credentials
           429 when rate-limited (see §7 for lockout policy)

POST /api/auth/logout
  Returns: 204
           Clears-Cookie: access_token

GET /api/auth/me
  Returns: 200  { "userId": long, "email": string }
  Errors:  401 if not authenticated
```

### 6.2 Templates

```
GET /api/templates
  Returns: 200  [{ "id": string, "name": string, "description": string }]

GET /api/templates/{id}
  Returns: 200  SimulationConfig  (full default parameter object)
  Errors:  404 if unknown id
```

### 6.3 Simulations

```
POST /api/simulations
  Auth:    required
  Body:    SimulationConfig
  Returns: 202  { "simulationId": long, "status": "QUEUED" }

GET /api/simulations
  Auth:    required
  Returns: 200  [SimulationSummary]   (user's runs, newest first)

GET /api/simulations/{id}
  Auth:    required
  Returns: 200  SimulationResult
  Errors:  403 if not owned by caller, 404 if not found

  Polling: frontend uses TanStack Query with
    refetchInterval: (query) =>
      query.state.data?.status === 'COMPLETED' ||
      query.state.data?.status === 'FAILED' ? false : 1000
  This polls every 1 s while status is QUEUED or RUNNING, and stops
  automatically on terminal states.
```

### 6.4 Saved Configs

```
POST /api/configs
  Auth:    required
  Body:    { "name": string, "config": SimulationConfig }
  Returns: 201  { "configId": long }

GET /api/configs
  Auth:    required
  Returns: 200  [{ "configId": long, "name": string, "createdAt": string }]

GET /api/configs/{id}
  Auth:    required
  Returns: 200  SimulationConfig

DELETE /api/configs/{id}
  Auth:    required
  Returns: 204
  Errors:  403 if not owned by caller
```

### 6.5 JSON Shapes

**SimulationConfig**
```json
{
  "templateId": "example1",
  "name": "My first sim",
  "datacenters": [
    {
      "name": "DC_0",
      "architecture": "x86",
      "os": "Linux",
      "vmm": "Xen",
      "timeZone": 10.0,
      "costPerSec": 3.0,
      "costPerMem": 0.05,
      "costPerStorage": 0.001,
      "costPerBw": 0.0,
      "schedulingInterval": 0.0,
      "vmAllocationPolicy": "SIMPLE",
      "hosts": [
        {
          "mips": 1000,
          "numberOfPes": 1,
          "ram": 2048,
          "bw": 10000,
          "storage": 1000000,
          "vmScheduler": "TIME_SHARED"
        }
      ]
    }
  ],
  "vms": [
    {
      "mips": 1000,
      "numberOfPes": 1,
      "ram": 512,
      "bw": 1000,
      "size": 10000,
      "vmm": "Xen",
      "cloudletScheduler": "TIME_SHARED"
    }
  ],
  "cloudlets": [
    {
      "length": 400000,
      "numberOfPes": 1,
      "fileSize": 300,
      "outputSize": 300,
      "utilizationModelCpu": "FULL",
      "utilizationModelRam": "FULL",
      "utilizationModelBw": "FULL",
      "assignedVmId": null
    }
  ],
  "simulationClock": 11.0,
  "traceFlag": false
}
```

**SimulationResult**
```json
{
  "id": 42,
  "name": "My first sim",
  "status": "COMPLETED",
  "createdAt": "2026-04-22T10:00:00Z",
  "completedAt": "2026-04-22T10:00:01Z",
  "config": { /* SimulationConfig as submitted */ },
  "summary": {
    "totalCloudlets": 1,
    "completedCloudlets": 1,
    "makespan": 400.0,
    "avgExecTime": 400.0
  },
  "cloudlets": [
    {
      "id": 0,
      "status": "SUCCESS",
      "datacenterId": 2,
      "vmId": 0,
      "submissionTime": 0.1,
      "startTime": 0.1,
      "finishTime": 400.1,
      "execTime": 400.0,
      "waitingTime": 0.0,
      "actualCpuTime": 400.0,
      "cpuCostRate": 3.0,
      "cpuCost": 1200.0,
      "bwCost": 0.0,
      "totalCost": 1200.0
    }
  ],
  "logs": "Starting CloudSim version 7.0.1\n...",
  "logsTruncated": false
}
```

**Cost field notes** (important for `SimulationMapper`):
- All cost fields are **derived by the CloudSim engine at runtime** — they are not constructor inputs on `Cloudlet`. The `Datacenter` stamps each submitted cloudlet via `cloudlet.setResourceParameter(datacenterId, costPerSecond, costPerBw)`, drawing rates from `DatacenterCharacteristics`.
- `cpuCostRate` ← `cloudlet.getCostPerSec()` (the $/sec rate stamped by the datacenter)
- `actualCpuTime` ← `cloudlet.getActualCPUTime()` = `finishTime − startTime`
- `cpuCost` = `cpuCostRate × actualCpuTime` (computed in mapper)
- `bwCost` ← `cloudlet.getProcessingCost()` = `costPerBw × (fileSize + outputSize)` (BW transfer costs only; CPU not included — CloudSim's API)
- `totalCost` = `cpuCost + bwCost` (computed in mapper)

**`logs` field notes**:
- Capped at **5 MB**. If captured output exceeds 5 MB the stored string is truncated and `"\n[log truncated]"` is appended.
- `logsTruncated: true` is set in the DTO when truncation occurred, so the UI can show a notice.

**SimulationSummary**
```json
{
  "id": 42,
  "name": "My first sim",
  "status": "COMPLETED",
  "createdAt": "2026-04-22T10:00:00Z",
  "templateId": "example1",
  "totalCloudlets": 1,
  "completedCloudlets": 1,
  "makespan": 400.0
}
```

---

## 7. Auth Model

| Concern | Decision |
|---|---|
| Credential storage | bcrypt (cost 12) via Spring Security's `BCryptPasswordEncoder` |
| Session token | JWT (HS256, 256-bit secret from env), **8-hour expiry** |
| Transport | `httpOnly; Secure; SameSite=Strict` cookie named `access_token` — never in `localStorage` |
| CSRF | `SameSite=Strict` provides primary protection; `Origin` header validated on all non-GET endpoints as belt-and-suspenders |
| Route guards | Frontend: `GET /api/auth/me` used as auth probe via TanStack Query; `<RequireAuth>` wrapper redirects unauthenticated users to `/login` |
| Refresh | Single 8-hour access token; no refresh token needed at this scale |
| Login rate limit | **Bucket4j** in-process rate limiter: 5 failed login attempts per email address within any 5-minute window → HTTP 429 with `Retry-After` header set to remaining lockout seconds. The bucket is keyed on normalised email; it refills after 5 minutes. Successful logins do not consume the bucket. |

---

## 8. Storage

**Database**: SQLite via `spring-boot-starter-data-jpa` + `xerial/sqlite-jdbc`. Zero external dependencies for local dev. To switch to Postgres: change `spring.datasource.*` and add the Postgres driver — no schema changes required.

**Schema**:

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE simulation_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  name         TEXT NOT NULL,
  template_id  TEXT,
  status       TEXT NOT NULL DEFAULT 'QUEUED',  -- QUEUED | RUNNING | COMPLETED | FAILED
  config_json  TEXT NOT NULL,
  result_json  TEXT,
  logs         TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  completed_at TEXT
);

CREATE TABLE saved_configs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

`config_json` and `result_json` store the full DTO blobs. At simulation scale (at most hundreds of cloudlets per run) there is no query-performance reason to normalise further.

**Seed data** (`data.sql`, runs on first startup):
- Demo user: `demo@cloudsim.local` / `demo1234`
- One saved config: Example 1 default parameters

---

## 9. Frontend Pages

| Route | Page | Purpose |
|---|---|---|
| `/login` | Auth | Sign-in form |
| `/register` | Auth | Sign-up form |
| `/` | Dashboard | Run history, quick stats, "New Simulation" button |
| `/simulations/new` | NewSimulation | Multi-section config form with template picker |
| `/simulations/:id` | SimulationResult | Per-cloudlet table, Gantt chart, bar/pie charts, raw logs |
| `/configs` | SavedConfigs | List of saved configs, load/delete |

All routes except `/login` and `/register` are wrapped in `<RequireAuth>`.

### NewSimulation form sections
1. **Template** — pill-select for Example 1–9 or Blank; loads defaults into form
2. **Datacenters** — add/remove datacenters; each expands to show hosts (add/remove hosts within each DC)
3. **VMs** — add/remove VMs; "Generate N copies" bulk action
4. **Cloudlets** — add/remove cloudlets; "Generate N copies" bulk action; optional VM binding
5. **Policies & Global** — allocation policy, scheduler choices, simulation clock, trace flag

### SimulationResult components
- Summary cards: total cloudlets, completed, makespan, avg exec time
- Cloudlet table: sortable/filterable, columns = id, status, DC, VM, start, finish, exec time, wait, cost
- Gantt chart (Recharts): x=time, y=VM lane, bar per cloudlet coloured by status
- Bar chart: exec time per cloudlet
- Pie chart: cloudlet count per datacenter
- Log viewer: collapsible `<pre>` with monospace font; shows a yellow "Log output was truncated" banner when `logsTruncated: true`
- Export: CSV and JSON download buttons
- **"Save as config" button**: visible once status is `COMPLETED`. On click, opens a small inline prompt for a config name, then `POST /api/configs` with `{ name, config: result.config }`. Uses the same `/api/configs` endpoint as the SavedConfigs page — no new endpoint. Shows a toast on success.

---

## 10. Project Layout

```
<repo-root>/
  modules/
    cloudsim/                 # UNCHANGED
    cloudsim-examples/        # UNCHANGED
    cloudsim-web/             # NEW — Spring Boot service
      pom.xml
      src/main/java/org/cloudbus/cloudsim/web/
      src/main/resources/application.properties
      src/main/resources/data.sql
      src/test/java/...
  web/                        # NEW — React frontend
    src/
      pages/
      components/
      hooks/
      lib/
    package.json
    vite.config.ts
    tailwind.config.ts
    tsconfig.json
  docs/
    DESIGN.md                 # this file
  README-WEB.md
  docker-compose.yml
  pom.xml                     # parent — add cloudsim-web to <modules>
```

---

## 11. Build & Run (Summary)

```bash
# Backend
mvn -pl modules/cloudsim-web -am package
java -jar modules/cloudsim-web/target/cloudsim-web-*.jar
# → http://localhost:8080

# Frontend
cd web && npm install && npm run dev
# → http://localhost:5173  (proxies /api/* to :8080)

# Original examples — still work unchanged
mvn exec:java -pl modules/cloudsim-examples/ \
  -Dexec.mainClass=org.cloudbus.cloudsim.examples.CloudSimExample1
```

Full details including Docker Compose in `README-WEB.md`.

---

## 12. Testing Strategy

| Layer | What is tested | Tool |
|---|---|---|
| `SimulationMapper` | JSON config → correct CloudSim object field values | JUnit 5 |
| `TemplateService` | Each template returns a valid, parseable config | JUnit 5 |
| `AuthService` | Register, login, duplicate-email error | JUnit 5 + H2 |
| Frontend forms | Form validation, field defaults, template loading | Vitest + Testing Library |
| E2E | Not in scope for initial build | — |

The `SimulationMapper` unit tests are the highest-value tests: they catch mapping bugs (wrong field order in constructors, off-by-one PE counts, etc.) before any CloudSim execution is attempted.
