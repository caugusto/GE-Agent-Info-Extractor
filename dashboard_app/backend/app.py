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


def _get_target_collection_id(collection_id: Optional[int] = None) -> int:
    if collection_id is not None:
        return collection_id
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


@app.get("/api/stats")
def get_summary_stats(collection_id: Optional[int] = Query(None)):
    """Computes computational overall stats for selected collection run."""
    try:
        col_id = _get_target_collection_id(collection_id)
        where_clause = f"WHERE collection_id = {col_id}"
        
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
        if results:
            return dict(results[0])
        return {}
    except Exception as e:
        logger.error(f"Error computing stats: {e}")
        return {}


@app.get("/api/agents")
def get_agents(
    collection_id: Optional[int] = Query(None),
    gcp_project_id: Optional[str] = Query(None),
    instance_name: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    uses_rag: Optional[bool] = Query(None),
    uses_mcp: Optional[bool] = Query(None),
    uses_tools: Optional[bool] = Query(None),
    uses_code: Optional[bool] = Query(None),
    is_shared: Optional[bool] = Query(None),
    is_available_to_everyone: Optional[bool] = Query(None),
):
    """Returns filtered agent records."""
    try:
        col_id = _get_target_collection_id(collection_id)
        conditions = [f"collection_id = {col_id}"]
            
        if gcp_project_id:
            conditions.append(f"gcp_project_id = '{gcp_project_id}'")
        if instance_name:
            conditions.append(f"gemini_enterprise_instance_name = '{instance_name}'")
        if platform:
            conditions.append(f"agent_platform = '{platform}'")
        if scope:
            conditions.append(f"access_scope = '{scope}'")
        if status:
            conditions.append(f"agent_status = '{status}'")
        if author:
            conditions.append(f"author_email = '{author}'")
        if environment:
            conditions.append(f"agent_environment = '{environment}'")
            
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
            
        if search:
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

