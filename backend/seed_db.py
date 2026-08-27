"""
Seed database with FIBO schema constraints and dummy wealth management data.
"""

import sys
import time
import structlog
from src.db.neo4j_client import neo4j_client

logger = structlog.get_logger()


def seed_database(max_retries: int = 15, delay_seconds: int = 3):
    """Wait for Neo4j to be ready, clear old data, and run constraint and seed scripts."""
    print("Connecting to Neo4j graph database...")
    connected = False
    for attempt in range(1, max_retries + 1):
        if neo4j_client.verify_connectivity():
            print(f"Connected to Neo4j successfully on attempt {attempt}.")
            connected = True
            break
        print(f"Waiting for Neo4j to initialize (attempt {attempt}/{max_retries})...")
        time.sleep(delay_seconds)

    if not connected:
        print("ERROR: Could not connect to Neo4j. Check docker container status.")
        sys.exit(1)

    # 1. Clean Database
    print("Resetting database state...")
    neo4j_client.execute_query("MATCH (n) DETACH DELETE n")

    # 2. Apply Schema Constraints
    print("Applying FIBO schema constraints...")
    neo4j_client.load_cypher_script("schema/fibo_constraints.cypher")
    print("Constraints applied.")

    # 3. Seed Wealth Management Dataset
    print("Seeding FIBO Wealth Management data...")
    neo4j_client.load_cypher_script("schema/fibo_seed_wealth.cypher")
    print("Seed data successfully ingested.")

    # 4. Print Summary Stats
    counts = neo4j_client.execute_query(
        """
        MATCH (n)
        RETURN labels(n) AS node_labels, count(n) AS count
        ORDER BY count DESC
        """
    )
    print("\n--- Knowledge Graph Summary (Nodes) ---")
    for row in counts:
        print(f"Labels: {row['node_labels']} -> Count: {row['count']}")

    rel_counts = neo4j_client.execute_query(
        """
        MATCH ()-[r]->()
        RETURN type(r) AS rel_type, count(r) AS count
        ORDER BY count DESC
        """
    )
    print("\n--- Relationship Summary ---")
    for row in rel_counts:
        print(f"Relationship: [:{row['rel_type']}] -> Count: {row['count']}")


if __name__ == "__main__":
    seed_database()

