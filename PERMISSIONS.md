# IAM Roles & Permissions Guide: GE Agent Extractor

To follow the **Principle of Least Privilege**, this document outlines the exact IAM roles and fine-grained permissions required for both **Manual Execution** (Human User) and **Automated Cloud Run Execution** (Service Account).

---

## 1. Manual Execution (Human User / Developer)

When running the extractor locally via CLI (`.venv/bin/python3 main.py` or `gcloud`), the user's account requires read access to agent inventory sources and read/write access to the BigQuery target dataset.

### Recommended Roles

#### Single-Role Quick Setup
For developer environments or simplified access, assigning the single **Project Editor** role (`roles/editor`) provides all required permissions across BigQuery, Discovery Engine, Vertex AI, and Cloud Run:
```bash
export GCP_PROJECT="${GCP_PROJECT:-your-gcp-project-id}"
export USER_EMAIL="your-email@domain.com"

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
    --member="user:${USER_EMAIL}" \
    --role="roles/editor"
```

#### Least-Privilege Granular Standard Roles
Alternatively, for a restricted least-privilege setup, assign the following granular roles at the **GCP Project level**:

| Service | Recommended IAM Role | Purpose / Scope |
| :--- | :--- | :--- |
| **BigQuery Dataset & Table** | `roles/bigquery.dataEditor` | Create/update dataset & table (`ge_agent_inventory.agent_details`), insert records. |
| **BigQuery Jobs** | `roles/bigquery.jobUser` | Run SQL queries (`MAX(collection_id)`). |
| **Discovery Engine** | `roles/discoveryengine.viewer` | Read Gemini Enterprise engines, data stores, assistants, and registered agents. |
| **Agent Registry** | `roles/agentregistry.viewer` | Read Google Cloud Agent Registry catalog, built-in A2A agents, and MCP servers. |
| **Agent Platform** | `roles/aiplatform.viewer` | List and get Vertex AI / Agent Engine Reasoning Engines across regions. |
| **Cloud Run** | `roles/run.viewer` | List Cloud Run agent services and query service metadata. |

---

## 2. Service Account Execution (Cloud Run Extractor & Dashboard)

When deployed as a containerized job/service on **Cloud Run** (or triggered via **Cloud Scheduler**), assign a dedicated Service Account (`sa-ge-agent-extractor@<PROJECT_ID>.iam.gserviceaccount.com`) with minimum required permissions.

### Assigning Standard Roles to the Service Account
Using `gcloud`:

```bash
# Set environment variables
export PROJECT_ID="${PROJECT_ID:-your-gcp-project-id}"
export SA_NAME="${SA_NAME:-sa-ge-agent-extractor}"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Create Service Account
gcloud iam service-accounts create ${SA_NAME} \
    --display-name="GE Agent Extractor & Dashboard Service Account" \
    --project=${PROJECT_ID}

# 2. Grant BigQuery Data Editor & Job User
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/bigquery.jobUser"

# 3. Grant Gemini Enterprise / Discovery Engine Viewer
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/discoveryengine.viewer"

# 4. Grant Agent Platform / Vertex AI Viewer
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/aiplatform.viewer"

# 5. Grant Cloud Run Viewer
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.viewer"
```

---

## 3. Custom Role (Fine-Grained Permissions List)

If creating a **Custom IAM Role** to strictly limit permissions without granting built-in roles, include only these exact permission strings:

### Fine-Grained Permissions List (`geAgentExtractor.runner`)

```yaml
title: "GE Agent Extractor Minimum Permissions"
description: "Least privilege permissions required for GE Agent Extractor"
stage: "GA"
includedPermissions:
  # BigQuery Permissions
  - bigquery.datasets.get
  - bigquery.datasets.create
  - bigquery.tables.get
  - bigquery.tables.create
  - bigquery.tables.delete
  - bigquery.tables.updateData
  - bigquery.tables.getData
  - bigquery.jobs.create

  # Discovery Engine / Gemini Enterprise Permissions
  - discoveryengine.engines.get
  - discoveryengine.engines.list
  - discoveryengine.dataStores.get
  - discoveryengine.dataStores.list
  - discoveryengine.assistants.get
  - discoveryengine.assistants.list
  - discoveryengine.agents.get
  - discoveryengine.agents.list
  - discoveryengine.agents.getIamPolicy

  # Vertex AI Reasoning Engines Permissions
  - aiplatform.reasoningEngines.get
  - aiplatform.reasoningEngines.list

  # Cloud Run Services Permissions
  - run.services.get
  - run.services.list

  # Project Metadata
  - resourcemanager.projects.get
```

### Command to Create Custom Role

```bash
gcloud iam roles create geAgentExtractorRunner \
    --project=${PROJECT_ID} \
    --title="GE Agent Extractor Runner" \
    --description="Minimal permissions for GE Agent Extractor" \
    --permissions="bigquery.datasets.get,bigquery.datasets.create,bigquery.tables.get,bigquery.tables.create,bigquery.tables.delete,bigquery.tables.updateData,bigquery.tables.getData,bigquery.jobs.create,discoveryengine.engines.get,discoveryengine.engines.list,discoveryengine.dataStores.get,discoveryengine.dataStores.list,discoveryengine.assistants.get,discoveryengine.assistants.list,discoveryengine.agents.get,discoveryengine.agents.list,discoveryengine.agents.getIamPolicy,aiplatform.reasoningEngines.get,aiplatform.reasoningEngines.list,run.services.get,run.services.list,resourcemanager.projects.get" \
    --stage=GA
```

---

## 4. Dashboard App IAP & Web Access Roles (`ge-agent-dashboard-app`)

When serving the **Agent Inventory Dashboard App** via Cloud Run secured with **Identity-Aware Proxy (IAP)** and executing under the dedicated service account (`sa-ge-agent-extractor@${PROJECT_ID}.iam.gserviceaccount.com`), assign these exact IAM roles:

| Role Name | IAM Role String | Target Resource | Granted Member | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud Run Invoker** | `roles/run.invoker` | Cloud Run Service (`ge-agent-dashboard-app`) | `domain:${DOMAIN}` | Allows Google Workspace domain users' browser requests to reach Cloud Run IAP proxy. |
| **IAP Web Accessor** | `roles/iap.httpsResourceAccessor` | IAP Resource (`iap_web`) | `user:${USER_EMAIL}`<br>`group:${GROUP_EMAIL}`<br>`domain:${DOMAIN}` | Grants permission to pass through Google Workspace SSO into the dashboard. |
| **BigQuery Data Viewer** | `roles/bigquery.dataViewer` | GCP Project / Dataset (`ge_agent_inventory`) | `serviceAccount:${SA_EMAIL}` | Allows backend FastAPI server to run SQL queries against BigQuery table. |
| **BigQuery Job User** | `roles/bigquery.jobUser` | GCP Project | `serviceAccount:${SA_EMAIL}` | Allows backend FastAPI server to execute query jobs in BigQuery. |

### Parameterized CLI Commands to Apply Dashboard IAM Policies

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export DOMAIN="yourcompany.com"
export ADMIN_EMAIL="admin@yourcompany.com"
export SA_NAME="sa-ge-agent-extractor"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Allow domain users to reach Cloud Run IAP proxy
gcloud run services add-iam-policy-binding ge-agent-dashboard-app \
  --member="domain:${DOMAIN}" \
  --role="roles/run.invoker" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

# 2. Grant IAP web access to authorized admin
gcloud iap web add-iam-policy-binding \
  --member="user:${ADMIN_EMAIL}" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"

# 3. Grant BigQuery Data Viewer & Job User to dedicated Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.jobUser"
```

---

## 👥 How to Add or Remove Additional Users & Google Groups in IAP

To allow additional team members or Google Groups to log in to the Dashboard:

### Grant Access to an Additional Individual User
```bash
gcloud iap web add-iam-policy-binding \
  --member="user:new.user@yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

### Grant Access to an Entire Google Group
```bash
gcloud iap web add-iam-policy-binding \
  --member="group:analytics-team@yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

### Grant Access to ALL Employees in the Google Workspace Domain
```bash
gcloud iap web add-iam-policy-binding \
  --member="domain:yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```

### Revoke Access for a User or Group
```bash
gcloud iap web remove-iam-policy-binding \
  --member="user:departed.user@yourcompany.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --project="${PROJECT_ID}"
```
