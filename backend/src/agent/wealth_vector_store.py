"""
AURA Wealth IQ - Enterprise Hybrid ChromaDB Vector Store
Indexes SEC Reg BI bulletins, Client Investment Policy Statements (IPS),
Delaware Trust legal agreements, and 10-K risk disclosures with metadata cross-linked to FIBO Knowledge Graph entities.
Powered by native ChromaDB with local dense embedding generator.
"""

import os
import re
import math
import time
import logging
from typing import List, Dict, Any, Optional

import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings
from chromadb.config import Settings

logger = logging.getLogger("WealthVectorStore")

# Institutional Wealth Management Unstructured Knowledge Base
WEALTH_DOCUMENTS = [
    {
        "doc_id": "SEC-REG-BI-2024-BULLETIN",
        "title": "SEC Regulation Best Interest (Rule 15l-1) Staff Compliance Bulletin",
        "category": "Regulatory Compliance",
        "client_id": "GLOBAL",
        "jurisdiction": "US-Federal",
        "related_entities": "SEC,FINRA",
        "related_sectors": "All",
        "content": (
            "Under SEC Regulation Best Interest (Exchange Act Rule 15l-1), broker-dealers and investment advisers "
            "must adhere to the Care Obligation, Disclosure Obligation, and Conflict of Interest Obligation. "
            "Advisers must evaluate portfolio concentration risk and ensure total equity allocation does not exceed "
            "mandated thresholds (e.g. max 35% for Conservative/Preservation accounts). Any portfolio exhibiting single-sector "
            "drift greater than 30% without explicit client suitability waivers constitutes a supervisory Reg BI breach."
        )
    },
    {
        "doc_id": "IPS-VICTORIA-STERLING-2024",
        "title": "Investment Policy Statement (IPS): Victoria Sterling Family Wealth Mandate",
        "category": "Client IPS",
        "client_id": "HNW-CLIENT-001",
        "jurisdiction": "Delaware",
        "related_entities": "HNW-CLIENT-001,PORT-VS-GROWTH-01,The Sterling Dynasty Trust",
        "related_sectors": "Technology,Healthcare,Financials",
        "content": (
            "Client Mandate: Moderate Growth with Estate Preservation. The Sterling Dynasty Trust is organized under Delaware "
            "General Corporation Law and Title 12 Delaware Code (Irrevocable Dynastic Trust). Target Asset Allocation: 55% Equities, "
            "35% Fixed Income, 10% Alternative Strategies. Maximum allowable single-sector concentration threshold is capped at 35.0%. "
            "Current portfolio is overweight Technology equities (51.2%), necessitating scheduled rebalancing into diversified fixed income."
        )
    },
    {
        "doc_id": "IPS-MARCUS-THORNE-2024",
        "title": "Investment Policy Statement (IPS): Marcus Thorne Capital Preservation Mandate",
        "category": "Client IPS",
        "client_id": "HNW-CLIENT-002",
        "jurisdiction": "Florida",
        "related_entities": "HNW-CLIENT-002,PORT-MT-INCOME-02",
        "related_sectors": "Fixed Income,Treasury,Municipal",
        "content": (
            "Client Mandate: Conservative Capital Preservation. Tax Residence: Florida (zero state income tax). "
            "Target Asset Allocation: 20% Equities, 70% Fixed Income (minimum A-rated corporate or municipal bonds), "
            "10% Liquid Cash Equivalents. Maximum allowable portfolio drawdown limit is 8.0%. Equity exposure must strictly avoid "
            "high-volatility or unhedged growth tech names to maintain full SEC Reg BI suitability."
        )
    },
    {
        "doc_id": "10K-NVDA-RISK-2024",
        "title": "NVIDIA Corporation (NVDA) FY2024 Form 10-K: Item 1A. Risk Factors",
        "category": "SEC 10-K Disclosure",
        "client_id": "GLOBAL",
        "jurisdiction": "Global",
        "related_entities": "NVDA,PORT-VS-GROWTH-01",
        "related_sectors": "Technology,Semiconductors",
        "content": (
            "Geopolitical and Regulatory Export Controls: Recent US Department of Commerce Bureau of Industry and Security (BIS) "
            "regulations impose strict licensing requirements on high-bandwidth memory (HBM3e) and advanced accelerator architecture "
            "(Hopper/Blackwell) shipments to certain global markets. Sudden regulatory adjustments may create revenue volatility "
            "and quarterly supply chain concentration bottlenecks for portfolios with concentrated semiconductor exposure."
        )
    },
    {
        "doc_id": "10K-AAPL-RISK-2024",
        "title": "Apple Inc. (AAPL) Form 10-K: Item 1A. Global Supply Chain & Market Exposure",
        "category": "SEC 10-K Disclosure",
        "client_id": "GLOBAL",
        "jurisdiction": "Global",
        "related_entities": "AAPL,PORT-VS-GROWTH-01",
        "related_sectors": "Technology,Consumer Electronics",
        "content": (
            "Supply Chain & Component Sourcing: The Company relies heavily on single-source supplier agreements for specialized silicon "
            "fabrication (TSMC) and display modules. Disruption in cross-border trade policy or semiconductor fabrication yields "
            "could adversely impact gross margins and portfolio valuation stability."
        )
    },
    {
        "doc_id": "DELAWARE-TRUST-CODE-T12",
        "title": "Delaware Code Title 12: Decanting, Dynasty Trusts & Asset Protection Nexus",
        "category": "Legal & Tax Statute",
        "client_id": "GLOBAL",
        "jurisdiction": "Delaware",
        "related_entities": "The Sterling Dynasty Trust,HNW-CLIENT-001",
        "related_sectors": "Estate Planning",
        "content": (
            "Delaware Dynasty Trusts (12 Del. C. Section 3303) allow perpetual duration without Rule Against Perpetuities constraints. "
            "Assets held within a properly structured Delaware Irrevocable Trust are shielded from state-level income taxation on "
            "accumulated earnings when all current beneficiaries reside outside Delaware, providing significant estate tax shielding."
        )
    }
]


class LocalDenseEmbeddingFunction(EmbeddingFunction[Documents]):
    """
    Offline deterministic dense embedding generator (384 dimensions)
    conforming to ChromaDB EmbeddingFunction protocol.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            tokens = re.findall(r"\b\w+\b", text.lower())
            vec = [0.0] * self.dim
            for idx, token in enumerate(tokens):
                h = hash(token)
                dim_idx = abs(h) % self.dim
                sign = 1.0 if (h % 2 == 0) else -1.0
                vec[dim_idx] += sign * (1.0 / (idx + 1.0) ** 0.5)

            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            embeddings.append([round(x / norm, 6) for x in vec])
        return embeddings

    @staticmethod
    def name() -> str:
        return "local_dense_embedding"


class ChromaWealthVectorStore:
    """
    ChromaDB-backed vector database storing wealth management policies,
    client Investment Policy Statements (IPS), and 10-K filings with explicit client-scoping.
    """

    def __init__(self, persist_dir: str = "./data/chroma_wealth_db"):
        self.persist_dir = persist_dir
        self.embedding_fn = LocalDenseEmbeddingFunction(dim=384)
        self.collection = None
        self.is_chroma_ready = False
        self._init_chroma()

    def _init_chroma(self):
        """Initializes persistent Chroma collection and seeds initial documents."""
        try:
            os.makedirs(self.persist_dir, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False)
            )
            # Recreate collection to ensure client_id metadata is refreshed
            try:
                self.client.delete_collection("fibo_wealth_knowledge_base")
            except Exception:
                pass

            self.collection = self.client.get_or_create_collection(
                name="fibo_wealth_knowledge_base",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )

            self._seed_documents()
            self.is_chroma_ready = True
            logger.info("chromadb_initialized", collection="fibo_wealth_knowledge_base", count=self.collection.count())
        except Exception as e:
            logger.warning(f"ChromaDB initialization encountered issue ({e}), running fallback if needed.")
            try:
                self.client = chromadb.EphemeralClient()
                self.collection = self.client.get_or_create_collection(
                    name="fibo_wealth_knowledge_base",
                    embedding_function=self.embedding_fn,
                    metadata={"hnsw:space": "cosine"}
                )
                self._seed_documents()
                self.is_chroma_ready = True
            except Exception as eph_err:
                logger.error(f"Ephemeral ChromaDB failed: {eph_err}")
                self.is_chroma_ready = False

    def _seed_documents(self):
        """Seeds canonical institutional wealth documents into ChromaDB with explicit client_id."""
        ids = [doc["doc_id"] for doc in WEALTH_DOCUMENTS]
        documents = [f"{doc['title']}\n\n{doc['content']}" for doc in WEALTH_DOCUMENTS]
        metadatas = [
            {
                "doc_id": doc["doc_id"],
                "title": doc["title"],
                "category": doc["category"],
                "client_id": doc["client_id"],  # Explicit client scoping (e.g. HNW-CLIENT-001, HNW-CLIENT-002, or GLOBAL)
                "jurisdiction": doc["jurisdiction"],
                "related_entities": doc["related_entities"],
                "related_sectors": doc["related_sectors"],
            }
            for doc in WEALTH_DOCUMENTS
        ]

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def search(
        self,
        query: str,
        entity_filter: Optional[str] = None,
        client_id: Optional[str] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic similarity search with metadata cross-filtering and client privacy scoping.
        If client_id is passed, only returns documents matching that client or GLOBAL documents.
        """
        active_filter = client_id or entity_filter

        if not self.is_chroma_ready or not self.collection:
            return self._fallback_search(query, active_filter, top_k)

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=min(top_k * 3, len(WEALTH_DOCUMENTS))
            )

            formatted = []
            if results and results["ids"] and len(results["ids"][0]) > 0:
                for idx in range(len(results["ids"][0])):
                    doc_id = results["ids"][0][idx]
                    metadata = results["metadatas"][0][idx]
                    document = results["documents"][0][idx]
                    distance = results["distances"][0][idx] if results["distances"] else 0.0
                    similarity = round(max(0.0, 1.0 - (distance / 2.0)), 4)
                    doc_client = metadata.get("client_id", "GLOBAL")

                    # Client Isolation Filter: Only return document if it matches active client or is GLOBAL
                    if active_filter:
                        filter_lower = active_filter.lower()
                        entities = metadata.get("related_entities", "").lower()
                        jurisdiction = metadata.get("jurisdiction", "").lower()

                        # If filter matches a client ID, ensure no other client's private IPS leaks
                        if "hnw-client-" in filter_lower:
                            if doc_client != "GLOBAL" and doc_client.lower() != filter_lower:
                                continue
                        else:
                            # General entity / sector filter
                            if filter_lower not in entities and filter_lower not in jurisdiction and filter_lower not in doc_client.lower():
                                continue

                    formatted.append({
                        "doc_id": doc_id,
                        "title": metadata.get("title", ""),
                        "category": metadata.get("category", ""),
                        "client_id": doc_client,
                        "jurisdiction": metadata.get("jurisdiction", ""),
                        "related_entities": metadata.get("related_entities", "").split(","),
                        "similarity_score": similarity,
                        "excerpt": document,
                    })

            return formatted[:top_k]
        except Exception as e:
            logger.error(f"ChromaDB search failed: {e}")
            return self._fallback_search(query, active_filter, top_k)

    def _fallback_search(
        self,
        query: str,
        active_filter: Optional[str] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Heuristic fallback search with client isolation."""
        query_lower = query.lower()
        matches = []
        for doc in WEALTH_DOCUMENTS:
            score = 0.0
            if any(term in doc["content"].lower() for term in query_lower.split()):
                score += 0.5
            if any(term in doc["title"].lower() for term in query_lower.split()):
                score += 0.4
            
            doc_client = doc.get("client_id", "GLOBAL")
            if active_filter:
                filter_lower = active_filter.lower()
                if "hnw-client-" in filter_lower:
                    if doc_client != "GLOBAL" and doc_client.lower() != filter_lower:
                        continue
                else:
                    if filter_lower not in doc["related_entities"].lower() and filter_lower not in doc["jurisdiction"].lower() and filter_lower not in doc_client.lower():
                        continue

            if score > 0.1:
                matches.append((score, doc))

        matches.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "doc_id": doc["doc_id"],
                "title": doc["title"],
                "category": doc["category"],
                "client_id": doc.get("client_id", "GLOBAL"),
                "jurisdiction": doc["jurisdiction"],
                "related_entities": doc["related_entities"].split(","),
                "similarity_score": round(score, 4),
                "excerpt": doc["content"],
            }
            for score, doc in matches[:top_k]
        ]


# Global singleton instance
wealth_vector_store = ChromaWealthVectorStore()


def search_wealth_policy_and_filings(
    query: str,
    entity_filter: Optional[str] = None,
    client_id: Optional[str] = None,
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Searches unstructured SEC Reg BI regulatory bulletins, client Investment Policy Statements (IPS),
    and 10-K risk disclosures using ChromaDB dense embeddings with metadata cross-linked to FIBO entities
    and strict client-privacy scoping.

    Unity Catalog Mapping: wealth_mgmt_catalog.fibo_knowledge_graph.search_wealth_policy_and_filings
    """
    t0 = time.time()
    results = wealth_vector_store.search(query, entity_filter=entity_filter, client_id=client_id, top_k=top_k)
    return {
        "status": "SUCCESS",
        "engine": "ChromaDB_Local_Dense_Embeddings",
        "query": query,
        "client_scope": client_id or entity_filter or "GLOBAL",
        "match_count": len(results),
        "documents": results,
        "search_latency_ms": round((time.time() - t0) * 1000, 2)
    }
