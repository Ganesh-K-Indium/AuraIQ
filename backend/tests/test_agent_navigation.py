"""
End-to-End Agent Navigation Tests and Structured Test Log Generation.
Validates multi-hop reasoning over the FIBO Knowledge Graph.
"""

import json
import pytest
from src.agent.agentic_rag import wealth_agent


def test_agent_advisory_workflow_victoria_sterling():
    """Validate end-to-end agentic review workflow on Ultra-HNW client."""
    client_id = "HNW-CLIENT-001"
    response = wealth_agent.execute_advisory_review(client_id=client_id)

    assert response["status"] == "SUCCESS"
    assert "report" in response
    assert "execution_traces" in response

    report = response["report"]
    assert report["client_name"] == "Victoria Sterling"
    assert len(report["portfolios"]) == 1
    assert len(report["suitability_evaluations"]) == 1
    assert len(report["trust_structures"]) == 1
    assert len(report["recommendation_summary"]) >= 1

    traces = response["execution_traces"]
    assert len(traces) >= 5
    trace_types = [t["type"] for t in traces]
    assert "PLAN" in trace_types
    assert "TOOL_CALL" in trace_types
    assert "OBSERVATION" in trace_types
    assert "SYNTHESIS" in trace_types


def test_agent_advisory_workflow_marcus_thorne():
    """Validate end-to-end agentic review workflow on conservative client."""
    client_id = "HNW-CLIENT-002"
    response = wealth_agent.execute_advisory_review(client_id=client_id)

    assert response["status"] == "SUCCESS"
    report = response["report"]
    assert report["client_name"] == "Marcus Thorne"
    assert report["risk_profile"]["tolerance_level"] == "Conservative Capital Preservation"


def test_structured_test_log_export(tmp_path):
    """Generate and verify structured agent execution log file."""
    response = wealth_agent.execute_advisory_review(client_id="HNW-CLIENT-001")
    log_file = tmp_path / "agent_nav_test_log.json"
    log_file.write_text(json.dumps(response, indent=2))

    data = json.loads(log_file.read_text())
    assert data["status"] == "SUCCESS"
    assert len(data["execution_traces"]) > 0

