# Gemini Enterprise Agent Inventory Dashboard App

A bespoke, high-performance **React + FastAPI Web Application** that visualizes the BigQuery Agent Inventory (`ge_agent_inventory.agent_details`), providing overall computational metrics, multi-dimensional filtering, and 360-degree agent detail drill-downs.

---

## 🚀 Live Cloud Run Service URL

- **Dashboard App URL**: [`https://ge-agent-dashboard-app-16933400417.us-central1.run.app`](https://ge-agent-dashboard-app-16933400417.us-central1.run.app)
- **Deployment Region**: `us-central1`
- **Authentication & Security**: **Direct Cloud Run IAP / Google IAM** (`--no-allow-unauthenticated`). Restricted exclusively to `admin@caugusto.altostrat.com`.

---

## 🔐 Restricted Access & Security Model

- **No Public Access**: Public unauthenticated access is strictly disabled.
- **IAM Authorization**:
  - `roles/run.invoker` is granted **only to `user:admin@caugusto.altostrat.com`**.
  - Any unapproved or unauthenticated request is blocked natively by Cloud Run IAM with HTTP 403 Forbidden.
- **Identity Awareness**: The FastAPI backend inspects `X-Goog-Authenticated-User-Email` headers passed by Google Cloud.

---

## 🎨 UI Features & Design System

- **Deep Pitch Black Theme**: `#000000` / `#08080C` background with subtle dark glassmorphic cards (`#121218`).
- **Google Brand Accent Colors**: Google Blue (`#4285F4`), Google Green (`#34A853`), Google Yellow (`#FBBC05`), Google Red (`#EA4335`).
- **Computational Summary Header**: Real-time KPI cards for Total Agents, Sharing Exposure Rate (% Enterprise, % Restricted, % Private), RAG Adoption, MCP Integrations, and Tooling.
- **Snapshot Run Dropdown**: Select specific `collection_id` runs or view latest.
- **Multi-Filter Toolbar**:
  - `gcp_project_id`
  - `gemini_enterprise_instance_name`
  - `agent_platform`
  - `access_scope`
  - `agent_status`
  - `author_email`
  - `agent_environment`
  - Real-time Global Search bar & capability toggles (`Data Stores / RAG`, `MCP`, `External Tools`, `Python Sandbox`).
- **Slide-Over Detail Inspector**: Clicking any card or table row opens a side-drawer showing:
  - SPIFFE URI, Author Email, Version history.
  - Full IAM policy roles and shared user lists.
  - System Prompt / Instructions.
  - Vertex AI Reasoning Engine execution specs (pickle GCS URIs, requirements URI, Python version).
  - Cloud Run container image URIs & A2A skills array.

---

## 🛠️ Local Development & Redeployment

### Running Backend & Frontend Locally
```bash
# 1. Install frontend dependencies and build
cd dashboard_app/frontend
npm install
npm run build

# 2. Run FastAPI backend server
cd ../backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Rebuilding & Redeploying to Cloud Run
```bash
# Build image with Cloud Build
gcloud builds submit dashboard_app --tag gcr.io/agentspace-452714/ge-agent-dashboard-app:latest --project agentspace-452714

# Deploy to Cloud Run
gcloud run deploy ge-agent-dashboard-app \
  --image gcr.io/agentspace-452714/ge-agent-dashboard-app:latest \
  --region us-central1 \
  --project agentspace-452714 \
  --no-allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=agentspace-452714,BQ_DATASET_ID=ge_agent_inventory,BQ_TABLE_ID=agent_details
```
