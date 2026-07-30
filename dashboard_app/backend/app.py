import os
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import bigquery

# Setup Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("dashboard_backend")

app = FastAPI(title="Gemini Enterprise Agent Inventory Dashboard API", version="1.0.0")

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "agentspace-452714")
BQ_DATASET = os.getenv("BQ_DATASET_ID", "ge_agent_inventory")
BQ_TABLE = os.getenv("BQ_TABLE_ID", "agent_details")
FULL_TABLE_ID = f"{GCP_PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"

# Initialize BigQuery Client
bq_client = bigquery.Client(project=GCP_PROJECT_ID)


def _get_authenticated_user(request: Request) -> str:
    """Extract authenticated user email from IAP / Cloud Run headers or fallback."""
    # Direct IAP / Cloud Run IAM header
    auth_email = request.headers.get("X-Goog-Authenticated-User-Email", "")
    if auth_email:
        return auth_email.replace("accounts.google.com:", "").replace("user:", "")
    
    # Check alternate headers
    user_header = request.headers.get("X-User-Email") or request.headers.get("X-Goog-User-Email")
    if user_header:
        return user_header
    
    # Fallback for local development
    return os.getenv("DEFAULT_USER_EMAIL", "admin@caugusto.altostrat.com")


def _get_target_collection_id(collection_id: Optional[Any] = None) -> int:
    if collection_id is not None and not hasattr(collection_id, "default") and "Query" not in type(collection_id).__name__:
        try:
            return int(collection_id)
        except Exception:
            pass
    try:
        q = f"SELECT MAX(collection_id) as max_id FROM `{FULL_TABLE_ID}`"
        res = list(bq_client.query(q).result())
        if res and res[0]["max_id"] is not None:
            return res[0]["max_id"]
    except Exception as ex:
        logger.error(f"Error fetching max collection_id: {ex}")
    return 1


@app.get("/api/user")
def get_user_profile(request: Request):
    """Returns currently authenticated user profile."""
    user_email = _get_authenticated_user(request)
    return {
        "email": user_email,
        "is_admin": user_email == "admin@caugusto.altostrat.com" or "admin" in user_email,
        "authenticated_via": "Direct Cloud Run IAP / Google IAM"
    }


@app.get("/api/collections")
def list_collections():
    """Returns list of extraction run snapshots (collection_ids)."""
    try:
        query = f"""
        SELECT 
            collection_id, 
            CAST(MIN(collection_timestamp) AS STRING) as timestamp, 
            COUNT(*) as agent_count,
            ARRAY_AGG(DISTINCT execution_source)[OFFSET(0)] as execution_source
        FROM `{FULL_TABLE_ID}`
        GROUP BY collection_id
        ORDER BY collection_id DESC
        """
        job = bq_client.query(query)
        rows = [dict(r) for r in job.result()]
        return {"collections": rows}
    except Exception as e:
        logger.error(f"Error fetching collections: {e}")
        return {"collections": []}


@app.get("/api/filter_options")
def get_filter_options(collection_id: Optional[int] = Query(None)):
    """Returns distinct values for dropdown filters."""
    try:
        col_id = _get_target_collection_id(collection_id)
        where_clause = f"WHERE collection_id = {col_id}"
        
        query = f"""
        SELECT 
            ARRAY_AGG(DISTINCT gcp_project_id IGNORE NULLS) as projects,
            ARRAY_AGG(DISTINCT gemini_enterprise_instance_name IGNORE NULLS) as instances,
            ARRAY_AGG(DISTINCT agent_platform IGNORE NULLS) as platforms,
            ARRAY_AGG(DISTINCT access_scope IGNORE NULLS) as scopes,
            ARRAY_AGG(DISTINCT agent_status IGNORE NULLS) as statuses,
            ARRAY_AGG(DISTINCT author_email IGNORE NULLS) as authors,
            ARRAY_AGG(DISTINCT agent_environment IGNORE NULLS) as environments
        FROM `{FULL_TABLE_ID}`
        {where_clause}
        """
        job = bq_client.query(query)
        res = list(job.result())
        if res:
            r = dict(res[0])
            return {
                "projects": sorted(r.get("projects") or []),
                "instances": sorted(r.get("instances") or []),
                "platforms": sorted(r.get("platforms") or []),
                "scopes": sorted(r.get("scopes") or []),
                "statuses": sorted(r.get("statuses") or []),
                "authors": sorted(r.get("authors") or []),
                "environments": sorted(r.get("environments") or []),
            }
        return {}
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        return {}


def _parse_list_param(param: Optional[Any]) -> List[str]:
    """Parses single string, comma-separated string, or list parameter into a list of strings."""
    if param is None:
        return []
    # If param is FastAPI Query default object
    if hasattr(param, "default") or "Query" in type(param).__name__:
        return []
    if isinstance(param, list):
        res = []
        for item in param:
            if isinstance(item, str):
                res.extend([x.strip() for x in item.split(",") if x.strip()])
            elif item is not None and not hasattr(item, "default"):
                res.append(str(item))
        return res
    if isinstance(param, str):
        return [x.strip() for x in param.split(",") if x.strip()]
    return []


def _build_in_condition(column_name: str, values: List[str]) -> Optional[str]:
    """Builds SQL IN condition for a list of values."""
    if not values:
        return None
    escaped = [v.replace("'", "\\'") for v in values]
    items_str = ", ".join([f"'{v}'" for v in escaped])
    return f"{column_name} IN ({items_str})"


@app.get("/api/filter_options")
def get_filter_options(collection_id: Optional[int] = Query(None)):
    """Returns distinct values for dropdown filters."""
    try:
        col_id = _get_target_collection_id(collection_id)
        where_clause = f"WHERE collection_id = {col_id}"
        
        query = f"""
        SELECT 
            ARRAY_AGG(DISTINCT gcp_project_id IGNORE NULLS) as projects,
            ARRAY_AGG(DISTINCT gemini_enterprise_instance_name IGNORE NULLS) as instances,
            ARRAY_AGG(DISTINCT agent_platform IGNORE NULLS) as platforms,
            ARRAY_AGG(DISTINCT access_scope IGNORE NULLS) as scopes,
            ARRAY_AGG(DISTINCT agent_status IGNORE NULLS) as statuses,
            ARRAY_AGG(DISTINCT author_email IGNORE NULLS) as authors,
            ARRAY_AGG(DISTINCT agent_environment IGNORE NULLS) as environments
        FROM `{FULL_TABLE_ID}`
        {where_clause}
        """
        job = bq_client.query(query)
        res = list(job.result())
        if res:
            r = dict(res[0])
            raw_instances = sorted(r.get("instances") or [])
            # Filter out N/A standalone instances from instances dropdown
            real_instances = [inst for inst in raw_instances if inst and not inst.startswith("N/A")]

            return {
                "projects": sorted(r.get("projects") or []),
                "instances": real_instances,
                "platforms": sorted(r.get("platforms") or []),
                "scopes": sorted(r.get("scopes") or []),
                "statuses": sorted(r.get("statuses") or []),
                "authors": sorted(r.get("authors") or []),
                "environments": sorted(r.get("environments") or []),
            }
        return {}
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        return {}


@app.get("/api/stats")
def get_summary_stats(
    collection_id: Optional[int] = Query(None),
    platform: Optional[List[str]] = Query(None),
    uses_mcp: Optional[bool] = Query(None),
):
    """Computes computational overall stats for selected collection run."""
    try:
        col_id = _get_target_collection_id(collection_id)
        conditions = [f"collection_id = {col_id}"]
        
        selected_platforms = _parse_list_param(platform)
        # Check if user explicitly asked for Agent Registry (MCP)
        includes_mcp = any("MCP" in p for p in selected_platforms) or uses_mcp is True

        # By default exclude Agent Registry (MCP) unless explicitly requested
        if not includes_mcp:
            conditions.append("agent_platform != 'Agent Registry (MCP)'")

        if selected_platforms:
            plat_cond = _build_in_condition("agent_platform", selected_platforms)
            if plat_cond:
                conditions.append(plat_cond)

        where_clause = " WHERE " + " AND ".join(conditions)
        
        query = f"""
        SELECT 
            COUNT(*) as total_agents,
            COUNTIF(is_shared IS TRUE) as total_shared,
            COUNTIF(is_available_to_everyone IS TRUE) as total_enterprise_wide,
            COUNTIF(is_shared IS TRUE AND (is_available_to_everyone IS FALSE OR is_available_to_everyone IS NULL)) as total_restricted_shared,
            COUNTIF(is_shared IS FALSE OR is_shared IS NULL) as total_private,
            
            COUNTIF(uses_knowledge_sources IS TRUE OR uses_rag IS TRUE) as uses_rag_count,
            COUNTIF(uses_mcp IS TRUE) as uses_mcp_count,
            COUNTIF(uses_tools IS TRUE) as uses_tools_count,
            COUNTIF(uses_code_execution IS TRUE) as uses_code_count,
            
            COUNT(DISTINCT IF(gemini_enterprise_instance_name NOT LIKE 'N/A%' AND gemini_enterprise_instance_name IS NOT NULL, gemini_enterprise_instance_name, NULL)) as distinct_instances_count,
            COUNT(DISTINCT agent_platform) as distinct_platforms_count,

            COUNTIF(agent_platform LIKE '%Agent Designer%') as count_agent_designer,
            COUNTIF(agent_platform LIKE '%Agent Runtime%' OR agent_platform LIKE '%Reasoning Engine%') as count_agent_runtime,
            COUNTIF(agent_platform LIKE '%Cloud Run%') as count_cloud_run,
            COUNTIF(agent_platform LIKE '%GKE%') as count_gke,
            COUNTIF(agent_platform LIKE '%Workflow%') as count_workflow
        FROM `{FULL_TABLE_ID}`
        {where_clause}
        """
        job = bq_client.query(query)
        results = list(job.result())
        stats = dict(results[0]) if results else {}

        # Fetch instance breakdown (ONLY real Gemini Enterprise instances, excluding N/A)
        q_instances = f"""
        SELECT 
            gemini_enterprise_instance_name as name, 
            COUNT(*) as count 
        FROM `{FULL_TABLE_ID}` {where_clause} AND gemini_enterprise_instance_name NOT LIKE 'N/A%' AND gemini_enterprise_instance_name IS NOT NULL
        GROUP BY gemini_enterprise_instance_name
        ORDER BY count DESC
        """
        inst_job = bq_client.query(q_instances)
        stats["instances_breakdown"] = [dict(r) for r in inst_job.result()]

        # Fetch platform breakdown
        q_platforms = f"""
        SELECT 
            COALESCE(agent_platform, 'Unknown') as name, 
            COUNT(*) as count 
        FROM `{FULL_TABLE_ID}` {where_clause}
        GROUP BY agent_platform
        ORDER BY count DESC
        """
        plat_job = bq_client.query(q_platforms)
        stats["platforms_breakdown"] = [dict(r) for r in plat_job.result()]

        # Fetch top authors (owners) breakdown
        q_authors = f"""
        SELECT 
            COALESCE(author_email, 'Unknown') as name, 
            COUNT(*) as count 
        FROM `{FULL_TABLE_ID}` {where_clause}
        GROUP BY author_email
        ORDER BY count DESC
        LIMIT 4
        """
        auth_job = bq_client.query(q_authors)
        stats["authors_breakdown"] = [dict(r) for r in auth_job.result()]

        return stats
    except Exception as e:
        logger.error(f"Error computing stats: {e}")
        return {}


@app.get("/api/agents")
def get_agents(
    collection_id: Optional[int] = Query(None),
    gcp_project_id: Optional[List[str]] = Query(None),
    instance_name: Optional[List[str]] = Query(None),
    platform: Optional[List[str]] = Query(None),
    scope: Optional[List[str]] = Query(None),
    status: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    environment: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None),
    uses_rag: Optional[bool] = Query(None),
    uses_mcp: Optional[bool] = Query(None),
    uses_tools: Optional[bool] = Query(None),
    uses_code: Optional[bool] = Query(None),
    is_shared: Optional[bool] = Query(None),
    is_available_to_everyone: Optional[bool] = Query(None),
):
    """Returns filtered agent records supporting multi-select list values."""
    try:
        col_id = _get_target_collection_id(collection_id)
        conditions = [f"collection_id = {col_id}"]
            
        projects_list = _parse_list_param(gcp_project_id)
        if projects_list:
            c = _build_in_condition("gcp_project_id", projects_list)
            if c: conditions.append(c)

        instances_list = _parse_list_param(instance_name)
        if instances_list:
            c = _build_in_condition("gemini_enterprise_instance_name", instances_list)
            if c: conditions.append(c)

        platforms_list = _parse_list_param(platform)
        # Exclude Agent Registry (MCP) by default unless requested in platform or uses_mcp
        includes_mcp = any("MCP" in p for p in platforms_list) or uses_mcp is True
        if not includes_mcp:
            conditions.append("agent_platform != 'Agent Registry (MCP)'")

        if platforms_list:
            c = _build_in_condition("agent_platform", platforms_list)
            if c: conditions.append(c)

        scopes_list = _parse_list_param(scope)
        if scopes_list:
            c = _build_in_condition("access_scope", scopes_list)
            if c: conditions.append(c)

        statuses_list = _parse_list_param(status)
        if statuses_list:
            c = _build_in_condition("agent_status", statuses_list)
            if c: conditions.append(c)

        authors_list = _parse_list_param(author)
        if authors_list:
            c = _build_in_condition("author_email", authors_list)
            if c: conditions.append(c)

        environments_list = _parse_list_param(environment)
        if environments_list:
            c = _build_in_condition("agent_environment", environments_list)
            if c: conditions.append(c)
            
        if is_shared is True:
            conditions.append("is_shared IS TRUE")
        elif is_shared is False:
            conditions.append("(is_shared IS FALSE OR is_shared IS NULL)")

        if is_available_to_everyone is True:
            conditions.append("is_available_to_everyone IS TRUE")
        elif is_available_to_everyone is False:
            conditions.append("(is_available_to_everyone IS FALSE OR is_available_to_everyone IS NULL)")

        if uses_rag is True:
            conditions.append("(uses_knowledge_sources = TRUE OR uses_rag = TRUE)")
        if uses_mcp is True:
            conditions.append("uses_mcp = TRUE")
        if uses_tools is True:
            conditions.append("uses_tools = TRUE")
        if uses_code is True:
            conditions.append("uses_code_execution = TRUE")
            
        if search and isinstance(search, str):
            s_clean = search.lower().replace("'", "\\'")
            conditions.append(f"(LOWER(agent_name) LIKE '%{s_clean}%' OR LOWER(agent_id) LIKE '%{s_clean}%' OR LOWER(agent_description) LIKE '%{s_clean}%' OR LOWER(author_email) LIKE '%{s_clean}%')")

        where_sql = " WHERE " + " AND ".join(conditions) if conditions else ""
        
        query = f"SELECT * FROM `{FULL_TABLE_ID}`{where_sql} ORDER BY agent_name ASC"
        job = bq_client.query(query)
        rows = [dict(r) for r in job.result()]
        return {"agents": rows, "count": len(rows)}
    except Exception as e:
        logger.error(f"Error querying agents: {e}")
        return {"agents": [], "count": 0, "error": str(e)}


# Serve Frontend Static Assets if available
frontend_dist_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

