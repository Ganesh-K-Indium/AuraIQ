// FIBO Wealth Management Ontology - Schema Constraints & Indexes

// Uniqueness Constraints
CREATE CONSTRAINT client_id_unique IF NOT EXISTS
FOR (c:`fibo-fnd-pty:Person`) REQUIRE c.client_id IS UNIQUE;

CREATE CONSTRAINT portfolio_id_unique IF NOT EXISTS
FOR (p:`fibo-fnd-agr:InvestmentPortfolio`) REQUIRE p.portfolio_id IS UNIQUE;

CREATE CONSTRAINT risk_id_unique IF NOT EXISTS
FOR (r:`fibo-fbc-pas:RiskProfile`) REQUIRE r.risk_id IS UNIQUE;

CREATE CONSTRAINT instrument_ticker_unique IF NOT EXISTS
FOR (s:`fibo-sec-eq:Share`) REQUIRE s.ticker IS UNIQUE;

CREATE CONSTRAINT bond_id_unique IF NOT EXISTS
FOR (b:`fibo-sec-dbt:Bond`) REQUIRE b.instrument_id IS UNIQUE;

CREATE CONSTRAINT alt_fund_id_unique IF NOT EXISTS
FOR (a:`fibo-der-alt:AlternativeAsset`) REQUIRE a.fund_id IS UNIQUE;

CREATE CONSTRAINT legal_entity_id_unique IF NOT EXISTS
FOR (e:`fibo-fnd-org:LegalEntity`) REQUIRE e.entity_id IS UNIQUE;

CREATE CONSTRAINT compliance_id_unique IF NOT EXISTS
FOR (cp:`fibo-reg-rep:CompliancePolicy`) REQUIRE cp.policy_id IS UNIQUE;

// Performance Indexes
CREATE INDEX client_name_idx IF NOT EXISTS
FOR (c:`fibo-fnd-pty:Person`) ON (c.name);

CREATE INDEX share_sector_idx IF NOT EXISTS
FOR (s:`fibo-sec-eq:Share`) ON (s.sector);

CREATE INDEX holding_asset_class_idx IF NOT EXISTS
FOR (i:FinancialInstrument) ON (i.asset_class);

