"""
Local Model Context Protocol (MCP) Server for Neo4j FIBO Knowledge Graph.

Exposes Databricks Unity Catalog tools to Antigravity, LLM agents, and local IDEs
via standard MCP protocol.
"""

from typing import Any, Dict, List
from mcp.server.fastmcp import FastMCP
import structlog
from src.tools.uc_portfolio_tools import (
    get_client_profile_and_holdings,
    check_portfolio_risk_suitability,
    find_correlated_exposure,
    analyze_client_tax_and_trust_structure,
    query_fibo_knowledge_graph,
)

logger = structlog.get_logger()

# Initialize FastMCP Server
mcp = FastMCP("fibo-wealth-mcp-server")


@mcp.tool(
    name="get_client_profile_and_holdings",
    description="Retrieve comprehensive HNW client profile, risk tolerance, and detailed portfolio holdings following FIBO ontology."
)
def tool_get_client_profile_and_holdings(client_id: str) -> Dict[str, Any]:
    """Retrieve client metadata, risk profile, and portfolio holdings."""
    logger.info("mcp_tool_invoked", tool="get_client_profile_and_holdings", client_id=client_id)
    return get_client_profile_and_holdings(client_id=client_id)


@mcp.tool(
    name="check_portfolio_risk_suitability",
    description="Evaluate whether an investment portfolio complies with client risk tolerance and regulatory policies (Reg BI / MiFID II)."
)
def tool_check_portfolio_risk_suitability(client_id: str, portfolio_id: str) -> Dict[str, Any]:
    """Check portfolio risk suitability and equity drift."""
    logger.info(
        "mcp_tool_invoked",
        tool="check_portfolio_risk_suitability",
        client_id=client_id,
        portfolio_id=portfolio_id,
    )
    return check_portfolio_risk_suitability(client_id=client_id, portfolio_id=portfolio_id)


@mcp.tool(
    name="find_correlated_exposure",
    description="Analyze systemic concentration risk and sector exposure across all client investment portfolios."
)
def tool_find_correlated_exposure(sector: str, min_allocation_pct: float = 0.05) -> List[Dict[str, Any]]:
    """Analyze correlated sector exposure across portfolios."""
    logger.info("mcp_tool_invoked", tool="find_correlated_exposure", sector=sector)
    return find_correlated_exposure(sector=sector, min_allocation_pct=min_allocation_pct)


@mcp.tool(
    name="analyze_client_tax_and_trust_structure",
    description="Analyze multi-entity wealth structures, irrevocable trusts, and legal entity relationships for an HNW client."
)
def tool_analyze_client_tax_and_trust_structure(client_id: str) -> Dict[str, Any]:
    """Analyze tax residence, trusts, and legal entities."""
    logger.info("mcp_tool_invoked", tool="analyze_client_tax_and_trust_structure", client_id=client_id)
    return analyze_client_tax_and_trust_structure(client_id=client_id)


@mcp.tool(
    name="query_fibo_knowledge_graph",
    description="Execute a controlled read-only Cypher query against the FIBO Wealth Management knowledge graph."
)
def tool_query_fibo_knowledge_graph(cypher_query: str) -> List[Dict[str, Any]]:
    """Execute read-only Cypher query."""
    logger.info("mcp_tool_invoked", tool="query_fibo_knowledge_graph", query=cypher_query)
    return query_fibo_knowledge_graph(cypher_query=cypher_query)


if __name__ == "__main__":
    print("Starting FIBO Wealth Management MCP Server via FastMCP...")
    mcp.run()

