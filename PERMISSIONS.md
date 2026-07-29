# IAM Roles & Permissions Guide: GE Agent Extractor

To follow the **Principle of Least Privilege**, this document outlines the exact IAM roles and fine-grained permissions required for both **Manual Execution** (Human User) and **Automated Cloud Run Execution** (Service Account).

---

## 1. Manual Execution (Human User / Developer)

When running the extractor locally via CLI (`.venv/bin/python3 main.py` or `gcloud`), the user's account requires read access to agent inventory sources and read/write access to the BigQuery target dataset.

### Recommended Roles

#### Single-Role Quick Setup
For developer environments or simplified access, assigning the single **Project Editor** role (`roles/editor`) provides all required permissions across BigQuery, Discovery Engine, Vertex AI, and Cloud Run:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="user:your-email@domain.com" \
    --role="roles/editor"
```

#### Least-Privilege Granular Standard Roles
Alternatively, for a restricted least-privilege setup, assign the following granular roles at the **GCP Project level**:

| Service | Recommended IAM Role | Purpose / Scope |
| :--- | :--- | :--- |
| **BigQuery Dataset & Table** | `roles/bigquery.dataEditor` | Create/update dataset & table (`ge_agent_inventory.agent_details`), insert records. |
| **BigQuery Jobs** | `roles/bigquery.jobUser` | Run SQL queries (`MAX(collection_id)`). |
| **Discovery Engine** | `roles/discoveryengine.viewer` | Read Gemini Enterprise engines, data stores, assistants, and registered agents. |
| **Agent Platform** | `roles/aiplatform.viewer` | List and get Vertex AI / Agent Engine Reasoning Engines across regions. |
| **Cloud Run** | `roles/run.viewer` | List Cloud Run agent services and query service metadata. |

---

## 2. Service Account Execution (Cloud Run / Cloud Scheduler)

When deployed as a containerized job on **Cloud Run** (or triggered via **Cloud Scheduler**), assign a dedicated Service Account (e.g. `sa-ge-agent-extractor@<PROJECT_ID>.iam.gserviceaccount.com`) with minimum required permissions.

### A. Assigning Standard Roles to the Service Account
Using `gcloud`:

```bash
# Set variables
PROJECT_ID="agentspace-452714"
SA_NAME="sa-ge-agent-extractor"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Create Service Account
gcloud iam service-accounts create ${SA_NAME} \
    --display-name="GE Agent Extractor Cloud Run Service Account" \
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

# Bind Custom Role to Service Account
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="projects/${PROJECT_ID}/roles/geAgentExtractorRunner"
```
