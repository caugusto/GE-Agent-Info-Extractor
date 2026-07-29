# GE Agent Inventory Extractor

A Python application that extracts inventory data for all AI agents across Google Cloud (Gemini Enterprise / Agent Designer No-Code Agents, Agent Platform Engine Reasoning Engines, and Cloud Run Agent Services) and loads them into BigQuery (`ge_agent_inventory.agent_details`).

---

## 📚 Documentation Links
- **[EXTRACTION_ARCHITECTURE.md](EXTRACTION_ARCHITECTURE.md)**: Extractor execution flow, deduplication sequence, and in-place record enrichment design.
- **[DATA_DICTIONARY.md](DATA_DICTIONARY.md)**: Complete BigQuery table data dictionary, column definitions, data types, and extraction logic.
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Detailed guide for local setup and deploying as a **Cloud Run Job** + **Cloud Scheduler**.
- **[PERMISSIONS.md](PERMISSIONS.md)**: GCP IAM roles and fine-grained least-privilege permission requirements for users and service accounts.

---

## Features

- **Multi-Platform Agent Extraction**:
  - **Gemini Enterprise (Agent Designer)**: Queries Discovery Engine engines, data stores, controls, registered agents, and system instructions across all locations.
  - **Agent Platform Engine**: Queries Reasoning Engines, python spec, tools, runtime endpoints, and identity.
  - **Cloud Run Agent Services**: Queries container services and A2A (`/.well-known/agent-card.json`) endpoints.
- **Incremental Run Tracking**: Every run assigns an incremental `collection_id` (`INT64`, e.g. `1`, `2`, `3`) and `collection_timestamp`. Standard SQL `MAX(collection_id)` can be used to query the latest snapshot.
- **Explicit BigQuery Schema**: Strongly-typed columns for agent features, permissions, sharing, deployment details, and runtime identities.
- **Automated Partitioning**: Table is partitioned by `collection_timestamp`.

---

## Project Structure

```
ge_agent_extractor/
├── config.py                       # GCP project, locations, and BigQuery table constants
├── bigquery_schema.py             # Schema definition & dataset/table initialization
├── extractors/
│   ├── __init__.py
│   ├── discovery_engine.py        # Gemini Enterprise / Agent Designer extractor
│   ├── vertex_reasoning_engine.py # Agent Platform Engine code agent extractor
│   └── cloud_run.py               # Cloud Run & A2A agent service extractor
├── main.py                        # Main orchestration entrypoint
├── EXTRACTION_ARCHITECTURE.md     # Pipeline execution flow & in-place record enrichment design
├── DATA_DICTIONARY.md             # Complete BigQuery data dictionary & extraction rules
├── DEPLOYMENT.md                  # Deployment & Cloud Run Job setup guide
├── PERMISSIONS.md                  # IAM Roles & fine-grained permissions
├── requirements.txt               # Dependencies
└── README.md
```

---

## ⚙️ Configuration (`config.py`)

The target BigQuery dataset, table, GCP Project, and scan regions can be configured in **[config.py](config.py)** or overridden via environment variables:

| Setting | `config.py` Variable | Environment Variable | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Dataset Name** | `DEFAULT_BQ_DATASET` | `BQ_DATASET` | `ge_agent_inventory` | Target BigQuery dataset |
| **Table Name** | `DEFAULT_BQ_TABLE` | `BQ_TABLE` | `agent_details` | Target BigQuery table |
| **GCP Project** | `PROJECT_ID` | `GCP_PROJECT` | `agentspace-452714` | Target GCP project |
| **BigQuery Location** | `BQ_LOCATION` | `BQ_LOCATION` | `US` | BigQuery dataset location |
| **CSV Output** | `DEFAULT_CSV_OUTPUT` | `CSV_OUTPUT` | `agent_inventory_dry_run.csv` | Output file for dry-run mode |

---

## 🚀 Prerequisites & Local Execution

### 1. Required GCP APIs
Ensure the following Google Cloud APIs are enabled in your project:
- **Discovery Engine API**: `discoveryengine.googleapis.com`
- **Vertex AI API**: `aiplatform.googleapis.com`
- **Cloud Run API**: `run.googleapis.com`
- **BigQuery API**: `bigquery.googleapis.com`
- **IAM Credentials API**: `iamcredentials.googleapis.com`

```bash
gcloud services enable \
    discoveryengine.googleapis.com \
    aiplatform.googleapis.com \
    run.googleapis.com \
    bigquery.googleapis.com \
    iamcredentials.googleapis.com \
    --project=agentspace-452714
```

### 2. Required GCP IAM Roles
Your authenticated GCP user or service account requires the following roles at the project level:
- **BigQuery Data Editor** (`roles/bigquery.dataEditor`): Create/update dataset & table, insert records.
- **BigQuery Job User** (`roles/bigquery.jobUser`): Execute BigQuery queries for incremental `collection_id` checks.
- **Discovery Engine Viewer** (`roles/discoveryengine.viewer`): Read Gemini Enterprise / Agent Designer agents & controls.
- **Vertex AI Viewer** (`roles/aiplatform.viewer`): List and inspect Agent Platform Reasoning Engine code agents.
- **Cloud Run Viewer** (`roles/run.viewer`): List Cloud Run agent services and query service metadata.

For fine-grained custom IAM permissions, see **[PERMISSIONS.md](PERMISSIONS.md)**.

---

## 🚀 Quick Start & CLI Options (`main.py`)

```bash
# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Authenticate with Google Cloud
gcloud auth application-default login
gcloud config set project agentspace-452714

# 4. Execute extraction and load to default BigQuery dataset/table
python3 main.py
```

### CLI Command Options

You can customize execution parameters by passing options to `main.py`:

| Flag | Long Flag | Description | Default |
| :--- | :--- | :--- | :--- |
| `-d` | `--dataset` | Specify target BigQuery dataset name | `ge_agent_inventory` |
| `-t` | `--table` | Specify target BigQuery table name | `agent_details` |
| | `--dry-run` | Extract agents and output to CSV without inserting into BigQuery | `False` |
| `-o` | `--output` | CSV output file path for dry-run mode | `agent_inventory_dry_run.csv` |
| `-s` | `--execution-source` | Execution source tag (`MANUAL_CLI`, `CLOUD_RUN_JOB`, `CLOUD_SCHEDULER`) | Auto-detected |

### Usage Examples

```bash
# Custom BigQuery dataset and table
python3 main.py -d my_custom_dataset -t custom_agent_details

# Dry run mode (generates CSV without inserting to BigQuery)
python3 main.py --dry-run -o my_inventory.csv

# Specify custom dataset and execution source
python3 main.py -d ge_agent_inventory -t agent_details -s MANUAL_CLI
```

For full deployment instructions to Cloud Run and Cloud Scheduler, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.
