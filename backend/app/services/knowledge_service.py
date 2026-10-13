import re
from pathlib import Path
from typing import List, Dict, Any, Optional

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"

STOPWORDS = {
    "a", "about", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "how", "i", "in", "is", "it", "of", "on", "or", "that", "the", "this",
    "to", "was", "what", "when", "where", "which", "who", "will", "with",
    "does", "mean", "can", "do", "we", "our", "you", "your"
}

def tokenize(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-Z0-9_\-]+\b", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) >= 2]

def load_knowledge_sections() -> list[dict[str, Any]]:
    sections = []
    if not KNOWLEDGE_DIR.exists():
        return sections

    for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        lines = content.splitlines()
        current_title = md_file.stem.replace("_", " ").title()
        current_lines: list[str] = []

        for line in lines:
            if line.startswith("#"):
                if current_lines:
                    sec_text = "\n".join(current_lines).strip()
                    if sec_text:
                        sections.append({
                            "file": md_file.name,
                            "heading": current_title,
                            "content": sec_text,
                            "tokens": set(tokenize(current_title + " " + sec_text))
                        })
                    current_lines = []
                current_title = line.lstrip("#").strip()
            current_lines.append(line)

        if current_lines:
            sec_text = "\n".join(current_lines).strip()
            if sec_text:
                sections.append({
                    "file": md_file.name,
                    "heading": current_title,
                    "content": sec_text,
                    "tokens": set(tokenize(current_title + " " + sec_text))
                })

    return sections

_SECTIONS_CACHE: Optional[list[dict[str, Any]]] = None

def get_sections(force_reload: bool = False) -> list[dict[str, Any]]:
    global _SECTIONS_CACHE
    if _SECTIONS_CACHE is None or force_reload:
        _SECTIONS_CACHE = load_knowledge_sections()
    return _SECTIONS_CACHE

def search_knowledge_base(query: str, top_k: int = 3) -> list[dict[str, Any]]:
    if not query or not isinstance(query, str):
        return []

    clean_query = query.strip()
    query_tokens = tokenize(clean_query)
    if not query_tokens:
        query_tokens = [w for w in re.findall(r"\b[a-zA-Z0-9_\-]+\b", clean_query.lower()) if len(w) >= 2]

    sections = get_sections()
    if not sections:
        return []

    scored_sections = []
    q_lower = clean_query.lower()

    for sec in sections:
        score = 0.0
        sec_heading_lower = sec["heading"].lower()
        sec_content_lower = sec["content"].lower()
        sec_tokens = sec["tokens"]

        # Exact query match bonus
        if q_lower in sec_heading_lower:
            score += 15.0
        elif q_lower in sec_content_lower:
            score += 8.0

        for t in query_tokens:
            if t in sec_heading_lower:
                score += 5.0
            elif t in sec_tokens:
                score += 2.0
            elif t in sec_content_lower:
                score += 1.0

        if score > 0:
            scored_sections.append((score, sec))

    scored_sections.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, sec in scored_sections[:top_k]:
        results.append({
            "file": sec["file"],
            "heading": sec["heading"],
            "content": sec["content"]
        })

    return results
