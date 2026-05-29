# Deployment Configuration

This document explains how to configure the GitHub Secrets required for the CI/CD pipelines to work.

## Required GitHub Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add the following secrets:

---

### `RENDER_DEPLOY_HOOK_URL`

The webhook URL that triggers a re-deploy on Render.com.

**How to obtain it:**
1. Log in to [Render](https://render.com) and open your backend service.
2. Go to **Settings** → scroll down to **Deploy Hook**.
3. Copy the full webhook URL (format: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`).

---

### `NETLIFY_AUTH_TOKEN`

A personal access token used by the Netlify CLI to authenticate.

**How to obtain it:**
1. Log in to [Netlify](https://app.netlify.com).
2. Go to **User Settings** → **Applications** → **Personal access tokens**.
3. Click **New access token**, give it a name, and copy the generated token.

---

### `NETLIFY_SITE_ID`

The unique identifier of your Netlify site.

**How to obtain it:**
1. Open your site in the Netlify dashboard.
2. Go to **Site configuration** → **General**.
3. Copy the **Site ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

---

## Pipeline Overview

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | Push or PR to `main` | `backend-ci`, `frontend-ci` (parallel) |
| `deploy.yml` | Push to `main` | `deploy-backend` (Render webhook), `deploy-frontend` (Netlify CLI) |

> **Note:** The deploy workflow runs in parallel with CI. If you want deploys to block on CI passing, add `needs: [backend-ci, frontend-ci]` to the deploy jobs and merge both workflows, or use a `workflow_run` trigger pointing to the CI workflow.
