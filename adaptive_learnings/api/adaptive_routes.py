from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query

from config.database import (
    adaptivequiz_collection,
    adaptivequiz_submissions_collection,
    units_collection,
)
from core.logger import logger
from integration.assessment_adapter import AdaptiveAssessmentAdapter
from models.schema import (
    CreateAdaptiveLearningRequest,
    GenerateAssessmentRequest,
    QuizAnswer,
    QuizRequest,
)
from services.adaptive_predictor import AdaptivePredictor
from services.adaptive_service import (
    ensure_quiz_stat,
    get_next_question_parameters,
    get_progress_summary_data,
    get_student_course_progress_data,
    get_student_progress_data,
    get_student_unit_progress_data,
    initialize_adaptive_learning,
    normalize_difficulty,
    update_adaptive_learning_with_recalculation,
)
from services.assestment_chain import AssessmentChain, QuizGenerationError
from services.online_learner import online_learner
from services.sakt_service import sakt_service

router = APIRouter()

adapter = AdaptiveAssessmentAdapter()
assessment_chain = AssessmentChain()

# How many previously asked questions to show the generator so it stops repeating.
RECENT_QUESTION_MEMORY = 12


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_object_id(value: str, field: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field}: {value}") from exc


def public_question(question: Dict[str, Any]) -> Dict[str, Any]:
    """
    Strip the answer key before a question leaves the server.

    The correct index and the explanation used to be sent with the question
    itself, so any student could read the answer out of the network response
    before submitting.
    """
    return {
        "question": question.get("question", ""),
        "type": question.get("type", "mcq"),
        "options": list(question.get("options", [])),
        "difficulty": question.get("difficulty", "low"),
        "learningObjectiveIndex": question.get("learningObjectiveIndex", 0),
    }


def recent_question_texts(student_id: str, unit_id: str, lo_index: int) -> List[str]:
    """Recently served questions for this student on this objective."""
    cursor = (
        adaptivequiz_collection.find(
            {
                "student_id": student_id,
                "unit_id": str(unit_id),
                "learning_objective_index": lo_index,
            },
            {"quiz.questions.question": 1},
        )
        .sort("created_at", -1)
        .limit(RECENT_QUESTION_MEMORY)
    )
    texts = []
    for doc in cursor:
        for q in (doc.get("quiz", {}) or {}).get("questions", []) or []:
            text = (q or {}).get("question")
            if text:
                texts.append(text)
    return texts


def build_question(
    student_id: str,
    course_id: str,
    unit_id: str,
    lo_index: int,
    difficulty: str = None,
    learning_action: str = None,
    focus_areas: List[str] = None,
) -> Dict[str, Any]:
    """
    Generate one question and persist it. The learning objective and difficulty
    are decided here, server-side — never taken from the model's output, which
    used to let a hallucinated index write stats onto the wrong objective.
    """
    predictor = adapter.get_predictor(course_id)
    adaptive_output = predictor.get_adaptive_parameters(
        student_id=student_id, unit_id=unit_id, lo_index=lo_index
    )

    resolved_unit_id = adaptive_output["recommended_unit_id"]
    resolved_lo = int(adaptive_output["learning_objective_index"])
    resolved_difficulty = normalize_difficulty(
        difficulty or adaptive_output["difficulty_level"]
    )

    adaptive_output["difficulty_level"] = resolved_difficulty
    adaptive_output["difficulty_distribution"] = {
        d: (100 if d == resolved_difficulty else 0) for d in ("low", "mid", "high")
    }
    if focus_areas:
        adaptive_output["focus_areas"] = focus_areas
    if learning_action:
        adaptive_output["learning_action"] = learning_action

    quiz = assessment_chain.generate_quiz_from_adaptive_output(
        {
            "adaptive_context": adaptive_output,
            "difficulty_mix": adaptive_output["difficulty_distribution"],
            "question_count": 1,
        },
        avoid_questions=recent_question_texts(student_id, resolved_unit_id, resolved_lo),
    )

    question = assessment_chain.shuffle_options(quiz["questions"][0])
    # The engine owns these two fields, not the model.
    question["learningObjectiveIndex"] = resolved_lo
    question["difficulty"] = resolved_difficulty
    quiz["questions"][0] = question

    # Make sure the stats slot exists before the student can answer into it.
    ensure_quiz_stat(student_id, course_id, resolved_unit_id, resolved_lo)

    doc = {
        "student_id": student_id,
        "course_id": course_id,
        "unit_id": resolved_unit_id,
        "learning_objective_index": resolved_lo,
        "difficulty": resolved_difficulty,
        "quiz": quiz,
        "adaptive_output": adaptive_output,
        "answered": False,
        "created_at": utcnow(),
    }
    result = adaptivequiz_collection.insert_one(doc)

    return {
        "quiz_id": str(result.inserted_id),
        "question": question,
        "unit_id": resolved_unit_id,
        "lo_index": resolved_lo,
        "difficulty": resolved_difficulty,
        "adaptive_output": adaptive_output,
    }


# -------------------- Create Adaptive Learning --------------------
@router.post("/create-adaptive-learning")
def create_adaptive_learning(req: CreateAdaptiveLearningRequest):
    """Initialize adaptive learning for a student in a course."""
    parse_object_id(req.student_id, "student_id")
    parse_object_id(req.course_id, "course_id")
    try:
        doc = initialize_adaptive_learning(req.student_id, req.course_id)
        return {
            "message": "Adaptive learning initialized successfully",
            "adaptive_learning": doc,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("create-adaptive-learning failed")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Generate Initial Quiz --------------------
@router.post("/generate-quiz")
def generate_quiz(req: QuizRequest):
    """Generate the next question for a student."""
    parse_object_id(req.student_id, "student_id")
    parse_object_id(req.course_id, "course_id")
    parse_object_id(req.unit_id, "unit_id")

    try:
        generated = build_question(
            student_id=req.student_id,
            course_id=req.course_id,
            unit_id=req.unit_id,
            lo_index=None,
        )
        adaptive_output = generated["adaptive_output"]

        return {
            "message": "Quiz generated successfully",
            "quiz_id": generated["quiz_id"],
            "question": public_question(generated["question"]),
            "adaptive_context": {
                "current_unit": generated["unit_id"],
                "current_lo": generated["lo_index"],
                "mastery_score": adaptive_output.get("mastery_score"),
                "objective_mastery": adaptive_output.get("objective_mastery"),
                "difficulty_level": generated["difficulty"],
                "learning_action": adaptive_output.get("learning_action"),
                "focus_areas": adaptive_output.get("focus_areas", []),
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except QuizGenerationError as e:
        logger.error("Quiz generation failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail="The question generator is temporarily unavailable. Please try again.",
        )
    except Exception as e:
        logger.exception("generate-quiz failed")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Submit Quiz & Get Next Question --------------------
@router.post("/submit-quiz")
def submit_quiz(submission: QuizAnswer):
    """Submit an answer, update mastery, and serve the next question."""
    parse_object_id(submission.student_id, "student_id")
    parse_object_id(submission.course_id, "course_id")
    quiz_oid = parse_object_id(submission.quiz_id, "quiz_id")

    if not submission.answers:
        raise HTTPException(status_code=400, detail="answers must contain one answer")

    answer = submission.answers[0]
    if not isinstance(answer, dict) or "selectedOption" not in answer:
        raise HTTPException(status_code=400, detail="answers[0].selectedOption is required")
    try:
        selected_option = int(answer["selectedOption"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="selectedOption must be an integer")

    quiz_doc = adaptivequiz_collection.find_one({"_id": quiz_oid})
    if not quiz_doc:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # A quiz belongs to exactly one student in one course; without this check a
    # student could submit against someone else's quiz id and corrupt their stats.
    if str(quiz_doc.get("student_id")) != submission.student_id:
        raise HTTPException(status_code=403, detail="This quiz belongs to another student")
    if str(quiz_doc.get("course_id")) != submission.course_id:
        raise HTTPException(status_code=400, detail="Quiz does not belong to this course")
    if quiz_doc.get("answered"):
        raise HTTPException(status_code=409, detail="This question has already been answered")

    questions = (quiz_doc.get("quiz", {}) or {}).get("questions") or []
    if not questions:
        raise HTTPException(status_code=422, detail="Stored quiz has no questions")

    question = questions[0]
    options = question.get("options", [])
    if not 0 <= selected_option < len(options):
        raise HTTPException(
            status_code=400,
            detail=f"selectedOption must be between 0 and {max(len(options) - 1, 0)}",
        )

    current_unit_id = str(quiz_doc.get("unit_id"))
    current_lo_index = int(
        quiz_doc.get("learning_objective_index", question.get("learningObjectiveIndex", 0))
    )
    current_difficulty = normalize_difficulty(
        quiz_doc.get("difficulty", question.get("difficulty", "low"))
    )
    correct_answer = int(question.get("correctAnswer", 0))
    is_correct = selected_option == correct_answer

    # Claim the quiz before scoring so a double-submit cannot count twice.
    claimed = adaptivequiz_collection.update_one(
        {"_id": quiz_oid, "answered": {"$ne": True}},
        {"$set": {"answered": True, "answered_at": utcnow()}},
    )
    if claimed.modified_count == 0:
        raise HTTPException(status_code=409, detail="This question has already been answered")

    try:
        # Time on task is a SAKT input feature, so capture it from how long the
        # question was open rather than feeding the model a constant.
        served_at = quiz_doc.get("created_at")
        answered_at = utcnow()
        time_spent_seconds = (
            max(0.0, (answered_at - served_at).total_seconds()) if served_at else None
        )

        adaptivequiz_submissions_collection.insert_one({
            "quiz_id": submission.quiz_id,
            "student_id": submission.student_id,
            "course_id": submission.course_id,
            "unit_id": current_unit_id,
            "learning_objective_index": current_lo_index,
            "selected_option": selected_option,
            "correct_option": correct_answer,
            "is_correct": is_correct,
            "difficulty": current_difficulty,
            "time_spent_seconds": time_spent_seconds,
            "submitted_at": answered_at,
        })

        # Update the online ability model. This is the cold-start adaptive
        # signal: no training data, meaningful from the first answers, and it
        # re-rates the LLM-generated question bands from real performance.
        ability_update = online_learner.record_answer(
            student_id=submission.student_id,
            course_id=submission.course_id,
            unit_id=current_unit_id,
            lo_index=current_lo_index,
            difficulty=current_difficulty,
            is_correct=is_correct,
            time_spent_seconds=time_spent_seconds,
        )

        # Trace knowledge over the sequence *including* the answer just recorded.
        # Returns None for short histories, and the engine falls back to rules.
        sakt_prediction = sakt_service.predict(submission.student_id, submission.course_id)

        # In advisory mode the prediction is reported but never steers: the
        # shipped checkpoint fails its calibration probe (see sakt_service).
        steering_prediction = sakt_prediction if sakt_service.steers_difficulty else None

        updated_stats = update_adaptive_learning_with_recalculation(
            student_id=submission.student_id,
            course_id=submission.course_id,
            unit_id=current_unit_id,
            lo_index=current_lo_index,
            is_correct=is_correct,
            difficulty=current_difficulty,
            sakt=steering_prediction,
        )

        # Ability recommendation for the objective the student is on, plus how
        # they have been working lately (rushing, stalling, returning cold).
        ability_recommendation = online_learner.recommend_difficulty(
            submission.student_id, submission.course_id, current_unit_id, current_lo_index
        )
        behaviour = online_learner.behaviour_signals(
            submission.student_id,
            submission.course_id,
            list(
                adaptivequiz_submissions_collection.find(
                    {
                        "student_id": submission.student_id,
                        "course_id": submission.course_id,
                    }
                ).sort("submitted_at", -1).limit(10)
            ),
        )

        next_params = get_next_question_parameters(
            student_id=submission.student_id,
            course_id=submission.course_id,
            current_unit_id=current_unit_id,
            current_lo_index=current_lo_index,
            current_difficulty=current_difficulty,
            is_correct=is_correct,
            lo_stats=updated_stats["lo_stats"],
            sakt=steering_prediction,
            ability=ability_recommendation,
            behaviour=behaviour,
        )
    except Exception:
        # Scoring failed — release the claim so the student can retry.
        adaptivequiz_collection.update_one(
            {"_id": quiz_oid}, {"$set": {"answered": False}, "$unset": {"answered_at": ""}}
        )
        logger.exception("submit-quiz scoring failed")
        raise HTTPException(status_code=500, detail="Failed to record the answer")

    result = {
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "correct_answer_text": options[correct_answer] if correct_answer < len(options) else "",
        "selected_answer_text": options[selected_option],
        # A real explanation instead of "the correct answer was option 2".
        "explanation": question.get("explanation")
        or f"The correct answer is: {options[correct_answer]}.",
    }

    progress = {
        "current_lo_mastery": updated_stats["lo_mastery"],
        "current_lo_accuracy": updated_stats["lo_accuracy"],
        "current_lo_attempts": updated_stats["lo_attempts"],
        "current_lo_correct": updated_stats["lo_correct"],
        "overall_mastery_score": updated_stats["mastery_score"],
        "coverage_score": updated_stats["coverage_score"],
        "pace_score": updated_stats["pace_score"],
        "difficulty_level": updated_stats["difficulty_level"],
        "difficulty_distribution": updated_stats["difficulty_distribution"],
        "mastered_objectives": updated_stats["mastered_objectives"],
        "total_objectives": updated_stats["total_objectives"],
        "evidence_mastery_score": updated_stats["evidence_mastery_score"],
        "knowledge_tracing": updated_stats["knowledge_tracing"],
        # The cold-start model: calibrated ability and how the student is working.
        "ability": {
            "theta": ability_update["theta"],
            "change": ability_update["theta_delta"],
            "expected_success": ability_update["expected"],
            "observations": ability_update["observations"],
            "objective_mastery": online_learner.mastery_estimate(
                submission.student_id, submission.course_id,
                current_unit_id, current_lo_index,
            )["mastery"],
        },
        "behaviour": behaviour,
    }

    response = {
        "message": "Answer submitted successfully",
        "result": result,
        "progress": progress,
        "next_question": None,
    }

    # Generation is the only step that can fail on an external service. Keep the
    # student's score and feedback even when the next question cannot be built.
    try:
        generated = build_question(
            student_id=submission.student_id,
            course_id=submission.course_id,
            unit_id=next_params["unit_id"],
            lo_index=next_params["lo_index"],
            difficulty=next_params["difficulty"],
            learning_action=next_params["learning_action"],
            focus_areas=next_params["focus_areas"],
        )
        response["next_question"] = {
            "quiz_id": generated["quiz_id"],
            "question": public_question(generated["question"]),
            "context": {
                "unit_id": generated["unit_id"],
                "learning_objective_index": generated["lo_index"],
                "difficulty": generated["difficulty"],
                "reason": next_params["reason"],
                "learning_action": next_params["learning_action"],
                "current_mastery": next_params["current_mastery"],
                "current_accuracy": next_params["current_accuracy"],
                # Whether the model or the rules chose this difficulty.
                "difficulty_source": next_params["difficulty_source"],
            },
        }
    except Exception as e:  # noqa: BLE001
        logger.error("Could not generate the follow-up question: %s", e)
        response["next_question_error"] = (
            "Your answer was saved, but the next question could not be generated. "
            "Please try again."
        )

    return response


# -------------------- Teacher: bulk assessment generation --------------------
@router.post("/generate-assessment")
def generate_assessment(req: GenerateAssessmentRequest):
    """
    Generate a full multi-question assessment for a unit.

    This backs the teacher-facing "generate quiz for unit" flow, which previously
    posted to an endpoint that did not exist anywhere in the codebase.
    """
    course_oid = parse_object_id(req.course_id, "course_id")
    unit_oid = parse_object_id(req.unit_id, "unit_id")

    unit_doc = units_collection.find_one({"_id": unit_oid})
    if not unit_doc:
        raise HTTPException(status_code=404, detail="Unit not found")
    if str(unit_doc.get("course")) != str(course_oid):
        raise HTTPException(status_code=400, detail="Unit does not belong to this course")

    objectives = unit_doc.get("learningObjectives", []) or []
    unit_content = AdaptivePredictor._extract_unit_content(unit_doc, 0)

    difficulty_mix = req.difficulty_mix or {"low": 40, "mid": 40, "high": 20}
    total = sum(max(0, int(v)) for v in difficulty_mix.values()) or 100
    dominant = max(difficulty_mix, key=lambda k: difficulty_mix.get(k, 0))

    questions: List[Dict[str, Any]] = []
    # Generate per difficulty band so the requested mix is actually honoured
    # rather than left to the model's discretion.
    remaining = req.question_count
    bands = []
    for level in ("low", "mid", "high"):
        share = max(0, int(difficulty_mix.get(level, 0)))
        count = round(req.question_count * share / total)
        bands.append([level, count])
    allocated = sum(c for _, c in bands)
    if bands:
        bands[[b[0] for b in bands].index(normalize_difficulty(dominant))][1] += (
            req.question_count - allocated
        )

    for level, count in bands:
        if count <= 0:
            continue
        context = {
            "mastery_score": 0.0,
            "objective_mastery": 0.0,
            "difficulty_level": normalize_difficulty(level),
            "difficulty_distribution": {level: 100},
            "focus_areas": objectives[:3] or ["Core unit concepts"],
            "learning_action": "PRACTICE",
            "learning_objective_index": 0,
            "unit_content": unit_content,
        }
        try:
            batch = assessment_chain.generate_quiz_from_adaptive_output(
                {
                    "adaptive_context": context,
                    "difficulty_mix": {level: 100},
                    "question_count": min(count, remaining),
                },
                assessment_type=req.assessment_type,
                avoid_questions=[q["question"] for q in questions],
            )
        except QuizGenerationError as e:
            logger.error("Assessment band '%s' failed: %s", level, e)
            continue

        for question in batch["questions"]:
            question = assessment_chain.shuffle_options(question)
            question["difficulty"] = normalize_difficulty(level)
            questions.append(question)
            remaining -= 1

    if not questions:
        raise HTTPException(
            status_code=503,
            detail="The question generator is temporarily unavailable. Please try again.",
        )

    return {
        "title": f"Unit {unit_doc.get('unitNumber', '')}: {unit_doc.get('title', 'Assessment')}".strip(),
        "assessment_type": req.assessment_type,
        "unit_id": req.unit_id,
        "course_id": req.course_id,
        "grounded_in_material": unit_content.get("has_source_material", False),
        "questions": questions,
    }


# -------------------- View Quizzes --------------------
@router.get("/view-quizzes/{student_id}")
def view_quizzes(
    student_id: str,
    course_id: str = Query(None, description="Filter by course ID"),
    limit: int = Query(50, ge=1, le=200),
):
    """Get quizzes served to a student (answer keys are only shown once answered)."""
    try:
        query = {"student_id": student_id}
        if course_id:
            query["course_id"] = course_id

        quizzes = list(
            adaptivequiz_collection.find(query).sort("created_at", -1).limit(limit)
        )

        payload = []
        for q in quizzes:
            questions = (q.get("quiz", {}) or {}).get("questions", []) or []
            answered = bool(q.get("answered"))
            payload.append({
                "_id": str(q["_id"]),
                "course_id": q.get("course_id"),
                "unit_id": q.get("unit_id"),
                "learning_objective_index": q.get("learning_objective_index"),
                "difficulty": q.get("difficulty"),
                "answered": answered,
                "created_at": q["created_at"].isoformat() if q.get("created_at") else None,
                # Unanswered questions must not expose their key.
                "questions": [
                    dict(item) if answered else public_question(item) for item in questions
                ],
            })

        return {"total_quizzes": len(payload), "quizzes": payload}
    except Exception as e:
        logger.exception("view-quizzes failed")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PROGRESS ENDPOINTS ====================

@router.get("/student-progress/{student_id}")
def get_student_progress(
    student_id: str,
    course_id: str = Query(None, description="Filter by specific course ID"),
):
    """Comprehensive progress across all courses or a specific course."""
    parse_object_id(student_id, "student_id")
    if course_id:
        parse_object_id(course_id, "course_id")
    try:
        return {"success": True, "data": get_student_progress_data(student_id, course_id)}
    except Exception as e:
        logger.exception("student-progress failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student-progress/{student_id}/course/{course_id}")
def get_student_course_progress(student_id: str, course_id: str):
    """Detailed progress for a student in one course, broken down by unit and objective."""
    parse_object_id(student_id, "student_id")
    parse_object_id(course_id, "course_id")
    try:
        progress_data = get_student_course_progress_data(student_id, course_id)
    except Exception as e:
        logger.exception("course progress failed")
        raise HTTPException(status_code=500, detail=str(e))

    if not progress_data:
        raise HTTPException(
            status_code=404,
            detail=f"No learning record found for student {student_id} in course {course_id}",
        )
    return {"success": True, "data": progress_data}


@router.get("/student-progress/{student_id}/course/{course_id}/unit/{unit_id}")
def get_student_unit_progress(student_id: str, course_id: str, unit_id: str):
    """Detailed progress for one unit, including per-objective strengths and gaps."""
    parse_object_id(student_id, "student_id")
    parse_object_id(course_id, "course_id")
    parse_object_id(unit_id, "unit_id")
    try:
        unit_progress = get_student_unit_progress_data(student_id, course_id, unit_id)
    except Exception as e:
        logger.exception("unit progress failed")
        raise HTTPException(status_code=500, detail=str(e))

    if not unit_progress:
        raise HTTPException(
            status_code=404,
            detail=f"No learning record found for student {student_id} in unit {unit_id}",
        )
    return {"success": True, "data": unit_progress}


@router.get("/student-progress/{student_id}/course/{course_id}/summary")
def get_student_course_summary(student_id: str, course_id: str):
    """High-level course summary: strengths, gaps, and completion."""
    parse_object_id(student_id, "student_id")
    parse_object_id(course_id, "course_id")
    try:
        progress_data = get_student_course_progress_data(student_id, course_id)
    except Exception as e:
        logger.exception("course summary failed")
        raise HTTPException(status_code=500, detail=str(e))

    if not progress_data:
        raise HTTPException(
            status_code=404,
            detail=f"No learning record found for student {student_id} in course {course_id}",
        )

    units = progress_data.get("units", [])
    total_units = len(units)
    units_started = sum(1 for u in units if u.get("total_attempted", 0) > 0)
    units_completed = sum(1 for u in units if u.get("mastery_status") == "mastered")
    units_proficient = sum(
        1 for u in units if u.get("mastery_status") in ("proficient", "mastered")
    )

    engaged = [u for u in units if u.get("total_attempted", 0) > 0]
    strongest = sorted(engaged, key=lambda x: x.get("mastery", 0), reverse=True)[:3]
    weakest = sorted(engaged, key=lambda x: x.get("mastery", 0))[:3]

    def brief(u):
        return {
            "unit_id": u["unit_id"],
            "title": u.get("title", ""),
            "accuracy": u.get("accuracy", 0.0),
            "mastery": u.get("mastery", 0.0),
            "mastery_status": u.get("mastery_status", "not_started"),
            "total_attempted": u.get("total_attempted", 0),
        }

    return {
        "success": True,
        "data": {
            "student_id": student_id,
            "course_id": course_id,
            "overall_mastery": progress_data.get("mastery_score", 0.0),
            "overall_accuracy": progress_data.get("overall_accuracy", 0.0),
            "coverage_score": progress_data.get("coverage_score", 0.0),
            "pace_score": progress_data.get("pace_score", 0.0),
            "difficulty_level": progress_data.get("difficulty_level", "low"),
            "difficulty_distribution": progress_data.get("difficulty_distribution", {}),
            "total_questions_attempted": progress_data.get("total_questions_attempted", 0),
            "total_correct_answers": progress_data.get("total_correct_answers", 0),
            "mastered_objectives": progress_data.get("mastered_objectives", 0),
            "total_objectives": progress_data.get("total_objectives", 0),
            "units_overview": {
                "total_units": total_units,
                "units_started": units_started,
                "units_completed": units_completed,
                "units_proficient": units_proficient,
                "completion_percentage": round(units_completed / total_units * 100, 2)
                if total_units else 0.0,
                "proficiency_percentage": round(units_proficient / total_units * 100, 2)
                if total_units else 0.0,
            },
            "strongest_units": [brief(u) for u in strongest],
            "weakest_units": [brief(u) for u in weakest],
            "current_unit": progress_data.get("current_unit"),
            "recommended_unit": progress_data.get("recommended_unit"),
            "created_at": progress_data.get("created_at"),
            "last_updated": progress_data.get("last_updated"),
        },
    }


@router.get("/progress-summary")
def get_progress_summary(
    student_id: str = Query(None, description="Filter by specific student ID"),
    course_id: str = Query(None, description="Filter by specific course ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum students to return"),
):
    """Progress roll-up for teachers and admins, sorted by mastery."""
    if student_id:
        parse_object_id(student_id, "student_id")
    if course_id:
        parse_object_id(course_id, "course_id")
    try:
        return {"success": True, "data": get_progress_summary_data(student_id, course_id, limit)}
    except Exception as e:
        logger.exception("progress-summary failed")
        raise HTTPException(status_code=500, detail=str(e))
