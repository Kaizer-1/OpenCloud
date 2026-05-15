# CloudSim Web UI

A browser-based interface for [CloudSim 7.0.1](https://github.com/Cloudslab/cloudsim) that lets you configure and run cloud computing simulations without editing Java source files.

---

## Architecture

```
web/              React + TypeScript frontend  (Vite, Tailwind, shadcn/ui, TanStack Query)
modules/
  cloudsim/       CloudSim core — read-only, never modified
  cloudsim-web/   Spring Boot 3.x REST API wrapping CloudSim
```

The backend serializes simulation runs via a single-threaded executor (CloudSim uses static global state and cannot run concurrently). `POST /api/simulations` returns HTTP 202 immediately; the frontend polls until `COMPLETED` or `FAILED`.

---

## Quick Start (local dev)

### Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ |
| Maven | 4.0+ |
| Node.js | 20+ |

### 1 — Build and run the backend

```bash
# From repo root
mvn -pl modules/cloudsim-web -am package -DskipTests
java -jar modules/cloudsim-web/target/cloudsim-web-*.jar
```

The API starts on **http://localhost:8080**. A SQLite database file `cloudsim.db` is created in the working directory on first run.

A demo user is seeded automatically:
- **Email**: `demo@cloudsim.local`
- **Password**: `demo1234`

### 2 — Run the frontend

```bash
cd web
npm install
npm run dev
```

The UI starts on **http://localhost:5173**.

### 3 — Open the app

Navigate to [http://localhost:5173](http://localhost:5173), log in with the demo credentials, and run a simulation.

---

## Docker (single-container backend)

```bash
docker compose up --build
```

The API is available at **http://localhost:8080**. Then run the frontend as above (or serve the built assets).

To build the frontend for production and have it served by the Spring Boot app, copy the `web/dist/` output into `modules/cloudsim-web/src/main/resources/static/` before packaging.

---

## Running the original CloudSim examples

The `cloudsim/` module is untouched. All 9 original examples still run:

```bash
mvn exec:java -pl modules/cloudsim-examples \
  -Dexec.mainClass=org.cloudbus.cloudsim.examples.CloudSimExample1
```

---

## Running tests

```bash
# Backend (Spring Boot + auth + mapper tests)
mvn -pl modules/cloudsim-web test

# Frontend type check
cd web && npx tsc --noEmit
```

---

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, sets `access_token` cookie |
| POST | `/api/auth/logout` | — | Clear cookie |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/templates` | — | List 9 example presets + blank |
| GET | `/api/templates/{id}` | — | Get preset config |
| POST | `/api/simulations` | ✓ | Submit simulation (returns 202) |
| GET | `/api/simulations` | ✓ | List user's simulations |
| GET | `/api/simulations/{id}` | ✓ | Poll result |
| POST | `/api/configs` | ✓ | Save a config |
| GET | `/api/configs` | ✓ | List saved configs |
| GET | `/api/configs/{id}` | ✓ | Load a saved config |
| DELETE | `/api/configs/{id}` | ✓ | Delete a saved config |

Full JSON shapes are in [`docs/DESIGN.md`](docs/DESIGN.md).

---

## Input limits

| Resource | Cap |
|----------|-----|
| Datacenters | 10 |
| Hosts per datacenter | 20 |
| VMs | 100 |
| Cloudlets | 1 000 |

Exceeding a cap returns HTTP 400.
