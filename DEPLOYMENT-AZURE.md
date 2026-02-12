# Deploy EMC Sales Cockpit to Azure

This guide covers deploying the Next.js app to **Azure App Service (Web App)** and optional CI/CD with GitHub Actions.

**Official reference:** [Deploy to Azure App Service by using GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?tabs=openid%2Cnodejs#add-the-workflow-file-to-your-github-repository) (Microsoft Learn)

---

## 1. Azure resources to create

Use **Azure App Service** so the app can run Node.js and use server-side features (SSR, Server Actions, API routes).

| Resource | Purpose |
|----------|---------|
| **Resource Group** | Container for all resources (e.g. `rg-emc-sales-cockpit`) |
| **App Service Plan** | Compute for the app (Linux, e.g. B1 or P1v2) |
| **Web App** | The actual app (Node.js 22 LTS) |

Optional: **Application Insights** for monitoring.

---

## 2. Create resources (Azure Portal)

### 2.1 Resource Group

1. Portal → **Resource groups** → **Create**
2. Name: `rg-emc-sales-cockpit` (or your choice)
3. Region: e.g. **West Europe**
4. **Review + create** → **Create**

### 2.2 Web App (creates App Service Plan automatically)

1. Portal → **Create a resource** → **Web App**
2. **Basics**
   - **Subscription**: your subscription
   - **Resource group**: `rg-emc-sales-cockpit`
   - **Name**: `emc-sales-cockpit` (or unique name; becomes `emc-sales-cockpit.azurewebsites.net`)
   - **Publish**: Code
   - **Runtime stack**: **Node 22 LTS**
   - **Operating system**: Linux
   - **Region**: same as resource group (e.g. West Europe)
   - **Pricing**: **Basic B1** (or **Premium P1v2** for staging slots)
3. **Review + create** → **Create**

---

## 3. Configure the Web App

### 3.1 Application settings (environment variables)

In the Web App → **Settings** → **Configuration** → **Application settings**, add:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-app-name>.azurewebsites.net` | Required for auth redirects and metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Required |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | If using admin/server features |
| `NODE_ENV` | `production` | Set automatically on deploy; can set explicitly |

Optional (depending on features):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_CUSTOMER_SEARCH_URL` | Customer search tool URL (e.g. office URL) |
| `NEXT_PUBLIC_ANALYTICS_URL` | Analytics tool URL |
| `OPENAI_API_KEY` | If using OpenAI in email gen |
| `LANGDOCK_API_KEY` | If using Langdock |
| `DEEPGRAM_API_KEY` | If using voice/transcription |
| `METABASE_SITE_URL` | If using Metabase dashboards |
| `METABASE_SECRET_KEY` | Metabase embed secret |

Mark **NEXT_PUBLIC_*** variables as "Slot setting" if you use deployment slots. Save the configuration.

### 3.2 General settings

- **Configuration** → **General settings**:
  - **Startup Command**: `npm run start` (required when deploying a pre-built app from GitHub Actions)
  - **Always On**: On (recommended for Basic and above to avoid cold starts)
- **Configuration** → **Application settings** (if using GitHub Actions deploy):
  - Add **SCM_DO_BUILD_DURING_DEPLOYMENT** = `false` so Azure does not run its own build and uses your artifact as-is

### 3.3 Build and run (important for Next.js)

App Service will run `npm install` and can run `npm run build` + `npm run start` if you configure it:

- Either deploy a **pre-built** app (build on CI and deploy the `.next` + `node_modules` or a zip),  
- Or use **Oryx** build: set **Configuration** → **General settings** → **Startup Command** to:

  ```bash
  npm run build && npm run start
  ```

  and ensure the app is deployed with source (e.g. ZIP with `package.json` and no pre-built `.next`).  

For predictable builds, the recommended approach is **build in GitHub Actions** and deploy the artifact (see section 5).

---

## 4. Deploy from your machine (one-time or manual)

### Option A: Azure CLI + ZIP deploy

```bash
# Login
az login

# Build locally (Node 22)
npm ci
npm run build

# Create deploy package (next, public, package.json, node_modules)
# On Windows (PowerShell): compress the needed files into a zip
# On Linux/macOS:
cd .next && zip -r ../next.zip . && cd ..
zip -r deploy.zip next.zip public package.json package-lock.json
# Add node_modules if you want to avoid install on Azure, or omit and use startup command to run npm install

# Deploy (replace <app-name> and <resource-group>)
az webapp deploy --resource-group <resource-group> --name <app-name> --src-path deploy.zip --type zip
```

Simpler approach: deploy **source** and let Azure build (slower, less control):

```bash
az webapp up --resource-group rg-emc-sales-cockpit --name emc-sales-cockpit --runtime "NODE:22-lts" --plan <your-plan-name>
```

### Option B: VS Code

1. Install **Azure App Service** extension
2. Sign in to Azure
3. Right-click the Web App → **Deploy to Web App** and follow the steps (deploy from folder; build can be done on Azure or locally first)

---

## 5. Deploy with GitHub Actions (recommended)

A workflow is provided to build the Next.js app and deploy to Azure App Service. It follows the [official Microsoft guidance](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?tabs=openid%2Cnodejs#add-the-workflow-file-to-your-github-repository): for Node.js/TypeScript apps, build in GitHub Actions and deploy the built artifact (set **SCM_DO_BUILD_DURING_DEPLOYMENT** = `false` on the Web App so Azure does not rebuild).

### 5.1 Publish profile (Basic authentication)

1. In the **Web App** → **Configuration** → **General settings**, set **Basic authentication** to **On** (required to download the publish profile). Save.
2. In the Web App **Overview**, click **Get publish profile** and download the `.PublishSettings` file.
3. Open the file in a text editor and copy its **entire contents** (XML) for use as a GitHub secret (see 5.2).

### 5.2 GitHub secrets

In the repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | Value | Required |
|------------|--------|----------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | **Entire contents** of the publish profile file (from **Get publish profile**) | Yes |
| `AZURE_WEBAPP_NAME` | Your Web App name (e.g. `emc-sales-cockpit`) | Optional; workflow has a default |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes for production build |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes for production build |
| `NEXT_PUBLIC_SITE_URL` | Production URL (e.g. `https://emc-sales-cockpit.azurewebsites.net`) | Yes for production build |

`NEXT_PUBLIC_*` secrets are used at **build time**; also set them in the Web App **Configuration** → **Application settings** for consistency.

### 5.3 Workflow file

The workflow file is in `.github/workflows/azure-deploy.yml`. It:

- Triggers on push to `main` (or **workflow_dispatch** for manual runs)
- Uses Node 22, runs `npm ci` and `npm run build`
- Deploys to Azure App Service using the **publish profile** (`azure/webapps-deploy@v3`)

Adjust the `branches` and `AZURE_WEBAPP_NAME` (or secret) as needed.

### 5.4 Environment variables on Azure

Ensure all required app settings (see section 3.1) are set in the Web App **Configuration** → **Application settings**. The workflow does not set env vars; it only deploys the built app.

---

## 6. Post-deploy checks

- Open `https://<your-app-name>.azurewebsites.net`
- Test login/sign-up (Supabase redirects use `NEXT_PUBLIC_SITE_URL`)
- Test Customer Search / Analytics (they will show “not available” off office network if URLs are on-prem)

---

## 7. Optional: Custom domain and HTTPS

- Web App → **Settings** → **Custom domains** → add your domain and bind certificate (App Service Managed Certificate or your own).
- Set **Configuration** → **Application settings** → `NEXT_PUBLIC_SITE_URL` to `https://your-domain.com`.

---

## 8. Troubleshooting

| Issue | What to check |
|-------|----------------|
| Blank page / 500 | **Log stream** and **Logs** (Application Logging) in the Web App; ensure `npm run build` and `npm run start` run and `NODE_ENV=production`. |
| Auth redirect wrong | `NEXT_PUBLIC_SITE_URL` must be exactly the app URL (e.g. `https://emc-sales-cockpit.azurewebsites.net`). Supabase redirect URLs must include this. |
| Build fails in Azure | Use GitHub Actions to build and deploy the built artifact; or set **Startup Command** to `npm run build && npm run start` and deploy source. |
| Env vars not applied | After changing Application settings, **Save** and **Restart** the Web App. |
| "No credentials found" / deploy fails | Enable **Basic authentication** on the Web App (Configuration → General settings), then download the publish profile and set the `AZURE_WEBAPP_PUBLISH_PROFILE` secret to its full contents. |

---

## Summary

1. Create **Resource Group** and **Web App** (Node 22, Linux).
2. Set **Application settings** (Supabase, `NEXT_PUBLIC_SITE_URL`, etc.).
3. Deploy via **GitHub Actions** (recommended) or **ZIP/CLI/VS Code**.
4. Set `NEXT_PUBLIC_SITE_URL` to your app URL and add the same URL to Supabase redirect allowlist.
