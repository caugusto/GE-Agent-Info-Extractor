"""Extractor for Google Kubernetes Engine (GKE) A2A Agent Services.

Scans GKE clusters across configured regions for exposed container endpoints that serve
valid Agent-to-Agent (A2A) protocol agent cards (/.well-known/agent-card.json).
Only genuine A2A AI agents are extracted.
"""

import logging
import urllib3
import requests
from typing import List, Dict, Any, Optional
from google.cloud import container_v1
import config

# Suppress insecure HTTPS request warnings when probing endpoints
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


def _check_agent_card(endpoint_url: str) -> Optional[Dict[str, Any]]:
    """Probes the target endpoint for a valid A2A Agent Card JSON payload.
    
    Returns the parsed dictionary if a valid agent card is found, or None if invalid.
    """
    if not endpoint_url:
        return None

    card_path = ".well-known/agent-card.json"
    headers = {"Accept": "application/json"}

    for scheme in ["https", "http"]:
        if endpoint_url.startswith("http://") or endpoint_url.startswith("https://"):
            target = f"{endpoint_url.rstrip('/')}/{card_path}"
        else:
            target = f"{scheme}://{endpoint_url.rstrip('/')}/{card_path}"

        try:
            resp = requests.get(target, headers=headers, timeout=4, verify=False)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict) and ("name" in data or "skills" in data or "a2a" in str(data).lower()):
                    return data
        except Exception:
            pass
    return None


def extract_gke_agents(project_id: str = config.PROJECT_ID, locations: List[str] = config.GKE_LOCATIONS) -> List[Dict[str, Any]]:
    """Scans GKE clusters in target locations for exposed A2A agent services."""
    extracted_agents = []

    try:
        client = container_v1.ClusterManagerClient()
    except Exception as err:
        logger.debug(f"Could not initialize GKE ClusterManagerClient: {err}")
        return []

    for loc in locations:
        parent = f"projects/{project_id}/locations/{loc}"
        try:
            logger.info(f"Scanning GKE clusters in location '{loc}'...")
            resp = client.list_clusters(parent=parent)
            clusters = resp.clusters or []

            for cluster in clusters:
                if cluster.status != container_v1.Cluster.Status.RUNNING:
                    continue

                cluster_name = cluster.name
                cluster_endpoint = cluster.endpoint  # External endpoint / IP

                if cluster_endpoint:
                    card = _check_agent_card(cluster_endpoint)
                    if card:
                        card_name = card.get("name", f"GKE Agent ({cluster_name})")
                        card_desc = card.get("description", f"GKE A2A Agent Service ({cluster_name})")
                        skills = card.get("skills", [])
                        tool_types = [s.get("name", "A2A Skill") for s in skills] if isinstance(skills, list) else ["A2A Protocol Skills"]

                        agent_id = f"projects/{project_id}/locations/{loc}/clusters/{cluster_name}"
                        spiffe_id = f"principal://container.googleapis.com/{agent_id}"

                        record = {
                            "gemini_enterprise_instance_name": "N/A (Standalone GKE)",
                            "gemini_enterprise_instance_id": "N/A",
                            "agent_name": card_name,
                            "agent_id": agent_id,
                            "author_email": f"gke-admin@{project_id}.iam.gserviceaccount.com",
                            "spiffe_id": spiffe_id,
                            "agent_description": card_desc,
                            "agent_platform": "GKE (A2A)",
                            "agent_created_date": None,
                            "agent_modified_date": None,
                            "agent_published_version": card.get("version", "v1.0"),
                            "agent_published_date": None,
                            "agent_status": "Published (Enabled)",
                            "agent_environment": "Prod",
                            "agent_intent": card_desc[:250],

                            # Permissions
                            "is_shared": False,
                            "shared_with_users": [],
                            "permission_roles": [f"GKE Admin ({cluster_name})"],

                            # Features
                            "uses_knowledge_sources": False,
                            "knowledge_source_types": [],
                            "uses_tools": True,
                            "tool_types": tool_types,
                            "uses_http_requests": True,
                            "uses_mcp": False,
                            "uses_function_calling": True,
                            "uses_extensions": False,
                            "uses_code_execution": True,
                            "uses_rag": False,
                            "uses_memory": False,
                            "autonomous_agent": True,
                            "system_instructions": f"GKE A2A Agent Container Service running at {cluster_endpoint}",
                            "model": "Configured in Container Code",
                            "safety_configuration": "GKE Cluster Level Security",
                            "authentication_method": "A2A Protocol / GKE OIDC",

                            # Access Scope
                            "is_available_to_everyone": True,
                            "access_scope": "Organization",
                            "audience_size": "GKE Invokers",
                            "target_audience_details": f"GKE Cluster {cluster_name}",

                            # Reasoning Engine Nulls
                            "reasoning_engine_id": None,
                            "reasoning_engine_display_name": None,
                            "reasoning_engine_location": None,
                            "reasoning_engine_service_account": None,
                            "query_url": None,
                            "stream_query_url": None,
                            "pickle_object_gcs_uri": None,
                            "requirements_gcs_uri": None,
                            "dependency_files_gcs_uri": None,
                            "python_version": None,
                            "agent_framework": None,

                            # Cloud Run / Container Nulls
                            "cloud_run_service_name": None,
                            "cloud_run_service_uri": f"https://{cluster_endpoint}",
                            "cloud_run_location": loc,
                            "cloud_run_container_image": None,
                            "cloud_run_service_account": None,

                            # A2A Details
                            "a2a_agent_url": f"https://{cluster_endpoint}",
                            "a2a_skills": [s.get("name") if isinstance(s, dict) else str(s) for s in skills],
                        }
                        extracted_agents.append(record)

        except Exception as e:
            logger.debug(f"Could not list GKE clusters in '{loc}': {e}")

    logger.info(f"Extracted {len(extracted_agents)} GKE agent services.")
    return extracted_agents
