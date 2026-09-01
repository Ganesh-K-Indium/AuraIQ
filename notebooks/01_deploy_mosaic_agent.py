# Databricks notebook source
# MAGIC %md
# MAGIC # 🏛️ AURA Wealth IQ: Mosaic AI Agent Deployment Notebook
# MAGIC > **Enterprise Production Deployment Pipeline for Institutional Wealth Management**
# MAGIC > 
# MAGIC > Target Unity Catalog: **`db_ai_strike_team.fibo_knowledge_graph`**
# MAGIC > 
# MAGIC > This notebook executes the end-to-end deployment of the AURA Wealth Agent on Databricks:
# MAGIC > 1. Sets up Schema in team catalog (`db_ai_strike_team.fibo_knowledge_graph`)
# MAGIC > 2. Installs required Python dependencies
# MAGIC > 3. Configures backend Python paths & verifies Unity Catalog Tools
# MAGIC > 4. Tests local Agent reasoning with MLflow Tracing
# MAGIC > 5. Packages and registers the Agent to MLflow with full ModelSignature
# MAGIC > 6. Deploys the Agent to a Serverless Databricks Model Serving Endpoint

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 1: Create Schema in Team Catalog (`db_ai_strike_team`)

# COMMAND ----------
# MAGIC %sql
# MAGIC USE CATALOG db_ai_strike_team;
# MAGIC 
# MAGIC CREATE SCHEMA IF NOT EXISTS fibo_knowledge_graph;
# MAGIC USE SCHEMA fibo_knowledge_graph;
# MAGIC 
# MAGIC SELECT current_catalog(), current_schema(), current_user();

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 2: Install Dependencies in Cluster Environment

# COMMAND ----------
# MAGIC %pip install chromadb neo4j mlflow databricks-sdk structlog pydantic typing-extensions
# MAGIC dbutils.library.restartPython()

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 3: Configure Paths & Verify Unity Catalog Tool Suite

# COMMAND ----------
import sys
import os

# Automatically resolve the repository root and backend directory
notebook_dir = os.getcwd()
repo_root = os.path.dirname(notebook_dir) if "notebooks" in notebook_dir else notebook_dir
backend_path = os.path.join(repo_root, "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

print(f"✅ Python search path configured: {backend_path}")

# Verify tool imports
from src.tools.uc_portfolio_tools import (
    get_client_profile_and_holdings,
    check_portfolio_risk_suitability,
    find_correlated_exposure,
    analyze_client_tax_and_trust_structure,
    search_wealth_documents,
    execute_dynamic_text_to_cypher,
    query_fibo_knowledge_graph,
)
print("✅ All 7 Databricks Unity Catalog tools imported and verified successfully!")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 4: Test Local Agent Reasoning with MLflow Tracing

# COMMAND ----------
import mlflow
from src.agent.agentic_rag import WealthAgentRAG

# Automatically bind MLflow experiment to current user's workspace directory
user_name = spark.sql("SELECT current_user()").collect()[0][0]
experiment_name = f"/Users/{user_name}/AURA_Wealth_Mosaic_Agent"

try:
    mlflow.set_experiment(experiment_name)
    print(f"📊 MLflow Experiment successfully bound: {experiment_name}")
except Exception as e:
    print(f"ℹ️ Defaulting to local experiment: {e}")

agent = WealthAgentRAG()
test_client_id = "HNW-CLIENT-001"
test_query = "Audit Victoria Sterling's portfolio for technology sector drift under SEC Reg BI guidelines."

print(f"🧠 Executing test reasoning for {test_client_id}...")
result = agent.chat(client_id=test_client_id, message=test_query)

print("\n" + "="*50)
print("📝 AGENT ADVISORY SYNTHESIS:")
print("="*50)
print(result.get("response", result.get("reply", "No response generated")))
print("\n" + "="*50)
print(f"⚡ Total Latency: {result.get('metrics', {}).get('latency_ms', 'N/A')} ms | Status: {result.get('status', 'SUCCESS')}")
print(f"🔍 Step Traces Captured: {len(result.get('traces', []))} steps")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 5: Package and Register Agent to Unity Catalog via MLflow

# COMMAND ----------
from src.agent.mlflow_model import AuraWealthAgentModel
from mlflow.models.signature import ModelSignature
from mlflow.types.schema import Schema, ColSpec

conda_env = {
    "channels": ["defaults", "conda-forge"],
    "dependencies": [
        "python=3.10.12",
        "pip",
        {
            "pip": [
                "mlflow>=3.0.0",
                "chromadb>=0.5.0",
                "neo4j>=5.18.0",
                "openai>=1.20.0",
                "pydantic>=2.6.0",
                "structlog>=24.1.0",
                "databricks-sdk>=0.20.0",
            ]
        }
    ]
}

# Define clean I/O signature for Model Serving
input_schema = Schema([
    ColSpec("string", "client_id"),
    ColSpec("string", "message"),
])
output_schema = Schema([
    ColSpec("string", "response"),
    ColSpec("string", "traces"),
])
signature = ModelSignature(inputs=input_schema, outputs=output_schema)

registered_model_name = "db_ai_strike_team.fibo_knowledge_graph.aura_wealth_agent"

with mlflow.start_run(run_name="AURA_Wealth_Agent_UC_Release") as run:
    mlflow.set_tags({
        "framework": "Databricks Mosaic AI Agent Framework",
        "ontology": "EDMC FIBO v2",
        "tools_catalog": "db_ai_strike_team",
        "tools_schema": "fibo_knowledge_graph",
        "governance": "Unity Catalog FastMCP",
    })

    model_info = mlflow.pyfunc.log_model(
        artifact_path="aura_wealth_agent",
        python_model=AuraWealthAgentModel(),
        signature=signature,
        conda_env=conda_env,
        code_paths=[backend_path],
        registered_model_name=registered_model_name
    )

    print("="*50)
    print(f"🎉 Model registered to Unity Catalog: {registered_model_name}")
    print(f"📦 Model Artifact URI: {model_info.model_uri}")
    print("="*50)

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 6: Deploy to Serverless Model Serving Endpoint

# COMMAND ----------
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import (
    EndpointCoreConfigInput,
    ServedEntityInput,
    AutoCaptureConfigInput
)

w = WorkspaceClient()
ENDPOINT_NAME = "aura-wealth-agent"

print(f"🚀 Deploying Serverless Model Serving Endpoint: '{ENDPOINT_NAME}'...")

endpoint_config = EndpointCoreConfigInput(
    name=ENDPOINT_NAME,
    served_entities=[
        ServedEntityInput(
            entity_name=registered_model_name,
            entity_version="1",
            scale_to_zero_enabled=True,
            workload_size="Small"
        )
    ],
    auto_capture_config=AutoCaptureConfigInput(
        catalog_name="db_ai_strike_team",
        schema_name="fibo_knowledge_graph",
        table_name_prefix="serving_payload_logs",
        enabled=True
    )
)

try:
    w.serving_endpoints.create_and_wait(name=ENDPOINT_NAME, config=endpoint_config)
    print(f"✅ Endpoint '{ENDPOINT_NAME}' deployed and ONLINE!")
except Exception as e:
    print(f"ℹ️ Endpoint already exists or updating. Applying updated configuration...")
    try:
        w.serving_endpoints.update_config_and_wait(
            name=ENDPOINT_NAME,
            served_entities=endpoint_config.served_entities
        )
        print(f"✅ Endpoint '{ENDPOINT_NAME}' updated and ONLINE!")
    except Exception as upd_err:
        print(f"⚠️ Serving config note: {upd_err}")
        print(f"You can view and manage this endpoint in the Databricks UI under 'Serving' ➔ '{ENDPOINT_NAME}'.")
