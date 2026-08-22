#!/usr/bin/env node
/**
 * Final pre-submission smoke against a PRODUCTION build.
 *
 * Dev-only overlays, React dev warnings and HMR chatter only disappear in a
 * production bundle, so "no debug banners / no console logging" can only be
 * proven here — not against `vite dev`.
 *
 * Steps: build (unless --no-build) -> serve the build -> run
 * e2e/prod-crash-free-smoke.spec.ts against it -> tear the server down.
 */
import { spawn, spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";

const PORT = Number(process.env["PROD_SMOKE_PORT"] ?? 4173);
const BASE_URL = `http://localhost:${PORT}`;
const skipBuild = process.argv.includes("--no-build");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

if (!skipBuild) {
  console.log("> building production bundle");
  run("npx", ["vite", "build"]);
}

// The worker reads server env (Supabase, Lovable API key, …) from bindings.
// Wrangler picks those up from dist/.dev.vars — generated here from the
// current process env so nothing secret is ever printed or committed.
const SERVER_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_ID",
  "LOVABLE_API_KEY",
];
const devVars = SERVER_ENV_KEYS.filter((k) => process.env[k]).map(
  (k) => `${k}=${JSON.stringify(process.env[k])}`,
);
writeFileSync("dist/.dev.vars", `${devVars.join("\n")}\n`);

console.log(`> serving production build on ${BASE_URL}`);
// The Vite build targets a Cloudflare Worker (nitro `cloudflare-module`), so
// `vite preview` cannot serve it — wrangler runs the emitted worker locally.
const server = spawn(
  "npx",
  ["wrangler", "--cwd", "dist", "dev", "--port", String(PORT), "--local"],
  { stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
);

let exitCode = 1;
try {
  if (!(await waitForServer(BASE_URL))) {
    console.error("production preview server never became ready");
  } else {
    const res = spawnSync(
      "npx",
      [
        "playwright",
        "test",
        "e2e/prod-crash-free-smoke.spec.ts",
        // Default covers both engines; PROD_SMOKE_PROJECTS narrows it on
        // machines that only have one browser installed.
        ...(process.env["PROD_SMOKE_PROJECTS"] ?? "chromium,mobile-safari")
          .split(",")
          .filter(Boolean)
          .map((p) => `--project=${p.trim()}`),
        "--reporter=list",
      ],
      { stdio: "inherit", env: { ...process.env, PLAYWRIGHT_BASE_URL: BASE_URL } },
    );
    exitCode = res.status ?? 1;
  }
} finally {
  server.kill("SIGTERM");
  rmSync("dist/.dev.vars", { force: true });
}

process.exit(exitCode);
