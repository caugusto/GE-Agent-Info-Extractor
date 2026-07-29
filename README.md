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

## Quick Start (Local Execution)

```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Authenticate
gcloud auth application-default login
gcloud config set project agentspace-452714

# 3. Execute extraction and load to BigQuery
python3 main.py

# Or dry-run mode (outputs CSV)
python3 main.py --dry-run
```

For full deployment instructions to Cloud Run and Cloud Scheduler, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.
