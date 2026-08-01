"""
DEPRECATED — not mounted by anything.

`main.py` serves the live API from `api/adaptive_routes.py`. This module is a
second, half-finished FastAPI app whose /generate-quiz never generates a quiz
(see the TODO below); it is kept only for reference. Do not point clients at it.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from integration.assessment_adapter import AdaptiveAssessmentAdapter
from services.student_tracker import StudentTracker

# Import your existing AssessmentChain
# Adjust the import path to match your project structure
# from llm.chains.assessment_chain import AssessmentChain

app = FastAPI(title="Adaptive Learning API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize adapter
adapter = AdaptiveAssessmentAdapter()

# Pydantic models
class AdaptiveQuizRequest(BaseModel):
    student_id: str
    course_id: str
    unit_id: str

class PredictionRequest(BaseModel):
    student_id: str
    course_id: str
    unit_id: Optional[str] = None

# Routes
@app.get("/")
def read_root():
    return {"status": "Adaptive Learning System Ready"}

@app.post("/api/adaptive/predictions")
async def get_adaptive_predictions(request: PredictionRequest):
    """
    Get raw adaptive predictions (mastery, difficulty, pace)
    """
    try:
        predictor = adapter.get_predictor(request.course_id)
        predictions = predictor.get_adaptive_parameters(
            request.student_id, 
            request.unit_id
        )
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/adaptive/quiz-parameters")
async def get_quiz_parameters(request: AdaptiveQuizRequest):
    """
    Get adaptive parameters formatted for your AssessmentChain
    
    Use this endpoint to get parameters, then pass to your quiz generator
    """
    try:
        params = adapter.get_adaptive_quiz_parameters(
            student_id=request.student_id,
            course_id=request.course_id,
            unit_id=request.unit_id
        )
        return params
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/adaptive/generate-quiz")
async def generate_adaptive_quiz(request: AdaptiveQuizRequest):
    """
    Complete flow: Get adaptive parameters + Generate quiz
    
    This integrates with your existing AssessmentChain
    """
    try:
        # Get adaptive parameters
        params = adapter.get_adaptive_quiz_parameters(
            student_id=request.student_id,
            course_id=request.course_id,
            unit_id=request.unit_id
        )
        
        # TODO: Initialize your AssessmentChain here
        # from llm.chains.assessment_chain import AssessmentChain
        # assessment_chain = AssessmentChain()
        
        # Generate quiz using your existing code
        # quiz = assessment_chain.generate_assessment(
        #     course_id=params['course_id'],
        #     unit_number=params['unit_number'],
        #     content_text=params['content_text'],
        #     assessment_type=params['assessment_type'],
        #     difficulty_mix=params['difficulty_mix'],
        #     question_count=params['question_count']
        # )
        
        # For now, return the parameters
        return {
            "adaptive_parameters": params,
            "message": "Integrate with your AssessmentChain to generate quiz",
            # "quiz": quiz  # Uncomment when integrated
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/progress/{student_id}/{course_id}")
async def get_student_progress(student_id: str, course_id: str):
    """Get detailed student progress"""
    try:
        tracker = StudentTracker(student_id)
        tracker.load_student_profile()
        
        performance = tracker.get_current_performance_summary(course_id)
        quiz_history = tracker.get_quiz_history(course_id=course_id, limit=10)
        
        return {
            "student": {
                "id": student_id,
                "name": tracker.student_data.get('fullName', 'Unknown')
            },
            "performance": performance,
            "quiz_history": [
                {
                    "quiz_id": str(q['_id']),
                    "score": q.get('score', 0),
                    "total": q.get('total', 0),
                    "accuracy": q.get('score', 0) / q.get('total', 1),
                    "date": q.get('createdAt')
                }
                for q in quiz_history
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)