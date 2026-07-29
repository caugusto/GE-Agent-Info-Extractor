import os
import re
import argparse
import csv
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from google.cloud import bigquery

from config import PROJECT_ID, BQ_LOCATION, DEFAULT_BQ_DATASET, DEFAULT_BQ_TABLE, DEFAULT_CSV_OUTPUT
from bigquery_schema import ensure_dataset_and_table
from extractors.discovery_engine import extract_discovery_engine_agents
from extractors.vertex_reasoning_engine import extract_vertex_reasoning_engines
from extractors.cloud_run import extract_cloud_run_agents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ge_agent_extractor")


def _get_next_collection_id(bq_client: bigquery.Client, full_table_id: str, csv_output: str) -> int:
    """Gets the next incremental collection_id (int) by querying BigQuery or local CSV."""
    try:
        query = f"SELECT MAX(collection_id) AS max_id FROM `{full_table_id}`"
        query_job = bq_client.query(query)
        results = list(query_job.result())
        if results and results[0].max_id is not None:
            return int(results[0].max_id) + 1
    except Exception as e:
        logger.debug(f"Could not fetch max collection_id from BigQuery: {e}")

    # Fallback check on existing CSV file
    if os.path.exists(csv_output):
        try:
            with open(csv_output, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                ids = []
                for row in reader:
                    val = str(row.get("collection_id", "")).strip()
                    if val.isdigit():
                        ids.append(int(val))
                if ids:
                    return max(ids) + 1
        except Exception as e:
            logger.debug(f"Could not read max collection_id from CSV: {e}")

    return 1


def _validate_parameters(dataset_name: str, table_name: str, csv_output: str) -> None:
    """Validates CLI and function parameters for BigQuery dataset, table, and file output names."""
    identifier_pattern = re.compile(r"^[a-zA-Z0-9_]+$")
    
    if not dataset_name or not identifier_pattern.match(dataset_name):
        raise ValueError(
            f"❌ Invalid parameter 'dataset': '{dataset_name}'. "
            f"BigQuery dataset names must contain only alphanumeric characters and underscores (e.g. 'ge_agent_inventory')."
        )
        
    if not table_name or not identifier_pattern.match(table_name):
        raise ValueError(
            f"❌ Invalid parameter 'table': '{table_name}'. "
            f"BigQuery table names must contain only alphanumeric characters and underscores (e.g. 'agent_details')."
        )
        
    if not csv_output or not csv_output.lower().endswith(".csv"):
        raise ValueError(
            f"❌ Invalid parameter 'output': '{csv_output}'. "
            f"File path must end with a '.csv' extension (e.g. 'agent_inventory.csv')."
        )

    output_dir = os.path.dirname(os.path.abspath(csv_output))
    if not os.path.exists(output_dir):
        raise ValueError(
            f"❌ Invalid parameter 'output': Directory '{output_dir}' does not exist."
        )


def _resolve_execution_source(cli_source: str | None = None) -> str:
    """Determines whether the execution source is MANUAL_CLI, CLOUD_RUN_JOB, or CLOUD_SCHEDULER."""
    if cli_source and cli_source in ["MANUAL_CLI", "CLOUD_RUN_JOB", "CLOUD_SCHEDULER"]:
        return cli_source
    env_src = os.getenv("EXECUTION_SOURCE")
    if env_src and env_src in ["MANUAL_CLI", "CLOUD_RUN_JOB", "CLOUD_SCHEDULER"]:
        return env_src
    if os.getenv("CLOUD_RUN_JOB") or os.getenv("CLOUD_RUN_EXECUTION") or os.getenv("K_SERVICE"):
        return "CLOUD_RUN_JOB"
    return "MANUAL_CLI"


def run_inventory_extraction(dataset_name: str = DEFAULT_BQ_DATASET, table_name: str = DEFAULT_BQ_TABLE, dry_run: bool = False, csv_output: str = DEFAULT_CSV_OUTPUT, execution_source: str | None = None):
    """Executes full agent inventory extraction and writes results to BigQuery or CSV in dry-run mode."""
    # 1. Validate input parameters
    _validate_parameters(dataset_name, table_name, csv_output)

    resolved_execution_source = _resolve_execution_source(execution_source)
    now_utc = datetime.now(timezone.utc)
    collection_timestamp_str = now_utc.isoformat()

    # Initialize BigQuery client and ensure schema (if not dry run)
    bq_client = bigquery.Client(project=PROJECT_ID)
    if not dry_run:
        full_table_id = ensure_dataset_and_table(bq_client, dataset_name=dataset_name, table_name=table_name)
    else:
        full_table_id = f"{PROJECT_ID}.{dataset_name}.{table_name}"
        logger.info("[DRY RUN] BigQuery dataset/table creation skipped.")

    # Generate incremental collection_id integer (1, 2, 3...)
    collection_id = _get_next_collection_id(bq_client, full_table_id, csv_output)

    logger.info("==================================================")
    logger.info("Starting GE Agent Inventory Extraction")
    logger.info(f"Target BigQuery Table: {full_table_id}")
    logger.info(f"Collection ID:        {collection_id}")
    logger.info(f"Execution Source:     {resolved_execution_source}")
    logger.info(f"Collection Timestamp: {collection_timestamp_str}")
    logger.info("==================================================")

    # 3. Extract agents across all platforms
    all_agents = []

    logger.info("Extracting Gemini Enterprise / Agent Designer No-Code Agents...")
    de_agents = extract_discovery_engine_agents()
    all_agents.extend(de_agents)

    def _enrich_registered_agent(target_rec: Dict[str, Any], source_rec: Dict[str, Any]) -> None:
        """Enriches a registered Gemini Enterprise agent record with additional technical
        runtime metadata extracted from a standalone Reasoning Engine or Cloud Run service record.
        """
        enrich_fields = [
            "reasoning_engine_id",
            "reasoning_engine_display_name",
            "reasoning_engine_location",
            "reasoning_engine_service_account",
            "query_url",
            "stream_query_url",
            "pickle_object_gcs_uri",
            "requirements_gcs_uri",
            "dependency_files_gcs_uri",
            "python_version",
            "agent_framework",
            "cloud_run_service_name",
            "cloud_run_region",
            "cloud_run_image",
            "cloud_run_service_account",
            "a2a_protocol_version",
            "a2a_skills",
            "a2a_agent_url",
        ]
        for field in enrich_fields:
            source_val = source_rec.get(field)
            if source_val and source_val != "N/A" and source_val != []:
                target_val = target_rec.get(field)
                if not target_val or target_val == "N/A" or target_val == []:
                    target_rec[field] = source_val

    # Collect reasoning engine IDs and Cloud Run URLs registered in Gemini Enterprise
    registered_re_ids = set()
    registered_cr_urls = set()

    for ag in de_agents:
        re_id = ag.get("reasoning_engine_id")
        if re_id and re_id != "N/A":
            registered_re_ids.add(re_id)
        cr_url = ag.get("a2a_agent_url") or ag.get("cloud_run_agent_url")
        if cr_url and cr_url != "N/A":
            registered_cr_urls.add(cr_url)

    logger.info("Extracting Agent Platform Reasoning Engines (ADK Code Agents)...")
    re_agents = extract_vertex_reasoning_engines()
    for re_ag in re_agents:
        re_id = re_ag.get("reasoning_engine_id") or re_ag.get("agent_id")
        if re_id not in registered_re_ids:
            all_agents.append(re_ag)
        else:
            # Enrich the existing registered agent record in de_agents
            for de_ag in de_agents:
                target_re_id = de_ag.get("reasoning_engine_id")
                if target_re_id and (target_re_id == re_id or re_id in target_re_id):
                    _enrich_registered_agent(de_ag, re_ag)
            logger.info(f"Skipping duplicate standalone Reasoning Engine '{re_ag.get('agent_name')}' ({re_id}) and enriched existing registered agent record with runtime metadata.")

    logger.info("Extracting Cloud Run Agent Services...")
    cr_agents = extract_cloud_run_agents()
    for cr_ag in cr_agents:
        cr_url = cr_ag.get("a2a_agent_url") or cr_ag.get("cloud_run_agent_url") or cr_ag.get("agent_id")
        cr_svc = cr_ag.get("cloud_run_service_name") or cr_ag.get("agent_name")
        if cr_url not in registered_cr_urls and not any(registered_url and cr_svc.lower() in registered_url.lower() for registered_url in registered_cr_urls if registered_url):
            all_agents.append(cr_ag)
        else:
            # Enrich the existing registered agent record in de_agents
            for de_ag in de_agents:
                target_url = de_ag.get("a2a_agent_url") or ""
                if cr_url == target_url or (cr_svc and cr_svc.lower() in target_url.lower()):
                    _enrich_registered_agent(de_ag, cr_ag)
            logger.info(f"Skipping duplicate standalone Cloud Run service '{cr_ag.get('agent_name')}' ({cr_url}) and enriched existing registered agent record with Cloud Run deployment metadata.")

    logger.info(f"Total Agents Extracted: {len(all_agents)}")

    # 4. Attach collection_id, collection_timestamp, and execution_source to each record
    final_records = []
    for agent in all_agents:
        record = {
            "collection_id": collection_id,
            "collection_timestamp": collection_timestamp_str,
            "execution_source": resolved_execution_source,
            "gcp_project_id": PROJECT_ID,
            **agent
        }
        final_records.append(record)

    # 5. Handle Dry Run mode (Write to CSV file)
    if dry_run:
        logger.info("==================================================")
        logger.info(f"[DRY RUN] Writing {len(final_records)} records to CSV file '{csv_output}'...")
        
        if final_records:
            fieldnames = list(final_records[0].keys())
            with open(csv_output, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for rec in final_records:
                    row = rec.copy()
                    # Flatten list values to string representations for CSV format
                    for k, v in row.items():
                        if isinstance(v, list):
                            row[k] = "; ".join(str(item) for item in v)
                    writer.writerow(row)
            logger.info(f"[DRY RUN] ✅ Successfully exported inventory to CSV file: {csv_output}")

        logger.info("[DRY RUN SUMMARY] Extracted Agent Records:")
        for idx, rec in enumerate(final_records, 1):
            logger.info(f"[{idx}] {rec['agent_platform']} | {rec['agent_name']} ({rec['agent_id']})")
            logger.info(f"    Collection ID: {rec['collection_id']} | Timestamp: {rec['collection_timestamp']} | Tools: {rec['tool_types']}")
        logger.info("==================================================")
        return final_records

    if not final_records:
        logger.warning("No agent records found during extraction. Skipping BigQuery insert.")
        return []

    logger.info(f"Loading {len(final_records)} records into BigQuery table '{full_table_id}' via BigQuery Load Job...")
    from bigquery_schema import AGENT_DETAILS_SCHEMA
    job_config = bigquery.LoadJobConfig(schema=AGENT_DETAILS_SCHEMA)
    load_job = bq_client.load_table_from_json(final_records, full_table_id, job_config=job_config)
    load_job.result()

    logger.info("==================================================")
    logger.info(f"✅ SUCCESS: Successfully inserted {len(final_records)} agent records into {full_table_id}")
    logger.info(f"Collection ID: {collection_id}")
    logger.info("==================================================")
    return final_records


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GE Agent Inventory Extractor")
    parser.add_argument("-d", "--dataset", type=str, default=DEFAULT_BQ_DATASET, help=f"BigQuery dataset name (default: {DEFAULT_BQ_DATASET})")
    parser.add_argument("-t", "--table", type=str, default=DEFAULT_BQ_TABLE, help=f"BigQuery table name (default: {DEFAULT_BQ_TABLE})")
    parser.add_argument("--dry-run", action="store_true", help="Extract agents and write to CSV without inserting into BigQuery")
    parser.add_argument("-o", "--output", type=str, default=DEFAULT_CSV_OUTPUT, help=f"CSV output file path for dry-run mode (default: {DEFAULT_CSV_OUTPUT})")
    parser.add_argument("-s", "--execution-source", type=str, choices=["MANUAL_CLI", "CLOUD_RUN_JOB", "CLOUD_SCHEDULER"], default=None, help="Extraction run execution source (MANUAL_CLI, CLOUD_RUN_JOB, CLOUD_SCHEDULER)")
    args = parser.parse_args()

    run_inventory_extraction(dataset_name=args.dataset, table_name=args.table, dry_run=args.dry_run, csv_output=args.output, execution_source=args.execution_source)
