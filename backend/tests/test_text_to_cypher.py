"""
Unit tests for Dynamic Text-to-Cypher Engine and AST Safety Validator.
"""

import pytest
from src.agent.text_to_cypher import (
    validate_read_only_cypher,
    generate_cypher_heuristic,
    translate_text_to_cypher,
    execute_text_to_cypher,
)


def test_validate_read_only_cypher_valid():
    safe_query = "MATCH (c:Person)-[:OWNS_ACCOUNT]->(p:InvestmentPortfolio) RETURN c.name, p.total_aum"
    is_safe, error = validate_read_only_cypher(safe_query)
    assert is_safe is True
    assert error is None


def test_validate_read_only_cypher_blocks_mutations():
    destructive_queries = [
        "MATCH (c:Person) DELETE c",
        "MATCH (c:Person) DETACH DELETE c",
        "CREATE (c:Person {name: 'Malicious'})",
        "MERGE (c:Person {name: 'Test'})",
        "MATCH (c:Person) SET c.aum = 0",
        "MATCH (c:Person) REMOVE c.name",
        "DROP CONSTRAINT my_constraint",
    ]
    for q in destructive_queries:
        is_safe, error = validate_read_only_cypher(q)
        assert is_safe is False
        assert error is not None


def test_generate_cypher_heuristic_tech():
    cypher = generate_cypher_heuristic("Show me all tech sector and semiconductor holdings")
    assert "Technology" in cypher
    assert "NVDA" in cypher
    assert "MATCH" in cypher


def test_generate_cypher_heuristic_bonds():
    cypher = generate_cypher_heuristic("What are the bond maturities and yields?")
    assert "Bond" in cypher
    assert "coupon_rate" in cypher


def test_generate_cypher_heuristic_trusts():
    cypher = generate_cypher_heuristic("List all Delaware irrevocable trusts and beneficiaries")
    assert "LegalEntity" in cypher
    assert "BENEFICIARY_OF" in cypher


def test_translate_text_to_cypher():
    res = translate_text_to_cypher("Find all tech stocks with allocation > 10%")
    assert res["status"] == "SUCCESS"
    assert "cypher" in res
    assert res["cypher"].startswith("MATCH")


def test_execute_text_to_cypher_mock():
    res = execute_text_to_cypher("Show all clients and portfolio AUM")
    assert res["status"] == "SUCCESS"
    assert "rows" in res
    assert "generated_cypher" in res
    assert res["execution_time_ms"] >= 0
