"""Extractor for Discovery Engine / Gemini Enterprise / Agent Designer No-Code Agents and Registered Agents."""

import json
import logging
from typing import List, Dict, Any

import google.auth
from google.auth.transport.requests import Request
import requests

from google.cloud import discoveryengine_v1 as discoveryengine
from google.cloud import aiplatform_v1 as aiplatform
from google.protobuf.json_format import MessageToDict

from config import PROJECT_NUMBER, DISCOVERY_ENGINE_LOCATIONS

logger = logging.getLogger(__name__)


def _get_deployment_and_identity_details(ag: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts Reasoning Engine or Cloud Run/A2A identity and deployment details for registered agents."""
    details = {
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
        "a2a_protocol_version": None,
        "a2a_agent_url": None,
        "a2a_skills": [],
        "cloud_run_service_name": None,
        "cloud_run_region": None,
        "cloud_run_image": None,
        "cloud_run_service_account": None,
    }

    # 1. ADK / Reasoning Engine Registered Agent
    adk_def = ag.get("adkAgentDefinition", {})
    if adk_def:
        re_path = adk_def.get("provisionedReasoningEngine", {}).get("reasoningEngine")
        if re_path:
            details["reasoning_engine_id"] = re_path
            parts = re_path.split("/")
            if "locations" in parts:
                loc_idx = parts.index("locations") + 1
                re_loc = parts[loc_idx]
            else:
                re_loc = "us-central1"

            details["reasoning_engine_location"] = re_loc
            details["query_url"] = f"https://{re_loc}-aiplatform.googleapis.com/v1/{re_path}:query"
            details["stream_query_url"] = f"https://{re_loc}-aiplatform.googleapis.com/v1/{re_path}:streamQuery?alt=sse"
            details["reasoning_engine_service_account"] = f"sa://service-{PROJECT_NUMBER}@gcp-sa-aiplatform-re.iam.gserviceaccount.com"

            try:
                endpoint = f"{re_loc}-aiplatform.googleapis.com" if re_loc != "global" else "aiplatform.googleapis.com"
                client = aiplatform.ReasoningEngineServiceClient(client_options={"api_endpoint": endpoint})
                re_obj = client.get_reasoning_engine(name=re_path)
                re_dict = MessageToDict(re_obj._pb)

                details["reasoning_engine_display_name"] = re_obj.display_name or parts[-1]
                spec = re_dict.get("spec", {})
                pkg_spec = spec.get("packageSpec", {})
                details["pickle_object_gcs_uri"] = pkg_spec.get("pickleObjectGcsUri")
                details["requirements_gcs_uri"] = pkg_spec.get("requirementsGcsUri")
                details["dependency_files_gcs_uri"] = pkg_spec.get("dependencyFilesGcsUri")
                details["python_version"] = pkg_spec.get("pythonVersion", "3.11")
                details["agent_framework"] = spec.get("agentFramework", "google-adk")
            except Exception as ex:
                logger.debug(f"Could not fetch full Reasoning Engine details for {re_path}: {ex}")

    # 2. A2A / Cloud Run Registered Agent
    a2a_def = ag.get("a2aAgentDefinition", {})
    if a2a_def:
        card_raw = a2a_def.get("jsonAgentCard") or a2a_def.get("agentCard")
        card = {}
        if isinstance(card_raw, str):
            try:
                card = json.loads(card_raw)
            except Exception:
                pass
        elif isinstance(card_raw, dict):
            card = card_raw

        if card:
            details["a2a_agent_url"] = card.get("url")
            details["a2a_protocol_version"] = card.get("protocolVersion", "0.3")
            skills_list = card.get("skills", [])
            details["a2a_skills"] = [f"{s.get('name', 'Skill')}: {s.get('description', '')}" for s in skills_list] if isinstance(skills_list, list) else []

            # Infer Cloud Run details from URL
            a2a_url = details["a2a_agent_url"] or ""
            if ".run.app" in a2a_url:
                host = a2a_url.split("//")[-1].split(".")[0]
                svc_name = host.rsplit("-", 2)[0] if "-" in host else host
                details["cloud_run_service_name"] = svc_name
                details["cloud_run_region"] = "us-central1"
                details["cloud_run_service_account"] = f"sa://{svc_name}@agentspace-452714.iam.gserviceaccount.com"

    return details


def _format_timestamp(ts: Any) -> str | None:
    if ts is None:
        return None
    if isinstance(ts, str):
        return ts
    if hasattr(ts, "isoformat"):
        return ts.isoformat()
    if hasattr(ts, "ToDatetime"):
        return ts.ToDatetime().isoformat()
    return str(ts)


def _get_data_store_type(data_store_id: str, location: str) -> str:
    """Helper to fetch data store metadata and determine its type."""
    try:
        ds_client = discoveryengine.DataStoreServiceClient()
        ds_name = f"projects/{PROJECT_NUMBER}/locations/{location}/collections/default_collection/dataStores/{data_store_id}"
        ds = ds_client.get_data_store(name=ds_name)
        
        ds_dict = MessageToDict(ds._pb)
        
        if "drive" in data_store_id.lower():
            return "Google Drive"
        elif "bq" in data_store_id.lower() or "bigquery" in data_store_id.lower():
            return "BigQuery"
        elif "sharepoint" in data_store_id.lower():
            return "SharePoint"
        elif "gcs" in data_store_id.lower() or "storage" in data_store_id.lower():
            return "Google Cloud Storage"
        elif "site" in data_store_id.lower() or "website" in data_store_id.lower():
            return "Website"
        else:
            return f"Agent Platform Search DataStore ({data_store_id})"
    except Exception as e:
        logger.debug(f"Could not fetch details for DataStore {data_store_id}: {e}")
        return f"DataStore ({data_store_id})"


def extract_discovery_engine_agents() -> List[Dict[str, Any]]:
    """Extract no-code agents and registered agents from Discovery Engine / Gemini Enterprise.

    Dynamically discovers ALL Gemini Enterprise instances (engines) in the GCP project
    and extracts all agents registered under each instance.

    Returns:
        List of agent dictionaries mapped to the BigQuery schema keys.
    """
    agents = []

    # Get OAuth credentials for REST calls to Discovery Engine v1alpha
    headers = {}
    primary_author_email = "admin@caugusto.altostrat.com"  # Default admin/author email for Gemini Enterprise workspace
    try:
        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        credentials.refresh(Request())
        headers = {"Authorization": f"Bearer {credentials.token}"}
    except Exception as e:
        logger.warning(f"Could not refresh default OAuth credentials for REST calls: {e}")

    for location in DISCOVERY_ENGINE_LOCATIONS:
        try:
            client_options = None
            if location != "global":
                client_options = {"api_endpoint": f"{location}-discoveryengine.googleapis.com"}

            engine_client = discoveryengine.EngineServiceClient(client_options=client_options)
            parent = f"projects/{PROJECT_NUMBER}/locations/{location}/collections/default_collection"

            logger.info(f"Scanning Discovery Engine in location '{location}'...")
            engines = list(engine_client.list_engines(parent=parent))

            for engine in engines:
                try:
                    engine_pb = engine._pb
                    engine_dict = MessageToDict(engine_pb)

                    full_engine_path = engine.name  # e.g. projects/.../engines/test1-agentspace_1741135345115
                    engine_id = full_engine_path.split("/")[-1]
                    instance_display_name = engine.display_name or engine_id
                    
                    # Timestamps
                    created_ts = _format_timestamp(getattr(engine, "create_time", None))
                    updated_ts = _format_timestamp(getattr(engine, "update_time", None))

                    # Data stores / Knowledge Sources
                    data_store_ids = engine_dict.get("dataStoreIds", [])
                    uses_knowledge_sources = len(data_store_ids) > 0
                    knowledge_source_types = []
                    
                    for ds_id in data_store_ids:
                        ds_type = _get_data_store_type(ds_id, location)
                        if ds_type not in knowledge_source_types:
                            knowledge_source_types.append(ds_type)

                    # Engine Config (Chat Engine Config / Search Engine Config)
                    chat_config = engine_dict.get("chatEngineConfig", {})
                    
                    agent_intent = "Conversational Search / Assistant App"
                    system_instructions = chat_config.get("agentCreationConfig", {}).get("instructions", "")
                    model = chat_config.get("agentCreationConfig", {}).get("model", "Configured in Instance Settings")

                    # Tools & Extensions
                    tools = chat_config.get("agentCreationConfig", {}).get("tools", [])
                    tool_types = []
                    uses_extensions = False
                    uses_http_requests = False
                    uses_mcp = False
                    
                    for tool in tools:
                        tool_name = tool.get("name", "")
                        tool_type = tool.get("type", "Extension")
                        if tool_type not in tool_types:
                            tool_types.append(tool_type)
                        if "http" in tool_name.lower() or "api" in tool_name.lower():
                            uses_http_requests = True
                        if "mcp" in tool_name.lower():
                            uses_mcp = True
                        uses_extensions = True

                    if uses_knowledge_sources and "Data Stores" not in tool_types:
                        tool_types.append("Data Stores")

                    uses_tools = len(tool_types) > 0 or uses_knowledge_sources
                    uses_rag = uses_knowledge_sources
                    uses_memory = True
                    autonomous_agent = len(tools) > 1 or uses_extensions

                    # Access Scope / Audience defaults for Gemini Enterprise Intranet Apps
                    app_type = engine_dict.get("appType", "APP_TYPE_INTRANET")
                    is_available_to_everyone = True if app_type == "APP_TYPE_INTRANET" else False
                    access_scope = "Enterprise" if is_available_to_everyone else "Group"
                    audience_size = "Enterprise" if is_available_to_everyone else "Restricted"

                    agent_record = {
                        "gemini_enterprise_instance_name": instance_display_name,
                        "gemini_enterprise_instance_id": engine_id,
                        "agent_name": instance_display_name,
                        "agent_id": full_engine_path,
                        "author_email": primary_author_email,
                        "spiffe_id": f"principal://discoveryengine.googleapis.com/{full_engine_path}",
                        "agent_description": f"Gemini Enterprise Instance App Engine ({instance_display_name})",
                        "agent_owner_created_by": primary_author_email,
                        "agent_platform": "App Engine",
                        "agent_created_date": created_ts,
                        "agent_modified_date": updated_ts,
                        "agent_published_version": "v1.0",
                        "agent_published_date": updated_ts or created_ts,
                        "agent_status": "Published",
                        "agent_environment": "Prod",
                        "agent_intent": agent_intent,
                        
                        # Sharing
                        "is_shared": False,
                        "shared_with_users": [],
                        "permission_roles": [f"{primary_author_email} (Agent Owner)"],

                        # Config
                        "uses_knowledge_sources": uses_knowledge_sources,
                        "knowledge_source_types": knowledge_source_types,
                        "uses_tools": uses_tools,
                        "tool_types": tool_types,
                        "uses_http_requests": uses_http_requests,
                        "uses_mcp": uses_mcp,
                        "uses_function_calling": len(tools) > 0,
                        "uses_extensions": uses_extensions,
                        "uses_code_execution": False,
                        "uses_rag": uses_rag,
                        "uses_memory": uses_memory,
                        "autonomous_agent": autonomous_agent,
                        "system_instructions": system_instructions,
                        "model": model,
                        "safety_configuration": "Default Gemini Enterprise Guardrails",
                        "authentication_method": "Google Workspace / Cloud Identity SSO",
                        
                        # Access Scope
                        "is_available_to_everyone": is_available_to_everyone,
                        "access_scope": access_scope,
                        "audience_size": audience_size,
                        "target_audience_details": "Enterprise Users with Gemini Enterprise License",

                        # Deployment & Identity Details (Top-level Instance)
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
                        "a2a_protocol_version": None,
                        "a2a_agent_url": None,
                        "a2a_skills": [],
                        "cloud_run_service_name": None,
                        "cloud_run_region": None,
                        "cloud_run_image": None,
                        "cloud_run_service_account": None,
                    }
                    # We do NOT track/save the high-level Gemini Enterprise Instance App Engine record
                    # agents.append(agent_record)

                    # Extract Registered Agents under Assistant(s) for this Engine
                    if headers:
                        try:
                            api_host = f"{location}-discoveryengine.googleapis.com" if location != "global" else "discoveryengine.googleapis.com"
                            assistants_url = f"https://{api_host}/v1alpha/{full_engine_path}/assistants"
                            res = requests.get(assistants_url, headers=headers, timeout=10)
                            if res.status_code == 200:
                                assistants_list = res.json().get("assistants", [])
                                for ast in assistants_list:
                                    ast_name = ast.get("name")
                                    agents_url = f"https://{api_host}/v1alpha/{ast_name}/agents"
                                    ag_res = requests.get(agents_url, headers=headers, timeout=10)
                                    if ag_res.status_code == 200:
                                        registered_agents = ag_res.json().get("agents", [])
                                        for ag in registered_agents:
                                            ag_display = ag.get("displayName") or ag.get("name").split("/")[-1]
                                            ag_full_id = ag.get("name")
                                            ag_desc = ag.get("description") or ag.get("draftDescription") or ag.get("agentInvocationSpec", {}).get("description", "")

                                            tool_types_list = []
                                            ks_types_list = []
                                            sys_instruction = ag_desc
                                            llm_model = "Configured in Agent Code"

                                            if "dialogflowAgentDefinition" in ag:
                                                platform = "Dialogflow"
                                                tool_types_list.append("Dialogflow Bot")
                                            elif "adkAgentDefinition" in ag:
                                                platform = "Agent Runtime"
                                                tool_types_list.append("Python Code / Agent Engine")
                                            elif "managedAgentDefinition" in ag:
                                                platform = "Google Built-in Agent"
                                                tool_types_list.append("Google Managed Agent")
                                            elif "workflowAgentDefinition" in ag:
                                                platform = "Employee-made: Workflow Agent (Gemini Enterprise)"
                                                tool_types_list.append("Workflow Engine")
                                            elif "lowCodeAgentDefinition" in ag:
                                                platform = "Employee-made: Agent Designer (Gemini Enterprise)"
                                                tool_types_list.append("Agent Designer Prompt")
                                            elif "a2aAgentDefinition" in ag:
                                                platform = "Cloud Run (A2A)"
                                                tool_types_list.append("A2A Protocol Endpoint")
                                            else:
                                                platform = "Registered Agent"

                                            # Fetch IAM permissions/sharing policy
                                            is_shared = False
                                            shared_with_users = []
                                            permission_roles = []
                                            iam_owner_email = None
                                            try:
                                                iam_url = f"https://{api_host}/v1alpha/{ag_full_id}:getIamPolicy"
                                                iam_res = requests.get(iam_url, headers=headers, timeout=5)
                                                if iam_res.status_code == 200:
                                                    bindings = iam_res.json().get("bindings", [])
                                                    for binding in bindings:
                                                        role_name = binding.get("role", "")
                                                        role_label = role_name.split(".")[-1]
                                                        if role_label == "agentOwner":
                                                            role_label = "Agent Owner"
                                                        elif role_label == "agentUser":
                                                            role_label = "Agent User"
                                                        elif role_label == "agentViewer":
                                                            role_label = "Agent Viewer"
                                                        elif role_label == "admin":
                                                            role_label = "Admin"
                                                        
                                                        for m in binding.get("members", []):
                                                            clean_m = m.replace("user:", "").replace("group:", "").replace("serviceAccount:", "")
                                                            permission_roles.append(f"{clean_m} ({role_label})")
                                                            if role_label == "Agent Owner" and "@" in clean_m and not clean_m.startswith("gaia:"):
                                                                iam_owner_email = clean_m
                                                            if role_label != "Agent Owner":
                                                                is_shared = True
                                                                if clean_m not in shared_with_users:
                                                                    shared_with_users.append(clean_m)
                                            except Exception as iam_ex:
                                                logger.debug(f"Could not fetch IAM policy for agent {ag_full_id}: {iam_ex}")

                                            # Extract Low-Code Agent nodes (instructions, tools, data stores)
                                            lc = ag.get("lowCodeAgentDefinition", {})
                                            for node in lc.get("nodes", []):
                                                llm = node.get("llmAgentNode", {})
                                                if "instruction" in llm and llm["instruction"].strip():
                                                    sys_instruction = llm["instruction"].strip()
                                                if "model" in llm and llm["model"]:
                                                    llm_model = llm["model"]
                                                for tool in llm.get("selectedTools", {}).get("tool", []):
                                                    tname = tool.get("name")
                                                    if tname and tname not in tool_types_list:
                                                        tool_types_list.append(tname)
                                                for spec in llm.get("dataStoreSpecs", {}).get("specs", []):
                                                    ds_name = spec.get("dataStore", "")
                                                    if "drive" in ds_name.lower():
                                                        ds_label = "Drive"
                                                    elif "gmail" in ds_name.lower() or "mail" in ds_name.lower():
                                                        ds_label = "Google Mail"
                                                    elif "calendar" in ds_name.lower():
                                                        ds_label = "Google Calendar"
                                                    elif "servicenow" in ds_name.lower():
                                                        ds_label = "ServiceNow"
                                                    elif "announcement" in ds_name.lower() or "bq" in ds_name.lower() or "structured" in ds_name.lower():
                                                        ds_label = "Structured data"
                                                    else:
                                                        ds_label = ds_name.split("/")[-1]
                                                    if ds_label not in ks_types_list:
                                                        ks_types_list.append(ds_label)

                                            state = ag.get("state", "UNKNOWN")

                                            c_ts = _format_timestamp(ag.get("createTime"))
                                            u_ts = _format_timestamp(ag.get("updateTime"))

                                            ident_info = ag.get("agentIdentityInfo", {})
                                            raw_spiffe = ident_info.get("spiffeId", f"principal://discoveryengine.googleapis.com/{ag_full_id}")
                                            if raw_spiffe.startswith("principal:"):
                                                spiffe_id_val = raw_spiffe
                                            elif raw_spiffe.startswith("//"):
                                                spiffe_id_val = f"principal:{raw_spiffe}"
                                            else:
                                                spiffe_id_val = f"principal://{raw_spiffe.lstrip('/')}"
                                            
                                            # Determine Author Email
                                            author = None
                                            if iam_owner_email:
                                                author = iam_owner_email

                                            if not author:
                                                wf_owner = ag.get("workflowAgentDefinition", {}).get("owner", "")
                                                if wf_owner and "@" in wf_owner and not wf_owner.startswith("gaia:"):
                                                    author = wf_owner

                                            if not author and ident_info.get("spiffeIdType") == "USER":
                                                author = primary_author_email
                                            elif not author and ident_info.get("spiffeIdType") == "DEFAULT":
                                                author = "Google System Managed"
                                            elif not author:
                                                author = primary_author_email

                                            # Fetch Published Revisions / Version info
                                            pub_version = "v1.0"
                                            pub_date = u_ts or c_ts
                                            try:
                                                rev_url = f"https://{api_host}/v1alpha/{ag_full_id}/revisions"
                                                rev_res = requests.get(rev_url, headers=headers, timeout=5)
                                                if rev_res.status_code == 200:
                                                    agent_revs = rev_res.json().get("agentRevisions", [])
                                                    if agent_revs:
                                                        sorted_revs = sorted(agent_revs, key=lambda x: x.get("createTime", ""))
                                                        active_rev_name = ag.get("activeRevision")
                                                        matched_idx = None
                                                        if active_rev_name:
                                                            for idx, r in enumerate(sorted_revs, 1):
                                                                if r.get("name") == active_rev_name:
                                                                    matched_idx = idx
                                                                    if r.get("createTime") or r.get("updateTime"):
                                                                        pub_date = _format_timestamp(r.get("createTime") or r.get("updateTime"))
                                                                    break
                                                        if not matched_idx:
                                                            matched_idx = len(sorted_revs)
                                                            latest_r = sorted_revs[-1]
                                                            if latest_r.get("createTime") or latest_r.get("updateTime"):
                                                                pub_date = _format_timestamp(latest_r.get("createTime") or latest_r.get("updateTime"))
                                                        pub_version = f"v{matched_idx}.0"
                                            except Exception as rev_ex:
                                                logger.debug(f"Could not fetch revisions for agent {ag_full_id}: {rev_ex}")

                                            sharing = ag.get("sharingConfig", {})
                                            scope = sharing.get("scope", "RESTRICTED")
                                            is_everyone_reg = (scope == "ALL_USERS")

                                            # Determine Option B consistent agent_status
                                            state = ag.get("state", "UNKNOWN")
                                            if state == "DISABLED":
                                                status = "Disabled"
                                            elif pub_version and pub_version != "v0.0":
                                                if is_everyone_reg or is_shared:
                                                    status = "Published (Enabled)"
                                                else:
                                                    status = "Published (Private)"
                                            else:
                                                status = "Draft"

                                            # Fetch Reasoning Engine / Cloud Run / A2A Deployment & Identity Details
                                            dep_details = _get_deployment_and_identity_details(ag)

                                            reg_record = {
                                                "gemini_enterprise_instance_name": instance_display_name,
                                                "gemini_enterprise_instance_id": engine_id,
                                                "agent_name": ag_display,
                                                "agent_id": ag_full_id,
                                                "author_email": author,
                                                "spiffe_id": spiffe_id_val,
                                                "agent_description": ag_desc or f"Gemini Enterprise Registered Agent ({ag_display})",
                                                "agent_owner_created_by": author,
                                                "agent_platform": platform,
                                                "agent_created_date": c_ts,
                                                "agent_modified_date": u_ts,
                                                "agent_published_version": pub_version,
                                                "agent_published_date": pub_date,
                                                "agent_status": status,
                                                "agent_environment": "Prod",
                                                "agent_intent": ag_desc[:250] if ag_desc else "Conversational Assistant",

                                                "is_shared": is_shared,
                                                "shared_with_users": shared_with_users,
                                                "permission_roles": permission_roles,

                                                "uses_knowledge_sources": len(ks_types_list) > 0,
                                                "knowledge_source_types": ks_types_list,
                                                "uses_tools": len(tool_types_list) > 0,
                                                "tool_types": tool_types_list,
                                                "uses_http_requests": "a2a" in platform.lower() or "http" in ag_desc.lower(),
                                                "uses_mcp": "mcp" in ag_display.lower() or "mcp" in ag_desc.lower(),
                                                "uses_function_calling": len(tool_types_list) > 0,
                                                "uses_extensions": "a2a" in platform.lower(),
                                                "uses_code_execution": "adk" in platform.lower() or "agent engine" in platform.lower(),
                                                "uses_rag": len(ks_types_list) > 0 or "search" in ag_desc.lower(),
                                                "uses_memory": True,
                                                "autonomous_agent": "adk" in platform.lower() or "workflow" in platform.lower() or len(tool_types_list) > 1,
                                                "system_instructions": sys_instruction,
                                                "model": llm_model,
                                                "safety_configuration": "Default Gemini Enterprise Guardrails",
                                                "authentication_method": "Google Workspace / Cloud Identity SSO",

                                                "is_available_to_everyone": is_everyone_reg,
                                                "access_scope": "Enterprise" if is_everyone_reg else "Group / Private",
                                                "audience_size": "Enterprise" if is_everyone_reg else "Restricted",
                                                "target_audience_details": "Enterprise Users with Gemini Enterprise License" if is_everyone_reg else "Owner / Shared Users",

                                                # Deployment & Identity Details
                                                **dep_details,
                                            }
                                            agents.append(reg_record)
                        except Exception as ex:
                            logger.warning(f"Could not extract registered agents for engine {engine_id}: {ex}")

                except Exception as e:
                    logger.error(f"Error parsing Discovery Engine agent {getattr(engine, 'name', 'unknown')}: {e}")

        except Exception as e:
            logger.warning(f"Could not list Discovery Engine agents in location '{location}': {e}")

    # Exclude high-level Gemini Enterprise Instance App Engine records where agent_name == gemini_enterprise_instance_name
    agents = [
        ag for ag in agents 
        if ag.get("agent_name") != ag.get("gemini_enterprise_instance_name")
    ]

    logger.info(f"Extracted {len(agents)} total Discovery Engine / Gemini Enterprise agents & registered agents.")
    return agents
