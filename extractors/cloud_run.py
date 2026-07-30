"""Extractor for Cloud Run Agent Services and A2A Protocol Endpoints."""

import json
import logging
import requests
from typing import List, Dict, Any, Optional

from google.auth.transport.requests import Request as AuthRequest
from google.oauth2 import id_token
from google.cloud import run_v2
from config import PROJECT_ID

logger = logging.getLogger(__name__)


def _get_id_token_for_url(url: str) -> Optional[str]:
    """Generates an OIDC ID token for authenticating calls to Cloud Run services."""
    try:
        auth_req = AuthRequest()
        token = id_token.fetch_id_token(auth_req, url)
        return token
    except Exception as e:
        logger.debug(f"Could not fetch OIDC ID token via ADC for {url}: {e}")
        # Fallback to gcloud CLI for local MANUAL_CLI execution
        import subprocess
        try:
            cmd = ["gcloud", "auth", "print-identity-token"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except Exception:
            pass
        return None


def _check_agent_card(service_url: str) -> Optional[Dict[str, Any]]:
    """Attempts to fetch agent card from well-known A2A endpoints with OIDC ID Token auth."""
    card_paths = [
        "/a2a/app/.well-known/agent-card.json",
        "/.well-known/agent-card.json",
    ]
    
    # Generate OIDC ID Token for IAM-authenticated Cloud Run services
    token = _get_id_token_for_url(service_url)
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    for path in card_paths:
        try:
            url = f"{service_url.rstrip('/')}{path}"
            resp = requests.get(url, headers=headers, timeout=3)
            if resp.status_code == 200 and "application/json" in resp.headers.get("Content-Type", ""):
                data = resp.json()
                if isinstance(data, dict):
                    # Validate that response is a genuine A2A Agent Card and not an application error payload
                    if "message" in data and "Error" in str(data.get("message")):
                        continue
                    if "error" in data:
                        continue
                    if any(k in data for k in ["skills", "protocolVersion", "protocol_version", "capabilities", "agent_name"]):
                        return data
        except Exception:
            continue
    return None


def extract_cloud_run_agents() -> List[Dict[str, Any]]:
    """Extract agent services running on Cloud Run using google-cloud-run Python SDK.

    Returns:
        List of agent dictionaries mapped to the BigQuery schema keys.
    """
    agents = []
    logger.info("Scanning Cloud Run services...")

    try:
        client = run_v2.ServicesClient()
        parent = f"projects/{PROJECT_ID}/locations/-"
        request = run_v2.ListServicesRequest(parent=parent)
        page_result = client.list_services(request=request)

        for svc in page_result:
            try:
                svc_name = svc.name  # Format: projects/.../locations/us-central1/services/my-service
                parts = svc_name.split("/")
                display_name = parts[-1] if len(parts) >= 6 else svc_name
                region = parts[3] if len(parts) >= 4 else "us-central1"
                uri = svc.uri

                created_ts = svc.create_time.isoformat() if svc.create_time else None
                updated_ts = svc.update_time.isoformat() if svc.update_time else created_ts
                last_deployed_by = svc.creator or "Cloud Run Deployer"

                container_image = None
                service_account = None
                if svc.template and svc.template.containers:
                    container_image = svc.template.containers[0].image
                if svc.template and svc.template.service_account:
                    service_account = f"sa://{svc.template.service_account}"

                # Check if service is a UI dashboard, frontend, or extractor app (and exclude it)
                is_dashboard_or_ui = any(kw in display_name.lower() for kw in ["dashboard", "extractor", "frontend", "ui-app"])
                if is_dashboard_or_ui:
                    logger.info(f"Skipping non-agent UI service: {display_name}")
                    continue

                # Check if service is an agent (by name keywords or A2A card)
                is_agent_service = any(kw in display_name.lower() for kw in ["agent", "a2a", "mcp", "assistant", "invoice", "travel", "process"])
                agent_card = _check_agent_card(uri) if uri else None

                if not is_agent_service and not agent_card:
                    continue

                if agent_card:
                    card_name = agent_card.get("name", display_name)
                    card_desc = agent_card.get("description", "A2A Agent Service on Cloud Run")
                    card_version = agent_card.get("version", "v1.0")
                    skills = agent_card.get("skills", [])
                    tool_types = [s.get("name", "A2A Skill") for s in skills] if isinstance(skills, list) else ["A2A Protocol Skills"]
                else:
                    card_name = display_name
                    card_desc = f"Cloud Run Agent Microservice ({uri})"
                    card_version = "v1.0"
                    skills = []
                    tool_types = ["Cloud Run Container Service"]

                # Check IAM policy for allUsers or allAuthenticatedUsers
                is_public = False
                try:
                    iam_policy = client.get_iam_policy(resource=svc_name)
                    for b in getattr(iam_policy, "bindings", []):
                        if "allUsers" in getattr(b, "members", []) or "allAuthenticatedUsers" in getattr(b, "members", []):
                            is_public = True
                            break
                except Exception as iam_err:
                    logger.debug(f"Could not check IAM policy for Cloud Run service {svc_name}: {iam_err}")

                agent_record = {
                    "gemini_enterprise_instance_name": "N/A (Standalone Cloud Run)",
                    "gemini_enterprise_instance_id": "N/A",
                    "agent_name": card_name,
                    "agent_id": svc_name,
                    "author_email": last_deployed_by if "@" in last_deployed_by else "admin@caugusto.altostrat.com",
                    "spiffe_id": f"principal://run.googleapis.com/{svc_name}",
                    "agent_description": card_desc,
                    "agent_owner_created_by": last_deployed_by,
                    "agent_platform": "Cloud Run (A2A)",
                    "agent_created_date": created_ts,
                    "agent_modified_date": updated_ts,
                    "agent_published_version": card_version,
                    "agent_published_date": created_ts,
                    "agent_status": "Published (Enabled)" if is_public else "Published (Private)",
                    "agent_environment": "Prod",
                    "agent_intent": f"A2A / Custom Container Agent ({card_name})",

                    # Sharing
                    "is_shared": is_public,
                    "shared_with_users": ["All users"] if is_public else [],
                    "permission_roles": [f"{last_deployed_by} (Agent Owner)", "All users (run.routesInvoker)"] if is_public else [f"{last_deployed_by} (Agent Owner)"],

                    # Config
                    "uses_knowledge_sources": False,
                    "knowledge_source_types": [],
                    "uses_tools": True,
                    "tool_types": tool_types,
                    "uses_http_requests": True,
                    "uses_mcp": "mcp" in display_name.lower(),
                    "uses_function_calling": True,
                    "uses_extensions": False,
                    "uses_code_execution": True,
                    "uses_rag": False,
                    "uses_memory": False,
                    "autonomous_agent": True,
                    "system_instructions": f"Containerized Agent Service running at {uri}",
                    "model": "Configured in Service Code",
                    "safety_configuration": "Container Level Security",
                    "authentication_method": "Cloud Run IAM / OIDC Token",

                    # Access Scope
                    "is_available_to_everyone": is_public,
                    "access_scope": "Public / Organization" if is_public else "Group",
                    "audience_size": "All Users" if is_public else "Authorized Invokers",
                    "target_audience_details": "Unauthenticated / All Users" if is_public else "IAM Principals with roles/run.routesInvoker",

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

                    # Cloud Run & A2A Details
                    "a2a_protocol_version": agent_card.get("protocolVersion", "0.3") if agent_card else None,
                    "a2a_agent_url": uri,
                    "a2a_skills": [f"{s.get('name', 'Skill')}: {s.get('description', '')}" for s in skills] if agent_card and isinstance(skills, list) else [],
                    "cloud_run_service_name": display_name,
                    "cloud_run_region": region,
                    "cloud_run_image": container_image,
                    "cloud_run_service_account": service_account or f"sa://{display_name}@{PROJECT_ID}.iam.gserviceaccount.com",
                }
                agents.append(agent_record)
            except Exception as e:
                logger.error(f"Error parsing Cloud Run service {getattr(svc, 'name', 'unknown')}: {e}")

    except Exception as e:
        logger.warning(f"Could not list Cloud Run services via Python SDK: {e}")

    logger.info(f"Extracted {len(agents)} Cloud Run agent services.")
    return agents
