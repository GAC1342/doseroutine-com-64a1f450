# Required status checks

The `pre-deploy` workflow is the gate that keeps broken builds out of production. This document explains how to enforce it.

## What is required

Two things must be true for the gate to be effective:

1. **GitHub must block merges to `main` when `pre-deploy` fails.**
2. **You must run `pre-deploy` manually before clicking Publish in Lovable.**

## 1. Make `pre-deploy` required in GitHub

These steps are done in the GitHub web UI. They cannot be committed as code.

1. Open the repository on GitHub.
2. Go to **Settings > Branches** (or **Rules > Rulesets** if you prefer the new rulesets UI).
3. Under **Branch protection rules**, click **Add rule**.
4. In **Branch name pattern**, enter: `main`
5. Enable these options:
   - **Require a pull request before merging** (recommended)
   - **Require status checks to pass before merging**
6. In the status checks search box, type `pre-deploy`.
7. Select the job named **pre-deploy**.
8. Save the rule.

After this, every pull request to `main` must pass the `pre-deploy` check before it can be merged. The check runs automatically because `.github/workflows/pre-deploy.yml` already triggers on `pull_request` to `main`.

## 2. Run the gate before every Lovable Publish

Lovable publishes from the `main` branch. Before you click **Publish** or **Update** in Lovable:

1. Go to **Actions > pre-deploy** in GitHub.
2. Click **Run workflow**.
3. Leave the default preview URL unless you want to re-verify production.
4. Wait for the green checkmark.
5. Only then click Publish in Lovable.

If `pre-deploy` fails, do not publish. Fix the failure first.

## Why this matters

The `pre-deploy` workflow catches the four failure modes that have broken deployments in the past:

- `package-lock.json` is out of sync with `package.json` (`npm ci` fails)
- the production build does not compile
- the deployed-marker contract is malformed
- the staging/preview deployment is missing required markers

Making it required means these failures cannot reach `main` through a pull request, and running it manually before Publish means they are caught before the live site is updated.

## Troubleshooting

### The required check does not appear in the branch protection dropdown

Status checks only appear after the workflow has run at least once. Open a test pull request or trigger the workflow manually via **Actions > pre-deploy > Run workflow**. After it runs, the check will be selectable in the branch protection rule.

### Lovable Publish does not wait for the check

Lovable Publish is independent of GitHub status checks. The check protects the `main` branch from broken code being merged; you must still run the workflow manually before publishing. If your project uses a custom publish flow tied to GitHub Actions, add `needs: pre-deploy` to the publish job so it cannot run until the gate passes.
