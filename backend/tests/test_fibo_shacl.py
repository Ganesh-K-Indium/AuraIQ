"""
Unit tests for FIBO SHACL Data Quality Validator.
"""

import pytest
from src.ontology.fibo_shacl_validator import FiboSHACLValidator


def test_validate_person_valid():
    valid_person = {
        "client_id": "HNW-CLIENT-001",
        "name": "Victoria Sterling",
        "tax_residence": "Delaware",
    }
    conforms, errors = FiboSHACLValidator.validate_person(valid_person)
    assert conforms is True
    assert len(errors) == 0


def test_validate_person_invalid():
    invalid_person = {
        "client_id": "INVALID-ID",
        "name": "",
        # missing tax_residence
    }
    conforms, errors = FiboSHACLValidator.validate_person(invalid_person)
    assert conforms is False
    assert len(errors) >= 3


def test_validate_portfolio_and_holdings():
    valid_bundle = {
        "client_id": "HNW-CLIENT-002",
        "name": "Marcus Thorne",
        "tax_residence": "Florida",
        "portfolios": [
            {
                "portfolio_id": "PORT-MT-INCOME-02",
                "total_aum": 6000000.0,
                "holdings": [
                    {
                        "allocation_pct": 0.35,
                        "current_value": 2100000.0,
                    },
                    {
                        "allocation_pct": 0.65,
                        "current_value": 3900000.0,
                    }
                ]
            }
        ]
    }
    report = FiboSHACLValidator.validate_client_graph_bundle(valid_bundle)
    assert report["conforms"] is True
    assert report["violation_count"] == 0


def test_validate_bundle_rejects_negative_aum_and_out_of_bounds_holding():
    bad_bundle = {
        "client_id": "HNW-CLIENT-001",
        "name": "Test Client",
        "tax_residence": "NY",
        "portfolios": [
            {
                "portfolio_id": "PORT-BAD",
                "total_aum": -500.0,  # Negative AUM
                "holdings": [
                    {
                        "allocation_pct": 1.5,  # > 1.0
                        "current_value": -100.0,  # Negative Value
                    }
                ]
            }
        ]
    }
    report = FiboSHACLValidator.validate_client_graph_bundle(bad_bundle)
    assert report["conforms"] is False
    assert report["violation_count"] >= 3
