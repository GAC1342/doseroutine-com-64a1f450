# Kubernetes-style Health Probes (staged, not active)

These three files are forward-compatible health probe endpoints in case
DoseRoutine is ever migrated off Cloudflare Workers onto Kubernetes (or any
orchestrator that expects startup / liveness / readiness probes).

They are **not wired up right now** — they live outside `src/routes/` so
the TanStack Router file-based routing plugin does not pick them up and
no URLs are exposed until you move them.

## What each probe does

- **startup.ts** → `/api/public/health/startup`
  Returns 200 once the process has finished booting (env vars present,
  build id known). Orchestrators wait for this before running the other
  probes so a slow cold start isn't mistaken for a dead container.

- **live.ts** → `/api/public/health/live`
  Returns 200 as long as the process itself is responsive. Does NOT
  check downstream services — a downstream outage should not cause the
  orchestrator to restart your container.

- **ready.ts** → `/api/public/health/ready`
  Returns 200 only when the app can actually serve traffic (DB + auth
  reachable). Returns 503 when a dependency is down so the orchestrator
  stops routing traffic to this pod without killing it.

## How to activate later

1. Move all three files into `src/routes/api/public/health/` (create the
   folder) **and rename them from `.ts.txt` to `.ts`**. The router
   plugin auto-registers them on the next build. They're stored with a
   `.ts.txt` extension here so TypeScript ignores them until you're
   ready — `createFileRoute` types only resolve for files that live
   under `src/routes/`.
2. Point your orchestrator's probes at the three URLs above.
3. Leave `/api/public/status` in place — it's the rich human-readable
   dashboard; these three are cheap machine checks.

No code changes needed on activation; the `createFileRoute` paths inside
each file already match their final location.
