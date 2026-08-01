from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CreateAdaptiveLearningRequest(BaseModel):
    student_id: str
    course_id: str

class QuizRequest(BaseModel):
    student_id: str
    course_id: str
    unit_id: str

class QuizAnswer(BaseModel):
    quiz_id: str
    student_id: str
    course_id: str
    # Exactly one answer per adaptive question; an empty list used to reach the
    # handler and raise an IndexError as a 500.
    answers: List[Dict[str, Any]] = Field(min_length=1)  # {questionIndex, selectedOption}

class GenerateAssessmentRequest(BaseModel):
    """Teacher-facing bulk generation for a whole unit."""
    course_id: str
    unit_id: str
    assessment_type: str = "quiz"
    question_count: int = Field(default=5, ge=1, le=30)
    difficulty_mix: Optional[Dict[str, int]] = None  # e.g. {"low": 40, "mid": 40, "high": 20}

class PredictionRequest(BaseModel):
    student_id: str
    course_id: str
    unit_id: Optional[str] = None