"""Extractor for Agent Platform Reasoning Engines (ADK / Code Agents)."""

import logging
from typing import List, Dict, Any

from google.cloud import aiplatform_v1 as aiplatform
from google.protobuf.json_format import MessageToDict

from config import PROJECT_ID, VERTEX_AI_LOCATIONS

logger = logging.getLogger(__name__)


def _format_timestamp(ts: Any) -> str | None:
    if ts is None:
        return None
    if hasattr(ts, "isoformat"):
        return ts.isoformat()
    if hasattr(ts, "ToDatetime"):
        return ts.ToDatetime().isoformat()
    return str(ts)


def extract_vertex_reasoning_engines() -> List[Dict[str, Any]]:
    """Extract code-based agents from Agent Platform Reasoning Engine / Agent Engine.

    Returns:
        List of agent dictionaries mapped to the BigQuery schema keys.
    """
    agents = []

    for location in VERTEX_AI_LOCATIONS:
        try:
            if location == "global":
                client_options = {"api_endpoint": "aiplatform.googleapis.com"}
            else:
                client_options = {"api_endpoint": f"{location}-aiplatform.googleapis.com"}
            client = aiplatform.ReasoningEngineServiceClient(client_options=client_options)
            parent = f"projects/{PROJECT_ID}/locations/{location}"

            logger.info(f"Scanning Agent Platform Reasoning Engines in location '{location}'...")
            reasoning_engines = client.list_reasoning_engines(parent=parent)

            for re in reasoning_engines:
                try:
                    re_dict = MessageToDict(re._pb)
                    engine_id = re.name
                    display_name = re.display_name or engine_id.split("/")[-1]
                    description = re.description or "Agent Platform Reasoning Engine Code Agent"

                    # Timestamps
                    created_ts = _format_timestamp(getattr(re, "create_time", None))
                    updated_ts = _format_timestamp(getattr(re, "update_time", None))

                    # Spec & Requirements
                    spec = re_dict.get("spec", {})
                    package_spec = spec.get("packageSpec", {})
                    requirements = package_spec.get("requirements", [])
                    python_version = package_spec.get("pythonVersion", "3.11")

                    # Identify tools and features from python dependencies / class spec
                    tool_types = ["Python Code / Functions"]
                    uses_mcp = any("mcp" in req.lower() for req in requirements)
                    uses_http = any("requests" in req.lower() or "httpx" in req.lower() for req in requirements)
                    uses_rag = any("langchain" in req.lower() or "llama" in req.lower() or "vector" in req.lower() for req in requirements)
                    
                    if uses_mcp:
                        tool_types.append("Model Context Protocol (MCP)")
                    if uses_http:
                        tool_types.append("APIs / HTTP REST")

                    model = "Configured in Agent Code"

                    agent_record = {
                        "gemini_enterprise_instance_name": "N/A (Standalone Agent Engine)",
                        "gemini_enterprise_instance_id": "N/A",
                        "agent_name": display_name,
                        "agent_id": engine_id,
                        "author_email": "admin@caugusto.altostrat.com",
                        "spiffe_id": f"principal://aiplatform.googleapis.com/{engine_id}",
                        "agent_description": description,
                        "agent_platform": "Agent Runtime",
                        "agent_created_date": created_ts,
                        "agent_modified_date": updated_ts,
                        "agent_published_version": "v1.0",
                        "agent_published_date": updated_ts or created_ts,
                        "agent_status": "Published (Private)",
                        "agent_environment": "Dev / Prod",
                        "agent_intent": f"Code Agent ({display_name})",

                        # Sharing
                        "is_shared": False,
                        "shared_with_users": [],
                        "permission_roles": ["admin@caugusto.altostrat.com (Agent Owner)"],

                        # Config
                        "uses_knowledge_sources": uses_rag,
                        "knowledge_source_types": ["Vector Database / Python RAG"] if uses_rag else [],
                        "uses_tools": True,
                        "tool_types": tool_types,
                        "uses_http_requests": uses_http,
                        "uses_mcp": uses_mcp,
                        "uses_function_calling": True,
                        "uses_extensions": False,
                        "uses_code_execution": True,
                        "uses_rag": uses_rag,
                        "uses_memory": True,
                        "autonomous_agent": True,
                        "system_instructions": f"Configured in Python agent code (Python {python_version})",
                        "model": model,
                        "safety_configuration": "Standard Agent Platform Safety Settings",
                        "authentication_method": "Google Cloud IAM / OAuth2",

                        # Access Scope
                        "is_available_to_everyone": False,
                        "access_scope": "Group",
                        "audience_size": "Authorized IAM Users & Services",
                        "target_audience_details": "IAM Principals with ReasoningEngine Invoker role",

                        # Reasoning Engine Details
                        "reasoning_engine_id": engine_id,
                        "reasoning_engine_display_name": display_name,
                        "reasoning_engine_location": location,
                        "reasoning_engine_service_account": f"sa://service-16933400417@gcp-sa-aiplatform-re.iam.gserviceaccount.com",
                        "query_url": f"https://{location}-aiplatform.googleapis.com/v1/{engine_id}:query",
                        "stream_query_url": f"https://{location}-aiplatform.googleapis.com/v1/{engine_id}:streamQuery?alt=sse",
                        "pickle_object_gcs_uri": package_spec.get("pickleObjectGcsUri"),
                        "requirements_gcs_uri": package_spec.get("requirementsGcsUri"),
                        "dependency_files_gcs_uri": package_spec.get("dependencyFilesGcsUri"),
                        "python_version": python_version,
                        "agent_framework": spec.get("agentFramework", "google-adk"),

                        # Cloud Run & A2A Nulls
                        "a2a_protocol_version": None,
                        "a2a_agent_url": None,
                        "a2a_skills": [],
                        "cloud_run_service_name": None,
                        "cloud_run_region": None,
                        "cloud_run_image": None,
                        "cloud_run_service_account": None,
                    }
                    agents.append(agent_record)
                except Exception as e:
                    logger.error(f"Error parsing Reasoning Engine {getattr(re, 'name', 'unknown')}: {e}")

        except Exception as e:
            logger.warning(f"Could not list Reasoning Engines in location '{location}': {e}")

    logger.info(f"Extracted {len(agents)} Agent Platform Reasoning Engine agents.")
    return agents
