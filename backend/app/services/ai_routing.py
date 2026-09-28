"""
Host Knowledge Base & AI Semantic Router
Matches visitor purpose and notes to the most relevant host employee based on job titles and descriptions.
"""

import re
from typing import Optional, Dict, List
from app.data.employee_directory import EMPLOYEE_DIRECTORY

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Employee, User

async def match_host_for_visitor(purpose: Optional[str], notes: Optional[str], db: AsyncSession) -> Dict:
    """
    Intelligently analyzes visitor purpose and notes to determine the optimal host.
    Uses multi-stage semantic text analysis with keyword weighting and text matching.
    """
    combined_text = f"{purpose or ''} {notes or ''}".lower()
    
    # Get all employees and their associated users
    result = await db.execute(select(Employee, User).outerjoin(User, Employee.user_id == User.id))
    rows = result.all()
    
    candidates = []
    db_emp_ids = set()
    for emp, user in rows:
        db_emp_ids.add(emp.employee_id)
        # Try to extract job title from department if present e.g. "Operations (Host)"
        job_title = ""
        dept = emp.department
        if "(" in dept and ")" in dept:
            job_title = dept.split("(")[1].replace(")", "").strip()
            dept = dept.split("(")[0].strip()

        candidates.append({
            "name": emp.full_name,
            "employee_id": emp.employee_id,
            "department": dept,
            "job_title": job_title,
            "description": user.description if user and user.description else "",
            "keywords": []
        })

    for emp in EMPLOYEE_DIRECTORY:
        if emp["employee_id"] not in db_emp_ids:
            candidates.append({
                "name": emp["name"],
                "employee_id": emp["employee_id"],
                "department": emp["department"],
                "job_title": emp["job_title"],
                "description": emp.get("job_description", ""),
                "keywords": emp.get("keywords", [])
            })
            db_emp_ids.add(emp["employee_id"])

    # 1. Direct Explicit Name Matching
    for cand in candidates:
        first_name = cand["name"].split()[0].lower()
        full_name = cand["name"].lower()
        if full_name in combined_text or first_name in combined_text:
            return {"name": cand["name"], "employee_id": cand["employee_id"], "department": cand["department"], "job_title": cand["job_title"]}

    # 2. Priority Keyword & Department Scoring
    best_score = 0
    best_host = candidates[0] if candidates else None

    # Purpose-based base scoring
    purpose_lower = (purpose or "").lower()
    
    for cand in candidates:
        score = 0

        # Check description words (AI Recommendation Description)
        if cand["description"]:
            desc_words = re.findall(r'[a-z0-9]+', cand["description"].lower())
            for word in desc_words:
                if len(word) > 2 and word in combined_text:
                    score += 50

        # Check keyword matches
        for kw in cand["keywords"]:
            if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
                score += 5

        # Check job title & department tokens
        for token in cand["job_title"].lower().split():
            if len(token) > 3 and token in combined_text:
                score += 4

        for token in cand["department"].lower().split():
            if len(token) > 3 and token in combined_text:
                score += 3

        # Contextual boosts
        if "interview" in purpose_lower and cand["name"] == "Sosina Getachew":
            score += 20
        elif "delivery" in purpose_lower and cand["name"] == "Sosina Getachew":
            score += 8
        elif "security" in combined_text and cand["name"] == "Mulugeta Abrha":
            score += 10
        elif ("cloud" in combined_text or "aws" in combined_text or "devops" in combined_text) and cand["name"] == "Kirubel Gizaw":
            score += 10
        elif ("backend" in combined_text or "api" in combined_text or "software" in combined_text) and cand["name"] == "Kirubel Gizaw":
            score += 10
        elif ("data" in combined_text or "pipeline" in combined_text or "warehouse" in combined_text) and cand["name"] == "Lidiya Getachew":
            score += 10
        elif ("marketing" in combined_text or "media" in combined_text or "ad" in combined_text) and cand["name"] == "Hikma Anwar":
            score += 10
        elif ("finance" in combined_text or "payment" in combined_text or "invoice" in combined_text) and cand["name"] == "Sosina Getachew":
            score += 10
        elif ("ceo" in combined_text or "investor" in combined_text or "board" in combined_text) and cand["name"] == "Mulugeta Abrha":
            score += 10

        if score > best_score:
            best_score = score
            best_host = cand

    # Default fallbacks based on purpose if score is 0
    if best_score == 0 and best_host:
        if "interview" in purpose_lower:
            return next((c for c in candidates if c["name"] == "Sosina Getachew"), best_host)
        elif "delivery" in purpose_lower:
            return next((c for c in candidates if c["name"] == "Sosina Getachew"), best_host)
        elif "meeting" in purpose_lower:
            return next((c for c in candidates if c["name"] == "Mulugeta Abrha"), best_host)

    return {"name": best_host["name"], "employee_id": best_host["employee_id"], "department": best_host["department"], "job_title": best_host["job_title"]} if best_host else None
