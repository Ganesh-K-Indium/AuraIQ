"""
AURA Wealth IQ - Dynamic Text-to-Cypher Engine
Translates natural language questions about wealth management, portfolios, trusts,
and regulatory compliance into validated, read-only Cypher queries against the Neo4j FIBO Knowledge Graph.
"""

import os
import re
import time
import json
import logging
from typing import Dict, Any, Tuple, Optional
from src.db.neo4j_client import neo4j_client

logger = logging.getLogger("TextToCypher")

# Strict read-only forbidden keywords
FORBIDDEN_MUTATION_KEYWORDS = [
    r"\bCREATE\b",
    r"\bMERGE\b",
    r"\bDELETE\b",
    r"\bDETACH\b",
    r"\bSET\b",
    r"\bREMOVE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bLOAD\s+CSV\b",
    r"\bCALL\s+dbms\b",
    r"\bCALL\s+apoc\.trigger\b",
]

# Canonical FIBO Schema Context for Prompting
FIBO_GRAPH_SCHEMA = """
Nodes and Properties:
- (:Person {client_id: string, name: string, net_worth_tier: string, tax_residence: string, kyc_status: string})
- (:LegalEntity {entity_id: string, entity_name: string, entity_type: string, jurisdiction: string, tax_nexus: string})
- (:InvestmentPortfolio {portfolio_id: string, name: string, portfolio_type: string, total_aum: float})
- (:Holding {allocation_pct: float, current_value: float})
- (:Share {instrument_id: string, ticker: string, name: string, sector: string, market_cap_category: string, risk_rating: string, asset_class: 'Equities'})
- (:Bond {instrument_id: string, name: string, coupon_rate: float, maturity_date: string, credit_rating: string, asset_class: 'Fixed Income'})
- (:AlternativeFund {instrument_id: string, fund_name: string, strategy: string, liquidity_tier: string, asset_class: 'Alternatives'})
- (:CompliancePolicy {policy_id: string, name: string, max_equity_allocation_conservative: float, max_illiquid_pct_conservative: float})
- (:RiskProfile {tolerance_level: string, target_equity_pct: float, target_fixed_income_pct: float, target_alternatives_pct: float, max_drawdown_pct: float})

Relationships:
- (:Person)-[:OWNS_ACCOUNT]->(:InvestmentPortfolio)
- (:Person)-[:BENEFICIARY_OF {share_pct: float}]->(:LegalEntity)
- (:LegalEntity)-[:ESTABLISHED_FOR]->(:InvestmentPortfolio)
- (:InvestmentPortfolio)-[:CONTAINS_HOLDING]->(:Share|:Bond|:AlternativeFund)
- (:InvestmentPortfolio)-[:SUBJECT_TO]->(:CompliancePolicy)
- (:Person)-[:ASSIGNED_MANDATE]->(:RiskProfile)
"""

def validate_read_only_cypher(query: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that a generated Cypher query is strictly read-only and safe.
    """
    cleaned = query.strip()
    
    # Must start with read-only keywords
    valid_starts = ("MATCH", "WITH", "RETURN", "CALL apoc.meta", "CALL db.labels")
    if not any(cleaned.upper().startswith(kw) for kw in valid_starts):
        return False, "Query must begin with a read-only keyword such as MATCH or WITH."

    # Check for forbidden mutation keywords
    for pattern in FORBIDDEN_MUTATION_KEYWORDS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return False, f"Dangerous or mutating Cypher keyword detected matching pattern '{pattern}'."

    return True, None


def generate_cypher_heuristic(natural_query: str) -> str:
    """
    Fallback deterministic compiler for common wealth management query patterns
    when external LLM is offline or in local mock mode.
    """
    q_lower = natural_query.lower()

    if "tech" in q_lower or "semiconductor" in q_lower or "nvidia" in q_lower or "apple" in q_lower:
        return (
            "MATCH (p:InvestmentPortfolio)-[h:CONTAINS_HOLDING]->(s:Share)\n"
            "WHERE s.sector = 'Technology' OR s.ticker IN ['NVDA', 'AAPL', 'MSFT']\n"
            "RETURN p.name AS portfolio, s.ticker AS ticker, s.name AS asset_name, "
            "h.allocation_pct AS allocation, h.current_value AS value_usd\n"
            "ORDER BY h.current_value DESC"
        )

    if "bond" in q_lower or "fixed income" in q_lower or "yield" in q_lower or "maturity" in q_lower or "coupon" in q_lower:
        return (
            "MATCH (p:InvestmentPortfolio)-[h:CONTAINS_HOLDING]->(b:Bond)\n"
            "RETURN b.instrument_id AS bond_id, b.name AS bond_name, b.coupon_rate AS coupon_rate, "
            "b.maturity_date AS maturity, b.credit_rating AS credit_rating, h.current_value AS holding_value\n"
            "ORDER BY b.coupon_rate DESC"
        )

    if "trust" in q_lower or "estate" in q_lower or "delaware" in q_lower or "beneficiary" in q_lower:
        return (
            "MATCH (c:Person)-[b:BENEFICIARY_OF]->(e:LegalEntity)\n"
            "OPTIONAL MATCH (e)-[:ESTABLISHED_FOR]->(p:InvestmentPortfolio)\n"
            "RETURN c.name AS client_name, e.name AS trust_name, e.entity_type AS entity_type, "
            "e.jurisdiction AS jurisdiction, b.share_pct AS beneficiary_stake, p.name AS connected_portfolio"
        )

    if "aum" in q_lower or "portfolio" in q_lower or "wealth" in q_lower:
        return (
            "MATCH (c:Person)-[:OWNS_ACCOUNT]->(p:InvestmentPortfolio)\n"
            "RETURN c.name AS client_name, c.net_worth_tier AS tier, p.name AS portfolio_name, "
            "p.portfolio_type AS type, p.total_aum AS total_aum\n"
            "ORDER BY p.total_aum DESC"
        )

    if "compliance" in q_lower or "reg bi" in q_lower or "policy" in q_lower:
        return (
            "MATCH (cp:CompliancePolicy)\n"
            "RETURN cp.policy_id AS policy_id, cp.name AS policy_name, "
            "cp.max_equity_allocation_conservative AS max_equity_conservative, "
            "cp.max_illiquid_pct_conservative AS max_illiquid_conservative"
        )

    # Default broad graph search
    return (
        "MATCH (c:Person)-[:OWNS_ACCOUNT]->(p:InvestmentPortfolio)-[h:CONTAINS_HOLDING]->(asset)\n"
        "RETURN c.name AS client, p.name AS portfolio, labels(asset)[0] AS asset_type, "
        "coalesce(asset.ticker, asset.name) AS asset_name, h.allocation_pct AS weight, h.current_value AS value\n"
        "ORDER BY h.current_value DESC\n"
        "LIMIT 15"
    )


def translate_text_to_cypher(natural_query: str) -> Dict[str, Any]:
    """
    Translates a natural language question into a validated Cypher query using OpenAI GPT-4o
    or the deterministic heuristic compiler.
    """
    openai_key = os.getenv("OPENAI_API_KEY", "")
    cypher_query = ""
    engine_used = "heuristic_fibo_compiler"

    if openai_key and len(openai_key) > 20:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            system_prompt = f"""You are an expert Neo4j Cypher translator for an institutional Wealth Management Knowledge Graph.
Translate the user's natural language question into a SINGLE clean, syntactically correct, READ-ONLY Neo4j Cypher query.

{FIBO_GRAPH_SCHEMA}

RULES:
1. ONLY return the raw Cypher query. Do NOT include markdown fences, comments, or prose.
2. The query MUST be strictly read-only (MATCH, WITH, RETURN, ORDER BY, LIMIT).
3. Use appropriate WHERE filters, string comparisons, and aggregations (sum, count, collect).
4. Order results logically by allocation, value, or name where relevant.
"""
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": natural_query}
                ],
                temperature=0.0,
                max_tokens=350,
            )
            raw_cypher = resp.choices[0].message.content.strip()
            # Clean possible markdown ticks
            raw_cypher = re.sub(r"^```(cypher)?", "", raw_cypher, flags=re.IGNORECASE)
            raw_cypher = re.sub(r"```$", "", raw_cypher).strip()
            cypher_query = raw_cypher
            engine_used = "openai_gpt4o"
        except Exception as e:
            logger.warning(f"OpenAI Cypher translation failed ({e}), falling back to heuristic compiler.")
            cypher_query = generate_cypher_heuristic(natural_query)
    else:
        cypher_query = generate_cypher_heuristic(natural_query)

    # Validate read-only safety
    is_safe, error_msg = validate_read_only_cypher(cypher_query)
    if not is_safe:
        return {
            "status": "VALIDATION_ERROR",
            "error": error_msg,
            "raw_cypher": cypher_query,
            "engine": engine_used
        }

    return {
        "status": "SUCCESS",
        "cypher": cypher_query,
        "engine": engine_used
    }


def execute_text_to_cypher(natural_query: str) -> Dict[str, Any]:
    """
    End-to-end pipeline: translates natural language to Cypher, executes on Neo4j,
    and returns formatted structured records with execution latency.
    """
    start_time = time.time()
    translation = translate_text_to_cypher(natural_query)

    if translation.get("status") != "SUCCESS":
        return {
            "status": "ERROR",
            "error": translation.get("error", "Failed to generate valid Cypher"),
            "natural_query": natural_query,
            "generated_cypher": translation.get("raw_cypher"),
            "execution_time_ms": round((time.time() - start_time) * 1000, 2)
        }

    cypher_query = translation["cypher"]

    try:
        results = neo4j_client.execute_query(cypher_query)
        latency_ms = round((time.time() - start_time) * 1000, 2)

        # Normalize rows & columns
        columns = list(results[0].keys()) if results else []

        return {
            "status": "SUCCESS",
            "natural_query": natural_query,
            "generated_cypher": cypher_query,
            "translation_engine": translation["engine"],
            "row_count": len(results),
            "columns": columns,
            "rows": results,
            "execution_time_ms": latency_ms
        }
    except Exception as e:
        logger.error(f"Error executing generated Cypher: {e}")
        return {
            "status": "EXECUTION_ERROR",
            "natural_query": natural_query,
            "generated_cypher": cypher_query,
            "error": str(e),
            "execution_time_ms": round((time.time() - start_time) * 1000, 2)
        }
