# Gemini Enterprise Agent Inventory Dashboard App

A bespoke, high-performance **React + FastAPI Web Application** that visualizes the BigQuery Agent Inventory (`ge_agent_inventory.agent_details`), providing overall computational metrics, multi-dimensional filtering, interactive KPI stat toggles, mouse-hover term definitions, full CSV export, and 360-degree agent detail drill-downs.

---

## 📸 Dashboard Screenshots & Visual Interface

### 1. Overview & Computational Summary Header
![Dashboard Overview Overview](docs/screenshots/dashboard_overview.png)

*Interactive KPI Summary Stat Cards, Snapshot Run selector, Multi-Select filters (`Is Shared?`, `Enterprise-Wide?`, `Project ID`, `Platform`), Capability toggles, and Global Search.*

---

### 2. Tabular Inventory View & CSV Export
![Dashboard Table View](docs/screenshots/dashboard_table_view.png)

*Data Table View with platform badges, sharing scope tags, status badges, author emails, and one-click Export to CSV function.*

---

### 3. Agent Metadata & Permissions Drill-Down Drawer
![Agent Detail Drawer 1](docs/screenshots/agent_detail_drawer_1.png)

*360-degree Inspector Drawer displaying description, Gemini Enterprise instance, GCP Project ID, SPIFFE Identity URI, Sharing Scope, and System Prompt/Instructions.*

---

### 4. Cloud Run Container & A2A Skills Specs
![Agent Detail Drawer 2](docs/screenshots/agent_detail_drawer_2.png)

*Detailed Execution Specs for Cloud Run & Agent-to-Agent (A2A) microservices, container image URIs, endpoints, and A2A skills array.*

---

## 🔐 Security & Access Control Model

- **Identity-Aware Proxy (IAP)**: Public unauthenticated access is strictly disabled. All incoming web requests are intercepted by Google Cloud IAP and authenticated via Google Workspace OAuth2 SSO (`accounts.google.com`).
- **Header Injection & Inspection**: FastApi backend inspects `X-Goog-Authenticated-User-Email` and `X-Goog-Iap-Jwt-Assertion` headers injected natively by Google Cloud IAP to enforce authorized identity access.

---

## 🚀 Step-by-Step Deployment Guide for ANY GCP Project

Follow these steps to deploy the Dashboard App into a new Google Cloud project from scratch.

### 1. Define Deployment Environment Variables
Set shell variables for your GCP project, deployment region, domain, and initial admin email:

```bash
export PROJECT_ID="your-gcp-project-id"   # e.g., my-company-agents
export REGION="us-central1"                # e.g., us-central1
export DOMAIN="yourcompany.com"            # e.g., mycompany.com
export ADMIN_EMAIL="admin@yourcompany.com" # e.g., admin@mycompany.com
```

### 2. Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  iap.googleapis.com \
  --project="${PROJECT_ID}"
```

### 3. Configure OAuth Consent Screen (GCP Console)
Before enabling IAP on Cloud Run, an **OAuth consent screen** must be configured once per GCP project:
1. Open [Google Cloud Console OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent) for your project.
2. Select **User Type**: **Internal** (restricts authentication exclusively to users within your Google Workspace organization).
3. Fill in required fields:
   - **App name**: `Gemini Enterprise Agent Inventory Dashboard`
   - **User support email**: `${ADMIN_EMAIL}`
   - **Developer contact information**: `${ADMIN_EMAIL}`
4. Click **Save and Continue** through the scopes step.

---

### 4. Build & Deploy Dashboard to Cloud Run
Build the container image with Cloud Build and deploy to Cloud Run with `--iap` enabled:

```bash
# A. Submit container build to Cloud Build
gcloud builds submit dashboard_app \
  --tag "gcr.io/${PROJECT_ID}/ge-agent-dashboard-app:latest" \
  --project "${PROJECT_ID}"

# B. Deploy to Cloud Run with IAP enabled
gcloud run deploy ge-agent-dashboard-app \
  --image "gcr.io/${PROJECT_ID}/ge-agent-dashboard-app:latest" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --iap \
  --no-allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID},BQ_DATASET_ID=ge_agent_inventory,BQ_TABLE_ID=agent_details"
```

---

### 5. Fetch Dynamic Service URL & Project Number
Fetch the dynamic Cloud Run URL and default compute service account:

```bash
# Retrieve dynamic Service URL
DASHBOARD_URL=$(gcloud run services describe ge-agent-dashboard-app --region="${REGION}" --project="${PROJECT_ID}" --format="value(status.url)")
echo "Dashboard Deployed at: ${DASHBOARD_URL}"

# Retrieve Project Number and Service Account Email
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

---

### 6. Configure IAM Policy Bindings

Apply necessary IAM permissions for IAP web access and BigQuery data access:

```bash
# A. Allow Google Workspace domain users to reach the Cloud Run IAP proxy
gcloud run services add-iam-policy-binding ge-agent-dashboard-app \
  --member="domain:${DOMAIN}" \
  --role="roles/run.invoker" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

# B. Grant IAP Web Accessor role to initial Admin user
gcloud iap web add-iam-policy-binding \
  --member="user:${ADMIN_EMAIL}" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"

# C. Grant BigQuery Data Viewer to Cloud Run runtime service account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/bigquery.dataViewer"
```

---

## 👥 How to Add or Remove Additional Users & Google Groups in IAP

By default, IAP restricts web access **exclusively** to members explicitly granted the **IAP-secured Web App User** role (`roles/iap.httpsResourceAccessor`). 

### Option A: Via `gcloud` Command Line

#### 1. Grant Access to an Additional Individual User
```bash
gcloud iap web add-iam-policy-binding \
  --member="user:jane.doe@yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

#### 2. Grant Access to an Entire Google Group (e.g. Analytics Team or AI Engineers)
```bash
gcloud iap web add-iam-policy-binding \
  --member="group:ai-analytics-team@yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

#### 3. Grant Access to ALL Employees in the Google Workspace Domain
```bash
gcloud iap web add-iam-policy-binding \
  --member="domain:yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

#### 4. Revoke / Remove Access for a User or Group
```bash
gcloud iap web remove-iam-policy-binding \
  --member="user:departed.user@yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

---

### Option B: Via Google Cloud Console (UI)

1. Open [Google Cloud Console Security -> Identity-Aware Proxy](https://console.cloud.google.com/security/iap?project=your-gcp-project-id).
2. Under the **HTTPS Resources** tab, locate **Cloud Run** and find `ge-agent-dashboard-app`.
3. Check the checkbox next to `ge-agent-dashboard-app`.
4. In the right-hand **Info Panel**, click **Add Principal**.
5. In **New principals**, enter the user email (`user:john@yourcompany.com`), group email (`group:team@yourcompany.com`), or domain (`domain:yourcompany.com`).
6. In **Select a role**, choose **IAP-secured Web App User** (`roles/iap.httpsResourceAccessor`).
7. Click **Save**.

---

## 🎨 UI Features & Design System

- **Clean White Light Theme**: Crisp `#F8FAFC` background with white cards (`#FFFFFF`), subtle slate borders (`#E2E8F0`), and high-contrast typography (`#0F172A`).
- **Mouse Hover Tooltips**: Mouse-over explanations for terms such as `No-Code`, `ADK Code`, `Cloud Run`, `Enterprise`, `Restricted`, `Private`, `RAG / Data Stores`, `MCP Servers`, `Python Sandbox`, and status tags.
- **Interactive KPI Card Filters**: Clicking any badge pill or stat card directly sets or toggles that filter.
- **Export to CSV**: One-click download of filtered list containing **all columns/fields**.
- **Snapshot Run Dropdown**: Select specific `collection_id` runs or view latest.
- **Multi-Filter Toolbar**: `gcp_project_id`, `gemini_enterprise_instance_name`, `agent_platform`, `is_shared`, `is_available_to_everyone`, `access_scope`, `agent_status`, `author_email`, Global Search bar, and capability toggles.

---

## 🛠️ Local Development

```bash
# 1. Install frontend dependencies and build
cd dashboard_app/frontend
npm install
npm run build

# 2. Run FastAPI backend server locally
cd ../backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
