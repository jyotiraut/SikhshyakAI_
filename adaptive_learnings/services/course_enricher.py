"""
Turn a raw course outline into structured units.

A teacher uploads a syllabus PDF (or pastes the text) and gets back units with
titles, learning objectives, a teaching plan and time estimates. Those learning
objectives are what the adaptive engine tracks mastery against and what the
question generator writes questions for, so the quality of this step sets a
ceiling on everything downstream.

The output contract is fixed by the Node caller's `normalizeUnits`:

    { "units": [ { unitNumber, title, description, learningObjectives[],
                   teachingPlan: { overview, methods[], activities[] },
                   estimatedTime: { totalMinutes, theoryMinutes, practicalMinutes } } ] }
"""

import json
import os
import re
import time
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from dotenv import load_dotenv

from core.logger import logger

load_dotenv()

MAX_ATTEMPTS = 3
RETRY_BASE_DELAY = 1.5

# A syllabus can be long; keep the prompt bounded but generous.
MAX_OUTLINE_CHARS = 30000

MIN_UNITS = 1
MAX_UNITS = 30
MIN_OBJECTIVES = 2
MAX_OBJECTIVES = 8

PACE_GUIDANCE = {
    "slow": "Favour more units with fewer objectives each, leaving room to revisit.",
    "normal": "Balance breadth and depth.",
    "fast": "Group related material into fewer, denser units.",
}


class CourseEnrichmentError(RuntimeError):
    """Raised when a usable unit breakdown could not be produced."""


class CourseEnricher:
    """Generate a unit breakdown from a course outline using Gemini."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": 0.4,
                "max_output_tokens": 16000,
                "top_p": 0.95,
                "response_mime_type": "application/json",
            },
        )

    # ------------------------------------------------------------------ api --

    def enrich(
        self,
        outline_text: str,
        course_meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        outline_text = (outline_text or "").strip()
        if len(outline_text) < 20:
            raise CourseEnrichmentError("The outline is too short to build units from")

        meta = course_meta or {}
        last_error: Optional[Exception] = None

        for attempt in range(1, MAX_ATTEMPTS + 1):
            prompt = self._build_prompt(outline_text, meta, strict_retry=attempt > 1)
            try:
                payload = self._extract_json(self._call_model(prompt))
                return {"units": self._validate_units(payload, meta)}
            except Exception as exc:  # noqa: BLE001 - retried, re-raised below
                last_error = exc
                logger.warning(
                    "Course enrichment attempt %s/%s failed: %s", attempt, MAX_ATTEMPTS, exc
                )
                if attempt < MAX_ATTEMPTS:
                    time.sleep(RETRY_BASE_DELAY * attempt)

        raise CourseEnrichmentError(
            f"Could not build a unit breakdown after {MAX_ATTEMPTS} attempts: {last_error}"
        )

    # ------------------------------------------------------------ internals --

    def _call_model(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            parts = getattr(getattr(candidate, "content", None), "parts", None) or []
            text = "".join(getattr(p, "text", "") or "" for p in parts).strip()
            if text:
                return text

        feedback = getattr(response, "prompt_feedback", None)
        reason = getattr(feedback, "block_reason", None) if feedback else None
        finish = getattr(candidates[0], "finish_reason", None) if candidates else None
        raise CourseEnrichmentError(
            f"Gemini returned no usable text (block_reason={reason}, finish_reason={finish})"
        )

    def _build_prompt(
        self, outline_text: str, meta: Dict[str, Any], strict_retry: bool = False
    ) -> str:
        if len(outline_text) > MAX_OUTLINE_CHARS:
            outline_text = outline_text[:MAX_OUTLINE_CHARS].rsplit(" ", 1)[0] + "\n[...truncated]"

        period_minutes = meta.get("periodDurationMinutes") or 45
        total_periods = meta.get("totalPeriods")
        pace = str(meta.get("pace") or "normal").lower()
        language = meta.get("language") or "en"

        budget_line = (
            f"The course runs for {total_periods} periods of {period_minutes} minutes "
            f"(about {int(total_periods) * int(period_minutes)} minutes total). Total "
            f"estimatedTime across all units should land close to that."
            if total_periods
            else f"Each teaching period is about {period_minutes} minutes."
        )

        strict_block = ""
        if strict_retry:
            strict_block = (
                "\nThe previous response was rejected for not matching the schema. "
                "Return ONLY the JSON object, with exactly the required keys and types.\n"
            )

        return f"""You are an experienced curriculum designer breaking a syllabus into teachable units.

COURSE OUTLINE
{outline_text}

CONSTRAINTS
- {budget_line}
- Pace: {pace}. {PACE_GUIDANCE.get(pace, PACE_GUIDANCE['normal'])}
- Write all text in language code: {language}
{strict_block}
RULES
- Derive units from the outline above. Do not invent topics it does not mention,
  and do not drop topics it does mention.
- Number units sequentially from 1, in the order they should be taught.
- Each unit needs {MIN_OBJECTIVES}-{MAX_OBJECTIVES} learning objectives. Write them as
  observable outcomes that start with a verb - "Explain how a vector is added",
  not "Vectors". These objectives are assessed individually, so each one must be
  narrow enough to write a single question about.
- estimatedTime.totalMinutes must equal theoryMinutes + practicalMinutes.
- teachingPlan.methods are how it is taught (lecture, demonstration, pair work).
  teachingPlan.activities are what students actually do.

Return ONLY this JSON object, no markdown fence, no commentary:
{{
  "units": [
    {{
      "unitNumber": 1,
      "title": "short unit title",
      "description": "one or two sentences on what this unit covers",
      "learningObjectives": ["Explain ...", "Calculate ..."],
      "teachingPlan": {{
        "overview": "how this unit is approached",
        "methods": ["lecture", "worked examples"],
        "activities": ["problem set", "lab exercise"]
      }},
      "estimatedTime": {{
        "totalMinutes": 90,
        "theoryMinutes": 60,
        "practicalMinutes": 30
      }}
    }}
  ]
}}"""

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        text = (text or "").strip()
        if not text:
            raise CourseEnrichmentError("Empty response from Gemini")

        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
            text = re.sub(r"```$", "", text).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise CourseEnrichmentError("No JSON object found in Gemini output")

        candidate = re.sub(r",(\s*[}\]])", r"\1", match.group())
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            raise CourseEnrichmentError(f"Gemini output was not valid JSON: {exc}") from exc

    def _validate_units(self, payload: Any, meta: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Reject anything the course flow cannot use. A unit with no objectives is
        invisible to the adaptive engine, which tracks mastery per objective.
        """
        if not isinstance(payload, dict):
            raise CourseEnrichmentError("Expected a JSON object at the top level")

        raw_units = payload.get("units")
        if not isinstance(raw_units, list) or not raw_units:
            raise CourseEnrichmentError("Response contained no units")
        if len(raw_units) > MAX_UNITS:
            raw_units = raw_units[:MAX_UNITS]

        period_minutes = int(meta.get("periodDurationMinutes") or 45)
        units: List[Dict[str, Any]] = []

        for index, raw in enumerate(raw_units):
            if not isinstance(raw, dict):
                raise CourseEnrichmentError(f"Unit {index} is not an object")

            title = str(raw.get("title", "")).strip()
            if not title:
                raise CourseEnrichmentError(f"Unit {index} has no title")

            objectives = [
                str(o).strip()
                for o in (raw.get("learningObjectives") or [])
                if str(o).strip()
            ][:MAX_OBJECTIVES]
            if len(objectives) < MIN_OBJECTIVES:
                raise CourseEnrichmentError(
                    f"Unit {index} ('{title}') has {len(objectives)} learning objectives, "
                    f"need at least {MIN_OBJECTIVES}"
                )

            plan = raw.get("teachingPlan") or {}
            if not isinstance(plan, dict):
                plan = {}

            time_block = raw.get("estimatedTime") or {}
            if not isinstance(time_block, dict):
                time_block = {}

            def minutes(key: str) -> Optional[int]:
                try:
                    value = int(float(time_block.get(key)))
                    return value if value >= 0 else None
                except (TypeError, ValueError):
                    return None

            theory = minutes("theoryMinutes")
            practical = minutes("practicalMinutes")
            total = minutes("totalMinutes")

            # Keep the arithmetic self-consistent rather than storing a total
            # that disagrees with its own parts.
            if theory is None and practical is None:
                total = total or period_minutes
                theory, practical = total, 0
            else:
                theory = theory or 0
                practical = practical or 0
                total = theory + practical

            units.append({
                "unitNumber": index + 1,  # renumbered here; sequence is ours to own
                "title": title[:200],
                "description": str(raw.get("description", "")).strip()[:1000],
                "learningObjectives": objectives,
                "teachingPlan": {
                    "overview": str(plan.get("overview", "")).strip()[:1000],
                    "methods": [str(m).strip() for m in (plan.get("methods") or []) if str(m).strip()][:10],
                    "activities": [str(a).strip() for a in (plan.get("activities") or []) if str(a).strip()][:10],
                },
                "estimatedTime": {
                    "totalMinutes": total,
                    "theoryMinutes": theory,
                    "practicalMinutes": practical,
                },
                "tutorials": [],
                "labs": [],
            })

        if len(units) < MIN_UNITS:
            raise CourseEnrichmentError("No usable units were produced")

        return units


_enricher: Optional[CourseEnricher] = None


def get_enricher() -> CourseEnricher:
    """Built lazily so the service still starts if only this feature is unconfigured."""
    global _enricher
    if _enricher is None:
        _enricher = CourseEnricher()
    return _enricher
