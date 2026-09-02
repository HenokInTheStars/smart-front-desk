"""
Host Knowledge Base & AI Semantic Router
Matches visitor purpose and notes to the most relevant host employee based on job titles and descriptions.
"""

import re
from typing import Optional, Dict, List

EMPLOYEE_DIRECTORY = [
    {
        "employee_id": "EMP001",
        "name": "Betelhem Alemu",
        "job_title": "Cloud Architect",
        "department": "Cloud & DevOps",
        "job_description": (
            "Designs multi-region AWS and Azure infrastructure using Terraform and Pulumi for infrastructure-as-code provisioning. "
            "Manages EKS and AKS Kubernetes clusters with Helm charts, VPC peering, and IAM policies. "
            "Runs CI/CD pipelines in GitHub Actions and Jenkins, monitoring systems via Prometheus, Grafana, and CloudWatch."
        ),
        "keywords": [
            "cloud", "aws", "azure", "kubernetes", "k8s", "terraform", "pulumi", "eks", "aks",
            "devops", "infrastructure", "helm", "ci/cd", "jenkins", "github actions", "grafana", "prometheus", "cloudwatch"
        ]
    },
    {
        "employee_id": "EMP002",
        "name": "Yonas Tesfaye",
        "job_title": "Backend Developer",
        "department": "Software Engineering",
        "job_description": (
            "Builds RESTful and gRPC APIs in Go and Node.js within a Docker-based microservices architecture. "
            "Manages PostgreSQL and Redis data layers with optimized SQL queries and caching. "
            "Integrates Apache Kafka for event processing and deploys via Bitbucket Pipelines."
        ),
        "keywords": [
            "backend", "api", "apis", "rest", "grpc", "golang", "go", "node", "nodejs", "docker",
            "microservices", "postgres", "postgresql", "redis", "database", "sql", "kafka", "caching"
        ]
    },
    {
        "employee_id": "EMP003",
        "name": "Selamawit Tadesse",
        "job_title": "Data Engineer",
        "department": "Data & Analytics",
        "job_description": (
            "Builds ETL pipelines with Apache Airflow ingesting data into a Snowflake warehouse. "
            "Writes Python transformation logic using Pandas and PySpark on Hadoop clusters. "
            "Designs star-schema models and manages versioning with dbt."
        ),
        "keywords": [
            "data", "data engineering", "etl", "airflow", "snowflake", "warehouse", "pyspark",
            "spark", "hadoop", "pandas", "dbt", "pipeline", "analytics", "big data"
        ]
    },
    {
        "employee_id": "EMP004",
        "name": "Abel Fikadu",
        "job_title": "Machine Learning Engineer",
        "department": "Artificial Intelligence",
        "job_description": (
            "Trains NLP and classification models in PyTorch and Hugging Face Transformers on CUDA-enabled GPU clusters. "
            "Builds preprocessing pipelines with NumPy and scikit-learn, tracking experiments in MLflow. "
            "Deploys inference via FastAPI and TensorFlow Serving on Kubernetes."
        ),
        "keywords": [
            "ai", "artificial intelligence", "machine learning", "ml", "nlp", "llm", "deep learning",
            "pytorch", "tensorflow", "transformers", "hugging face", "gpu", "model", "models", "mlflow"
        ]
    },
    {
        "employee_id": "EMP005",
        "name": "Nathnael Getachew",
        "job_title": "Security Engineer",
        "department": "Cybersecurity",
        "job_description": (
            "Conducts penetration testing with Burp Suite and OWASP ZAP on web and API endpoints. "
            "Integrates SAST/DAST tools like SonarQube and Snyk into GitLab CI. "
            "Manages OAuth2 and Keycloak access controls and audits AWS IAM configurations via Python scripts."
        ),
        "keywords": [
            "security", "cybersecurity", "penetration", "pentest", "vulnerability", "audit",
            "burp suite", "owasp", "sonarqube", "snyk", "oauth", "oauth2", "keycloak", "iam", "access control"
        ]
    },
    {
        "employee_id": "EMP006",
        "name": "Meron Tesfaye",
        "job_title": "CEO",
        "department": "Executive Leadership",
        "job_description": (
            "Reviews consolidated financials and board reporting in NetSuite ERP and Tableau dashboards. "
            "Tracks company-wide OKRs in Lattice against revenue models built in Excel. "
            "Approves budget forecasts and monitors investor documentation stored in DocSend and Notion."
        ),
        "keywords": [
            "ceo", "executive", "board", "investor", "investors", "fundraising", "leadership",
            "partnership", "partnerships", "strategy", "okr", "acquisition", "meron"
        ]
    },
    {
        "employee_id": "EMP007",
        "name": "Liya Mengistu",
        "job_title": "HR Manager",
        "department": "Human Resources",
        "job_description": (
            "Administers the BambooHR HRIS platform for records, leave tracking, and payroll sync with ADP. "
            "Manages the Greenhouse applicant tracking system for interview scheduling and candidate pipelines. "
            "Builds headcount reports in Excel and manages onboarding e-signatures via DocuSign."
        ),
        "keywords": [
            "hr", "human resources", "interview", "interviews", "hiring", "candidate", "job", "career",
            "recruiting", "recruitment", "payroll", "onboarding", "resume", "cv", "benefits", "leave"
        ]
    },
    {
        "employee_id": "EMP008",
        "name": "Solomon Desta",
        "job_title": "Finance Manager",
        "department": "Finance & Accounting",
        "job_description": (
            "Maintains the general ledger and AP/AR records in Oracle NetSuite ERP, reconciling monthly close entries. "
            "Builds DCF revenue forecasts in Excel and prepares tax filings using QuickBooks. "
            "Tracks budget variance through Power BI dashboards connected to the ERP database."
        ),
        "keywords": [
            "finance", "accounting", "invoice", "invoices", "billing", "payment", "payments",
            "tax", "taxes", "ledger", "budget", "financial", "quickbooks", "netsuite", "audit"
        ]
    },
    {
        "employee_id": "EMP009",
        "name": "Eden Kebede",
        "job_title": "Marketing Manager",
        "department": "Marketing & Public Relations",
        "job_description": (
            "Manages paid campaigns in Meta Ads Manager and Google Ads, tracking conversions via GA4. "
            "Runs SEO audits with SEMrush and Ahrefs and schedules content through HubSpot. "
            "Maintains the WordPress CMS and manages email automation via the HubSpot CRM."
        ),
        "keywords": [
            "marketing", "press", "media", "advertising", "ads", "seo", "branding", "pr",
            "campaign", "social media", "content", "hubspot", "google ads", "sponsorship"
        ]
    },
    {
        "employee_id": "EMP010",
        "name": "Yordanos Alemayehu",
        "job_title": "Project Manager",
        "department": "Project Management",
        "job_description": (
            "Maintains sprint backlogs and Kanban boards in Jira for engineering teams. "
            "Builds Gantt charts and resource plans in Microsoft Project across multiple workstreams. "
            "Documents specs in Confluence and tracks budget burn-down against scope in Excel."
        ),
        "keywords": [
            "project", "project manager", "scrum", "agile", "jira", "sprint", "kanban",
            "timeline", "delivery", "coordination", "vendor", "deliveries", "package", "courier"
        ]
    }
]


def match_host_for_visitor(purpose: Optional[str], notes: Optional[str]) -> Dict:
    """
    Intelligently analyzes visitor purpose and notes to determine the optimal host.
    Uses multi-stage semantic text analysis with keyword weighting and text matching.
    """
    combined_text = f"{purpose or ''} {notes or ''}".lower()
    
    # 1. Direct Explicit Name Matching (if visitor mentions a specific name)
    for emp in EMPLOYEE_DIRECTORY:
        first_name = emp["name"].split()[0].lower()
        full_name = emp["name"].lower()
        if full_name in combined_text or first_name in combined_text:
            return emp

    # 2. Priority Keyword & Department Scoring
    best_score = 0
    best_host = EMPLOYEE_DIRECTORY[0]  # default fallback

    # Purpose-based base scoring
    purpose_lower = (purpose or "").lower()
    
    for emp in EMPLOYEE_DIRECTORY:
        score = 0
        emp_text = f"{emp['job_title']} {emp['department']} {emp['job_description']}".lower()

        # Check keyword matches
        for kw in emp["keywords"]:
            # Word boundary matching
            if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
                # Extra weight for exact keyword hit
                score += 5

        # Check job title & department tokens
        for token in emp["job_title"].lower().split():
            if len(token) > 3 and token in combined_text:
                score += 4

        for token in emp["department"].lower().split():
            if len(token) > 3 and token in combined_text:
                score += 3

        # Contextual boosts
        if "interview" in purpose_lower and emp["name"] == "Liya Mengistu":
            score += 10
        elif "delivery" in purpose_lower and emp["name"] == "Yordanos Alemayehu":
            score += 8
        elif "security" in combined_text and emp["name"] == "Nathnael Getachew":
            score += 10
        elif ("ai" in combined_text or "machine learning" in combined_text) and emp["name"] == "Abel Fikadu":
            score += 10
        elif ("cloud" in combined_text or "aws" in combined_text or "devops" in combined_text) and emp["name"] == "Betelhem Alemu":
            score += 10
        elif ("backend" in combined_text or "api" in combined_text or "software" in combined_text) and emp["name"] == "Yonas Tesfaye":
            score += 10
        elif ("data" in combined_text or "pipeline" in combined_text or "warehouse" in combined_text) and emp["name"] == "Selamawit Tadesse":
            score += 10
        elif ("marketing" in combined_text or "media" in combined_text or "ad" in combined_text) and emp["name"] == "Eden Kebede":
            score += 10
        elif ("finance" in combined_text or "payment" in combined_text or "invoice" in combined_text) and emp["name"] == "Solomon Desta":
            score += 10
        elif ("ceo" in combined_text or "investor" in combined_text or "board" in combined_text) and emp["name"] == "Meron Tesfaye":
            score += 10

        if score > best_score:
            best_score = score
            best_host = emp

    # Default fallbacks based on purpose if score is 0
    if best_score == 0:
        if "interview" in purpose_lower:
            return next(e for e in EMPLOYEE_DIRECTORY if e["name"] == "Liya Mengistu")
        elif "delivery" in purpose_lower:
            return next(e for e in EMPLOYEE_DIRECTORY if e["name"] == "Yordanos Alemayehu")
        elif "meeting" in purpose_lower:
            return next(e for e in EMPLOYEE_DIRECTORY if e["name"] == "Meron Tesfaye")

    return best_host
