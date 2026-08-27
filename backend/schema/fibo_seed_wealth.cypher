// ==============================================================================
// FIBO WEALTH MANAGEMENT SEED ONTOLOGY DATASET
// ==============================================================================
// Domain Overview:
//   This seed dataset establishes a multi-asset High-Net-Worth (HNW) wealth
//   management ecosystem in Neo4j based on the EDM Council FIBO specification.
//
// Graph Entity Topology:
//
//   [Person (Client)]
//     │
//     ├───────[:OWNS_ACCOUNT]──────────> [InvestmentPortfolio]
//     │                                       │
//     │                                       ├──────[:CONTAINS_HOLDING]──────> [FinancialInstrument]
//     │                                       │                                   ├── Share (Equities)
//     │                                       │                                   ├── Bond (Fixed Income)
//     │                                       │                                   └── AlternativeAsset (PE/REIT)
//     │                                       │
//     │                                       ├──────[:GOVERNED_BY]───────────> [RiskProfile]
//     │                                       │
//     │                                       └──────[:SUBJECT_TO]────────────> [CompliancePolicy] (SEC Reg BI)
//     │
//     ├───────[:BENEFICIARY_OF]────────> [LegalEntity] (Delaware Irrevocable Trust)
//     │
//     └───────[:HAS_RISK_PROFILE]──────> [RiskProfile] (Target Allocations & Constraints)
//
// Clients Modeled:
//   1. Victoria Sterling (HNW-CLIENT-001): Ultra-HNW ($25M+), Growth mandate, Tech overweight, Delaware Dynasty Trust.
//   2. Marcus Thorne (HNW-CLIENT-002): HNW ($5M-$10M), Conservative Capital Preservation, High Fixed Income.
// ==============================================================================


// ==============================================================================
// SECTION 1: REGULATORY COMPLIANCE POLICIES (SEC Reg BI & MiFID II)
// ==============================================================================
// Defines fiduciary boundaries and regulatory thresholds enforced by the AI Agent.

// 1.1 SEC Regulation Best Interest (Reg BI - Fiduciary Standard)
// Rule: Conservative accounts cannot exceed 35% equity or 5% illiquid alternatives.
MERGE (reg_bi:CompliancePolicy:`fibo-reg-rep:CompliancePolicy` {policy_id: "POL-REG-BI-2024"})
SET reg_bi.name = "SEC Regulation Best Interest Standard",
    reg_bi.max_equity_allocation_conservative = 0.35,
    reg_bi.max_illiquid_pct_conservative = 0.05,
    reg_bi.min_fixed_income_conservative = 0.50,
    reg_bi.jurisdiction = "US-Federal",
    reg_bi.effective_year = 2024;

// 1.2 European Markets in Financial Instruments Directive (MiFID II)
// Rule: Mandatory ESG preference alignment and 15% max drawdown ceiling for moderate tiers.
MERGE (mifid:CompliancePolicy:`fibo-reg-rep:CompliancePolicy` {policy_id: "POL-MIFID-SUITABILITY"})
SET mifid.name = "MiFID II Suitability & Appropriateness Rule",
    mifid.esg_mandatory_flag = true,
    mifid.max_drawdown_limit_moderate = 0.15,
    mifid.jurisdiction = "EU-EEA",
    mifid.effective_year = 2018;


// ==============================================================================
// SECTION 2: FINANCIAL INSTRUMENT UNIVERSE (Equities, Bonds, Alternatives)
// ==============================================================================
// Catalog of tradeable securities with real-time risk ratings, ESG metrics, and prices.

// ------------------------------------------------------------------------------
// 2.1 Public Equities (fibo-sec-eq:Share)
// ------------------------------------------------------------------------------

// Apple Inc. (MegaCap Technology)
MERGE (aapl:Share:FinancialInstrument:`fibo-sec-eq:Share` {ticker: "AAPL"})
SET aapl.name = "Apple Inc. Common Stock",
    aapl.sector = "Technology",
    aapl.asset_class = "Equity",
    aapl.market_cap_category = "MegaCap",
    aapl.esg_score = 82,
    aapl.current_price = 224.50,
    aapl.currency = "USD",
    aapl.risk_rating = "Moderate";

// Microsoft Corporation (MegaCap Technology)
MERGE (msft:Share:FinancialInstrument:`fibo-sec-eq:Share` {ticker: "MSFT"})
SET msft.name = "Microsoft Corporation",
    msft.sector = "Technology",
    msft.asset_class = "Equity",
    msft.market_cap_category = "MegaCap",
    msft.esg_score = 88,
    msft.current_price = 448.20,
    msft.currency = "USD",
    msft.risk_rating = "Moderate";

// NVIDIA Corporation (MegaCap Semiconductor / AI Infrastructure)
MERGE (nvda:Share:FinancialInstrument:`fibo-sec-eq:Share` {ticker: "NVDA"})
SET nvda.name = "NVIDIA Corporation",
    nvda.sector = "Technology",
    nvda.asset_class = "Equity",
    nvda.market_cap_category = "MegaCap",
    nvda.esg_score = 75,
    nvda.current_price = 128.80,
    nvda.currency = "USD",
    nvda.risk_rating = "High";

// JPMorgan Chase & Co. (LargeCap Financial Services)
MERGE (jpm:Share:FinancialInstrument:`fibo-sec-eq:Share` {ticker: "JPM"})
SET jpm.name = "JPMorgan Chase & Co.",
    jpm.sector = "Financials",
    jpm.asset_class = "Equity",
    jpm.market_cap_category = "LargeCap",
    jpm.esg_score = 71,
    jpm.current_price = 214.00,
    jpm.currency = "USD",
    jpm.risk_rating = "Moderate";

// Eli Lilly and Company (LargeCap Pharmaceuticals / Healthcare)
MERGE (lly:Share:FinancialInstrument:`fibo-sec-eq:Share` {ticker: "LLY"})
SET lly.name = "Eli Lilly and Company",
    lly.sector = "Healthcare",
    lly.asset_class = "Equity",
    lly.market_cap_category = "LargeCap",
    lly.esg_score = 84,
    lly.current_price = 920.10,
    lly.currency = "USD",
    lly.risk_rating = "Moderate";

// ------------------------------------------------------------------------------
// 2.2 Fixed Income & Debt Instruments (fibo-sec-dbt:Bond)
// ------------------------------------------------------------------------------

// US Treasury 10-Year Benchmark Sovereign Bond (Risk-free benchmark yield)
MERGE (ust10y:Bond:FinancialInstrument:`fibo-sec-dbt:Bond` {instrument_id: "BOND-UST-10Y-2034"})
SET ust10y.name = "US Treasury 10-Year Benchmark Bond",
    ust10y.issuer = "US Department of the Treasury",
    ust10y.coupon_rate = 0.0425,
    ust10y.maturity_date = "2034-08-15",
    ust10y.credit_rating = "AAA",
    ust10y.asset_class = "FixedIncome",
    ust10y.current_price = 99.40,
    ust10y.currency = "USD",
    ust10y.risk_rating = "Low";

// Microsoft Senior Investment-Grade Corporate Notes (3.30% Coupon, Maturity 2030)
MERGE (corp_bond:Bond:FinancialInstrument:`fibo-sec-dbt:Bond` {instrument_id: "BOND-MSFT-2030"})
SET corp_bond.name = "Microsoft Corp 3.3% Senior Notes 2030",
    corp_bond.issuer = "Microsoft Corporation",
    corp_bond.coupon_rate = 0.0330,
    corp_bond.maturity_date = "2030-02-06",
    corp_bond.credit_rating = "AAA",
    corp_bond.asset_class = "FixedIncome",
    corp_bond.current_price = 95.80,
    corp_bond.currency = "USD",
    corp_bond.risk_rating = "Low";

// ------------------------------------------------------------------------------
// 2.3 Alternative Assets & Private Markets (fibo-der-alt:AlternativeAsset)
// ------------------------------------------------------------------------------

// Sequoia Global Growth Fund V (Illiquid Venture Capital / Private Equity)
MERGE (pe_fund:AlternativeAsset:FinancialInstrument:`fibo-der-alt:AlternativeAsset` {fund_id: "PE-SEQUOIA-GROWTH-V"})
SET pe_fund.name = "Sequoia Global Growth Fund V",
    pe_fund.asset_class = "Alternative",
    pe_fund.fund_type = "VentureCapital",
    pe_fund.vintage_year = 2023,
    pe_fund.nav = 1050000000.0,
    pe_fund.liquidity_lockup_years = 7,
    pe_fund.risk_rating = "High";

// Blackstone Real Estate Income Trust (Private Non-Traded REIT)
MERGE (reit_fund:AlternativeAsset:FinancialInstrument:`fibo-der-alt:AlternativeAsset` {fund_id: "ALT-BREIT-RE-INCOME"})
SET reit_fund.name = "Blackstone Real Estate Income Trust",
    reit_fund.asset_class = "RealEstate",
    reit_fund.fund_type = "PrivateREIT",
    reit_fund.vintage_year = 2021,
    reit_fund.nav = 60000000.0,
    reit_fund.liquidity_lockup_years = 3,
    reit_fund.risk_rating = "Moderate";


// ==============================================================================
// SECTION 3: CLIENT 1 - VICTORIA STERLING (ULTRA-HNW $25M+)
// ==============================================================================
// Profile: Tech Executive, NY Tax Residence, Delaware Dynasty Trust Structure.
// Mandate: Moderate Growth (Target: 60% Equity / 30% Fixed Income / 10% Alts).
// Status: Tech Overweight Drift (AAPL: 21.5%, MSFT: 21.5%, NVDA: 8.2% = 51.2% Total Tech).

// 3.1 Client Natural Person Node
MERGE (c1:Person:`fibo-fnd-pty:Person` {client_id: "HNW-CLIENT-001"})
SET c1.name = "Victoria Sterling",
    c1.tax_residence = "US-NY",
    c1.net_worth_tier = "Ultra-HNW ($25M+)",
    c1.accredited_investor = true,
    c1.kyc_status = "VERIFIED_TIER1",
    c1.created_date = "2021-03-15";

// 3.2 Investment Policy Statement (IPS) & Risk Profile Mandate
MERGE (rp1:RiskProfile:`fibo-fbc-pas:RiskProfile` {risk_id: "RP-STERLING-01"})
SET rp1.tolerance_level = "Moderate Growth",
    rp1.time_horizon_years = 12,
    rp1.liquidity_need = "Low",
    rp1.max_drawdown_pct = 0.18,
    rp1.target_equity_pct = 0.60,
    rp1.target_fixed_income_pct = 0.30,
    rp1.target_alternatives_pct = 0.10,
    rp1.esg_preference = "High";

// 3.3 Delaware Irrevocable Trust (Dynasty Estate Tax Optimization)
MERGE (e1:LegalEntity:`fibo-fnd-org:LegalEntity` {entity_id: "TRUST-STERLING-DYNASTY"})
SET e1.name = "The Sterling Dynasty Irrevocable Trust",
    e1.jurisdiction = "US-DE",
    e1.entity_type = "IrrevocableTrust",
    e1.tax_classification = "Non-Grantor Dynasty Trust";

// 3.4 Primary Discretionary Growth Portfolio ($12.5M AUM)
MERGE (p1:InvestmentPortfolio:`fibo-fnd-agr:InvestmentPortfolio` {portfolio_id: "PORT-VS-GROWTH-01"})
SET p1.name = "Sterling Flagship Discretionary Growth",
    p1.portfolio_type = "Discretionary",
    p1.currency = "USD",
    p1.total_aum = 12500000.0,
    p1.target_cash_pct = 0.05;

// 3.5 Link Client 1 Graph Relationships
MATCH (c:Person {client_id: "HNW-CLIENT-001"}), (rp:RiskProfile {risk_id: "RP-STERLING-01"})
MERGE (c)-[:HAS_RISK_PROFILE]->(rp);

MATCH (c:Person {client_id: "HNW-CLIENT-001"}), (e:LegalEntity {entity_id: "TRUST-STERLING-DYNASTY"})
MERGE (c)-[:BENEFICIARY_OF {share_pct: 1.0}]->(e);

MATCH (c:Person {client_id: "HNW-CLIENT-001"}), (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"})
MERGE (c)-[:OWNS_ACCOUNT]->(p);

MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (rp:RiskProfile {risk_id: "RP-STERLING-01"})
MERGE (p)-[:GOVERNED_BY]->(rp);

MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (cp:CompliancePolicy {policy_id: "POL-REG-BI-2024"})
MERGE (p)-[:SUBJECT_TO]->(cp);

// 3.6 Map Multi-Asset Holdings & Valuations ($12.5M Total)
// Apple Equity (21.5% - $2.69M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (aapl:Share {ticker: "AAPL"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 12000, avg_cost: 185.00, current_value: 2694000.0, allocation_pct: 0.215}]->(aapl);

// Microsoft Equity (21.5% - $2.68M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (msft:Share {ticker: "MSFT"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 6000, avg_cost: 380.00, current_value: 2689200.0, allocation_pct: 0.215}]->(msft);

// NVIDIA Equity (8.2% - $1.03M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (nvda:Share {ticker: "NVDA"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 8000, avg_cost: 95.00, current_value: 1030400.0, allocation_pct: 0.082}]->(nvda);

// US Treasury 10Y Bond (27.8% - $3.48M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (ust:Bond {instrument_id: "BOND-UST-10Y-2034"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 35000, avg_cost: 98.20, current_value: 3479000.0, allocation_pct: 0.278}]->(ust);

// Microsoft Corporate Bond (11.5% - $1.44M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (corp:Bond {instrument_id: "BOND-MSFT-2030"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 15000, avg_cost: 94.10, current_value: 1437000.0, allocation_pct: 0.115}]->(corp);

// Sequoia VC Growth Fund V (9.5% - $1.17M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-VS-GROWTH-01"}), (pe:AlternativeAsset {fund_id: "PE-SEQUOIA-GROWTH-V"})
MERGE (p)-[:CONTAINS_HOLDING {units: 1, committed_capital: 1000000.0, current_value: 1170400.0, allocation_pct: 0.095}]->(pe);


// ==============================================================================
// SECTION 4: CLIENT 2 - MARCUS THORNE (HNW $5M-$10M)
// ==============================================================================
// Profile: Retired Executive, Florida Tax Residence, Capital Preservation.
// Mandate: Conservative (Target: 25% Equity / 70% Fixed Income / 5% Real Estate).
// Status: Fully Compliant with SEC Reg BI Conservative Rule Thresholds.

// 4.1 Client Natural Person Node
MERGE (c2:Person:`fibo-fnd-pty:Person` {client_id: "HNW-CLIENT-002"})
SET c2.name = "Marcus Thorne",
    c2.tax_residence = "US-FL",
    c2.net_worth_tier = "HNW ($5M-$10M)",
    c2.accredited_investor = true,
    c2.kyc_status = "VERIFIED_TIER1",
    c2.created_date = "2023-01-10";

// 4.2 Investment Policy Statement (IPS) & Conservative Mandate
MERGE (rp2:RiskProfile:`fibo-fbc-pas:RiskProfile` {risk_id: "RP-THORNE-02"})
SET rp2.tolerance_level = "Conservative Capital Preservation",
    rp2.time_horizon_years = 5,
    rp2.liquidity_need = "Medium",
    rp2.max_drawdown_pct = 0.08,
    rp2.target_equity_pct = 0.25,
    rp2.target_fixed_income_pct = 0.70,
    rp2.target_alternatives_pct = 0.05,
    rp2.esg_preference = "Neutral";

// 4.3 Advisory Income & Preservation Portfolio ($6.0M AUM)
MERGE (p2:InvestmentPortfolio:`fibo-fnd-agr:InvestmentPortfolio` {portfolio_id: "PORT-MT-INCOME-02"})
SET p2.name = "Thorne Capital Preservation & Fixed Income",
    p2.portfolio_type = "Advisory",
    p2.currency = "USD",
    p2.total_aum = 6000000.0,
    p2.target_cash_pct = 0.08;

// 4.4 Link Client 2 Graph Relationships
MATCH (c:Person {client_id: "HNW-CLIENT-002"}), (rp:RiskProfile {risk_id: "RP-THORNE-02"})
MERGE (c)-[:HAS_RISK_PROFILE]->(rp);

MATCH (c:Person {client_id: "HNW-CLIENT-002"}), (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"})
MERGE (c)-[:OWNS_ACCOUNT]->(p);

MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (rp:RiskProfile {risk_id: "RP-THORNE-02"})
MERGE (p)-[:GOVERNED_BY]->(rp);

MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (cp:CompliancePolicy {policy_id: "POL-REG-BI-2024"})
MERGE (p)-[:SUBJECT_TO]->(cp);

// 4.5 Map Defensive Multi-Asset Holdings ($6.0M Total)
// JPMorgan Chase LargeCap Equity (12.5% - $749k)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (jpm:Share {ticker: "JPM"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 3500, avg_cost: 180.00, current_value: 749000.0, allocation_pct: 0.125}]->(jpm);

// Eli Lilly Healthcare Equity (12.3% - $736k)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (lly:Share {ticker: "LLY"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 800, avg_cost: 850.00, current_value: 736080.0, allocation_pct: 0.123}]->(lly);

// US Treasury 10Y Benchmark Sovereign Bond (49.7% - $2.98M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (ust:Bond {instrument_id: "BOND-UST-10Y-2034"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 30000, avg_cost: 99.00, current_value: 2982000.0, allocation_pct: 0.497}]->(ust);

// Microsoft Senior Corporate Notes (20.7% - $1.25M)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (corp:Bond {instrument_id: "BOND-MSFT-2030"})
MERGE (p)-[:CONTAINS_HOLDING {quantity: 13000, avg_cost: 96.00, current_value: 1245400.0, allocation_pct: 0.207}]->(corp);

// Blackstone REIT Income Fund (4.8% - $287k)
MATCH (p:InvestmentPortfolio {portfolio_id: "PORT-MT-INCOME-02"}), (reit:AlternativeAsset {fund_id: "ALT-BREIT-RE-INCOME"})
MERGE (p)-[:CONTAINS_HOLDING {units: 1, committed_capital: 250000.0, current_value: 287520.0, allocation_pct: 0.048}]->(reit);
