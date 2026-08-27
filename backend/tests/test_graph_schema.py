"""
Tests for FIBO Knowledge Graph Schema and Seeding Integrity.
"""

import pytest
from src.db.neo4j_client import neo4j_client


def test_neo4j_connectivity():
    """Verify active connection to Neo4j instance."""
    assert neo4j_client.verify_connectivity() is True


def test_fibo_node_types_exist():
    """Verify that all core FIBO ontology node types exist in the database."""
    query = """
    MATCH (n)
    RETURN DISTINCT labels(n) AS labels
    """
    results = neo4j_client.execute_query(query)
    all_labels = set()
    for row in results:
        all_labels.update(row["labels"])

    expected_labels = {
        "Person",
        "RiskProfile",
        "InvestmentPortfolio",
        "FinancialInstrument",
        "Share",
        "Bond",
        "AlternativeAsset",
        "LegalEntity",
        "CompliancePolicy",
    }
    for expected in expected_labels:
        assert expected in all_labels, f"Expected FIBO label '{expected}' not found in graph."


def test_fibo_relationship_integrity():
    """Verify essential graph relationships between Persons, Portfolios, Instruments, and Risk Profiles."""
    query = """
    MATCH ()-[r]->()
    RETURN DISTINCT type(r) AS rel_type
    """
    results = neo4j_client.execute_query(query)
    rel_types = {row["rel_type"] for row in results}

    expected_relationships = {
        "OWNS_ACCOUNT",
        "HAS_RISK_PROFILE",
        "CONTAINS_HOLDING",
        "GOVERNED_BY",
        "SUBJECT_TO",
        "BENEFICIARY_OF",
    }
    for rel in expected_relationships:
        assert rel in rel_types, f"Expected relationship '{rel}' not found in graph."

