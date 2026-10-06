from __future__ import annotations

import json
import re

from app.config import settings
from app.services.groq_client import get_groq

# ── Document classification prompt ──────────────────────────────────────────

DOC_CLASSIFY_PROMPT = """You are a medical document classifier.
Return JSON with this exact shape:
{
  "doc_type": string,
  "entities": {
    "diagnoses": [string],
    "procedures": [string],
    "medications": [{"name": string, "dose": string|null, "frequency": string|null}],
    "dates": [string],
    "symptoms": [string],
    "key_findings": [string]
  }
}
doc_type must be one of: lab_report, discharge_summary, imaging_report,
prescription, clinical_note, insurance_form, referral, pathology_report,
operative_note, other.
Use only information in the provided text. Use empty arrays if not found.
"""

# ── Full analysis prompt ─────────────────────────────────────────────────────

ANALYZE_PROMPT = """You are an expert clinical case analyst supporting doctors and insurance reviewers.
Given structured case data (JSON), return ONLY valid JSON with this exact shape:
{
  "summary": string,
  "diagnoses": [
    {
      "name": string,
      "icd10": string|null,
      "confidence": number,
      "source": {"document": string, "excerpt": string}|null
    }
  ],
  "procedures": [
    {"name": string, "source": {"document": string, "excerpt": string}|null}
  ],
  "medications": [
    {"name": string, "dose": string|null, "frequency": string|null,
     "source": {"document": string, "excerpt": string}|null}
  ],
  "symptoms": [string],
  "conditions": [string],
  "key_findings": [string],
  "missing_information": [string],
  "risk_flags": [string],
  "recommendations": [string],
  "overall_confidence": number
}

Rules:
- confidence and overall_confidence are floats 0.0-1.0
- source.document is the filename, source.excerpt is a short verbatim quote
- Use ONLY information present in the case data. Do NOT invent facts.
- Empty arrays if no data. null for optional scalar fields.
"""

# ── De-identification ────────────────────────────────────────────────────────

_DEID_PATTERNS = [
    (re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[PHONE]"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN]"),
    (re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"), "[EMAIL]"),
    (re.compile(r"\b(DOB|Date of Birth|Born)[:\s]+[\d/\-]+\b", re.I), "[DOB]"),
    (re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"), "[DATE]"),
    (re.compile(r"\bMRN[:\s]*[A-Z0-9\-]+\b", re.I), "[MRN]"),
    (re.compile(r"\bID[:\s]*[A-Z0-9\-]+\b", re.I), "[ID]"),
]


def deidentify(text: str, name: str | None = None) -> str:
    if name:
        for part in name.split():
            if len(part) > 2:
                text = re.sub(re.escape(part), "[NAME]", text, flags=re.I)
    for pattern, replacement in _DEID_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


# ── JSON helpers ─────────────────────────────────────────────────────────────

def _parse_json(content: str) -> dict:
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return json.loads(text)


def _coerce_analysis(data: dict) -> dict:
    """Normalise the AI output to the expected schema."""
    def src(x: object) -> dict | None:
        if isinstance(x, dict) and "document" in x:
            return {"document": str(x.get("document") or ""), "excerpt": str(x.get("excerpt") or "")}
        return None

    def coerce_diag(d: object) -> dict:
        if isinstance(d, str):
            return {"name": d, "icd10": None, "confidence": 0.7, "source": None}
        if isinstance(d, dict):
            return {
                "name": str(d.get("name") or d.get("diagnosis") or ""),
                "icd10": d.get("icd10") or d.get("icd_10") or None,
                "confidence": float(d.get("confidence", 0.7)),
                "source": src(d.get("source")),
            }
        return {"name": str(d), "icd10": None, "confidence": 0.7, "source": None}

    def coerce_proc(p: object) -> dict:
        if isinstance(p, str):
            return {"name": p, "source": None}
        if isinstance(p, dict):
            return {"name": str(p.get("name") or ""), "source": src(p.get("source"))}
        return {"name": str(p), "source": None}

    def coerce_med(m: object) -> dict:
        if isinstance(m, str):
            return {"name": m, "dose": None, "frequency": None, "source": None}
        if isinstance(m, dict):
            return {
                "name": str(m.get("name") or ""),
                "dose": m.get("dose") or None,
                "frequency": m.get("frequency") or None,
                "source": src(m.get("source")),
            }
        return {"name": str(m), "dose": None, "frequency": None, "source": None}

    return {
        "summary": str(data.get("summary") or ""),
        "diagnoses": [coerce_diag(d) for d in (data.get("diagnoses") or [])],
        "procedures": [coerce_proc(p) for p in (data.get("procedures") or [])],
        "medications": [coerce_med(m) for m in (data.get("medications") or [])],
        "symptoms": [str(s) for s in (data.get("symptoms") or [])],
        "conditions": [str(c) for c in (data.get("conditions") or [])],
        "key_findings": [str(f) for f in (data.get("key_findings") or [])],
        "missing_information": [str(i) for i in (data.get("missing_information") or [])],
        "risk_flags": [str(r) for r in (data.get("risk_flags") or [])],
        "recommendations": [str(r) for r in (data.get("recommendations") or [])],
        "overall_confidence": float(data.get("overall_confidence", 0.7)),
    }


# ── Document classification ──────────────────────────────────────────────────

def classify_document(text: str, filename: str = "") -> dict:
    """Lightweight AI pass to classify doc type and extract key entities."""
    client = get_groq()
    prompt_text = f"Filename: {filename}\n\n{text[:8000]}"
    response = client.chat.completions.create(
        model=settings.groq_model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": DOC_CLASSIFY_PROMPT},
            {"role": "user", "content": prompt_text},
        ],
    )
    raw = _parse_json(response.choices[0].message.content or "{}")
    return {
        "doc_type": raw.get("doc_type") or "other",
        "entities": raw.get("entities") or {},
    }


# ── Full case analysis ───────────────────────────────────────────────────────

def analyze_case(payload: dict, *, deidentify_flag: bool = False) -> dict:
    """Run full clinical analysis. Returns rich structured dict."""
    client = get_groq()
    serialized = json.dumps(payload)
    if deidentify_flag:
        patient_name = payload.get("patient", {}).get("name", "")
        serialized = deidentify(serialized, name=patient_name)

    # Truncate to ~20k chars, keeping context
    serialized = serialized[:20000]

    def _call() -> dict:
        resp = client.chat.completions.create(
            model=settings.groq_model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ANALYZE_PROMPT},
                {"role": "user", "content": serialized},
            ],
        )
        return _parse_json(resp.choices[0].message.content or "{}")

    try:
        raw = _call()
    except (json.JSONDecodeError, ValueError):
        # Retry once
        raw = _call()

    return _coerce_analysis(raw)
