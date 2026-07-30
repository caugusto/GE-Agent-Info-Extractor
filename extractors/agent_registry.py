"""Extractor for Google Cloud Agent Registry API (agentregistry.googleapis.com).

Queries agentregistry.googleapis.com across locations to discover built-in Google A2A agents,
registered Agent Registry services, A2A skill manifests, and registered MCP servers.
"""

import logging
import requests
from typing import List, Dict, Any

import google.auth
from google.auth.transport.requests import Request as AuthRequest
from config import PROJECT_ID

logger = logging.getLogger(__name__)

# Search locations for Agent Registry API
AGENT_REGISTRY_LOCATIONS = ["global", "us-central1", "us-east1", "us-west1", "us", "eu"]


def _get_auth_token() -> str:
    """Retrieves Google ADC access token for authenticating calls to agentregistry.googleapis.com."""
    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    credentials.refresh(AuthRequest())
    return credentials.token


def extract_agent_registry_agents() -> List[Dict[str, Any]]:
    """Extracts agents, services, and MCP servers registered in Google Cloud Agent Registry API.

    Returns:
        List of agent dictionary records structured according to AGENT_DETAILS_SCHEMA.
    """
    extracted_agents = []
    seen_ids = set()

    try:
        token = _get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        logger.error(f"Failed to obtain ADC access token for Agent Registry API: {e}")
        return []

    for location in AGENT_REGISTRY_LOCATIONS:
        # 1. Query Agents endpoint
        url_agents = f"https://agentregistry.googleapis.com/v1/projects/{PROJECT_ID}/locations/{location}/agents"
        try:
            resp = requests.get(url_agents, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                raw_agents = data.get("agents", [])
                logger.info(f"Scanned Agent Registry location '{location}': found {len(raw_agents)} agents.")
                
                for ag in raw_agents:
                    res_name = ag.get("name", "")
                    agent_urn = ag.get("agentId", "") or res_name
                    
                    if not agent_urn or agent_urn in seen_ids:
                        continue
                    seen_ids.add(agent_urn)

                    display_name = ag.get("displayName") or "Agent Registry Service"
                    description = ag.get("description") or "Registered agent in Google Cloud Agent Registry."
                    version = ag.get("version") or "1.0"
                    
                    # Extract protocol version & endpoint URL
                    protocol_ver = "0.3.0"
                    endpoint_url = "N/A"
                    protocols = ag.get("protocols", [])
                    if protocols and isinstance(protocols, list):
                        p0 = protocols[0]
                        protocol_ver = p0.get("protocolVersion") or p0.get("type") or "0.3.0"
                        interfaces = p0.get("interfaces", [])
                        if interfaces and isinstance(interfaces, list):
                            endpoint_url = interfaces[0].get("url") or "N/A"

                    # Extract skills
                    skills_list = []
                    raw_skills = ag.get("skills", [])
                    if raw_skills and isinstance(raw_skills, list):
                        for s in raw_skills:
                            s_name = s.get("name") or s.get("id")
                            s_desc = s.get("description")
                            if s_name:
                                if s_desc:
                                    skills_list.append(f"{s_name}: {s_desc}")
                                else:
                                    skills_list.append(s_name)

                    # Determine platform classification
                    if "workspaceagent" in agent_urn.lower() or "google" in agent_urn.lower():
                        platform = "Google Built-in Agent (A2A)"
                        author = "Google System Managed"
                        access_scope = "Enterprise"
                        is_everyone = True
                        is_shared = True
                    elif "reasoningengines" in agent_urn.lower():
                        platform = "Agent Runtime"
                        author = "admin@caugusto.altostrat.com"
                        access_scope = "Private"
                        is_everyone = False
                        is_shared = False
                    else:
                        platform = "Agent Registry (A2A)"
                        author = "admin@caugusto.altostrat.com"
                        access_scope = "Enterprise"
                        is_everyone = True
                        is_shared = True

                    record = {
                        "gemini_enterprise_instance_name": "N/A (Agent Registry)",
                        "gemini_enterprise_instance_id": "N/A",
                        "agent_name": display_name,
                        "agent_id": agent_urn,
                        "author_email": author,
                        "spiffe_id": f"spiffe://gcp.cloud/agentregistry/{location}/{display_name.lower().replace(' ', '-')}",
                        "agent_description": description,
                        "agent_platform": platform,
                        "agent_created_date": ag.get("createTime"),
                        "agent_modified_date": ag.get("updateTime"),
                        "agent_published_version": version,
                        "agent_published_date": ag.get("createTime"),
                        "agent_status": "Published (Enabled)",
                        "agent_environment": "Prod",
                        "agent_intent": description[:200] if description else "N/A",
                        "is_shared": is_shared,
                        "shared_with_users": [],
                        "permission_roles": [f"{author} (Owner)"] if author else [],
                        "uses_knowledge_sources": False,
                        "knowledge_source_types": [],
                        "uses_tools": len(skills_list) > 0,
                        "tool_types": ["A2A Skills"] if skills_list else [],
                        "uses_http_requests": True,
                        "uses_mcp": False,
                        "uses_function_calling": len(skills_list) > 0,
                        "uses_extensions": False,
                        "uses_code_execution": False,
                        "uses_rag": False,
                        "uses_memory": False,
                        "autonomous_agent": True,
                        "system_instructions": f"Google Cloud Agent Registry Service ({display_name}). Version: {version}",
                        "model": "Gemini 2.5 Flash",
                        "safety_configuration": "Default Safety Filter",
                        "authentication_method": "OAuth2 / OIDC Bearer Token",
                        "is_available_to_everyone": is_everyone,
                        "access_scope": access_scope,
                        "audience_size": "Enterprise-wide" if is_everyone else "Individual",
                        "target_audience_details": "Google Cloud Workspace & AI Orchestrator Agents",
                        "a2a_protocol_version": protocol_ver,
                        "a2a_agent_url": endpoint_url,
                        "a2a_skills": skills_list,
                    }
                    extracted_agents.append(record)
            elif resp.status_code != 404:
                logger.debug(f"Agent Registry list agents status {resp.status_code} for location '{location}': {resp.text[:100]}")
        except Exception as e:
            logger.debug(f"Could not list Agent Registry agents in location '{location}': {e}")

        # 2. Query McpServers endpoint
        url_mcp = f"https://agentregistry.googleapis.com/v1/projects/{PROJECT_ID}/locations/{location}/mcpServers"
        try:
            resp = requests.get(url_mcp, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                raw_mcp = data.get("mcpServers", [])
                if raw_mcp:
                    logger.info(f"Scanned Agent Registry location '{location}': found {len(raw_mcp)} MCP servers.")
                    for mcp in raw_mcp:
                        mcp_name = mcp.get("displayName") or mcp.get("name") or "Agent Registry MCP Server"
                        mcp_urn = mcp.get("name") or f"mcp-{location}-{mcp_name}"
                        if mcp_urn in seen_ids:
                            continue
                        seen_ids.add(mcp_urn)

                        record = {
                            "gemini_enterprise_instance_name": "N/A (Agent Registry MCP)",
                            "gemini_enterprise_instance_id": "N/A",
                            "agent_name": mcp_name,
                            "agent_id": mcp_urn,
                            "author_email": "admin@caugusto.altostrat.com",
                            "spiffe_id": f"spiffe://gcp.cloud/agentregistry/mcp/{location}/{mcp_name.lower().replace(' ', '-')}",
                            "agent_description": f"Model Context Protocol (MCP) Server registered in Agent Registry ({location}).",
                            "agent_platform": "Agent Registry (MCP)",
                            "agent_created_date": mcp.get("createTime"),
                            "agent_modified_date": mcp.get("updateTime"),
                            "agent_published_version": "1.0",
                            "agent_published_date": mcp.get("createTime"),
                            "agent_status": "Published (Enabled)",
                            "agent_environment": "Prod",
                            "agent_intent": "MCP Tool Provider",
                            "is_shared": True,
                            "shared_with_users": [],
                            "permission_roles": ["admin@caugusto.altostrat.com (Owner)"],
                            "uses_knowledge_sources": False,
                            "knowledge_source_types": [],
                            "uses_tools": True,
                            "tool_types": ["MCP"],
                            "uses_http_requests": True,
                            "uses_mcp": True,
                            "uses_function_calling": True,
                            "uses_extensions": False,
                            "uses_code_execution": False,
                            "uses_rag": False,
                            "uses_memory": False,
                            "autonomous_agent": False,
                            "system_instructions": f"MCP Server registered in Agent Registry ({location}).",
                            "model": "N/A (MCP Server)",
                            "safety_configuration": "Default Safety Filter",
                            "authentication_method": "OAuth2 / IAM",
                            "is_available_to_everyone": True,
                            "access_scope": "Enterprise",
                            "audience_size": "Enterprise-wide",
                            "target_audience_details": "Agent Space Orchestrator",
                            "a2a_protocol_version": "1.0",
                            "a2a_agent_url": mcp.get("endpointUrl") or "N/A",
                            "a2a_skills": [],
                        }
                        extracted_agents.append(record)
        except Exception as e:
            logger.debug(f"Could not list Agent Registry MCP servers in location '{location}': {e}")

    logger.info(f"Extracted {len(extracted_agents)} total agents & MCP servers from Agent Registry API.")
    return extracted_agents
