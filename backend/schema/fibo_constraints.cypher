// ==============================================================================
// FIBO (Financial Industry Business Ontology) - Schema Constraints & Indexes
// ==============================================================================
// Purpose:
//   Establishes strict enterprise schema integrity and high-performance query
//   indexes in Neo4j, adhering to the EDM Council Financial Industry Business
//   Ontology (FIBO) standards for Wealth Management & Discretionary Portfolios.
//
// Graph Ontology Namespaces Defined:
//   - fibo-fnd-pty : Foundation Parties & Natural Persons (Investors / Clients)
//   - fibo-fnd-agr : Foundation Agreements & Investment Portfolios / Accounts
//   - fibo-fbc-pas : Business & Commerce Products / Risk Profiles & Mandates
//   - fibo-sec-eq  : Securities Equities & Shares (Common Stock / Equities)
//   - fibo-sec-dbt : Debt Instruments & Fixed Income (Sovereign & Corp Bonds)
//   - fibo-der-alt : Derivatives & Alternative Assets (PE Funds / REITs)
//   - fibo-fnd-org : Organizations & Formal Legal Entities (Delaware Trusts)
//   - fibo-reg-rep : Regulatory Compliance Policies (SEC Reg BI & MiFID II)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. UNIQUENESS CONSTRAINTS (Guarantees Entity Identity & Idempotent Upserts)
// ------------------------------------------------------------------------------

// 1.1 Natural Person / Client Identity (e.g. "HNW-CLIENT-001")
CREATE CONSTRAINT client_id_unique IF NOT EXISTS
FOR (c:`fibo-fnd-pty:Person`) REQUIRE c.client_id IS UNIQUE;

// 1.2 Investment Account & Portfolio Identifier (e.g. "PORT-VS-GROWTH-01")
CREATE CONSTRAINT portfolio_id_unique IF NOT EXISTS
FOR (p:`fibo-fnd-agr:InvestmentPortfolio`) REQUIRE p.portfolio_id IS UNIQUE;

// 1.3 Risk Profile & Investment Policy Statement ID (e.g. "RP-STERLING-01")
CREATE CONSTRAINT risk_id_unique IF NOT EXISTS
FOR (r:`fibo-fbc-pas:RiskProfile`) REQUIRE r.risk_id IS UNIQUE;

// 1.4 Public Equity Ticker Symbol (e.g. "AAPL", "MSFT", "NVDA")
CREATE CONSTRAINT instrument_ticker_unique IF NOT EXISTS
FOR (s:`fibo-sec-eq:Share`) REQUIRE s.ticker IS UNIQUE;

// 1.5 Debt Security & Bond Instrument Identifier (e.g. "BOND-UST-10Y-2034")
CREATE CONSTRAINT bond_id_unique IF NOT EXISTS
FOR (b:`fibo-sec-dbt:Bond`) REQUIRE b.instrument_id IS UNIQUE;

// 1.6 Alternative Asset & Private Equity Fund ID (e.g. "PE-SEQUOIA-GROWTH-V")
CREATE CONSTRAINT alt_fund_id_unique IF NOT EXISTS
FOR (a:`fibo-der-alt:AlternativeAsset`) REQUIRE a.fund_id IS UNIQUE;

// 1.7 Legal Entity & Delaware Trust Structure ID (e.g. "TRUST-STERLING-DYNASTY")
CREATE CONSTRAINT legal_entity_id_unique IF NOT EXISTS
FOR (e:`fibo-fnd-org:LegalEntity`) REQUIRE e.entity_id IS UNIQUE;

// 1.8 Regulatory Policy & Compliance Standard ID (e.g. "POL-REG-BI-2024")
CREATE CONSTRAINT compliance_id_unique IF NOT EXISTS
FOR (cp:`fibo-reg-rep:CompliancePolicy`) REQUIRE cp.policy_id IS UNIQUE;

// ------------------------------------------------------------------------------
// 2. PERFORMANCE SEARCH INDEXES (Accelerates Vector & Multi-Hop Cypher Filters)
// ------------------------------------------------------------------------------

// 2.1 Fast B-Tree Lookup for Client Legal Name Searching
CREATE INDEX client_name_idx IF NOT EXISTS
FOR (c:`fibo-fnd-pty:Person`) ON (c.name);

// 2.2 Sector Concentration Aggregation Index (Technology, Financials, Healthcare)
CREATE INDEX share_sector_idx IF NOT EXISTS
FOR (s:`fibo-sec-eq:Share`) ON (s.sector);

// 2.3 Asset Class Allocation Filtering Index (Equity, FixedIncome, Alternative)
CREATE INDEX holding_asset_class_idx IF NOT EXISTS
FOR (i:FinancialInstrument) ON (i.asset_class);
