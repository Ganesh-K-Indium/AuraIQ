"""
Databricks Mosaic AI Agent Framework - MLflow PyFunc Model Wrapper.
Enables packaging the FIBO Wealth Agent as a governed Unity Catalog Model
and deploying to Databricks Model Serving.
"""

from typing import Any, Dict, List
import mlflow
import mlflow.pyfunc
from mlflow.models.signature import ModelSignature
from mlflow.types.schema import Schema, ColSpec
import pandas as pd


class AuraWealthAgentModel(mlflow.pyfunc.PythonModel):
    """
    MLflow PyFunc Model wrapper for AURA Wealth Copilot.
    Compatible with Databricks Mosaic AI Agent Framework & Unity Catalog Model Registry.
    """

    def load_context(self, context: mlflow.pyfunc.PythonModelContext):
        """Initializes the Neo4j Knowledge Graph connection and Agent RAG engine."""
        import os
        import sys
        
        # Ensure src is importable
        from src.agent.agentic_rag import wealth_agent
        self.agent = wealth_agent

    def predict(self, context: mlflow.pyfunc.PythonModelContext, model_input: Any) -> List[Dict[str, Any]]:
        """
        Executes multi-hop reasoning over the FIBO Knowledge Graph for input queries.

        Args:
            model_input: Pandas DataFrame or Dict containing 'client_id' and 'message' columns.

        Returns:
            List of dictionaries containing reply, reasoning traces, and model metadata.
        """
        if isinstance(model_input, pd.DataFrame):
            records = model_input.to_dict(orient="records")
        elif isinstance(model_input, dict):
            records = [model_input]
        else:
            records = list(model_input)

        results = []
        for record in records:
            client_id = record.get("client_id", "HNW-CLIENT-001")
            message = record.get("message", "Perform SEC Reg BI Suitability Audit.")
            response = self.agent.chat(client_id=client_id, message=message)
            results.append(response)

        return results


def log_agent_to_mlflow(
    experiment_name: str = "AURA_Wealth_Mosaic_Agent",
    registered_model_name: str = None,
) -> str:
    """
    Packages and logs the Agent to MLflow with complete Databricks Model Serving signature.

    Returns:
        The logged model URI (e.g. runs:/<run_id>/aura_wealth_agent).
    """
    import os
    catalog = os.getenv("DATABRICKS_CATALOG", "db_ai_strike_team")
    if not registered_model_name:
        registered_model_name = f"{catalog}.fibo_knowledge_graph.aura_wealth_agent"

    mlflow.set_experiment(experiment_name)

    input_schema = Schema([
        ColSpec("string", "client_id"),
        ColSpec("string", "message"),
    ])
    output_schema = Schema([
        ColSpec("string", "reply"),
        ColSpec("string", "traces"),
    ])
    signature = ModelSignature(inputs=input_schema, outputs=output_schema)

    with mlflow.start_run(run_name="register-aura-agent") as run:
        mlflow.set_tags({
            "framework": "Databricks Mosaic AI Agent Framework",
            "ontology": "EDMC FIBO v2",
            "tools_catalog": catalog,
            "tools_schema": "fibo_knowledge_graph",
            "governance": "FastMCP 2.0",
        })

        model_info = mlflow.pyfunc.log_model(
            artifact_path="aura_wealth_agent",
            python_model=AuraWealthAgentModel(),
            signature=signature,
            registered_model_name=registered_model_name,
        )

        return model_info.model_uri


if __name__ == "__main__":
    print("Packaging AURA Wealth Agent to MLflow...")
    uri = log_agent_to_mlflow()
    print(f"✅ Successfully registered Agent Model in MLflow: {uri}")

