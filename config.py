"""Centralized Configuration Module for GE Agent Extractor.

All default variables and project settings are defined in this single file.
Update these variables when configuring target GCP environments, BigQuery locations, or output settings.
"""

import os

# ==============================================================================
# GCP Project Settings
# ==============================================================================
# GCP Project ID and Project Number
PROJECT_ID = os.getenv("GCP_PROJECT", "agentspace-452714")
PROJECT_NUMBER = os.getenv("GCP_PROJECT_NUMBER", "16933400417")
REGION = os.getenv("REGION", "us-central1")
SA_NAME = os.getenv("SA_NAME", "sa-ge-agent-extractor")
SA_EMAIL = f"{SA_NAME}@{PROJECT_ID}.iam.gserviceaccount.com"

# ==============================================================================
# BigQuery Target Settings
# ==============================================================================
# Default dataset name, table name, location, and dry-run CSV file path
DEFAULT_BQ_DATASET = os.getenv("BQ_DATASET", "ge_agent_inventory")
DEFAULT_BQ_TABLE = os.getenv("BQ_TABLE", "agent_details")
DEFAULT_CSV_OUTPUT = os.getenv("CSV_OUTPUT", "agent_inventory_dry_run.csv")
BQ_LOCATION = os.getenv("BQ_LOCATION", "US")

# ==============================================================================
# Regional / Service Locations to Scan
# ==============================================================================
# Discovery Engine / Gemini Enterprise locations
DISCOVERY_ENGINE_LOCATIONS = ["global", "us", "eu"]

# Agent Platform Engine locations (Reasoning Engines are regional)
VERTEX_AI_LOCATIONS = ["us-central1", "us-east1", "us-west1", "europe-west1"]

# Cloud Run regions
CLOUD_RUN_REGIONS = ["us-central1", "us-east1", "us-west1"]

# GKE cluster locations to scan
GKE_LOCATIONS = ["us-central1", "us-east1", "us-west1", "europe-west1"]
