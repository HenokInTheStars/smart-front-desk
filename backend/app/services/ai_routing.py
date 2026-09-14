"""
Host Knowledge Base & AI Semantic Router
Matches visitor purpose and notes to the most relevant host employee based on job titles and descriptions.
"""

import re
from typing import Optional, Dict, List
from app.data.employee_directory import EMPLOYEE_DIRECTORY

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
        if "interview" in purpose_lower and emp["name"] == "Sosina Getachew":
            score += 20
        elif "delivery" in purpose_lower and emp["name"] == "Sosina Getachew":
            score += 8
        elif "security" in combined_text and emp["name"] == "Mulugeta Abrha":
            score += 10
        elif ("ai" in combined_text or "machine learning" in combined_text) and emp["name"] == "Semir Sultan":
            score += 10
        elif ("cloud" in combined_text or "aws" in combined_text or "devops" in combined_text) and emp["name"] == "Kirubel Gizaw":
            score += 10
        elif ("backend" in combined_text or "api" in combined_text or "software" in combined_text) and emp["name"] == "Kirubel Gizaw":
            score += 10
        elif ("data" in combined_text or "pipeline" in combined_text or "warehouse" in combined_text) and emp["name"] == "Lidiya Getachew":
            score += 10
        elif ("marketing" in combined_text or "media" in combined_text or "ad" in combined_text) and emp["name"] == "Hikma Anwar":
            score += 10
        elif ("finance" in combined_text or "payment" in combined_text or "invoice" in combined_text) and emp["name"] == "Sosina Getachew":
            score += 10
        elif ("ceo" in combined_text or "investor" in combined_text or "board" in combined_text) and emp["name"] == "Mulugeta Abrha":
            score += 10

        if score > best_score:
            best_score = score
            best_host = emp

    # Default fallbacks based on purpose if score is 0
    if best_score == 0:
        if "interview" in purpose_lower:
            return next((e for e in EMPLOYEE_DIRECTORY if e["name"] == "Sosina Getachew"), EMPLOYEE_DIRECTORY[0])
        elif "delivery" in purpose_lower:
            return next((e for e in EMPLOYEE_DIRECTORY if e["name"] == "Sosina Getachew"), EMPLOYEE_DIRECTORY[0])
        elif "meeting" in purpose_lower:
            return next((e for e in EMPLOYEE_DIRECTORY if e["name"] == "Mulugeta Abrha"), EMPLOYEE_DIRECTORY[0])

    return best_host
