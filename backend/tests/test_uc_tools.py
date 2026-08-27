"""
Tests for Databricks Unity Catalog compatible tools.
"""

import pytest
from src.tools.uc_portfolio_tools import (
    get_client_profile_and_holdings,
    check_portfolio_risk_suitability,
    find_correlated_exposure,
    analyze_client_tax_and_trust_structure,
    query_fibo_knowledge_graph,
)


def test_get_client_profile_and_holdings():
    """Test retrieving client profile, risk tolerance, and holdings."""
    client_id = "HNW-CLIENT-001"
    res = get_client_profile_and_holdings(client_id)

    assert res["client_id"] == client_id
    assert res["name"] == "Victoria Sterling"
    assert res["risk_profile"]["tolerance_level"] == "Moderate Growth"
    assert len(res["portfolios"]) >= 1

    flagship = res["portfolios"][0]
    assert flagship["portfolio_id"] == "PORT-VS-GROWTH-01"
    assert len(flagship["holdings"]) == 6

    # Verify asset classes present
    asset_classes = {h["asset_class"] for h in flagship["holdings"]}
    assert "Equity" in asset_classes
    assert "FixedIncome" in asset_classes
    assert "Alternative" in asset_classes


def test_check_portfolio_risk_suitability_compliant():
    """Test suitability check on client portfolio."""
    res = check_portfolio_risk_suitability("HNW-CLIENT-001", "PORT-VS-GROWTH-01")
    assert res["suitability_status"] in ["COMPLIANT", "NON_COMPLIANT_WARNING"]
    assert "allocations" in res
    assert "actual" in res["allocations"]
    assert res["allocations"]["actual"]["equity_pct"] > 0


def test_find_correlated_exposure():
    """Test detecting systemic exposure to Technology sector."""
    res = find_correlated_exposure(sector="Technology", min_allocation_pct=0.05)
    assert len(res) >= 1
    tickers = {r["ticker"] for r in res}
    assert "AAPL" in tickers or "MSFT" in tickers or "NVDA" in tickers


def test_analyze_client_tax_and_trust_structure():
    """Test querying legal entities and trust beneficiary relationships."""
    res = analyze_client_tax_and_trust_structure("HNW-CLIENT-001")
    assert res["client_id"] == "HNW-CLIENT-001"
    assert len(res["legal_entities"]) >= 1
    trust = res["legal_entities"][0]
    assert trust["entity_id"] == "TRUST-STERLING-DYNASTY"
    assert trust["beneficiary_share_pct"] == 1.0


def test_query_fibo_knowledge_graph_safe():
    """Test read-only Cypher query execution."""
    cypher = "MATCH (c:Person) RETURN c.name AS name ORDER BY name"
    res = query_fibo_knowledge_graph(cypher)
    assert len(res) == 2
    names = [r["name"] for r in res]
    assert "Marcus Thorne" in names
    assert "Victoria Sterling" in names


def test_query_fibo_knowledge_graph_destructive_blocked():
    """Verify that destructive Cypher queries are blocked by tool security guards."""
    with pytest.raises(ValueError, match="Destructive write/delete queries are prohibited"):
        query_fibo_knowledge_graph("MATCH (n) DETACH DELETE n")

