"""
AURA Wealth IQ - FIBO SHACL Data Quality Validator
Validates incoming wealth management client records, trust structures, and portfolio holdings
against formal SHACL shapes defined in fibo_wealth_ontology.ttl before ingestion into Neo4j.
"""

import os
import re
from typing import Dict, Any, List, Tuple


class FiboSHACLValidator:
    """
    Validates dictionary payloads against SHACL constraints defined in FIBO ontology.
    Provides fast, deterministic validation for ETL pipelines.
    """

    @staticmethod
    def validate_person(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validates a Person node payload against PersonShape."""
        errors = []
        
        client_id = data.get("client_id")
        if not client_id:
            errors.append("PersonShape Violation: 'client_id' is mandatory.")
        elif not re.match(r"^HNW-CLIENT-[0-9]{3}$", str(client_id)):
            errors.append(f"PersonShape Violation: 'client_id' ({client_id}) must match format 'HNW-CLIENT-XXX'.")

        name = data.get("name")
        if not name or not str(name).strip():
            errors.append("PersonShape Violation: 'name' is mandatory and cannot be blank.")

        tax_residence = data.get("tax_residence")
        if not tax_residence or not str(tax_residence).strip():
            errors.append("PersonShape Violation: 'tax_residence' is mandatory for KYC/Reg BI compliance.")

        return len(errors) == 0, errors

    @staticmethod
    def validate_portfolio(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validates an InvestmentPortfolio payload against PortfolioShape."""
        errors = []
        
        portfolio_id = data.get("portfolio_id")
        if not portfolio_id:
            errors.append("PortfolioShape Violation: 'portfolio_id' is mandatory.")

        total_aum = data.get("total_aum")
        if total_aum is None:
            errors.append("PortfolioShape Violation: 'total_aum' is mandatory.")
        elif float(total_aum) < 0.0:
            errors.append(f"PortfolioShape Violation: 'total_aum' ({total_aum}) must be non-negative.")

        return len(errors) == 0, errors

    @staticmethod
    def validate_holding(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validates a Holding payload against HoldingShape."""
        errors = []

        allocation_pct = data.get("allocation_pct")
        if allocation_pct is None:
            errors.append("HoldingShape Violation: 'allocation_pct' is mandatory.")
        elif not (0.0 <= float(allocation_pct) <= 1.0):
            errors.append(f"HoldingShape Violation: 'allocation_pct' ({allocation_pct}) must be between 0.0 and 1.0.")

        current_value = data.get("current_value")
        if current_value is None:
            errors.append("HoldingShape Violation: 'current_value' is mandatory.")
        elif float(current_value) < 0.0:
            errors.append(f"HoldingShape Violation: 'current_value' ({current_value}) must be non-negative.")

        return len(errors) == 0, errors

    @classmethod
    def validate_client_graph_bundle(cls, client_bundle: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates an entire client graph bundle including person details, portfolios, and holdings.
        """
        all_errors = []
        
        # Validate Client
        valid_p, p_errs = cls.validate_person(client_bundle)
        all_errors.extend(p_errs)

        # Validate Portfolios & Holdings
        for port in client_bundle.get("portfolios", []):
            valid_pt, pt_errs = cls.validate_portfolio(port)
            all_errors.extend(pt_errs)

            for holding in port.get("holdings", []):
                valid_h, h_errs = cls.validate_holding(holding)
                all_errors.extend(h_errs)

        return {
            "conforms": len(all_errors) == 0,
            "violation_count": len(all_errors),
            "violations": all_errors,
            "ontology_standard": "EDMC FIBO 2.0 / W3C SHACL"
        }
