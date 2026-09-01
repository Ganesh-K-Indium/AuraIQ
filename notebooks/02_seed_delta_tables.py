# Databricks notebook source
# MAGIC %md
# MAGIC # 📊 AURA Wealth IQ: Complete Data Seeding Notebook (Delta Lake + FIBO Knowledge Graph)
# MAGIC > **Enterprise Data Seeding Pipeline for Databricks Lakehouse & Knowledge Graph**
# MAGIC > 
# MAGIC > Target Catalog: **`db_ai_strike_team.fibo_knowledge_graph`**
# MAGIC > 
# MAGIC > This notebook seeds both layers of the architecture:
# MAGIC > 1. **Delta Lake Tables in Unity Catalog**: `dim_clients`, `dim_legal_entities`, `dim_portfolios`, `dim_instruments`, `fact_holdings`.
# MAGIC > 2. **FIBO Knowledge Graph in Neo4j**: Loads FIBO schema constraints, nodes, and multi-hop relationships.

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 1: Set Catalog and Schema

# COMMAND ----------
# MAGIC %sql
# MAGIC USE CATALOG db_ai_strike_team;
# MAGIC CREATE SCHEMA IF NOT EXISTS fibo_knowledge_graph;
# MAGIC USE SCHEMA fibo_knowledge_graph;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 2: Create and Seed `dim_clients`

# COMMAND ----------
# MAGIC %sql
# MAGIC CREATE OR REPLACE TABLE dim_clients (
# MAGIC   client_id STRING NOT NULL COMMENT 'Unique Client ID matching HNW-CLIENT-XXX',
# MAGIC   name STRING NOT NULL COMMENT 'Full Legal Name',
# MAGIC   net_worth_tier STRING COMMENT 'Net Worth Category: Ultra-HNW or HNW',
# MAGIC   tax_residence STRING COMMENT 'Primary Tax Domicile (e.g. Delaware, Florida)',
# MAGIC   kyc_status STRING COMMENT 'KYC Verification Status',
# MAGIC   accredited_investor BOOLEAN COMMENT 'SEC Accredited Investor Flag',
# MAGIC   created_at TIMESTAMP
# MAGIC )
# MAGIC COMMENT 'FIBO Person & Wealth Client Master Dimension';
# MAGIC 
# MAGIC INSERT INTO dim_clients VALUES
# MAGIC   ('HNW-CLIENT-001', 'Victoria Sterling', 'Ultra-HNW', 'Delaware', 'VERIFIED_TIER_1', true, current_timestamp()),
# MAGIC   ('HNW-CLIENT-002', 'Marcus Thorne', 'HNW', 'Florida', 'VERIFIED_TIER_1', true, current_timestamp()),
# MAGIC   ('HNW-CLIENT-003', 'Elena Rostova', 'Ultra-HNW', 'New York', 'VERIFIED_TIER_1', true, current_timestamp());
# MAGIC 
# MAGIC SELECT * FROM dim_clients;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 3: Create and Seed `dim_legal_entities` (Delaware Trusts & Family Offices)

# COMMAND ----------
# MAGIC %sql
# MAGIC CREATE OR REPLACE TABLE dim_legal_entities (
# MAGIC   entity_id STRING NOT NULL,
# MAGIC   entity_name STRING NOT NULL,
# MAGIC   entity_type STRING COMMENT 'Irrevocable Trust, Family Office, LLC',
# MAGIC   jurisdiction STRING COMMENT 'State or Country of Organization',
# MAGIC   beneficiary_client_id STRING,
# MAGIC   beneficiary_share_pct DOUBLE COMMENT 'Beneficiary Ownership Stake'
# MAGIC )
# MAGIC COMMENT 'FIBO Legal Entity & Estate Planning Trust Dimension';
# MAGIC 
# MAGIC INSERT INTO dim_legal_entities VALUES
# MAGIC   ('ENT-TRUST-001', 'The Sterling Dynasty Trust', 'Irrevocable Dynasty Trust', 'Delaware', 'HNW-CLIENT-001', 1.00),
# MAGIC   ('ENT-TRUST-002', 'Thorne Family Capital LLC', 'Family Asset LLC', 'Florida', 'HNW-CLIENT-002', 1.00),
# MAGIC   ('ENT-TRUST-003', 'Rostova Global Foundation', 'Private Charitable Foundation', 'Delaware', 'HNW-CLIENT-003', 0.85);
# MAGIC 
# MAGIC SELECT * FROM dim_legal_entities;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 4: Create and Seed `dim_portfolios`

# COMMAND ----------
# MAGIC %sql
# MAGIC CREATE OR REPLACE TABLE dim_portfolios (
# MAGIC   portfolio_id STRING NOT NULL,
# MAGIC   client_id STRING NOT NULL,
# MAGIC   portfolio_name STRING NOT NULL,
# MAGIC   mandate_type STRING COMMENT 'Moderate Growth, Capital Preservation, Aggressive Growth',
# MAGIC   total_aum DOUBLE COMMENT 'Current Total Assets Under Management in USD',
# MAGIC   target_equity_pct DOUBLE COMMENT 'Target Equity Allocation Weight',
# MAGIC   target_fixed_income_pct DOUBLE COMMENT 'Target Fixed Income Allocation Weight',
# MAGIC   target_alts_pct DOUBLE COMMENT 'Target Alternative Asset Weight',
# MAGIC   max_sector_cap_pct DOUBLE COMMENT 'Maximum allowable single-sector concentration'
# MAGIC )
# MAGIC COMMENT 'FIBO Investment Portfolio & Mandate Master Dimension';
# MAGIC 
# MAGIC INSERT INTO dim_portfolios VALUES
# MAGIC   ('PORT-VS-GROWTH-01', 'HNW-CLIENT-001', 'Victoria Sterling Flagship Growth', 'Moderate Growth', 12500000.0, 0.55, 0.35, 0.10, 0.35),
# MAGIC   ('PORT-MT-INCOME-02', 'HNW-CLIENT-002', 'Marcus Thorne Capital Preservation', 'Capital Preservation', 6000000.0, 0.20, 0.70, 0.10, 0.25),
# MAGIC   ('PORT-ER-OPP-03', 'HNW-CLIENT-003', 'Elena Rostova Global Opportunities', 'Aggressive Growth', 25000000.0, 0.70, 0.15, 0.15, 0.40);
# MAGIC 
# MAGIC SELECT * FROM dim_portfolios;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 5: Create and Seed `dim_instruments`

# COMMAND ----------
# MAGIC %sql
# MAGIC CREATE OR REPLACE TABLE dim_instruments (
# MAGIC   instrument_id STRING NOT NULL,
# MAGIC   ticker STRING,
# MAGIC   name STRING NOT NULL,
# MAGIC   asset_class STRING COMMENT 'Equities, Fixed Income, Alternatives, Cash',
# MAGIC   sector STRING COMMENT 'Technology, Healthcare, Financials, Government, Energy',
# MAGIC   credit_rating STRING COMMENT 'AAA, AA, A, BBB, etc. (for Bonds)',
# MAGIC   coupon_yield_pct DOUBLE,
# MAGIC   maturity_date STRING
# MAGIC )
# MAGIC COMMENT 'FIBO Financial Instrument Master Dimension';
# MAGIC 
# MAGIC INSERT INTO dim_instruments VALUES
# MAGIC   ('EQ-NVDA', 'NVDA', 'NVIDIA Corporation', 'Equities', 'Technology', NULL, 0.02, NULL),
# MAGIC   ('EQ-AAPL', 'AAPL', 'Apple Inc.', 'Equities', 'Technology', NULL, 0.50, NULL),
# MAGIC   ('EQ-MSFT', 'MSFT', 'Microsoft Corporation', 'Equities', 'Technology', NULL, 0.70, NULL),
# MAGIC   ('EQ-JPM',  'JPM',  'JPMorgan Chase & Co.', 'Equities', 'Financials', NULL, 2.30, NULL),
# MAGIC   ('EQ-LLY',  'LLY',  'Eli Lilly and Company', 'Equities', 'Healthcare', NULL, 0.90, NULL),
# MAGIC   ('BD-UST-5Y', 'UST-5Y', 'US Treasury 5-Year Benchmark Note', 'Fixed Income', 'Government', 'AAA', 4.35, '2029-08-15'),
# MAGIC   ('BD-CORP-A', 'APPL-BOND', 'Apple Inc. Senior Notes 2028', 'Fixed Income', 'Technology', 'AA+', 4.65, '2028-05-11'),
# MAGIC   ('ALT-PE-01', 'VC-FUND-I', 'Apex Global Venture Capital Fund IV', 'Alternatives', 'Private Equity', NULL, NULL, NULL);
# MAGIC 
# MAGIC SELECT * FROM dim_instruments;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 6: Create and Seed `fact_holdings` (Positions & Valuations)

# COMMAND ----------
# MAGIC %sql
# MAGIC CREATE OR REPLACE TABLE fact_holdings (
# MAGIC   holding_id STRING NOT NULL,
# MAGIC   portfolio_id STRING NOT NULL,
# MAGIC   client_id STRING NOT NULL,
# MAGIC   instrument_id STRING NOT NULL,
# MAGIC   ticker STRING,
# MAGIC   asset_name STRING,
# MAGIC   asset_class STRING,
# MAGIC   sector STRING,
# MAGIC   allocation_pct DOUBLE COMMENT 'Weight as decimal (0.0 to 1.0)',
# MAGIC   current_value_usd DOUBLE COMMENT 'Holding market valuation in USD',
# MAGIC   cost_basis_usd DOUBLE,
# MAGIC   as_of_date DATE
# MAGIC )
# MAGIC COMMENT 'FIBO Fact Holdings Snapshot Table';
# MAGIC 
# MAGIC INSERT INTO fact_holdings VALUES
# MAGIC   -- Victoria Sterling Portfolio (Overweight Tech at 51.2%)
# MAGIC   ('HLD-VS-001', 'PORT-VS-GROWTH-01', 'HNW-CLIENT-001', 'EQ-NVDA', 'NVDA', 'NVIDIA Corporation', 'Equities', 'Technology', 0.2800, 3500000.0, 1800000.0, current_date()),
# MAGIC   ('HLD-VS-002', 'PORT-VS-GROWTH-01', 'HNW-CLIENT-001', 'EQ-AAPL', 'AAPL', 'Apple Inc.', 'Equities', 'Technology', 0.2320, 2900000.0, 1950000.0, current_date()),
# MAGIC   ('HLD-VS-003', 'PORT-VS-GROWTH-01', 'HNW-CLIENT-001', 'EQ-LLY',  'LLY',  'Eli Lilly and Company', 'Equities', 'Healthcare', 0.1280, 1600000.0, 1100000.0, current_date()),
# MAGIC   ('HLD-VS-004', 'PORT-VS-GROWTH-01', 'HNW-CLIENT-001', 'BD-UST-5Y', 'UST-5Y', 'US Treasury 5-Year Benchmark Note', 'Fixed Income', 'Government', 0.2400, 3000000.0, 3000000.0, current_date()),
# MAGIC   ('HLD-VS-005', 'PORT-VS-GROWTH-01', 'HNW-CLIENT-001', 'ALT-PE-01', 'VC-FUND-I', 'Apex Global Venture Capital Fund IV', 'Alternatives', 'Private Equity', 0.1200, 1500000.0, 1500000.0, current_date()),
# MAGIC 
# MAGIC   -- Marcus Thorne Portfolio (Conservative Mandate 70% Fixed Income)
# MAGIC   ('HLD-MT-001', 'PORT-MT-INCOME-02', 'HNW-CLIENT-002', 'BD-UST-5Y', 'UST-5Y', 'US Treasury 5-Year Benchmark Note', 'Fixed Income', 'Government', 0.4500, 2700000.0, 2700000.0, current_date()),
# MAGIC   ('HLD-MT-002', 'PORT-MT-INCOME-02', 'HNW-CLIENT-002', 'BD-CORP-A', 'APPL-BOND', 'Apple Inc. Senior Notes 2028', 'Fixed Income', 'Technology', 0.2500, 1500000.0, 1500000.0, current_date()),
# MAGIC   ('HLD-MT-003', 'PORT-MT-INCOME-02', 'HNW-CLIENT-002', 'EQ-JPM',  'JPM',  'JPMorgan Chase & Co.', 'Equities', 'Financials', 0.2000, 1200000.0, 950000.0, current_date()),
# MAGIC   ('HLD-MT-004', 'PORT-MT-INCOME-02', 'HNW-CLIENT-002', 'ALT-PE-01', 'VC-FUND-I', 'Apex Global Venture Capital Fund IV', 'Alternatives', 'Private Equity', 0.1000, 600000.0, 600000.0, current_date());
# MAGIC 
# MAGIC SELECT * FROM fact_holdings;

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 7: (Optional) Seed Neo4j Knowledge Graph via Python Driver

# COMMAND ----------
import sys
import os

notebook_dir = os.getcwd()
repo_root = os.path.dirname(notebook_dir) if "notebooks" in notebook_dir else notebook_dir
backend_path = os.path.join(repo_root, "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

try:
    from seed_db import seed_database
    print("🔌 Triggering Neo4j FIBO Knowledge Graph Seeding...")
    seed_database()
    print("✅ Neo4j Knowledge Graph seeded successfully!")
except Exception as e:
    print(f"ℹ️ Neo4j Seeding Notice (if running isolated from Neo4j): {e}")
    print(f"ℹ️ Neo4j Seeding Notice: {e}")
    print("Delta Lake Tables in Unity Catalog are fully seeded and ready!")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Step 8: Multi-Client Compliance & Drift Verification Query

# COMMAND ----------
# MAGIC %sql
# MAGIC SELECT 
# MAGIC   c.client_id,
# MAGIC   c.name AS client_name,
# MAGIC   c.tax_residence,
# MAGIC   p.portfolio_name,
# MAGIC   p.mandate_type,
# MAGIC   p.total_aum,
# MAGIC   count(h.holding_id) AS total_holdings,
# MAGIC   round(sum(CASE WHEN h.sector = 'Technology' THEN h.allocation_pct ELSE 0 END) * 100, 2) AS tech_sector_allocation_pct,
# MAGIC   p.max_sector_cap_pct * 100 AS sector_cap_limit_pct,
# MAGIC   CASE WHEN sum(CASE WHEN h.sector = 'Technology' THEN h.allocation_pct ELSE 0 END) > p.max_sector_cap_pct 
# MAGIC        THEN '🚨 SEC REG BI DRIFT BREACH' 
# MAGIC        ELSE '✅ COMPLIANT' END AS compliance_status
# MAGIC FROM dim_clients c
# MAGIC JOIN dim_portfolios p ON c.client_id = p.client_id
# MAGIC JOIN fact_holdings h ON p.portfolio_id = h.portfolio_id
# MAGIC GROUP BY c.client_id, c.name, c.tax_residence, p.portfolio_name, p.mandate_type, p.total_aum, p.max_sector_cap_pct;
