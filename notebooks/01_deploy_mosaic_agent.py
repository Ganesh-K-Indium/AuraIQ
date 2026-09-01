# Databricks notebook source
# MAGIC %md
# MAGIC # 🏛️ AURA Wealth IQ: Mosaic AI Agent Deployment Notebook
# MAGIC > **Enterprise Production Deployment Pipeline for Institutional Wealth Management**
# MAGIC > 
# MAGIC > This notebook executes the end-to-end deployment of the AURA Wealth Agent on Databricks:
# MAGIC > 1. Sets up Unity Catalog (`wealth_mgmt_catalog.fibo_knowledge_graph`)
# MAGIC > 2. Installs required Python dependencies
# MAGIC > 3. Registers Unity Catalog Governed Tools
# MAGIC > 4. Packages and logs the Agent to MLflow with full Tracing
# MAGIC > 5. Deploys the Agent to a Serverless Databricks Model Serving Endpoint

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 1: Create Unity Catalog Catalog & Schema

# COMMAND ----------
# MAGIC %sql
# MAGIC CREATE CATALOG IF NOT EXISTS wealth_mgmt_catalog;
# MAGIC USE CATALOG wealth_mgmt_catalog;
# MAGIC 
# MAGIC CREATE SCHEMA IF NOT EXISTS fibo_knowledge_graph;
# MAGIC USE SCHEMA fibo_knowledge_graph;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 2: Install Dependencies in Cluster Environment

# COMMAND ----------
# MAGIC %pip install chromadb neo4j mlflow databricks-sdk structlog pydantic typing-extensions
# MAGIC dbutils.library.restartPython()

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 3: Add Backend Source to Python Path & Verify Imports

# COMMAND ----------
import sys
import os

# Add backend/ directory to sys.path
notebook_dir = os.getcwd()
repo_root = os.path.dirname(notebook_dir) if "notebooks" in notebook_dir else notebook_dir
backend_path = os.path.join(repo_root, "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

print(f"✅ Python path configured: {backend_path}")

# Verify tool imports
from src.tools.uc_portfolio_tools import (
    get_client_profile_and_holdings,
    check_portfolio_risk_suitability,
    search_wealth_documents,
    execute_dynamic_text_to_cypher,
)
print("✅ Unity Catalog tools imported successfully!")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 4: Test Local Agent Execution with MLflow Tracing

# COMMAND ----------
import mlflow
from src.agent.agentic_rag import WealthAgentRAG

# Set active MLflow experiment
experiment_name = f"/Users/{spark.sql('SELECT current_user()').collect()[0][0]}/AURA_Wealth_Mosaic_Agent"
mlflow.set_experiment(experiment_name)
print(f"📊 MLflow Experiment bound: {experiment_name}")

agent = WealthAgentRAG()
test_client_id = "HNW-CLIENT-001"
test_query = "Audit Victoria Sterling's portfolio for technology sector drift under SEC Reg BI"

print(f"🧠 Executing test query for {test_client_id}...")
result = agent.execute_advisory_review(test_client_id, test_query)

print("\n--- Final Synthesis ---")
print(result.get("final_synthesis"))
print(f"\n⚡ Total Execution Latency: {result.get('metrics', {}).get('latency_ms', 0)} ms")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 5: Package and Log Agent Model to MLflow Model Registry

# COMMAND ----------
from src.agent.mlflow_model import AURAWealthAgentMLflowModel

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

model_registered_name = "wealth_mgmt_catalog.fibo_knowledge_graph.aura_wealth_agent"

with mlflow.start_run(run_name="AURA_Wealth_Agent_UC_Release") as run:
    model_info = mlflow.pyfunc.log_model(
        artifact_path="aura_wealth_agent",
        python_model=AURAWealthAgentMLflowModel(),
        conda_env=conda_env,
        code_path=[backend_path],
        registered_model_name=model_registered_name
    )
    print(f"🎉 Model registered to Unity Catalog: {model_registered_name}")
    print(f"URI: {model_info.model_uri}")

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

print(f"🚀 Deploying to Serverless Serving Endpoint: {ENDPOINT_NAME}...")

endpoint_config = EndpointCoreConfigInput(
    name=ENDPOINT_NAME,
    served_entities=[
        ServedEntityInput(
            entity_name=model_registered_name,
            entity_version="1",
            scale_to_zero_enabled=True,
            workload_size="Small"
        )
    ],
    auto_capture_config=AutoCaptureConfigInput(
        catalog_name="wealth_mgmt_catalog",
        schema_name="fibo_knowledge_graph",
        table_name_prefix="serving_payload_logs",
        enabled=True
    )
)

try:
    w.serving_endpoints.create_and_wait(name=ENDPOINT_NAME, config=endpoint_config)
    print(f"✅ Endpoint {ENDPOINT_NAME} deployed and ONLINE!")
except Exception as e:
    print(f"ℹ️ Updating existing endpoint {ENDPOINT_NAME}...")
    w.serving_endpoints.update_config_and_wait(
        name=ENDPOINT_NAME,
        served_entities=endpoint_config.served_entities
    )
    print(f"✅ Endpoint {ENDPOINT_NAME} updated successfully!")

