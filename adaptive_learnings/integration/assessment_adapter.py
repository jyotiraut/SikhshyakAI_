from collections import OrderedDict
from typing import Any, Dict, Optional

from bson import ObjectId

from config.database import courses_collection, units_collection
from services.adaptive_predictor import AdaptivePredictor

# Predictors are cheap now that they no longer cache unit documents, but the
# cache still needs a bound so a busy server does not hold one entry per course
# forever.
MAX_CACHED_PREDICTORS = 64


class AdaptiveAssessmentAdapter:
    """Bridges AdaptivePredictor to AssessmentChain"""

    def __init__(self):
        self.predictors: "OrderedDict[str, AdaptivePredictor]" = OrderedDict()

    def get_predictor(self, course_id: str) -> AdaptivePredictor:
        """Get or create predictor for a course (LRU-bounded)."""
        predictor = self.predictors.pop(course_id, None)
        if predictor is None:
            predictor = AdaptivePredictor(course_id)
        self.predictors[course_id] = predictor
        while len(self.predictors) > MAX_CACHED_PREDICTORS:
            self.predictors.popitem(last=False)
        return predictor

    def get_adaptive_quiz_parameters(
        self,
        student_id: str,
        course_id: str,
        unit_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Adaptive parameters in the flatter shape older callers expect."""
        predictor = self.get_predictor(course_id)
        adaptive_params = predictor.get_adaptive_parameters(student_id, unit_id)

        unit_doc = units_collection.find_one(
            {"_id": ObjectId(adaptive_params["recommended_unit_id"])}
        )
        course_doc = courses_collection.find_one({"_id": ObjectId(course_id)})

        return {
            "course_id": course_id,
            "course_title": course_doc.get("title", "") if course_doc else "",
            "unit_number": unit_doc.get("unitNumber", 1) if unit_doc else 1,
            "content_text": adaptive_params.get("unit_content", {}).get("content", ""),
            "difficulty_mix": adaptive_params["difficulty_distribution"],
            "question_count": adaptive_params["question_count"],
            "adaptive_context": {
                "mastery_score": adaptive_params["mastery_score"],
                "objective_mastery": adaptive_params.get("objective_mastery", 0.0),
                "difficulty_level": adaptive_params["difficulty_level"],
                "pace_score": adaptive_params["pace_score"],
                "focus_areas": adaptive_params["focus_areas"],
                "learning_action": adaptive_params["learning_action"],
                "learning_objective_index": adaptive_params.get("learning_objective_index", 0),
                "student_metadata": adaptive_params["metadata"],
                "unit_content": adaptive_params.get("unit_content", {}),
            },
        }
