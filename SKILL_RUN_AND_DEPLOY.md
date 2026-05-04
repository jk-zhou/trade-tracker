# Skill: Run & Deploy Trade Tracker

This skill provides step-by-step instructions for an AI agent to run the Trade Tracker application locally for development, or build and deploy it as a Docker container.

## Prerequisites

- **Project root**: The directory containing this file (`SKILL_RUN_AND_DEPLOY.md`). All commands below assume you are running them from the project root.
- **Runtime**: Node.js 20+, npm
- **Docker** (for deployment only): Docker CLI available on the host

---

## Option A: Run Locally (Development)

Execute these commands **in order**. Stop and report errors if any step fails.

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Set up the database

The app uses SQLite via Prisma. The DATABASE_URL must point to a local file:

```bash
DATABASE_URL="file:./dev.db" npx prisma generate && DATABASE_URL="file:./dev.db" npx prisma db push
```

### Step 3 — Start the dev server

First, ensure port 3000 is free. If a previous dev server is still running, kill it:

```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null; echo "Port 3000 cleared"
```

Then start:

```bash
DATABASE_URL="file:./dev.db" npx next dev --hostname 0.0.0.0
```

The app will be available at **http://localhost:3000** and from other devices on the LAN at **http://<host-ip>:3000**.

> **⚠️ IMPORTANT**: The first page load in dev mode triggers compilation + Yahoo Finance API calls, which can take **60-90 seconds**. The browser will appear to hang — this is normal. Subsequent loads will be fast (~400ms).

### Step 4 — Verify

Open a browser to `http://localhost:3000` and **wait up to 90 seconds** for the first load to compile. Once loaded, confirm the dashboard shows positions and market data.

> **Note on LAN access**: You can access this dev server via `http://<host-ip>:3000`. However, you may see WebSocket connection errors in the console because Next.js dev mode (Turbopack) struggles with LAN HMR. If you just want to *use* the app on your LAN, **Option A.5 (Local Production)** is highly recommended instead.

---

## Option A.5: Run Locally (Production Mode) - Recommended for LAN

If you are not actively editing code and just want to use the app over your local network, run the production build. This is **much faster** and avoids the WebSocket/HMR bugs.

```bash
DATABASE_URL="file:./dev.db" npm run build
DATABASE_URL="file:./dev.db" npx next start --hostname 0.0.0.0
```

The app will instantly be available at **http://<host-ip>:3000**.

### Step 1 — Build the Docker image

```bash
docker build -t trade-tracker:latest .
```

This is a multi-stage build (deps → builder → runner). It typically takes 1-3 minutes.

### Step 2 — Run the container

**CRITICAL**: You MUST map `/app/data` to a persistent host directory, otherwise all transaction data will be lost when the container restarts.

```bash
docker run -d \
  --name trade-tracker \
  -p 3000:3000 \
  -v /mnt/user/appdata/trade-tracker:/app/data \
  --restart unless-stopped \
  trade-tracker:latest
```

> For Unraid users: the host path is typically `/mnt/user/appdata/trade-tracker`.
> For other systems: replace with any persistent directory you prefer.

### Step 3 — Verify deployment

```bash
docker logs trade-tracker --tail 20
```

Expected output should show:
```
Applying database migrations to /app/data/trade-tracker.db...
Starting Trade Tracker...
```

Then confirm the app is accessible at **http://<host-ip>:3000**.

### Step 4 — Push to Docker Hub (optional)

If you want to push the image to a registry for use on another machine:

```bash
docker tag trade-tracker:latest <dockerhub-username>/trade-tracker:latest
docker push <dockerhub-username>/trade-tracker:latest
```

---

## Option C: Update & Redeploy (existing Docker deployment)

When code changes have been made and you need to redeploy:

```bash
docker build -t trade-tracker:latest . && \
  docker stop trade-tracker && \
  docker rm trade-tracker && \
  docker run -d \
    --name trade-tracker \
    -p 3000:3000 \
    -v /mnt/user/appdata/trade-tracker:/app/data \
    --restart unless-stopped \
    trade-tracker:latest
```

Data is preserved because the SQLite database lives on the mapped host volume, not inside the container.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Environment variable not found: DATABASE_URL` | Missing env var | Prefix commands with `DATABASE_URL="file:./dev.db"` (local) or check Dockerfile ENV (Docker) |
| Page loads but shows "Something went wrong" | Yahoo Finance API timeout or rate limit | Wait 30 seconds and refresh; the error boundary has a retry button |
| `prisma db push` fails with schema error | Schema change may be incompatible | Check `prisma/schema.prisma` for syntax errors, then retry |
| Container starts but port 3000 is not reachable | Port conflict | Check `docker ps` and ensure no other container uses port 3000 |
| Database file permissions error in Docker | Volume ownership mismatch | Ensure the host directory is writable: `chmod 777 /mnt/user/appdata/trade-tracker` |
| `WebSocket connection to ... failed` in dev mode | Next.js Turbopack LAN bug | Ignore it (it only affects auto-reload) or use **Option A.5** (Production mode) instead. |
| Cannot click tabs / Page unresponsive | Invisible Dev Overlay blocking clicks | Check console for warnings. Restart server. Use **Option A.5** to avoid dev overlays. |
