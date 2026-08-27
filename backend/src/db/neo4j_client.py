"""
Neo4j Graph Database Client for FIBO Wealth Management Knowledge Graph.
Handles connection pooling, query execution, and schema seeding.
"""

import os
from typing import Any, Dict, List, Optional
from neo4j import GraphDatabase, Driver, Session
import structlog
from dotenv import load_dotenv

load_dotenv()

logger = structlog.get_logger()


class Neo4jClient:
    """Thread-safe Neo4j Client with connection pooling and query formatting."""

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
    ):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password123")
        self.database = database or os.getenv("NEO4J_DATABASE", "neo4j")
        self._driver: Optional[Driver] = None

    def connect(self) -> Driver:
        """Initialize and verify connection to Neo4j."""
        if not self._driver:
            self._driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
            )
            logger.info("neo4j_connected", uri=self.uri, user=self.user)
        return self._driver

    def close(self):
        """Close driver connection pool."""
        if self._driver:
            self._driver.close()
            self._driver = None
            logger.info("neo4j_connection_closed")

    def execute_query(
        self, cypher: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Execute a read/write Cypher query and return list of dictionaries."""
        driver = self.connect()
        with driver.session(database=self.database) as session:
            result = session.run(cypher, parameters or {})
            return [record.data() for record in result]

    def verify_connectivity(self) -> bool:
        """Check if Neo4j is reachable and responsive."""
        try:
            driver = self.connect()
            driver.verify_connectivity()
            return True
        except Exception as e:
            logger.error("neo4j_connectivity_failed", error=str(e))
            return False

    def load_cypher_script(self, filepath: str) -> List[Dict[str, Any]]:
        """Execute multiple Cypher statements from a .cypher file separated by semicolons."""
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        statements = [stmt.strip() for stmt in content.split(";") if stmt.strip()]
        results = []
        driver = self.connect()
        with driver.session(database=self.database) as session:
            for stmt in statements:
                # Remove single-line comments from statement
                cleaned_lines = [
                    line for line in stmt.splitlines() if not line.strip().startswith("//")
                ]
                clean_stmt = "\n".join(cleaned_lines).strip()
                if clean_stmt:
                    res = session.run(clean_stmt)
                    results.extend([r.data() for r in res])
        logger.info("cypher_script_executed", filepath=filepath, statement_count=len(statements))
        return results


# Global singleton instance
neo4j_client = Neo4jClient()

