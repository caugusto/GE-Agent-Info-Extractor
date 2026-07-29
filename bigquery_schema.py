"""BigQuery schema definition and dataset/table initialization."""

import time
import logging
from google.cloud import bigquery
from google.cloud.exceptions import NotFound

from config import PROJECT_ID, DEFAULT_BQ_DATASET, DEFAULT_BQ_TABLE, BQ_LOCATION

logger = logging.getLogger(__name__)

# Define BigQuery schema for agent inventory tables
# STRICT REQUIREMENT: No JSON columns are used. Every value is explicitly typed.
# Table is partitioned by collection_timestamp.
AGENT_DETAILS_SCHEMA = [
    # Run Metadata
    bigquery.SchemaField("collection_id", "INT64", mode="REQUIRED", description="Incremental execution/run sequence ID"),
    bigquery.SchemaField("collection_timestamp", "TIMESTAMP", mode="REQUIRED", description="Timestamp when the collection run started (partition column)"),
    bigquery.SchemaField("execution_source", "STRING", mode="NULLABLE", description="Source of the extraction run (MANUAL_CLI, CLOUD_RUN_JOB, CLOUD_SCHEDULER)"),
    bigquery.SchemaField("gcp_project_id", "STRING", mode="NULLABLE", description="GCP Project ID where the agent resides"),

    # Gemini Enterprise Instance Context
    bigquery.SchemaField("gemini_enterprise_instance_name", "STRING", mode="NULLABLE", description="Gemini Enterprise Instance Display Name (e.g. Test1 Agentspace)"),
    bigquery.SchemaField("gemini_enterprise_instance_id", "STRING", mode="NULLABLE", description="Gemini Enterprise Instance Resource ID (e.g. test1-agentspace_1741135345115)"),

    # Foundational & Registry Info
    bigquery.SchemaField("agent_name", "STRING", mode="NULLABLE", description="Agent display name"),
    bigquery.SchemaField("agent_id", "STRING", mode="NULLABLE", description="Full agent resource name or ID"),
    bigquery.SchemaField("author_email", "STRING", mode="NULLABLE", description="Author or creator email address"),
    bigquery.SchemaField("spiffe_id", "STRING", mode="NULLABLE", description="Agent SPIFFE identity URI"),
    bigquery.SchemaField("agent_description", "STRING", mode="NULLABLE", description="Agent description"),
    bigquery.SchemaField("agent_owner_created_by", "STRING", mode="NULLABLE", description="Agent owner or creator email/service account"),
    bigquery.SchemaField("agent_platform", "STRING", mode="NULLABLE", description="Platform (Gemini Enterprise Agent Designer, Agent Platform Engine, Dialogflow, Cloud Run)"),
    bigquery.SchemaField("agent_created_date", "TIMESTAMP", mode="NULLABLE", description="Creation timestamp"),
    bigquery.SchemaField("agent_modified_date", "TIMESTAMP", mode="NULLABLE", description="Last modification timestamp"),
    bigquery.SchemaField("agent_published_version", "STRING", mode="NULLABLE", description="Published version identifier"),
    bigquery.SchemaField("agent_published_date", "TIMESTAMP", mode="NULLABLE", description="Published timestamp"),
    bigquery.SchemaField("agent_status", "STRING", mode="NULLABLE", description="Status (Published (Private), Published (Enabled), Draft, Disabled)"),
    bigquery.SchemaField("agent_environment", "STRING", mode="NULLABLE", description="Environment (Dev, Test, Prod)"),
    bigquery.SchemaField("agent_intent", "STRING", mode="NULLABLE", description="Agent intent or primary task goal"),

    # Sharing & Permissions Info
    bigquery.SchemaField("is_shared", "BOOLEAN", mode="NULLABLE", description="True if agent is shared with other users"),
    bigquery.SchemaField("shared_with_users", "STRING", mode="REPEATED", description="List of user emails the agent is shared with"),
    bigquery.SchemaField("permission_roles", "STRING", mode="REPEATED", description="List of members and their assigned permission roles (e.g. user@domain.com (Agent User))"),

    # Configuration
    bigquery.SchemaField("uses_knowledge_sources", "BOOLEAN", mode="NULLABLE", description="True if agent references data stores / knowledge bases"),
    bigquery.SchemaField("knowledge_source_types", "STRING", mode="REPEATED", description="Types of connected data stores / knowledge sources (Structured data, Drive, Google Mail, Google Calendar, ServiceNow, Agent Platform Search, Website, etc.)"),
    bigquery.SchemaField("uses_tools", "BOOLEAN", mode="NULLABLE", description="True if agent uses external tools/extensions"),
    bigquery.SchemaField("tool_types", "STRING", mode="REPEATED", description="Types of tools used (Google Workspace, APIs, Functions, Extensions, Data Stores, MCP)"),
    bigquery.SchemaField("uses_http_requests", "BOOLEAN", mode="NULLABLE", description="True if agent issues REST / OpenAPI HTTP requests"),
    bigquery.SchemaField("uses_mcp", "BOOLEAN", mode="NULLABLE", description="True if agent uses Model Context Protocol"),
    bigquery.SchemaField("uses_function_calling", "BOOLEAN", mode="NULLABLE", description="True if agent uses LLM function calling"),
    bigquery.SchemaField("uses_extensions", "BOOLEAN", mode="NULLABLE", description="True if agent uses Discovery Engine / Agent Platform extensions"),
    bigquery.SchemaField("uses_code_execution", "BOOLEAN", mode="NULLABLE", description="True if agent enables code execution / sandbox"),
    bigquery.SchemaField("uses_rag", "BOOLEAN", mode="NULLABLE", description="True if agent uses Retrieval-Augmented Generation"),
    bigquery.SchemaField("uses_memory", "BOOLEAN", mode="NULLABLE", description="True if agent uses conversational session memory"),
    bigquery.SchemaField("autonomous_agent", "BOOLEAN", mode="NULLABLE", description="True if agent operates as an autonomous multi-step agent"),
    bigquery.SchemaField("system_instructions", "STRING", mode="NULLABLE", description="System prompt or instructions"),
    bigquery.SchemaField("model", "STRING", mode="NULLABLE", description="Model identifier (e.g. Gemini 3.5 Flash, Gemini 2.5 Pro)"),
    bigquery.SchemaField("safety_configuration", "STRING", mode="NULLABLE", description="Safety threshold settings summary"),
    bigquery.SchemaField("authentication_method", "STRING", mode="NULLABLE", description="Authentication method (OAuth2, IAM, Service Account, API Key, None)"),

    # Access Scope / Audience
    bigquery.SchemaField("is_available_to_everyone", "BOOLEAN", mode="NULLABLE", description="True if agent is enterprise-wide public"),
    bigquery.SchemaField("access_scope", "STRING", mode="NULLABLE", description="Access scope (Enterprise, Group, DL, Individuals, Private)"),
    bigquery.SchemaField("audience_size", "STRING", mode="NULLABLE", description="Estimated audience size or group type"),
    bigquery.SchemaField("target_audience_details", "STRING", mode="NULLABLE", description="Details on assigned groups or users"),

    # Agent Runtime / Reasoning Engine Details
    bigquery.SchemaField("reasoning_engine_id", "STRING", mode="NULLABLE", description="Agent Runtime Reasoning Engine full resource ID"),
    bigquery.SchemaField("reasoning_engine_display_name", "STRING", mode="NULLABLE", description="Reasoning Engine display name"),
    bigquery.SchemaField("reasoning_engine_location", "STRING", mode="NULLABLE", description="Reasoning Engine GCP location/region"),
    bigquery.SchemaField("reasoning_engine_service_account", "STRING", mode="NULLABLE", description="Reasoning Engine runtime identity / service account"),
    bigquery.SchemaField("query_url", "STRING", mode="NULLABLE", description="Reasoning Engine query endpoint URL"),
    bigquery.SchemaField("stream_query_url", "STRING", mode="NULLABLE", description="Reasoning Engine streaming query endpoint URL"),
    bigquery.SchemaField("pickle_object_gcs_uri", "STRING", mode="NULLABLE", description="GCS URI for serialized agent pickle object"),
    bigquery.SchemaField("requirements_gcs_uri", "STRING", mode="NULLABLE", description="GCS URI for Python requirements.txt"),
    bigquery.SchemaField("dependency_files_gcs_uri", "STRING", mode="NULLABLE", description="GCS URI for Python dependency package tar.gz"),
    bigquery.SchemaField("python_version", "STRING", mode="NULLABLE", description="Python runtime version"),
    bigquery.SchemaField("agent_framework", "STRING", mode="NULLABLE", description="Agent Framework (e.g. google-adk, langchain)"),

    # Cloud Run & A2A Deployment Details
    bigquery.SchemaField("a2a_protocol_version", "STRING", mode="NULLABLE", description="A2A Protocol Version (e.g. 0.3)"),
    bigquery.SchemaField("a2a_agent_url", "STRING", mode="NULLABLE", description="A2A Agent Card / Service Endpoint URL"),
    bigquery.SchemaField("a2a_skills", "STRING", mode="REPEATED", description="A2A Agent Skills / Capabilities"),
    bigquery.SchemaField("cloud_run_service_name", "STRING", mode="NULLABLE", description="Cloud Run Service Name"),
    bigquery.SchemaField("cloud_run_region", "STRING", mode="NULLABLE", description="Cloud Run GCP region"),
    bigquery.SchemaField("cloud_run_image", "STRING", mode="NULLABLE", description="Cloud Run Container Image URI"),
    bigquery.SchemaField("cloud_run_service_account", "STRING", mode="NULLABLE", description="Cloud Run Service Account / Identity"),
]


def _wait_for_table_propagation(client: bigquery.Client, table_ref: bigquery.TableReference, max_retries: int = 5):
    """Waits for BigQuery table metadata to propagate to streaming endpoints."""
    time.sleep(10)
    for attempt in range(1, max_retries + 1):
        try:
            client.get_table(table_ref)
            return
        except NotFound:
            time.sleep(3)


def ensure_dataset_and_table(
    client: bigquery.Client,
    dataset_name: str = DEFAULT_BQ_DATASET,
    table_name: str = DEFAULT_BQ_TABLE,
    project_id: str = PROJECT_ID,
    location: str = BQ_LOCATION,
    recreate_if_schema_changed: bool = True
) -> str:
    """Ensure the BigQuery dataset and table exist with the required schema and partitioning on collection_timestamp.

    Returns:
        Full table ID string (e.g. project_id.dataset_name.table_name).
    """
    dataset_ref = bigquery.DatasetReference(project_id, dataset_name)
    try:
        client.get_dataset(dataset_ref)
        logger.info(f"Dataset {project_id}.{dataset_name} already exists.")
    except NotFound:
        logger.info(f"Creating dataset {project_id}.{dataset_name}...")
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = location
        client.create_dataset(dataset)
        logger.info(f"Created dataset {project_id}.{dataset_name}.")

    table_ref = dataset_ref.table(table_name)
    try:
        table = client.get_table(table_ref)
        partition_field = table.time_partitioning.field if table.time_partitioning else None
        current_field_names = {f.name for f in table.schema}
        expected_field_names = {f.name for f in AGENT_DETAILS_SCHEMA}

        schema_mismatch = (
            partition_field != "collection_timestamp" or
            not expected_field_names.issubset(current_field_names)
        )

        if schema_mismatch:
            if recreate_if_schema_changed:
                logger.info(f"Table schema or partitioning changed. Recreating table {project_id}.{dataset_name}.{table_name}...")
                client.delete_table(table_ref)
                time.sleep(2)
                table = bigquery.Table(table_ref, schema=AGENT_DETAILS_SCHEMA)
                table.time_partitioning = bigquery.TimePartitioning(
                    type_=bigquery.TimePartitioningType.DAY,
                    field="collection_timestamp",
                )
                client.create_table(table)
                _wait_for_table_propagation(client, table_ref)
                logger.info(f"Recreated table {project_id}.{dataset_name}.{table_name} with latest schema.")
            else:
                logger.warning("Table schema mismatch detected.")
        else:
            logger.info(f"Table {project_id}.{dataset_name}.{table_name} already exists and matches expected schema.")
    except NotFound:
        logger.info(f"Creating table {project_id}.{dataset_name}.{table_name}...")
        table = bigquery.Table(table_ref, schema=AGENT_DETAILS_SCHEMA)
        table.time_partitioning = bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field="collection_timestamp",
        )
        client.create_table(table)
        _wait_for_table_propagation(client, table_ref)
        logger.info(f"Created table {project_id}.{dataset_name}.{table_name} partitioned by 'collection_timestamp'.")

    return f"{project_id}.{dataset_name}.{table_name}"

