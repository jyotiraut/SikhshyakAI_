"""
Turns a student's stored learning record into the parameters the question
generator needs: which unit, which objective, how hard, and — critically — the
actual teaching material to write questions from.
"""

from typing import Any, Dict, List, Optional

from bson import ObjectId

from config.database import adaptive_learning_collection, units_collection
from services.adaptive_service import (
    DIFFICULTIES,
    compute_lo_mastery,
    learning_action_for,
    lo_is_mastered,
    normalize_difficulty,
    read_by_difficulty,
)

# Gemini gets a generous but bounded slice of the unit material.
MAX_CONTENT_CHARS = 12000


class AdaptivePredictor:
    """Rule-based predictor over the student's stored adaptive learning record."""

    def __init__(self, course_id: str):
        self.course_id = course_id
        # Units are read per request rather than cached on the instance: teachers
        # edit unit content and objectives while students are working, and a
        # cached copy silently serves stale material forever.
        if not self.get_units():
            raise ValueError(f"No units found for course {course_id}")

    def get_units(self) -> List[Dict[str, Any]]:
        return list(
            units_collection.find({"course": ObjectId(self.course_id)}).sort("unitNumber", 1)
        )

    # ------------------------------------------------------------------ main --

    def get_adaptive_parameters(
        self,
        student_id: str,
        unit_id: Optional[str] = None,
        lo_index: Optional[int] = None,
    ) -> Dict[str, Any]:
        units = self.get_units()
        record = adaptive_learning_collection.find_one({
            "student": ObjectId(student_id),
            "course": ObjectId(self.course_id),
        })

        if not record:
            return self._beginner_parameters(units, unit_id)

        target_unit_id = (
            unit_id
            or str(record.get("recommendedUnit") or record.get("currentUnit") or units[0]["_id"])
        )
        unit_doc = units_collection.find_one({"_id": ObjectId(target_unit_id)}) or units[0]
        target_unit_id = str(unit_doc["_id"])
        objectives = unit_doc.get("learningObjectives", []) or []

        target_lo = (
            lo_index
            if lo_index is not None
            else self._next_open_objective(record, target_unit_id, len(objectives))
        )
        target_lo = max(0, min(target_lo, max(len(objectives) - 1, 0)))

        lo_stat = self._find_stat(record, target_unit_id, target_lo)
        buckets = read_by_difficulty(lo_stat) if lo_stat else None
        lo_mastery = compute_lo_mastery(buckets) if buckets else 0.0
        lo_attempts = (
            sum(int((buckets[d]).get("attempted", 0) or 0) for d in DIFFICULTIES)
            if buckets else 0
        )

        difficulty_level = self._difficulty_for_objective(buckets)
        difficulty_distribution = record.get("difficultyDistribution") or {
            "low": 100, "mid": 0, "high": 0
        }

        return {
            "mastery_score": round(float(record.get("masteryScore", 0.0) or 0.0), 4),
            "objective_mastery": lo_mastery,
            "difficulty_level": difficulty_level,
            "difficulty_distribution": difficulty_distribution,
            "pace_score": round(float(record.get("paceScore", 0.0) or 0.0), 4),
            "coverage_score": round(float(record.get("coverageScore", 0.0) or 0.0), 4),
            "recommended_unit_id": target_unit_id,
            "current_unit_id": str(record.get("currentUnit") or target_unit_id),
            "learning_objective_index": target_lo,
            "question_count": 1,
            "focus_areas": self._focus_areas(objectives, target_lo),
            "learning_action": learning_action_for(lo_mastery, lo_attempts),
            "metadata": {
                "total_objectives": sum(
                    len(u.get("learningObjectives", []) or []) for u in units
                ),
                "objective_attempts": lo_attempts,
                "trend": "continuing_student" if lo_attempts else "new_objective",
            },
            "unit_content": self._extract_unit_content(unit_doc, target_lo),
        }

    # ------------------------------------------------------------- internals --

    def _beginner_parameters(
        self, units: List[Dict[str, Any]], unit_id: Optional[str]
    ) -> Dict[str, Any]:
        unit_doc = None
        if unit_id:
            unit_doc = units_collection.find_one({"_id": ObjectId(unit_id)})
        unit_doc = unit_doc or units[0]
        objectives = unit_doc.get("learningObjectives", []) or []

        return {
            "mastery_score": 0.0,
            "objective_mastery": 0.0,
            "difficulty_level": "low",
            "difficulty_distribution": {"low": 100, "mid": 0, "high": 0},
            "pace_score": 0.0,
            "coverage_score": 0.0,
            "recommended_unit_id": str(unit_doc["_id"]),
            "current_unit_id": str(unit_doc["_id"]),
            "learning_objective_index": 0,
            "question_count": 1,
            # Anchor on the unit's real first objective rather than a generic
            # "Introduction" placeholder, which produced off-topic questions.
            "focus_areas": self._focus_areas(objectives, 0),
            "learning_action": "BEGIN",
            "metadata": {
                "total_objectives": sum(
                    len(u.get("learningObjectives", []) or []) for u in units
                ),
                "objective_attempts": 0,
                "trend": "new_student",
            },
            "unit_content": self._extract_unit_content(unit_doc, 0),
        }

    @staticmethod
    def _find_stat(record: Dict[str, Any], unit_id: str, lo_index: int):
        for stat in record.get("quizStats", []) or []:
            if (
                str(stat.get("unit", "")) == str(unit_id)
                and int(stat.get("learningObjectiveIndex", 0)) == lo_index
            ):
                return stat
        return None

    def _next_open_objective(self, record: Dict[str, Any], unit_id: str, total_los: int) -> int:
        """Resume on the stored objective, skipping ones already mastered."""
        stored = record.get("currentLearningObjectiveIndex")
        if isinstance(stored, int) and 0 <= stored < max(total_los, 1):
            stat = self._find_stat(record, unit_id, stored)
            if not stat:
                return stored
            buckets = read_by_difficulty(stat)
            if not lo_is_mastered(buckets, compute_lo_mastery(buckets)):
                return stored

        for idx in range(max(total_los, 1)):
            stat = self._find_stat(record, unit_id, idx)
            if not stat:
                return idx
            buckets = read_by_difficulty(stat)
            if not lo_is_mastered(buckets, compute_lo_mastery(buckets)):
                return idx
        return max(total_los - 1, 0)

    @staticmethod
    def _difficulty_for_objective(buckets) -> str:
        """Serve the hardest level the student has already worked at."""
        if not buckets:
            return "low"
        level = "low"
        for d in DIFFICULTIES:
            if int((buckets.get(d) or {}).get("attempted", 0) or 0) > 0:
                level = d
        return normalize_difficulty(level)

    @staticmethod
    def _focus_areas(objectives: List[str], lo_index: int) -> List[str]:
        """
        Focus on the objective being assessed. Previously this returned the first
        two objectives of the unit regardless of where the student actually was,
        so questions drifted off the target objective.
        """
        if not objectives:
            return ["Core concepts of this unit"]
        idx = max(0, min(lo_index, len(objectives) - 1))
        focus = [objectives[idx]]
        if idx > 0:
            focus.append(f"(prerequisite) {objectives[idx - 1]}")
        return focus

    @staticmethod
    def _extract_unit_content(unit_doc, lo_index: int = 0) -> Dict[str, Any]:
        """
        Pull the real teaching material out of a unit document.

        The unit schema has no `content` or `topics` field — the earlier code read
        those keys and always got empty strings, so every question was generated
        from objective titles alone with no source material.
        """
        if not unit_doc:
            return {"content": "", "topics": [], "learning_objectives": [], "title": ""}

        objectives = unit_doc.get("learningObjectives", []) or []
        sections: List[str] = []

        title = unit_doc.get("title", "")
        if title:
            sections.append(f"# Unit {unit_doc.get('unitNumber', '')}: {title}".strip())

        if unit_doc.get("description"):
            sections.append(f"## Description\n{unit_doc['description']}")

        if unit_doc.get("outlineText"):
            sections.append(f"## Outline\n{unit_doc['outlineText']}")

        plan = unit_doc.get("teachingPlan") or {}
        if isinstance(plan, dict):
            plan_parts = []
            if plan.get("overview"):
                plan_parts.append(plan["overview"])
            for key in ("methods", "activities"):
                values = [str(v) for v in (plan.get(key) or []) if v]
                if values:
                    plan_parts.append(
                        f"{key.capitalize()}:\n" + "\n".join(f"- {v}" for v in values)
                    )
            if plan_parts:
                sections.append("## Teaching plan\n" + "\n\n".join(plan_parts))

        labs = [str(lab) for lab in (unit_doc.get("labs") or []) if lab]
        if labs:
            sections.append("## Labs\n" + "\n".join(f"- {lab}" for lab in labs))

        # Extracted PDF text is the richest source; keep it last so the shorter
        # structured fields survive truncation.
        extracts = [
            f.get("textExtract", "").strip()
            for f in (unit_doc.get("files") or [])
            if f.get("textExtract")
        ]
        if extracts:
            sections.append("## Source material\n" + "\n\n".join(extracts))

        content = "\n\n".join(s for s in sections if s.strip())
        if len(content) > MAX_CONTENT_CHARS:
            content = content[:MAX_CONTENT_CHARS].rsplit(" ", 1)[0] + "\n\n[...truncated]"

        return {
            "content": content,
            "topics": objectives,
            "learning_objectives": objectives,
            "focus_objective": objectives[lo_index] if lo_index < len(objectives) else "",
            "title": title,
            "has_source_material": bool(extracts),
        }
