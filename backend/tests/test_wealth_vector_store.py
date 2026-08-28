"""
Unit tests for ChromaWealthVectorStore with explicit client scoping & isolation.
"""

import pytest
from src.agent.wealth_vector_store import wealth_vector_store
from src.tools.uc_portfolio_tools import search_wealth_documents


def test_chroma_initialization_with_client_scoping():
    assert wealth_vector_store.collection is not None
    assert wealth_vector_store.collection.count() >= 6


def test_client_isolation_victoria():
    """Searching for Victoria Sterling (HNW-CLIENT-001) must NEVER return Marcus Thorne's IPS."""
    results = wealth_vector_store.search(
        "mandate asset allocation and trust rules",
        client_id="HNW-CLIENT-001",
        top_k=5
    )
    doc_ids = [r["doc_id"] for r in results]
    assert "IPS-VICTORIA-STERLING-2024" in doc_ids
    assert "IPS-MARCUS-THORNE-2024" not in doc_ids  # Guaranteed privacy isolation


def test_client_isolation_marcus():
    """Searching for Marcus Thorne (HNW-CLIENT-002) must NEVER return Victoria's IPS."""
    results = wealth_vector_store.search(
        "mandate asset allocation and trust rules",
        client_id="HNW-CLIENT-002",
        top_k=5
    )
    doc_ids = [r["doc_id"] for r in results]
    assert "IPS-MARCUS-THORNE-2024" in doc_ids
    assert "IPS-VICTORIA-STERLING-2024" not in doc_ids  # Guaranteed privacy isolation


def test_global_documents_accessible_to_all_clients():
    """Global documents like SEC Reg BI and 10-Ks are accessible under any client scope."""
    results = wealth_vector_store.search(
        "SEC Regulation Best Interest care obligation",
        client_id="HNW-CLIENT-001",
        top_k=3
    )
    doc_ids = [r["doc_id"] for r in results]
    assert any("SEC-REG-BI" in d for d in doc_ids)


def test_search_wealth_documents_tool():
    docs = search_wealth_documents(
        query="What is the target equity allocation and trust structure?",
        client_id="HNW-CLIENT-001"
    )
    assert len(docs) > 0
    assert all(d["client_id"] in ["HNW-CLIENT-001", "GLOBAL"] for d in docs)
    assert any("IPS" in d["section"] or "Policy" in d["document_title"] for d in docs)
