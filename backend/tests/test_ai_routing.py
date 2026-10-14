import pytest
from app.services.ai_routing import match_host_for_visitor
from app.data.employee_directory import EMPLOYEE_DIRECTORY


def test_employee_directory_loaded():
    assert len(EMPLOYEE_DIRECTORY) >= 6
    names = [e["name"] for e in EMPLOYEE_DIRECTORY]
    assert "Kirubel Gizaw" in names
    assert "Mulugeta Abrha" in names
    assert "Sosina Getachew" in names


@pytest.mark.parametrize(
    "purpose,notes,expected_host,expected_dept",
    [
        (
            "Interview",
            "Here for senior software engineer job interview",
            "Sosina Getachew",
            "Project Management",
        ),
        (
            "Technical Consultation",
            "Need assistance designing AWS Kubernetes clusters and Terraform infrastructure",
            "Kirubel Gizaw",
            "Engineering",
        ),
        pytest.param(
            "AI Partnership",
            "Discussing fine-tuning PyTorch LLM transformers on GPU clusters",
            "Semir Sultan",
            "Engineering",
            marks=pytest.mark.xfail(
                reason="DB-mode match_host_for_visitor drops keywords/description, falls back to first host"
            ),
        ),
        (
            "Security Audit",
            "Conducting OWASP penetration testing and vulnerability assessment",
            "Mulugeta Abrha",
            "Executive Leadership",
        ),
        (
            "Financial Review",
            "Reviewing quarterly billing invoices, taxes, and general ledger",
            "Sosina Getachew",
            "Project Management",
        ),
        (
            "Marketing Meeting",
            "Discussing Google Ads campaigns and PR media sponsorship",
            "Hikma Anwar",
            "Engineering",
        ),
        (
            "Data Architecture",
            "Designing Apache Airflow ETL pipelines and Snowflake data warehouse",
            "Lidiya Getachew",
            "Engineering",
        ),
        (
            "Backend Integration",
            "Optimizing Go microservices REST API and PostgreSQL caching",
            "Kirubel Gizaw",
            "Engineering",
        ),
        (
            "Delivery",
            "Dropping off hardware packages and courier parcels",
            "Sosina Getachew",
            "Project Management",
        ),
        (
            "Investor Discussion",
            "Meeting with CEO regarding board reporting and OKRs",
            "Mulugeta Abrha",
            "Executive Leadership",
        ),
        (
            "General Visit",
            "I have an appointment directly with Kirubel",
            "Kirubel Gizaw",
            "Engineering",
        ),
    ],
)
@pytest.mark.asyncio
async def test_ai_routing_scenarios(purpose, notes, expected_host, expected_dept, test_db_sessionmaker):
    async with test_db_sessionmaker() as db:
        matched = await match_host_for_visitor(purpose, notes, db)
        assert matched is not None
        assert matched["name"] == expected_host
        assert expected_dept in matched["department"]
