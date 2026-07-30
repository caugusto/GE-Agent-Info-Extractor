# BigQuery Agent Inventory Data Dictionary

This document details every column in the BigQuery table `ge_agent_inventory.agent_details`. It explains the **Extraction Logic**, **Possible Values**, **When Each Value Occurs**, and **Applicability by Agent Type**.

---

## Table Overview
- **Dataset**: `ge_agent_inventory` (default)
- **Table**: `agent_details` (default)
- **Partitioning**: Partitioned by `collection_timestamp` (DAY)
- **Primary Search Pattern**: Query by `collection_id = (SELECT MAX(collection_id) FROM ...)` to get the latest snapshot.

---

## Column Specifications

### 1. Run Metadata

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `collection_id` | `INT64` | Auto-incrementing run integer calculated as `MAX(collection_id) + 1` from BigQuery before each run. | `1`, `2`, `3`, ... | Generated automatically at the start of every extraction run. |
| `collection_timestamp` | `TIMESTAMP` | UTC timestamp when the extraction job started. Used as table partition key. | ISO 8601 Timestamp string (e.g. `2026-07-28 21:12:31 UTC`) | Generated automatically at the start of every extraction run. |
| `execution_source` | `STRING` | Source of the extraction run. Indicates whether the script was run manually via local CLI, directly as a Cloud Run Job execution, or triggered on schedule via Cloud Scheduler. | • `MANUAL_CLI`<br>• `CLOUD_RUN_JOB`<br>• `CLOUD_SCHEDULER` | Resolved from `--execution-source` CLI argument, `EXECUTION_SOURCE` environment variable, or Cloud Run runtime environment (`CLOUD_RUN_JOB` / `K_SERVICE`). |
| `gcp_project_id` | `STRING` | GCP Project ID where the agent resides. Extracted from project configuration or resource path. | GCP Project ID (e.g. `agentspace-452714`) | Set automatically on every record during extraction run. |

---

### 2. Gemini Enterprise Instance Context

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `gemini_enterprise_instance_name` | `STRING` | Display name of the parent Gemini Enterprise app/instance (engine). | • Instance name (e.g. `Test1 Agentspace`, `workshop-1`)<br>• `N/A (Standalone Agent Engine)`<br>• `N/A (Standalone Cloud Run)` | Returns instance name if agent is registered in a Gemini Enterprise instance. Returns `N/A (...)` for un-registered standalone Vertex AI or Cloud Run agents. |
| `gemini_enterprise_instance_id` | `STRING` | Resource ID of the parent Gemini Enterprise engine. | • Instance ID (e.g. `test1-agentspace_1741135345115`)<br>• `N/A` | Returns engine resource ID if agent is in Gemini Enterprise. Returns `N/A` otherwise. |

---

### 3. Foundational & Registry Info

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `agent_name` | `STRING` | Display name of the agent. | Human-readable string (e.g. `Switchcraft ADK BQ Native Agent`, `HRJobInclusiWrite`) | Extracted from `displayName` in Discovery Engine, Reasoning Engine, or Cloud Run service name. |
| `agent_id` | `STRING` | Full GCP resource name or URL. | • `projects/.../engines/.../agents/<ID>`<br>• `projects/.../locations/.../reasoningEngines/<ID>`<br>• Service URL (`https://<service>.run.app`) | Unique full resource path identifier for the agent across GCP APIs. |
| `author_email` | `STRING` | Author or creator email. | Email address (e.g. `admin@caugusto.altostrat.com`, service account email) | Extracted from `agentOwnerCreatedBy` or defaults to active GCP credentials email. |
| `spiffe_id` | `STRING` | SPIFFE identity URI for workload identity. | `principal://<service>.googleapis.com/<resource_path>` | Derived from the GCP service authority and resource path. |
| `agent_description` | `STRING` | Agent summary or description. | Free-text string | Extracted from agent definition `description`, draft description, or reasoning engine spec. |
| `agent_platform` | `STRING` | Underlying runtime technology platform powering the agent. | • `Employee-made: Agent Designer (Gemini Enterprise)` (UI no-code builder)<br>• `Agent Runtime` (ADK / Reasoning Engine)<br>• `Employee-made: Workflow Agent (Gemini Enterprise)` (Workflow engine)<br>• `Dialogflow` (Dialogflow CX bot)<br>• `Google Built-in Agent` (Google first-party agent)<br>• `Cloud Run (A2A)` (Container microservice / A2A agent) | Set based on definition type (`adkAgentDefinition`, `lowCodeAgentDefinition`, `dialogflowAgentDefinition`, `managedAgentDefinition`, `a2aAgentDefinition`, or standalone service). Note: High-level Gemini Enterprise Instance App Engine container records where `agent_name == gemini_enterprise_instance_name` are intentionally excluded. |
| `agent_created_date` | `TIMESTAMP` | Timestamp when agent was created.<br><br>**Extraction Sources:**<br>• **Discovery Engine & App Engine**: `createTime` / `create_time`<br>• **Reasoning Engine**: `createTime`<br>• **Cloud Run**: `metadata.creationTimestamp` | UTC Timestamp string (e.g. `2026-03-05 17:35:45 UTC`) | Extracted directly from control-plane creation metadata across all services (Discovery Engine, Reasoning Engine, Cloud Run). |
| `agent_modified_date` | `TIMESTAMP` | Timestamp when agent was last updated.<br><br>**Extraction Sources:**<br>• **Discovery Engine & App Engine**: `updateTime` / `update_time`<br>• **Reasoning Engine**: `updateTime`<br>• **Cloud Run**: `annotations['run.googleapis.com/lastDeploymentTimestamp']` or `status.conditions[].lastTransitionTime` | UTC Timestamp string (e.g. `2026-03-05 18:20:10 UTC`) | Extracted directly from control-plane update/deployment metadata across all services. |
| `agent_published_version` | `STRING` | Version tag or release ID.<br><br>**Extraction Sources:**<br>• **Discovery Engine**: Dynamically calculated by querying the `/revisions` API for active and historical revisions (e.g. `v3.0` for 3rd revision, `v1.0` for initial version)<br>• **Cloud Run**: Extracted from A2A agent card metadata or `v1.0`<br>• **Reasoning Engine**: `v1.0` | `v1.0`, `v2.0`, `v3.0`, `1.0.0` | Calculated dynamically from active agent revision history in Discovery Engine or extracted from agent metadata. |
| `agent_published_date` | `TIMESTAMP` | Timestamp when agent was published.<br><br>**Extraction Sources:**<br>• **Discovery Engine**: Timestamp (`createTime`/`updateTime`) of the active published revision from `/revisions` API<br>• **Reasoning Engine / Cloud Run**: Last modification/deployment timestamp | UTC Timestamp string (e.g. `2026-07-29 14:48:44 UTC`) | Extracted directly from active revision or deployment metadata. |
| `agent_status` | `STRING` | Operational and publication status.<br><br>**Extraction Sources:**<br>• **Discovery Engine**: Determined by published revision presence and sharing config (`Published (Enabled)` if published & shared/ALL_USERS, `Published (Private)` if published & restricted to owner, `Draft` if no active published revision, `Disabled` if state is disabled)<br>• **Reasoning Engine**: `Published (Enabled)` if shared, `Published (Private)` if restricted to owner<br>• **Cloud Run**: `Published (Enabled)` if public endpoint, `Published (Private)` if IAM-restricted | • `Published (Enabled)`<br>• `Published (Private)`<br>• `Draft`<br>• `Disabled` | Derived directly from active revision presence and access/sharing configuration across platforms. |
| `agent_environment` | `STRING` | Deployment environment tier.<br><br>**Extraction Source:** Extracted from resource labels (`env`, `environment`, `tier`). | `Prod`, `Test`, `Dev` | Evaluates label values if present; defaults to `Prod` if no environment label exists. |
| `agent_intent` | `STRING` | Summary of primary task goal / capabilities. | Free-text goal statement | Extracted from description or generated from agent tools/intents. |

---

### 4. Sharing & Permissions Info

> [!NOTE]
> **Applicability Scope across Agent Types:**
> - **Gemini Enterprise Registered Agents** (`Agent Designer`, registered `Agent Runtime`, `Dialogflow`, `Workflow Agent`, `Google Built-in Agent`, `Cloud Run (A2A)`, `App Engine`): Extracted from Discovery Engine `sharingConfig` (`scope: ALL_USERS | DOMAIN | RESTRICTED`, `sharedUsers`) and IAM policies (`getIamPolicy`).
> - **Standalone Agent Runtime (Reasoning Engines)**: Extracted from Vertex AI Reasoning Engine IAM policies (`aiplatform.reasoningEngines.getIamPolicy`).
> - **Standalone Cloud Run (A2A)**: Extracted from Cloud Run service IAM policies (`run.services.getIamPolicy`).

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `is_shared` | `BOOLEAN` | True if agent has enterprise-wide sharing (`scope: ALL_USERS`/`DOMAIN`), explicit shared users in `sharingConfig`, or IAM permissions for users/groups. | `TRUE`, `FALSE` | Set to `TRUE` if `sharingConfig` scope is `ALL_USERS`/`DOMAIN`, `sharedUsers` is populated, or `getIamPolicy` returns non-owner bindings. |
| `shared_with_users` | `ARRAY<STRING>` | List of user email addresses or group markers with access to the agent. | Array of strings (e.g. `["All users"]`, `["user1@domain.com"]`) | Contains `["All users"]` for enterprise-wide agents, or explicit email addresses for restricted shared agents. |
| `permission_roles` | `ARRAY<STRING>` | Detailed membership and role mapping strings. | Array of formatted strings (e.g. `["All users (Agent User)"]`, `["user@domain.com (Agent User)", "admin@domain.com (Agent Owner)"]`) | Formatted representation of `sharingConfig` and IAM policy bindings returned by `getIamPolicy`. |

---

### 5. Configuration & Capability Flags

> [!NOTE]
> **Applicability Scope & Tri-State Evaluation Rules (`TRUE`, `FALSE`, `NULL` / `N/A`):**
> - **Gemini Enterprise No-Code & App Engine** (`Agent Designer`, `App Engine`): **Fully Applicable**. Evaluated directly from Discovery Engine JSON configuration schemas and node definitions.
> - **Code-Based & Container Runtimes** (`Agent Runtime`, `Cloud Run (A2A)`): **Partially Applicable**. Flags that are explicitly declared in package or service metadata (e.g. `uses_code_execution = TRUE` for Reasoning Engines) are set accordingly. Capability flags that cannot be statically inspected from control-plane API schemas (such as internal HTTP requests or dynamic RAG calls inside custom Python code) return **`NULL` (`N/A`)**.

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `uses_knowledge_sources` | `BOOLEAN` | True if agent connects to search data stores or RAG knowledge bases. | `TRUE`, `FALSE`, `NULL` | `TRUE` if data stores or search data sources are attached; `NULL` if code implementation is uninspectable. |
| `knowledge_source_types` | `ARRAY<STRING>` | Types of attached knowledge sources. | Array of strings (`["Structured data", "Google Drive", "ServiceNow", "Website"]`) | Identified by inspecting data store IDs and engines. |
| `uses_tools` | `BOOLEAN` | True if agent utilizes external tools or functions. | `TRUE`, `FALSE`, `NULL` | `TRUE` if tools, extensions, REST APIs, or MCP servers are configured; `NULL` for uninspectable code engines. |
| `tool_types` | `ARRAY<STRING>` | Categorized tool types used. | Array of strings (`["Google Workspace", "APIs / HTTP REST", "Model Context Protocol (MCP)", "Data Stores"]`) | Inferred from tool definitions and execution specs. |
| `uses_http_requests` | `BOOLEAN` | True if agent calls external HTTP REST APIs. | `TRUE`, `FALSE`, `NULL` | `TRUE` if OpenAPI specs or HTTP tools are declared. |
| `uses_mcp` | `BOOLEAN` | True if agent integrates with Model Context Protocol servers. | `TRUE`, `FALSE`, `NULL` | `TRUE` if `mcp` is detected in tool tools or packages. |
| `uses_function_calling` | `BOOLEAN` | True if agent uses LLM native tool/function calling. | `TRUE`, `FALSE`, `NULL` | `TRUE` if function specs are declared in agent definition. |
| `uses_extensions` | `BOOLEAN` | True if agent uses Discovery Engine or Agent Platform extensions. | `TRUE`, `FALSE`, `NULL` | `TRUE` if extension tools are declared. |
| `uses_code_execution` | `BOOLEAN` | True if agent supports Python code execution / sandbox. | `TRUE`, `FALSE`, `NULL` | `TRUE` for ADK Code Agents / Reasoning Engines. |
| `uses_rag` | `BOOLEAN` | True if agent performs Retrieval-Augmented Generation. | `TRUE`, `FALSE`, `NULL` | `TRUE` if knowledge sources or vector search libraries are imported. |
| `uses_memory` | `BOOLEAN` | True if agent retains multi-turn session memory. | `TRUE`, `FALSE`, `NULL` | `TRUE` for Gemini Enterprise agents and ADK agents with session services. |
| `autonomous_agent` | `BOOLEAN` | True if agent executes multi-step autonomous planning. | `TRUE`, `FALSE`, `NULL` | `TRUE` if agent has multiple tools or multi-step reasoning capabilities. |
| `system_instructions` | `STRING` | System instructions or prompt guiding agent behavior. | System prompt text string | Extracted from agent configuration instructions. |
| `model` | `STRING` | Model identifier string. | • `gemini-3.5-flash` (if explicitly declared in API)<br>• `Configured in Agent Code`<br>• `Configured in Service Code`<br>• `Configured in Instance Settings` | Strictly reflects explicit API model strings or generic non-assumptive indicators. |
| `safety_configuration` | `STRING` | Safety settings summary. | `Default Guardrails`, `Container Level Security` | Configured safety filter level. |
| `authentication_method` | `STRING` | Authentication mechanism required by agent. | `OAuth2 / User Identity`, `IAM / Service Account`, `Cloud Run IAM / OIDC Token` | Extracted from agent security config or Cloud Run IAM settings. |

---

### 6. Access Scope & Audience

> [!NOTE]
> **Applicability Scope across Agent Types:**
> - **Gemini Enterprise Apps (`App Engine`) & Registered Agents**: Evaluated directly from Discovery Engine `sharingConfig` (`scope: ALL_USERS` | `DOMAIN`) and IAM policies.
> - **Standalone Runtimes (`Agent Runtime`, `Cloud Run (A2A)`)**: Default to `access_scope = Group` / `Private` and `is_available_to_everyone = FALSE` unless public unauthenticated access (`allUsers`) is configured in GCP IAM.

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `is_available_to_everyone` | `BOOLEAN` | True if accessible enterprise-wide to all users or domain members. | `TRUE`, `FALSE` | Set to `TRUE` if `sharingConfig` scope is `ALL_USERS` or `DOMAIN` or if public IAM access is enabled. |
| `access_scope` | `STRING` | Visibility tier. | • `Enterprise`<br>• `Shared Users`<br>• `Private` | Inferred from `sharingConfig` scope and IAM bindings. |
| `audience_size` | `STRING` | Target user base scale. | • `Enterprise Wide`<br>• `Shared Users`<br>• `Restricted` | `Enterprise Wide` for all-user agents; `Shared Users` for specific user sharing; `Restricted` for private agents. |
| `target_audience_details` | `STRING` | Description of intended audience. | Text string (e.g. `Enterprise Users with Gemini Enterprise License`, `user@domain.com`, `Owner Only`) | Detailed text summary of target users or group access. |

---

### 7. Agent Runtime / Reasoning Engine Details

> [!IMPORTANT]
> **Applicability Scope & Enrichment Behavior:**
> - **`Agent Runtime` ONLY**: These 11 columns are populated **exclusively** for agents backed by a Vertex AI Reasoning Engine (both standalone and registered inside Gemini Enterprise).
> - **In-Place Record Enrichment**: When a standalone Reasoning Engine is detected as already registered in a Gemini Enterprise instance, the standalone record is deduplicated (preventing duplicate rows), and its detailed technical execution fields (`pickle_object_gcs_uri`, `requirements_gcs_uri`, `python_version`, `service_account`, etc.) are automatically merged into the registered agent record in-place.
> - **All Other Agent Types** (`Employee-made: Agent Designer (Gemini Enterprise)`, `Dialogflow`, `Cloud Run (A2A)`, `App Engine`, `Google Built-in Agent`, `Employee-made: Workflow Agent (Gemini Enterprise)`): These columns contain **`NULL`** or **`N/A`**.

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `reasoning_engine_id` | `STRING` | Full GCP resource ID of the Reasoning Engine. | `projects/<NUM>/locations/<REGION>/reasoningEngines/<ID>` | Populated whenever agent is powered by an Agent Runtime Reasoning Engine. |
| `reasoning_engine_display_name` | `STRING` | Reasoning engine resource name. | Human-readable name (e.g. `Switchcraft Native ADK BQ Agent`) | Display name of the underlying Reasoning Engine. |
| `reasoning_engine_location` | `STRING` | GCP location where Reasoning Engine is deployed. | `us-central1`, `us-east1`, `europe-west1`, etc. | Extracted from reasoning engine resource path. |
| `reasoning_engine_service_account` | `STRING` | Runtime service account identity executing the agent code. | Service Account Email (e.g. `service-account@project.iam.gserviceaccount.com`) | Extracted from `spec.deploymentSpec.serviceAccount`. |
| `query_url` | `STRING` | REST endpoint URL for `query` operations. | `https://us-central1-aiplatform.googleapis.com/...:query` | Computed endpoint URL. |
| `stream_query_url` | `STRING` | REST endpoint URL for `streamQuery` operations. | `https://us-central1-aiplatform.googleapis.com/...:streamQuery` | Computed streaming endpoint URL. |
| `pickle_object_gcs_uri` | `STRING` | Cloud Storage URI containing serialized agent object. | `gs://<bucket>/agent_engine.pkl` | Extracted from reasoning engine package spec. |
| `requirements_gcs_uri` | `STRING` | Cloud Storage URI containing `requirements.txt`. | `gs://<bucket>/requirements.txt` | Extracted from reasoning engine package spec. |
| `dependency_files_gcs_uri` | `STRING` | Cloud Storage URI containing dependency archive. | `gs://<bucket>/dependencies.tar.gz` | Extracted from reasoning engine package spec. |
| `python_version` | `STRING` | Python runtime version. | `3.10`, `3.11`, `3.14`, etc. | Extracted from reasoning engine Python spec. |
| `agent_framework` | `STRING` | Framework used to build the agent. | `google-adk`, `langchain`, `llama-index`, `custom` | Extracted from `agentFramework` in reasoning engine spec. |

---

### 8. Cloud Run & A2A Deployment Details

> [!IMPORTANT]
> **Applicability Scope & Enrichment Behavior:**
> - **`Cloud Run (A2A)` & `A2A Agent` ONLY**: These 7 columns are populated **exclusively** for containerized Cloud Run services and Agent-to-Agent (A2A) protocol endpoints.
> - **In-Place Record Enrichment**: When a standalone Cloud Run service is detected as already registered in a Gemini Enterprise instance, the standalone record is deduplicated (preventing duplicate rows), and its deployment metadata (`cloud_run_image`, `cloud_run_region`, `cloud_run_service_account`, `a2a_skills`, etc.) is automatically merged into the registered agent record in-place.
> - **All Other Agent Types** (`Employee-made: Agent Designer (Gemini Enterprise)`, `Agent Runtime`, `Dialogflow`, `App Engine`, `Google Built-in Agent`, `Employee-made: Workflow Agent (Gemini Enterprise)`): These columns contain **`NULL`** or **`N/A`**.

| Column Name | BigQuery Data Type | Logic & Extraction Source | Possible Values | When Value Occurs |
| :--- | :--- | :--- | :--- | :--- |
| `a2a_protocol_version` | `STRING` | Agent-to-Agent (A2A) protocol version. | `0.3`, `1.0`, `N/A` | Extracted from `/.well-known/agent-card.json` at service endpoint. |
| `a2a_agent_url` | `STRING` | A2A agent card or service endpoint URL. | `https://<service-name>.run.app` | Populated for Cloud Run / A2A agent services. |
| `a2a_skills` | `ARRAY<STRING>` | List of declared A2A skills/capabilities. | Array of skill strings | Extracted from A2A card `skills` array. |
| `cloud_run_service_name` | `STRING` | Name of Cloud Run service. | Service name string (e.g. `my-a2a-agent`) | Extracted from Cloud Run service resource name. |
| `cloud_run_region` | `STRING` | GCP region where Cloud Run service runs. | `us-central1`, `europe-west1`, etc. | Extracted from Cloud Run service region. |
| `cloud_run_image` | `STRING` | Container image URI. | `gcr.io/...` or `us-docker.pkg.dev/...` | Extracted from Cloud Run service container spec. |
| `cloud_run_service_account` | `STRING` | Cloud Run service identity. | Service Account Email | Extracted from Cloud Run service account config. |
