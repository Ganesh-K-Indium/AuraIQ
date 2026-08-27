"""
Unit & Integration Tests for FastAPI Backend Endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from src.api.app import app

client = TestClient(app)


def test_api_health():
    """Test health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["neo4j_connected"] is True
    assert data["nodes"] > 0


def test_api_analysis_tasks():
    """Test analysis-tasks endpoint with and without portfolio_id query parameter."""
    response = client.get("/analysis-tasks?portfolio_id=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["status"] == "COMPLETED"

    response_api = client.get("/api/analysis-tasks?portfolio_id=12")
    assert response_api.status_code == 200
    assert len(response_api.json()) >= 1


def test_api_list_clients():
    """Test clients listing endpoint."""
    response = client.get("/api/clients")
    assert response.status_code == 200
    data = response.json()
    assert "clients" in data
    assert len(data["clients"]) == 2


def test_api_client_details():
    """Test individual client details endpoint."""
    response = client.get("/api/client/HNW-CLIENT-001")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Victoria Sterling"
    assert len(data["portfolios"]) >= 1


def test_api_agent_review():
    """Test agent execution review endpoint."""
    payload = {"client_id": "HNW-CLIENT-001"}
    response = client.post("/api/agent/review", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "report" in data


def test_api_agent_chat():
    """Test conversational copilot endpoint."""
    payload = {"client_id": "HNW-CLIENT-001", "message": "What is our exposure to technology equities?"}
    response = client.post("/api/agent/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "reply" in data
    assert len(data["traces"]) >= 1


def test_api_agent_chat_stream():
    """Test Server-Sent Events (SSE) streaming copilot endpoint."""
    response = client.get("/api/agent/chat-stream?client_id=HNW-CLIENT-001&message=Audit+suitability")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    content = response.text
    assert "data: " in content
    assert '"event"' in content


def test_api_portfolio_simulate_rebalance():
    """Test rebalance simulation endpoint."""
    payload = {
        "client_id": "HNW-CLIENT-001",
        "portfolio_id": "PORT-VS-GROWTH-01",
        "target_equity_pct": 0.50,
        "target_fixed_income_pct": 0.40,
        "target_alternatives_pct": 0.10,
    }
    response = client.post("/api/portfolio/simulate-rebalance", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "trades" in data
    assert "allocations_after" in data


def test_api_cypher_run():
    """Test custom Cypher IDE runner endpoint."""
    payload = {"query": "MATCH (p:InvestmentPortfolio) RETURN p.name AS name, p.total_aum AS aum"}
    response = client.post("/api/cypher/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["row_count"] >= 2
    assert "execution_time_ms" in data


def test_api_graph_data():
    """Test graph visualization data extraction endpoint."""
    response = client.get("/api/graph/data")
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) > 10
    assert len(data["links"]) > 10


def test_api_execute_uc_tool():
    """Test direct UC tool execution endpoint."""
    payload = {
        "tool_name": "find_correlated_exposure",
        "parameters": {"sector": "Technology", "min_allocation_pct": 0.05}
    }
    response = client.post("/api/tools/execute", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
