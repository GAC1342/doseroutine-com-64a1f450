# Dependency Update Tooling: Dependabot vs Renovate

Both tools run in parallel so you can compare behavior over ~2–4 weeks, then
disable the loser.

## What's configured

| Concern                  | Dependabot                            | Renovate                                       |
| ------------------------ | ------------------------------------- | ---------------------------------------------- |
| Config file              | `.github/dependabot.yml`              | `renovate.json` (repo root)                    |
| Schedule                 | Security: immediate; minor: weekly    | Weekly (Mon before 6am ET) + immediate CVEs    |
| Grouping                 | Basic (by ecosystem)                  | Rich (React / TanStack / Supabase / Capacitor) |
| Auto-merge patch + minor | Yes (via `dependabot-auto-merge.yml`) | Yes (native `platformAutomerge`)               |
| Major version bumps      | Opens PR, no auto-merge               | Opens PR, no auto-merge, labeled               |
| Lockfile maintenance     | No                                    | Yes (weekly `bun install` refresh)             |
| GitHub Actions pinning   | No                                    | Yes (SHA-pinned)                               |
| Vulnerability source     | GitHub Advisory DB                    | GitHub Advisory + OSV                          |
| Dashboard issue          | No                                    | Yes (single issue tracks all pending updates)  |

## To enable Renovate

1. Install the **Renovate GitHub App** on this repo:
   https://github.com/apps/renovate
2. Renovate opens an onboarding PR — merge it (config already committed).
3. Watch the **Dependency Dashboard** issue Renovate creates.

## What to compare

- **PR noise** — how many PRs per week, how well grouped
- **Time-to-merge** — do auto-merged PRs land cleanly, or do they break CI
- **Coverage** — does either tool miss transitive vulns the other catches
- **Major-bump quality** — release notes, changelog links, migration hints

## After the trial

Delete the losing tool's config:

- **Keep Dependabot** → remove `renovate.json`, uninstall Renovate app
- **Keep Renovate** → delete `.github/dependabot.yml` and
  `.github/workflows/dependabot-auto-merge.yml`
