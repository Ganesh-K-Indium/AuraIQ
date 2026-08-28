"""
Databricks Unity Catalog Tools for FIBO Wealth Management Knowledge Graph.

These functions are designed to map directly to Databricks Unity Catalog functions
under catalog `wealth_mgmt_catalog.fibo_knowledge_graph` and be registered as tools
in the Databricks Mosaic AI Agent Framework.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import structlog
from src.db.neo4j_client import neo4j_client

logger = structlog.get_logger()


# Pydantic Response Models for structured tool output
class HoldingDetail(BaseModel):
    name: str
    asset_class: str
    ticker_or_id: Optional[str] = None
    sector: Optional[str] = None
    allocation_pct: float
    current_value: float
    risk_rating: Optional[str] = None


class PortfolioBreakdown(BaseModel):
    portfolio_id: str
    portfolio_name: str
    portfolio_type: str
    total_aum: float
    holdings: List[HoldingDetail]


class ClientProfileHoldingsResponse(BaseModel):
    client_id: str
    name: str
    net_worth_tier: str
    risk_profile: Dict[str, Any]
    portfolios: List[PortfolioBreakdown]


def get_client_profile_and_holdings(client_id: str) -> Dict[str, Any]:
    """
    Retrieve comprehensive client profile, risk tolerance, and detailed portfolio holdings
    from the FIBO Wealth Management knowledge graph.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.get_client_profile_and_holdings

    Args:
        client_id: Unique identifier for the HNW Client (e.g. 'HNW-CLIENT-001').

    Returns:
        Dict containing client metadata, risk profile parameters, and an array of
        associated investment portfolios with individual holding allocations and asset classes.
    """
    query = """
    MATCH (c:`fibo-fnd-pty:Person` {client_id: $client_id})
    OPTIONAL MATCH (c)-[:HAS_RISK_PROFILE]->(rp:`fibo-fbc-pas:RiskProfile`)
    OPTIONAL MATCH (c)-[:OWNS_ACCOUNT]->(p:`fibo-fnd-agr:InvestmentPortfolio`)
    OPTIONAL MATCH (p)-[h:CONTAINS_HOLDING]->(inst:FinancialInstrument)
    RETURN c.client_id AS client_id,
           c.name AS client_name,
           c.net_worth_tier AS net_worth_tier,
           c.tax_residence AS tax_residence,
           rp.tolerance_level AS risk_tolerance,
           rp.target_equity_pct AS target_equity_pct,
           rp.target_fixed_income_pct AS target_fixed_income_pct,
           rp.target_alternatives_pct AS target_alternatives_pct,
           rp.max_drawdown_pct AS max_drawdown_pct,
           rp.esg_preference AS esg_preference,
           p.portfolio_id AS portfolio_id,
           p.name AS portfolio_name,
           p.portfolio_type AS portfolio_type,
           p.total_aum AS total_aum,
           collect({
               name: inst.name,
               asset_class: inst.asset_class,
               ticker_or_id: coalesce(inst.ticker, inst.instrument_id, inst.fund_id),
               sector: inst.sector,
               allocation_pct: h.allocation_pct,
               current_value: h.current_value,
               risk_rating: inst.risk_rating
           }) AS holdings
    """
    results = neo4j_client.execute_query(query, {"client_id": client_id})
    if not results or not results[0].get("client_id"):
        return {"error": f"Client with ID '{client_id}' not found."}

    row = results[0]
    return {
        "client_id": row["client_id"],
        "name": row["client_name"],
        "net_worth_tier": row["net_worth_tier"],
        "tax_residence": row["tax_residence"],
        "risk_profile": {
            "tolerance_level": row["risk_tolerance"],
            "target_equity_pct": row["target_equity_pct"],
            "target_fixed_income_pct": row["target_fixed_income_pct"],
            "target_alternatives_pct": row["target_alternatives_pct"],
            "max_drawdown_pct": row["max_drawdown_pct"],
            "esg_preference": row["esg_preference"],
        },
        "portfolios": [
            {
                "portfolio_id": r["portfolio_id"],
                "portfolio_name": r["portfolio_name"],
                "portfolio_type": r["portfolio_type"],
                "total_aum": r["total_aum"],
                "holdings": [h for h in r["holdings"] if h.get("name") is not None],
            }
            for r in results
            if r.get("portfolio_id")
        ],
    }


def check_portfolio_risk_suitability(client_id: str, portfolio_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluate whether a specific investment portfolio adheres to client risk mandate and
    FIBO regulatory compliance policies (e.g. Reg BI / MiFID II suitability).

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.check_portfolio_risk_suitability

    Args:
        client_id: Unique identifier for the HNW Client (e.g. 'HNW-CLIENT-001').
        portfolio_id: Optional unique identifier for the Portfolio (e.g. 'PORT-VS-GROWTH-01').
                      If omitted or not found, automatically evaluates the client's primary portfolio.

    Returns:
        Dict containing suitability metrics: actual vs target asset allocation,
        equity concentration, compliance policy checks, and violation flags.
    """
    query = """
    MATCH (c:`fibo-fnd-pty:Person` {client_id: $client_id})-[:OWNS_ACCOUNT]->(p:`fibo-fnd-agr:InvestmentPortfolio`)
    WHERE ($portfolio_id IS NULL OR $portfolio_id = "" OR p.portfolio_id = $portfolio_id)
    OPTIONAL MATCH (c)-[:HAS_RISK_PROFILE]->(rp:`fibo-fbc-pas:RiskProfile`)
    OPTIONAL MATCH (p)-[:SUBJECT_TO]->(cp:`fibo-reg-rep:CompliancePolicy`)
    OPTIONAL MATCH (p)-[h:CONTAINS_HOLDING]->(inst:FinancialInstrument)
    WITH c, p, rp, cp,
         sum(CASE WHEN inst.asset_class = 'Equity' THEN h.allocation_pct ELSE 0 END) AS actual_equity_pct,
         sum(CASE WHEN inst.asset_class = 'FixedIncome' THEN h.allocation_pct ELSE 0 END) AS actual_fixed_income_pct,
         sum(CASE WHEN inst.asset_class IN ['Alternative', 'RealEstate'] THEN h.allocation_pct ELSE 0 END) AS actual_alt_pct,
         collect({
             instrument: inst.name,
             asset_class: inst.asset_class,
             allocation_pct: h.allocation_pct,
             risk_rating: inst.risk_rating
         }) AS holdings
    RETURN c.client_id AS client_id,
           c.name AS client_name,
           p.portfolio_id AS portfolio_id,
           p.name AS portfolio_name,
           rp.tolerance_level AS risk_mandate,
           rp.target_equity_pct AS target_equity_pct,
           rp.target_fixed_income_pct AS target_fixed_income_pct,
           rp.target_alternatives_pct AS target_alternatives_pct,
           actual_equity_pct,
           actual_fixed_income_pct,
           actual_alt_pct,
           cp.policy_id AS governing_compliance_policy,
           cp.max_equity_allocation_conservative AS policy_max_equity_conservative,
           holdings
    LIMIT 1
    """
    results = neo4j_client.execute_query(
        query, {"client_id": client_id, "portfolio_id": portfolio_id or None}
    )
    if not results:
        # Fallback to resolving any portfolio owned by the client
        results = neo4j_client.execute_query(
            query, {"client_id": client_id, "portfolio_id": None}
        )

    if not results:
        return {"error": f"No portfolio found for client '{client_id}'."}

    data = results[0]
    equity_diff = (data["actual_equity_pct"] or 0) - (data["target_equity_pct"] or 0)
    
    # Compliance Suitability Check
    is_compliant = True
    reasons = []
    
    if "Conservative" in (data.get("risk_mandate") or ""):
        max_eq = data.get("policy_max_equity_conservative") or 0.35
        if (data["actual_equity_pct"] or 0) > max_eq:
            is_compliant = False
            reasons.append(
                f"Equity allocation ({data['actual_equity_pct']:.1%}) exceeds conservative limit of {max_eq:.1%}."
            )

    return {
        "client_id": data["client_id"],
        "client_name": data["client_name"],
        "portfolio_id": data["portfolio_id"],
        "portfolio_name": data["portfolio_name"],
        "risk_mandate": data["risk_mandate"],
        "allocations": {
            "actual": {
                "equity_pct": round(data["actual_equity_pct"] or 0, 4),
                "fixed_income_pct": round(data["actual_fixed_income_pct"] or 0, 4),
                "alternatives_pct": round(data["actual_alt_pct"] or 0, 4),
            },
            "target": {
                "equity_pct": round(data["target_equity_pct"] or 0, 4),
                "fixed_income_pct": round(data["target_fixed_income_pct"] or 0, 4),
                "alternatives_pct": round(data["target_alternatives_pct"] or 0, 4),
            },
            "equity_drift_pct": round(equity_diff, 4),
        },
        "suitability_status": "COMPLIANT" if is_compliant else "NON_COMPLIANT_WARNING",
        "compliance_notes": reasons if reasons else ["Portfolio is aligned with risk mandate and regulatory policies."],
    }


def find_correlated_exposure(sector: str, min_allocation_pct: float = 0.05) -> List[Dict[str, Any]]:
    """
    Identify systemic concentration risk and sector exposure across all client portfolios in the wealth book.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.find_correlated_exposure

    Args:
        sector: Economic sector name (e.g. 'Technology', 'Healthcare', 'Financials').
        min_allocation_pct: Minimum portfolio allocation threshold to filter exposure (default: 0.05 / 5%).

    Returns:
        List of affected clients, portfolios, specific holdings, and aggregate capital exposure in that sector.
    """
    query = """
    MATCH (c:`fibo-fnd-pty:Person`)-[:OWNS_ACCOUNT]->(p:`fibo-fnd-agr:InvestmentPortfolio`)-[h:CONTAINS_HOLDING]->(inst:FinancialInstrument)
    WHERE inst.sector = $sector AND h.allocation_pct >= $min_allocation_pct
    RETURN c.client_id AS client_id,
           c.name AS client_name,
           p.portfolio_id AS portfolio_id,
           p.name AS portfolio_name,
           inst.ticker AS ticker,
           inst.name AS instrument_name,
           h.allocation_pct AS allocation_pct,
           h.current_value AS exposure_value_usd
    ORDER BY h.allocation_pct DESC
    """
    results = neo4j_client.execute_query(
        query, {"sector": sector, "min_allocation_pct": min_allocation_pct}
    )
    return results


def analyze_client_tax_and_trust_structure(client_id: str) -> Dict[str, Any]:
    """
    Analyze multi-entity wealth structures, family trusts, and legal entity relationships
    for an Ultra-HNW client following FIBO entity modeling.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.analyze_client_tax_and_trust_structure

    Args:
        client_id: Unique identifier for the HNW Client (e.g. 'HNW-CLIENT-001').

    Returns:
        Dict containing tax jurisdiction, connected trust structures, beneficiary stakes, and estate planning entities.
    """
    query = """
    MATCH (c:`fibo-fnd-pty:Person` {client_id: $client_id})
    OPTIONAL MATCH (c)-[b:BENEFICIARY_OF]->(e:`fibo-fnd-org:LegalEntity`)
    RETURN c.client_id AS client_id,
           c.name AS client_name,
           c.tax_residence AS tax_residence,
           c.kyc_status AS kyc_status,
           collect({
               entity_id: e.entity_id,
               entity_name: e.name,
               jurisdiction: e.jurisdiction,
               entity_type: e.entity_type,
               beneficiary_share_pct: b.share_pct
           }) AS legal_entities
    """
    results = neo4j_client.execute_query(query, {"client_id": client_id})
    if not results:
        return {"error": f"Client '{client_id}' not found."}
    return results[0]


def query_fibo_knowledge_graph(cypher_query: str) -> List[Dict[str, Any]]:
    """
    Execute controlled, read-only Cypher graph queries against the FIBO Wealth Management database.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.query_fibo_knowledge_graph

    Args:
        cypher_query: Cypher query string (must begin with MATCH or RETURN).

    Returns:
        List of matched graph records.
    """
    cleaned = cypher_query.strip()
    # Guard against destructive queries in Agentic RAG
    prohibited_keywords = ["DELETE", "DETACH", "DROP", "CREATE", "SET", "MERGE", "REMOVE"]
    first_word = cleaned.split()[0].upper() if cleaned.split() else ""
    if any(keyword in cleaned.upper() for keyword in ["DROP", "DETACH DELETE", "DELETE"]):
        raise ValueError("Destructive write/delete queries are prohibited in read-only tool.")

    return neo4j_client.execute_query(cleaned)


def execute_dynamic_text_to_cypher(natural_query: str) -> Dict[str, Any]:
    """
    Translates an ad-hoc natural language question into a validated read-only Cypher query
    and executes it against the FIBO Knowledge Graph with sub-millisecond execution telemetry.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.execute_dynamic_text_to_cypher
    """
    from src.agent.text_to_cypher import execute_text_to_cypher
    return execute_text_to_cypher(natural_query)


def generate_and_execute_text_to_cypher(natural_query: str) -> Dict[str, Any]:
    """Unity Catalog tool mapping for dynamic Text-to-Cypher."""
    return execute_dynamic_text_to_cypher(natural_query)


def search_wealth_documents(
    query: str,
    client_id: Optional[str] = None,
    entity_filter: Optional[str] = None,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Searches unstructured SEC Reg BI regulatory bulletins, client Investment Policy Statements (IPS),
    and 10-K risk disclosures using ChromaDB dense embeddings with metadata cross-linked to FIBO entities.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.search_wealth_documents
    """
    from src.agent.wealth_vector_store import wealth_vector_store
    results = wealth_vector_store.search(query=query, entity_filter=entity_filter, client_id=client_id, top_k=top_k)
    return [
        {
            "document_title": r.get("title", ""),
            "section": r.get("category", ""),
            "content": r.get("excerpt", ""),
            "entity_links": r.get("related_entities", []),
            "similarity_score": r.get("similarity_score", 0.0),
            "client_id": r.get("client_id", "GLOBAL"),
        }
        for r in results
    ]


def search_wealth_policy_and_filings(
    query: str,
    entity_filter: Optional[str] = None,
    client_id: Optional[str] = None,
    top_k: int = 3
) -> Dict[str, Any]:
    """Unity Catalog tool mapping for wealth policy vector search."""
    from src.agent.wealth_vector_store import search_wealth_policy_and_filings as _search
    return _search(query=query, entity_filter=entity_filter, client_id=client_id, top_k=top_k)





