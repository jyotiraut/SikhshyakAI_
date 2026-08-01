"""
Adaptive learning engine.

Mastery model
-------------
Every learning objective (LO) keeps evidence *per difficulty level* instead of a
single pooled counter. That matters because answering 5 easy questions correctly
is not the same evidence as answering 5 hard ones, and pooling them makes both
the mastery score and the difficulty ladder meaningless.

For an LO:
    acc_d      accuracy over the last RECENT_WINDOW answers at difficulty d
    n_d        number of answers in that window
    weighted   sum(w_d * acc_d * n_d) / sum(w_d * n_d)
    ceiling    the best score reachable given the hardest level the student has
               actually answered correctly at
    mastery    min(weighted, ceiling)

Recency matters: a mistake made early stops counting once it falls out of the
window, so a student is never permanently locked out of mastering an LO.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from config.database import adaptive_learning_collection, units_collection

# ------------------------------------------------------------------ tuning ---

DIFFICULTIES = ("low", "mid", "high")

# How much evidence each difficulty level contributes.
DIFFICULTY_WEIGHT = {"low": 1.0, "mid": 1.6, "high": 2.4}

# The highest mastery reachable while the student has only proven themselves at
# a given level. Perfect scores on easy questions cannot signal full mastery.
DIFFICULTY_CEILING = {"low": 0.65, "mid": 0.85, "high": 1.0}

# Only the most recent answers at a level count toward accuracy.
RECENT_WINDOW = 8

# Thresholds for declaring an LO mastered.
MASTERY_THRESHOLD = 0.80
MIN_ATTEMPTS_FOR_MASTERY = 4
MIN_TOP_LEVEL_ATTEMPTS = 2

# Promotion / demotion on the difficulty ladder.
PROMOTE_MIN_ATTEMPTS = 2
PROMOTE_MIN_ACCURACY = 0.70
DEMOTE_MIN_ATTEMPTS = 3
DEMOTE_MAX_ACCURACY = 0.50

# Typical number of questions needed to master one LO; used for pace.
EXPECTED_ATTEMPTS_PER_LO = 6

# How much the knowledge-tracing model is allowed to move a blended metric at
# full confidence. The rule engine keeps the majority weight because it reasons
# per objective, while SAKT only sees the unit-level sequence.
SAKT_MAX_WEIGHT = 0.45


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_difficulty(value: Any) -> str:
    """Map anything an LLM or an old document might contain onto low/mid/high."""
    text = str(value or "").strip().lower()
    if text in DIFFICULTIES:
        return text
    aliases = {
        "easy": "low", "beginner": "low", "basic": "low", "simple": "low", "1": "low",
        "medium": "mid", "moderate": "mid", "intermediate": "mid", "2": "mid",
        "hard": "high", "difficult": "high", "advanced": "high", "3": "high",
    }
    return aliases.get(text, "low")


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict (ObjectId -> str)"""
    if not doc:
        return None
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else i for i in v]
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        else:
            result[k] = v
    return result


# ------------------------------------------------------- per-difficulty data --

def empty_by_difficulty() -> Dict[str, Dict[str, Any]]:
    return {d: {"attempted": 0, "correct": 0, "recent": []} for d in DIFFICULTIES}


def read_by_difficulty(stat: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Read the per-difficulty block off a quizStat, reconstructing it for legacy
    documents that only ever stored pooled counters.
    """
    raw = stat.get("byDifficulty")
    buckets = empty_by_difficulty()

    if isinstance(raw, dict) and any(
        isinstance(raw.get(d), dict) and raw[d].get("attempted") for d in DIFFICULTIES
    ):
        for d in DIFFICULTIES:
            entry = raw.get(d) or {}
            attempted = int(entry.get("attempted", 0) or 0)
            correct = int(entry.get("correct", 0) or 0)
            recent = [1 if x else 0 for x in (entry.get("recent") or [])][-RECENT_WINDOW:]
            buckets[d] = {
                "attempted": max(0, attempted),
                "correct": max(0, min(correct, max(attempted, 0))),
                "recent": recent,
            }
        return buckets

    # Legacy shape: everything pooled under the LO's last-seen difficulty.
    legacy_difficulty = normalize_difficulty(stat.get("difficulty", "low"))
    attempted = int(stat.get("attemptedQuestions", 0) or 0)
    correct = int(stat.get("correctAnswers", 0) or 0)
    correct = max(0, min(correct, attempted))
    if attempted:
        recent = ([1] * correct + [0] * (attempted - correct))[-RECENT_WINDOW:]
        buckets[legacy_difficulty] = {
            "attempted": attempted,
            "correct": correct,
            "recent": recent,
        }
    return buckets


def level_accuracy(bucket: Dict[str, Any]) -> tuple:
    """Return (accuracy, sample_size) for one difficulty, preferring recent answers."""
    recent = bucket.get("recent") or []
    if recent:
        return sum(recent) / len(recent), len(recent)
    attempted = int(bucket.get("attempted", 0) or 0)
    if attempted <= 0:
        return 0.0, 0
    return int(bucket.get("correct", 0) or 0) / attempted, attempted


def compute_lo_mastery(by_difficulty: Dict[str, Dict[str, Any]]) -> float:
    """Mastery in 0..1 for a single learning objective."""
    numerator = 0.0
    denominator = 0.0
    ceiling = 0.0
    any_attempt = False

    for d in DIFFICULTIES:
        bucket = by_difficulty.get(d) or {}
        accuracy, n = level_accuracy(bucket)
        if n <= 0:
            continue
        any_attempt = True
        weight = DIFFICULTY_WEIGHT[d]
        numerator += weight * accuracy * n
        denominator += weight * n
        if int(bucket.get("correct", 0) or 0) > 0:
            ceiling = max(ceiling, DIFFICULTY_CEILING[d])

    if not any_attempt or denominator <= 0:
        return 0.0

    # Attempted but never answered correctly anywhere: allow a small non-zero
    # signal so partial credit still moves, but keep it clearly "struggling".
    if ceiling <= 0:
        ceiling = 0.5

    return round(min(numerator / denominator, ceiling), 4)


def highest_level_attempted(by_difficulty: Dict[str, Dict[str, Any]]) -> str:
    top = "low"
    for d in DIFFICULTIES:
        if int((by_difficulty.get(d) or {}).get("attempted", 0) or 0) > 0:
            top = d
    return top


def lo_is_mastered(by_difficulty: Dict[str, Dict[str, Any]], mastery: float) -> bool:
    """
    An LO counts as mastered when the score clears the bar AND there is enough
    evidence at a hard enough level to trust it.
    """
    total_attempts = sum(
        int((by_difficulty.get(d) or {}).get("attempted", 0) or 0) for d in DIFFICULTIES
    )
    if total_attempts < MIN_ATTEMPTS_FOR_MASTERY or mastery < MASTERY_THRESHOLD:
        return False

    top = highest_level_attempted(by_difficulty)
    top_attempts = int((by_difficulty.get(top) or {}).get("attempted", 0) or 0)
    return top == "high" and top_attempts >= MIN_TOP_LEVEL_ATTEMPTS


def get_mastery_status(correct: int, attempted: int) -> str:
    """Coarse label based on raw accuracy (kept for reporting/back-compat)."""
    if attempted == 0:
        return "not_started"
    accuracy = (correct / attempted) * 100
    if accuracy >= 90:
        return "mastered"
    if accuracy >= 70:
        return "proficient"
    if accuracy >= 50:
        return "developing"
    return "needs_improvement"


def mastery_status_from_score(mastery: float, attempted: int) -> str:
    if attempted == 0:
        return "not_started"
    if mastery >= MASTERY_THRESHOLD:
        return "mastered"
    if mastery >= 0.6:
        return "proficient"
    if mastery >= 0.4:
        return "developing"
    return "needs_improvement"


def calculate_weighted_mastery(correct: int, attempted: int, difficulty: str) -> float:
    """
    Legacy helper kept for compatibility with older call sites: mastery for an LO
    whose evidence sits entirely at one difficulty level.
    """
    if attempted <= 0:
        return 0.0
    d = normalize_difficulty(difficulty)
    correct = max(0, min(correct, attempted))
    recent = ([1] * correct + [0] * (attempted - correct))[-RECENT_WINDOW:]
    return compute_lo_mastery({**empty_by_difficulty(), d: {
        "attempted": attempted, "correct": correct, "recent": recent
    }})


def blend_with_sakt(rule_value: float, sakt_value: Optional[float], confidence: float) -> float:
    """
    Combine a rule-derived metric with the model's estimate.

    The model's share is capped and scaled by confidence, so a student with four
    answers barely shifts the number while one with a long history shifts it a
    lot. The rule value is always the anchor.
    """
    if sakt_value is None:
        return rule_value
    weight = SAKT_MAX_WEIGHT * max(0.0, min(confidence, 1.0))
    return round(rule_value * (1 - weight) + float(sakt_value) * weight, 4)


def apply_sakt_difficulty(
    rule_difficulty: str,
    current_difficulty: str,
    sakt: Optional[Dict[str, Any]],
    level_attempts: int,
) -> tuple:
    """
    Let the model nudge the next difficulty, within the rules' safety rails.

    Selecting difficulty is the one thing this checkpoint is genuinely built for,
    so its opinion counts — but it may only move one step from what the rules
    chose, may never promote a student who has not yet answered at the current
    level, and may never skip a rung. Returns (difficulty, note).
    """
    if not sakt or sakt.get("confidence", 0) < 0.5:
        return rule_difficulty, None

    ladder = list(DIFFICULTIES)
    suggested = normalize_difficulty(sakt.get("difficulty"))
    rule_position = ladder.index(rule_difficulty)
    suggested_position = ladder.index(suggested)

    if suggested_position == rule_position:
        return rule_difficulty, None

    # One step from the rules' choice, never further.
    step = 1 if suggested_position > rule_position else -1
    target_position = rule_position + step

    # Promotion still needs evidence at the level the student is on.
    if step > 0 and level_attempts < PROMOTE_MIN_ATTEMPTS:
        return rule_difficulty, None

    # Never jump more than one rung above where the student currently is.
    current_position = ladder.index(normalize_difficulty(current_difficulty))
    target_position = max(0, min(target_position, current_position + 1, len(ladder) - 1))
    if target_position == rule_position:
        return rule_difficulty, None

    target = ladder[target_position]
    direction = "raised" if step > 0 else "eased"
    note = (
        f"Knowledge tracing {direction} the difficulty to {target} "
        f"(confidence {sakt['confidence']:.0%})"
    )
    return target, note


def apply_ability_difficulty(
    rule_difficulty: str,
    current_difficulty: str,
    recommendation: Optional[Dict[str, Any]],
    level_attempts: int,
) -> tuple:
    """
    Let the online ability model nudge the difficulty, inside the same rails
    the rules enforce.

    Unlike the neural model this needs no training data and is meaningful from a
    student's first few answers, so it is the primary adaptive signal until a
    knowledge-tracing model has earned promotion. Returns (difficulty, note).
    """
    if not recommendation or recommendation.get("confidence", 0) < 0.5:
        return rule_difficulty, None

    ladder = list(DIFFICULTIES)
    suggested = normalize_difficulty(recommendation.get("difficulty"))
    rule_position = ladder.index(rule_difficulty)
    suggested_position = ladder.index(suggested)
    if suggested_position == rule_position:
        return rule_difficulty, None

    step = 1 if suggested_position > rule_position else -1
    if step > 0 and level_attempts < PROMOTE_MIN_ATTEMPTS:
        return rule_difficulty, None

    current_position = ladder.index(normalize_difficulty(current_difficulty))
    target_position = max(
        0, min(rule_position + step, current_position + 1, len(ladder) - 1)
    )
    if target_position == rule_position:
        return rule_difficulty, None

    target = ladder[target_position]
    success = recommendation.get("predicted_success", 0.0)
    note = (
        f"Ability estimate puts you at {success:.0%} on {target} questions, "
        f"which is about the right stretch"
    )
    return target, note


def learning_action_for(mastery: float, attempted: int) -> str:
    """Mastery here is on the 0..1 scale the rest of the engine uses."""
    if attempted == 0:
        return "BEGIN"
    if mastery < 0.40:
        return "REVIEW"
    if mastery < 0.65:
        return "PRACTICE"
    if mastery < MASTERY_THRESHOLD:
        return "ADVANCE"
    return "MASTER"


# ------------------------------------------------------------ initialisation --

def build_quiz_stat(unit_id: ObjectId, lo_index: int) -> Dict[str, Any]:
    return {
        "unit": unit_id,
        "learningObjectiveIndex": lo_index,
        "attemptedQuestions": 0,
        "correctAnswers": 0,
        "difficulty": "low",
        "masteryScore": 0.0,
        "byDifficulty": empty_by_difficulty(),
    }


def initialize_adaptive_learning(student_id: str, course_id: str):
    """Initialize (or top up) the adaptive learning document for a student."""
    query = {"student": ObjectId(student_id), "course": ObjectId(course_id)}
    existing = adaptive_learning_collection.find_one(query)

    units = list(units_collection.find({"course": ObjectId(course_id)}).sort("unitNumber", 1))
    if not units:
        raise ValueError("No units found for this course")

    if existing:
        # Teachers add units and objectives after students have started; make
        # sure every current LO has a slot instead of silently dropping answers.
        sync_quiz_stats(existing, units)
        return serialize_doc(adaptive_learning_collection.find_one(query))

    doc = {
        "student": ObjectId(student_id),
        "course": ObjectId(course_id),
        "currentUnit": units[0]["_id"],
        "recommendedUnit": units[0]["_id"],
        "currentLearningObjectiveIndex": 0,
        "masteryScore": 0.0,
        "coverageScore": 0.0,
        "paceScore": 0.0,
        "difficultyLevel": "low",
        "difficultyDistribution": {"low": 100, "mid": 0, "high": 0},
        "quizStats": [],
        "createdAt": utcnow(),
        "updatedAt": utcnow(),
    }

    for unit in units:
        for idx, _ in enumerate(unit.get("learningObjectives", []) or []):
            doc["quizStats"].append(build_quiz_stat(unit["_id"], idx))

    result = adaptive_learning_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


def sync_quiz_stats(record: Dict[str, Any], units: Optional[List[Dict]] = None) -> None:
    """Add quizStats entries for LOs that appeared after the record was created."""
    if units is None:
        units = list(units_collection.find({"course": record["course"]}).sort("unitNumber", 1))

    have = {
        (str(s.get("unit")), int(s.get("learningObjectiveIndex", 0)))
        for s in record.get("quizStats", [])
    }
    missing = [
        build_quiz_stat(unit["_id"], idx)
        for unit in units
        for idx, _ in enumerate(unit.get("learningObjectives", []) or [])
        if (str(unit["_id"]), idx) not in have
    ]

    if missing:
        adaptive_learning_collection.update_one(
            {"_id": record["_id"]},
            {"$push": {"quizStats": {"$each": missing}}, "$set": {"updatedAt": utcnow()}},
        )
        record.setdefault("quizStats", []).extend(missing)


def ensure_quiz_stat(student_id: str, course_id: str, unit_id: str, lo_index: int) -> Dict[str, Any]:
    """
    Guarantee the (unit, lo_index) slot exists, creating the whole record if the
    student never initialised. Returns the adaptive learning document.
    """
    query = {"student": ObjectId(student_id), "course": ObjectId(course_id)}
    record = adaptive_learning_collection.find_one(query)

    if not record:
        initialize_adaptive_learning(student_id, course_id)
        record = adaptive_learning_collection.find_one(query)

    exists = any(
        str(s.get("unit")) == str(unit_id) and int(s.get("learningObjectiveIndex", 0)) == lo_index
        for s in record.get("quizStats", [])
    )
    if not exists:
        stat = build_quiz_stat(ObjectId(unit_id), lo_index)
        adaptive_learning_collection.update_one(
            {"_id": record["_id"]},
            {"$push": {"quizStats": stat}, "$set": {"updatedAt": utcnow()}},
        )
        record.setdefault("quizStats", []).append(stat)

    return record


# ------------------------------------------------------------- recalculation --

def summarize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Recompute every derived metric from the raw quizStats."""
    quiz_stats = record.get("quizStats", []) or []

    lo_masteries: List[float] = []
    attempted_lo_masteries: List[float] = []
    partial_progress = 0.0
    mastered_los = 0
    question_counts = {d: 0 for d in DIFFICULTIES}
    total_attempts = 0
    per_stat: Dict[tuple, Dict[str, Any]] = {}

    for stat in quiz_stats:
        buckets = read_by_difficulty(stat)
        mastery = compute_lo_mastery(buckets)
        attempted = sum(int((buckets[d]).get("attempted", 0) or 0) for d in DIFFICULTIES)
        correct = sum(int((buckets[d]).get("correct", 0) or 0) for d in DIFFICULTIES)

        for d in DIFFICULTIES:
            question_counts[d] += int(buckets[d].get("attempted", 0) or 0)
        total_attempts += attempted

        lo_masteries.append(mastery)
        if attempted > 0:
            attempted_lo_masteries.append(mastery)
            if lo_is_mastered(buckets, mastery):
                mastered_los += 1
            else:
                # Credit partial progress toward pace. Scoring an LO at 0.85 but
                # not yet formally mastered should not read as zero progress.
                partial_progress += mastery

        per_stat[(str(stat.get("unit")), int(stat.get("learningObjectiveIndex", 0)))] = {
            "buckets": buckets,
            "mastery": mastery,
            "attempted": attempted,
            "correct": correct,
        }

    # Average over LOs the student has actually touched. Averaging over every LO
    # in the course pins the score near zero no matter how well they do.
    mastery_score = (
        round(sum(attempted_lo_masteries) / len(attempted_lo_masteries), 4)
        if attempted_lo_masteries else 0.0
    )
    coverage_score = (
        round(len(attempted_lo_masteries) / len(lo_masteries), 4) if lo_masteries else 0.0
    )

    total_questions = sum(question_counts.values())
    if total_questions > 0:
        distribution = {
            d: round(question_counts[d] / total_questions * 100, 2) for d in DIFFICULTIES
        }
    else:
        distribution = {"low": 100.0, "mid": 0.0, "high": 0.0}

    # The level the student is actually working at: the hardest one that makes up
    # a meaningful share of recent questions.
    difficulty_level = "low"
    for d in DIFFICULTIES:
        if distribution[d] >= 25:
            difficulty_level = d

    # Pace: progress achieved per question asked, against an expected budget.
    progress_units = mastered_los + partial_progress
    if total_attempts > 0:
        pace_score = round(
            min(progress_units * EXPECTED_ATTEMPTS_PER_LO / total_attempts, 1.0), 4
        )
    else:
        pace_score = 0.0

    return {
        "masteryScore": mastery_score,
        "coverageScore": coverage_score,
        "paceScore": pace_score,
        "difficultyLevel": difficulty_level,
        "difficultyDistribution": distribution,
        "masteredObjectives": mastered_los,
        "totalObjectives": len(lo_masteries),
        "totalAttempts": total_attempts,
        "questionCounts": question_counts,
        "perStat": per_stat,
    }


def persist_summary(record_id: ObjectId, summary: Dict[str, Any], extra: Optional[Dict] = None) -> None:
    updates = {
        "masteryScore": summary["masteryScore"],
        "coverageScore": summary["coverageScore"],
        "paceScore": summary["paceScore"],
        "difficultyLevel": summary["difficultyLevel"],
        "difficultyDistribution": summary["difficultyDistribution"],
        "masteredObjectives": summary["masteredObjectives"],
        "updatedAt": utcnow(),
    }
    if extra:
        updates.update(extra)
    adaptive_learning_collection.update_one({"_id": record_id}, {"$set": updates})


def _recalculate_overall_metrics(base_query: dict):
    record = adaptive_learning_collection.find_one(base_query)
    if not record:
        return
    persist_summary(record["_id"], summarize_record(record))


def update_adaptive_learning(student_id: str, course_id: str, updates: list):
    """Bulk update after a batch quiz submission (legacy entry point)."""
    for upd in updates:
        unit_id = upd["unit"]
        lo_index = int(upd["learningObjectiveIndex"])
        difficulty = normalize_difficulty(upd.get("difficulty", "low"))
        attempted = int(upd.get("attempted", 0))
        correct = int(upd.get("correct", 0))

        ensure_quiz_stat(student_id, course_id, str(unit_id), lo_index)
        for i in range(attempted):
            record_answer(
                student_id, course_id, str(unit_id), lo_index,
                is_correct=i < correct, difficulty=difficulty, recalculate=False,
            )

    _recalculate_overall_metrics(
        {"student": ObjectId(student_id), "course": ObjectId(course_id)}
    )


def _find_stat_index(record: Dict[str, Any], unit_id: str, lo_index: int) -> int:
    for i, stat in enumerate(record.get("quizStats", []) or []):
        if (
            str(stat.get("unit", "")) == str(unit_id)
            and int(stat.get("learningObjectiveIndex", 0)) == lo_index
        ):
            return i
    return -1


def record_answer(
    student_id: str,
    course_id: str,
    unit_id: str,
    lo_index: int,
    is_correct: bool,
    difficulty: str,
    recalculate: bool = True,
) -> Dict[str, Any]:
    """
    Write one answer into the per-difficulty evidence for an LO.

    The element is rebuilt in Python and written back by array index rather than
    with the positional `$` operator: deep dotted paths under `quizStats.$`
    (`quizStats.$.byDifficulty.mid.attempted`) are not portable, and silently
    landed the counters at the wrong nesting level.

    The write is a compare-and-set on the element's attempt count, so two answers
    arriving at once cannot clobber each other.
    """
    difficulty = normalize_difficulty(difficulty)
    record = ensure_quiz_stat(student_id, course_id, unit_id, lo_index)

    for _ in range(3):
        index = _find_stat_index(record, unit_id, lo_index)
        if index < 0:
            record = ensure_quiz_stat(student_id, course_id, unit_id, lo_index)
            index = _find_stat_index(record, unit_id, lo_index)
            if index < 0:
                break

        stat = record["quizStats"][index]
        previous_attempts = int(stat.get("attemptedQuestions", 0) or 0)

        buckets = read_by_difficulty(stat)
        bucket = buckets[difficulty]
        bucket["attempted"] = int(bucket.get("attempted", 0) or 0) + 1
        bucket["correct"] = int(bucket.get("correct", 0) or 0) + (1 if is_correct else 0)
        bucket["recent"] = (list(bucket.get("recent") or []) + [1 if is_correct else 0])[
            -RECENT_WINDOW:
        ]

        updated = {
            "unit": stat.get("unit", ObjectId(unit_id)),
            "learningObjectiveIndex": lo_index,
            "attemptedQuestions": previous_attempts + 1,
            "correctAnswers": int(stat.get("correctAnswers", 0) or 0) + (1 if is_correct else 0),
            "difficulty": difficulty,
            "masteryScore": compute_lo_mastery(buckets),
            "byDifficulty": buckets,
            "lastAnsweredAt": utcnow(),
        }

        result = adaptive_learning_collection.update_one(
            {
                "_id": record["_id"],
                f"quizStats.{index}.learningObjectiveIndex": lo_index,
                f"quizStats.{index}.attemptedQuestions": previous_attempts,
            },
            {"$set": {f"quizStats.{index}": updated, "updatedAt": utcnow()}},
        )
        if result.matched_count:
            break

        # Someone else wrote first; re-read and retry.
        record = adaptive_learning_collection.find_one({"_id": record["_id"]})

    if not recalculate:
        return {}

    record = adaptive_learning_collection.find_one({"_id": record["_id"]})
    summary = summarize_record(record)
    persist_summary(record["_id"], summary)
    entry = summary["perStat"].get((str(unit_id), lo_index))
    return {"record": record, "summary": summary, "entry": entry}


def update_adaptive_learning_with_recalculation(
    student_id: str,
    course_id: str,
    unit_id: str,
    lo_index: int,
    is_correct: bool,
    difficulty: str,
    sakt: Optional[Dict[str, Any]] = None,
):
    """
    Record one answer and return the refreshed stats. `lo_stats` is always a
    dict - callers used to crash when the LO slot was missing.

    A SAKT prediction, when supplied, is blended into the course-level mastery
    and pace figures. Per-objective numbers stay purely evidence-based, since the
    checkpoint's skill space is unit-level.
    """
    outcome = record_answer(student_id, course_id, unit_id, lo_index, is_correct, difficulty)
    summary = outcome["summary"]
    entry = outcome["entry"] or {
        "buckets": empty_by_difficulty(), "mastery": 0.0, "attempted": 0, "correct": 0
    }

    buckets = entry["buckets"]
    attempted = entry["attempted"]
    correct = entry["correct"]

    lo_stats = {
        "attempted": attempted,
        "correct": correct,
        "accuracy": round(correct / attempted, 4) if attempted else 0.0,
        "mastery": entry["mastery"],
        "difficulty": normalize_difficulty(difficulty),
        "by_difficulty": {
            d: {
                "attempted": int(buckets[d].get("attempted", 0) or 0),
                "correct": int(buckets[d].get("correct", 0) or 0),
                "recent_accuracy": round(level_accuracy(buckets[d])[0], 4),
            }
            for d in DIFFICULTIES
        },
        "is_mastered": lo_is_mastered(buckets, entry["mastery"]),
    }

    confidence = float(sakt.get("confidence", 0.0)) if sakt else 0.0
    blended_mastery = blend_with_sakt(
        summary["masteryScore"], sakt.get("mastery") if sakt else None, confidence
    )
    blended_pace = blend_with_sakt(
        summary["paceScore"], sakt.get("pace") if sakt else None, confidence
    )

    # Persist the blended course-level view so dashboards and the predictor agree
    # with what the student was just told.
    if sakt and confidence > 0:
        persist_summary(
            outcome["record"]["_id"],
            summary,
            extra={"masteryScore": blended_mastery, "paceScore": blended_pace},
        )

    return {
        "lo_stats": lo_stats,
        "lo_mastery": entry["mastery"],
        "lo_accuracy": lo_stats["accuracy"],
        "lo_attempts": attempted,
        "lo_correct": correct,
        "mastery_score": blended_mastery,
        "evidence_mastery_score": summary["masteryScore"],
        "coverage_score": summary["coverageScore"],
        "pace_score": blended_pace,
        "difficulty_level": summary["difficultyLevel"],
        "difficulty_distribution": summary["difficultyDistribution"],
        "mastered_objectives": summary["masteredObjectives"],
        "total_objectives": summary["totalObjectives"],
        "knowledge_tracing": {
            "active": True,
            "mastery": round(sakt["mastery"], 4),
            "pace": round(sakt["pace"], 4),
            "difficulty": sakt["difficulty"],
            "confidence": sakt["confidence"],
            "sequence_length": sakt["sequence_length"],
        } if sakt else {"active": False},
    }


# ------------------------------------------------------------- next question --

def get_next_question_parameters(
    student_id: str,
    course_id: str,
    current_unit_id: str,
    current_lo_index: int,
    current_difficulty: str,
    is_correct: bool,
    lo_stats: dict,
    sakt: Optional[Dict[str, Any]] = None,
    ability: Optional[Dict[str, Any]] = None,
    behaviour: Optional[Dict[str, Any]] = None,
):
    """
    Pick the next (unit, learning objective, difficulty).

    Promotion and demotion look at performance *at the current difficulty only*,
    so a student cannot ride two easy correct answers all the way to the hardest
    level, and a single stumble does not undo a level they have proven.

    When a SAKT prediction is supplied it adjusts the difficulty within those
    rails (see `apply_sakt_difficulty`). Objective and unit progression stay
    rule-driven: the checkpoint's skill space is unit-level, so it cannot judge
    whether a specific learning objective is finished.
    """
    lo_stats = lo_stats or {}
    current_difficulty = normalize_difficulty(current_difficulty)
    by_difficulty = lo_stats.get("by_difficulty") or {}
    level = by_difficulty.get(current_difficulty) or {}
    level_attempts = int(level.get("attempted", 0) or 0)
    level_accuracy_value = float(level.get("recent_accuracy", 0.0) or 0.0)

    mastery = float(lo_stats.get("mastery", 0.0) or 0.0)
    accuracy = float(lo_stats.get("accuracy", 0.0) or 0.0)
    is_mastered = bool(lo_stats.get("is_mastered"))

    unit_doc = units_collection.find_one({"_id": ObjectId(current_unit_id)})
    objectives = (unit_doc.get("learningObjectives", []) or []) if unit_doc else []
    total_los = max(len(objectives), 1)

    next_unit_id = current_unit_id
    next_lo_index = current_lo_index
    next_difficulty = current_difficulty
    ladder = list(DIFFICULTIES)
    position = ladder.index(current_difficulty)

    if is_mastered:
        next_lo_index = current_lo_index + 1
        if next_lo_index >= total_los:
            next_unit = get_next_unit(course_id, current_unit_id)
            if next_unit:
                next_unit_id = str(next_unit["_id"])
                next_lo_index = 0
                next_difficulty = "low"
                reason = "Unit complete - starting the next unit"
                learning_action = "BEGIN"
            else:
                next_lo_index = current_lo_index
                next_difficulty = "high"
                reason = "Course complete - excellent work!"
                learning_action = "MASTER"
        else:
            next_difficulty = "low"
            reason = "Objective mastered - moving to the next one"
            learning_action = "BEGIN"

    elif is_correct:
        can_promote = (
            position < len(ladder) - 1
            and level_attempts >= PROMOTE_MIN_ATTEMPTS
            and level_accuracy_value >= PROMOTE_MIN_ACCURACY
        )
        if can_promote:
            next_difficulty = ladder[position + 1]
            reason = f"Strong at {current_difficulty} level - stepping up to {next_difficulty}"
            learning_action = "ADVANCE"
        elif current_difficulty == "high":
            reason = "Keep going - a couple more at this level to lock it in"
            learning_action = "MASTER" if mastery >= 0.7 else "PRACTICE"
        else:
            reason = "Nice - one more at this level before stepping up"
            learning_action = "PRACTICE"

    else:
        should_demote = (
            position > 0
            and level_attempts >= DEMOTE_MIN_ATTEMPTS
            and level_accuracy_value < DEMOTE_MAX_ACCURACY
        )
        if should_demote:
            next_difficulty = ladder[position - 1]
            reason = f"Let's rebuild at {next_difficulty} level before trying again"
            learning_action = "REVIEW"
        elif current_difficulty == "low" and level_attempts >= DEMOTE_MIN_ATTEMPTS and level_accuracy_value < DEMOTE_MAX_ACCURACY:
            reason = "Let's reinforce the fundamentals of this objective"
            learning_action = "REINFORCE"
        else:
            reason = "Not quite - try another one at this level"
            learning_action = "PRACTICE"

    # Adaptive signals get a say on difficulty, bounded by the rules above.
    # They are deliberately not consulted right after an objective or unit
    # change, where the rules reset to "low" to re-establish a baseline.
    #
    # Order matters: the online ability model is the default adaptive signal
    # because it works from the first answers with no training. A knowledge
    # tracing model only overrides it once it has been promoted, which requires
    # beating this baseline on held-out data.
    adaptive_note = None
    difficulty_source = "rules"
    objective_changed = next_lo_index != current_lo_index or next_unit_id != current_unit_id

    if not objective_changed:
        next_difficulty, adaptive_note = apply_ability_difficulty(
            next_difficulty, current_difficulty, ability, level_attempts
        )
        if adaptive_note:
            difficulty_source = "ability_model"

        if sakt:
            next_difficulty, sakt_note = apply_sakt_difficulty(
                next_difficulty, current_difficulty, sakt, level_attempts
            )
            if sakt_note:
                adaptive_note = sakt_note
                difficulty_source = "knowledge_tracing"

        if adaptive_note:
            reason = f"{reason}. {adaptive_note}"

    # Behaviour overrides correctness when the problem is not difficulty.
    # Pushing harder questions at someone who is clicking through at random
    # makes the data worse and the student more frustrated.
    if behaviour and behaviour.get("available"):
        if behaviour.get("likely_disengaged") and next_difficulty != "low":
            next_difficulty = "low"
            learning_action = "REINFORCE"
            reason = "Let's slow down and rebuild with something more approachable"
            difficulty_source = "behaviour"
        elif behaviour.get("returning_after_break") and not objective_changed:
            ladder = list(DIFFICULTIES)
            eased = ladder[max(0, ladder.index(next_difficulty) - 1)]
            if eased != next_difficulty:
                next_difficulty = eased
                reason = "Welcome back - easing in with a refresher before ramping up"
                learning_action = "REVIEW"
                difficulty_source = "behaviour"

    # Focus on the objective the next question actually targets.
    if next_unit_id != current_unit_id:
        target_unit = units_collection.find_one({"_id": ObjectId(next_unit_id)})
        objectives = (target_unit.get("learningObjectives", []) or []) if target_unit else []

    next_lo_index = max(0, min(next_lo_index, max(len(objectives) - 1, 0)))
    focus_areas = [objectives[next_lo_index]] if next_lo_index < len(objectives) else []

    # Remember where the student is so the next session resumes here.
    adaptive_learning_collection.update_one(
        {"student": ObjectId(student_id), "course": ObjectId(course_id)},
        {
            "$set": {
                "currentUnit": ObjectId(next_unit_id),
                "recommendedUnit": ObjectId(next_unit_id),
                "currentLearningObjectiveIndex": next_lo_index,
                "updatedAt": utcnow(),
            }
        },
    )

    return {
        "unit_id": next_unit_id,
        "lo_index": next_lo_index,
        "difficulty": next_difficulty,
        "reason": reason,
        "learning_action": learning_action,
        "focus_areas": focus_areas,
        "current_mastery": round(mastery, 4),
        "current_accuracy": round(accuracy, 4),
        # Which system chose the difficulty, so the behaviour is auditable.
        "difficulty_source": difficulty_source,
        "ability": ability,
        "behaviour": behaviour,
        "sakt": {
            "mastery": round(sakt["mastery"], 4),
            "difficulty": sakt["difficulty"],
            "pace": round(sakt["pace"], 4),
            "confidence": sakt["confidence"],
            "sequence_length": sakt["sequence_length"],
        } if sakt else None,
    }


def get_next_unit(course_id: str, current_unit_id: str):
    """Next unit by unit number, tolerating gaps in the numbering."""
    current_unit = units_collection.find_one({"_id": ObjectId(current_unit_id)})
    if not current_unit:
        return None

    return units_collection.find_one(
        {
            "course": ObjectId(course_id),
            "unitNumber": {"$gt": current_unit.get("unitNumber", 0)},
        },
        sort=[("unitNumber", 1)],
    )


# ----------------------------------------------------------------- reporting --

def _unit_titles(unit_ids) -> Dict[str, Dict[str, Any]]:
    ids = [ObjectId(u) for u in unit_ids if u]
    if not ids:
        return {}
    return {
        str(u["_id"]): {"title": u.get("title", ""), "unit_number": u.get("unitNumber")}
        for u in units_collection.find({"_id": {"$in": ids}}, {"title": 1, "unitNumber": 1})
    }


def _build_course_progress(record: Dict[str, Any]) -> Dict[str, Any]:
    summary = summarize_record(record)
    current_unit = str(record.get("currentUnit", ""))
    recommended_unit = str(record.get("recommendedUnit", ""))

    unit_stats: Dict[str, Dict[str, Any]] = {}
    total_attempted = 0
    total_correct = 0

    for stat in record.get("quizStats", []) or []:
        unit_id = str(stat.get("unit", ""))
        lo_index = int(stat.get("learningObjectiveIndex", 0))
        entry = summary["perStat"].get((unit_id, lo_index))
        if not entry:
            continue

        attempted = entry["attempted"]
        correct = entry["correct"]
        total_attempted += attempted
        total_correct += correct

        bucket = unit_stats.setdefault(unit_id, {
            "unit_id": unit_id,
            "is_current_unit": unit_id == current_unit,
            "is_recommended_unit": unit_id == recommended_unit,
            "total_attempted": 0,
            "total_correct": 0,
            "accuracy": 0.0,
            "mastery": 0.0,
            "learning_objectives": [],
        })
        bucket["total_attempted"] += attempted
        bucket["total_correct"] += correct
        bucket["learning_objectives"].append({
            "learningObjectiveIndex": lo_index,
            "attempted": attempted,
            "correct": correct,
            "accuracy": round(correct / attempted, 4) if attempted else 0.0,
            "mastery": entry["mastery"],
            "difficulty": highest_level_attempted(entry["buckets"]),
            "mastery_status": mastery_status_from_score(entry["mastery"], attempted),
            "is_mastered": lo_is_mastered(entry["buckets"], entry["mastery"]),
        })

    titles = _unit_titles(unit_stats.keys())
    for unit_id, bucket in unit_stats.items():
        bucket["learning_objectives"].sort(key=lambda x: x["learningObjectiveIndex"])
        attempted_los = [lo for lo in bucket["learning_objectives"] if lo["attempted"] > 0]
        bucket["accuracy"] = (
            round(bucket["total_correct"] / bucket["total_attempted"], 4)
            if bucket["total_attempted"] else 0.0
        )
        bucket["mastery"] = (
            round(sum(lo["mastery"] for lo in attempted_los) / len(attempted_los), 4)
            if attempted_los else 0.0
        )
        bucket["mastery_status"] = mastery_status_from_score(
            bucket["mastery"], bucket["total_attempted"]
        )
        bucket.update(titles.get(unit_id, {}))

    created_at = record.get("createdAt")
    updated_at = record.get("updatedAt")

    return {
        "course_id": str(record.get("course", "")),
        "current_unit": current_unit,
        "recommended_unit": recommended_unit,
        "current_learning_objective_index": record.get("currentLearningObjectiveIndex", 0),
        "mastery_score": summary["masteryScore"],
        "coverage_score": summary["coverageScore"],
        "pace_score": summary["paceScore"],
        "difficulty_level": summary["difficultyLevel"],
        "difficulty_distribution": summary["difficultyDistribution"],
        "mastered_objectives": summary["masteredObjectives"],
        "total_objectives": summary["totalObjectives"],
        "total_attempted": total_attempted,
        "total_correct": total_correct,
        "total_questions_attempted": total_attempted,
        "total_correct_answers": total_correct,
        "accuracy": round(total_correct / total_attempted, 4) if total_attempted else 0.0,
        "overall_accuracy": round(total_correct / total_attempted, 4) if total_attempted else 0.0,
        "units": sorted(
            unit_stats.values(),
            key=lambda u: (u.get("unit_number") is None, u.get("unit_number", 0)),
        ),
        "created_at": created_at.isoformat() if created_at else None,
        "last_updated": updated_at.isoformat() if updated_at else None,
    }


def get_student_progress_data(student_id: str, course_id: str = None):
    """Progress across all courses (or one), with per-course breakdown."""
    query = {"student": ObjectId(student_id)}
    if course_id:
        query["course"] = ObjectId(course_id)

    records = list(adaptive_learning_collection.find(query))
    if not records:
        return {
            "student_id": student_id,
            "course_id": course_id,
            "total_questions_attempted": 0,
            "total_correct_answers": 0,
            "overall_accuracy": 0.0,
            "mastery_score": 0.0,
            "coverage_score": 0.0,
            "pace_score": 0.0,
            "difficulty_level": "low",
            "difficulty_distribution": {"low": 100, "mid": 0, "high": 0},
            "total_courses": 0,
            "progress_by_course": [],
            "message": "No learning records found for this student",
        }

    progress_by_course = [_build_course_progress(record) for record in records]

    total_attempted = sum(c["total_attempted"] for c in progress_by_course)
    total_correct = sum(c["total_correct"] for c in progress_by_course)

    # Weight each course by how many questions the student actually answered so
    # a barely-touched course cannot drag the headline number around.
    engaged = [c for c in progress_by_course if c["total_attempted"] > 0]
    if engaged and total_attempted:
        mastery_score = round(
            sum(c["mastery_score"] * c["total_attempted"] for c in engaged) / total_attempted, 4
        )
        pace_score = round(
            sum(c["pace_score"] * c["total_attempted"] for c in engaged) / total_attempted, 4
        )
        coverage_score = round(sum(c["coverage_score"] for c in engaged) / len(engaged), 4)
    else:
        mastery_score = pace_score = coverage_score = 0.0

    counts = {d: 0.0 for d in DIFFICULTIES}
    for c in engaged:
        for d in DIFFICULTIES:
            counts[d] += c["difficulty_distribution"].get(d, 0) * c["total_attempted"] / 100.0
    total_counted = sum(counts.values())
    if total_counted > 0:
        distribution = {d: round(counts[d] / total_counted * 100, 2) for d in DIFFICULTIES}
    else:
        distribution = {"low": 100.0, "mid": 0.0, "high": 0.0}

    difficulty_level = "low"
    for d in DIFFICULTIES:
        if distribution[d] >= 25:
            difficulty_level = d

    return {
        "student_id": student_id,
        "course_id": course_id,
        "total_questions_attempted": total_attempted,
        "total_correct_answers": total_correct,
        "overall_accuracy": round(total_correct / total_attempted, 4) if total_attempted else 0.0,
        "mastery_score": mastery_score,
        "coverage_score": coverage_score,
        "pace_score": pace_score,
        "difficulty_level": difficulty_level,
        "difficulty_distribution": distribution,
        "total_courses": len(progress_by_course),
        "progress_by_course": progress_by_course,
    }


def get_student_course_progress_data(student_id: str, course_id: str):
    """Detailed progress for one student in one course."""
    record = adaptive_learning_collection.find_one({
        "student": ObjectId(student_id),
        "course": ObjectId(course_id),
    })
    if not record:
        return None

    progress = _build_course_progress(record)
    progress["student_id"] = student_id
    progress["course_id"] = course_id
    return progress


def get_student_unit_progress_data(student_id: str, course_id: str, unit_id: str):
    """Detailed progress for one unit."""
    record = adaptive_learning_collection.find_one({
        "student": ObjectId(student_id),
        "course": ObjectId(course_id),
    })
    if not record:
        return None

    summary = summarize_record(record)
    current_unit = str(record.get("currentUnit", ""))
    recommended_unit = str(record.get("recommendedUnit", ""))

    unit_doc = units_collection.find_one({"_id": ObjectId(unit_id)})
    objectives = (unit_doc.get("learningObjectives", []) or []) if unit_doc else []
    total_los = len(objectives)

    learning_objectives = []
    total_attempted = 0
    total_correct = 0
    masteries = []

    for stat in record.get("quizStats", []) or []:
        if str(stat.get("unit", "")) != str(unit_id):
            continue
        lo_index = int(stat.get("learningObjectiveIndex", 0))
        entry = summary["perStat"].get((str(unit_id), lo_index))
        if not entry:
            continue

        attempted = entry["attempted"]
        correct = entry["correct"]
        total_attempted += attempted
        total_correct += correct
        if attempted:
            masteries.append(entry["mastery"])

        learning_objectives.append({
            "learningObjectiveIndex": lo_index,
            "title": objectives[lo_index] if lo_index < total_los else "",
            "attempted": attempted,
            "correct": correct,
            "accuracy": round(correct / attempted, 4) if attempted else 0.0,
            "mastery": entry["mastery"],
            "difficulty": highest_level_attempted(entry["buckets"]),
            "mastery_status": mastery_status_from_score(entry["mastery"], attempted),
            "is_mastered": lo_is_mastered(entry["buckets"], entry["mastery"]),
            "progress_percentage": round(entry["mastery"] * 100, 2),
            "by_difficulty": {
                d: {
                    "attempted": int(entry["buckets"][d].get("attempted", 0) or 0),
                    "correct": int(entry["buckets"][d].get("correct", 0) or 0),
                }
                for d in DIFFICULTIES
            },
        })

    learning_objectives.sort(key=lambda x: x["learningObjectiveIndex"])
    total_los = total_los or len(learning_objectives)

    if not learning_objectives:
        return {
            "student_id": student_id,
            "course_id": course_id,
            "unit_id": unit_id,
            "unit_title": unit_doc.get("title", "") if unit_doc else "",
            "is_current_unit": str(unit_id) == current_unit,
            "is_recommended_unit": str(unit_id) == recommended_unit,
            "total_attempted": 0,
            "total_correct": 0,
            "accuracy": 0.0,
            "mastery_score": 0.0,
            "mastery_status": "not_started",
            "completion_percentage": 0.0,
            "mastery_percentage": 0.0,
            "learning_objectives_overview": {
                "total": total_los, "started": 0, "mastered": 0, "in_progress": 0
            },
            "learning_objectives": [],
            "strengths": [],
            "needs_improvement": [],
            "message": "No progress data found for this unit",
        }

    unit_mastery = round(sum(masteries) / len(masteries), 4) if masteries else 0.0
    los_started = sum(1 for lo in learning_objectives if lo["attempted"] > 0)
    los_mastered = sum(1 for lo in learning_objectives if lo["is_mastered"])

    return {
        "student_id": student_id,
        "course_id": course_id,
        "unit_id": unit_id,
        "unit_title": unit_doc.get("title", "") if unit_doc else "",
        "is_current_unit": str(unit_id) == current_unit,
        "is_recommended_unit": str(unit_id) == recommended_unit,
        "total_attempted": total_attempted,
        "total_correct": total_correct,
        "accuracy": round(total_correct / total_attempted, 4) if total_attempted else 0.0,
        "mastery_score": unit_mastery,
        "mastery_status": mastery_status_from_score(unit_mastery, total_attempted),
        "completion_percentage": round(los_started / total_los * 100, 2) if total_los else 0.0,
        "mastery_percentage": round(los_mastered / total_los * 100, 2) if total_los else 0.0,
        "learning_objectives_overview": {
            "total": total_los,
            "started": los_started,
            "mastered": los_mastered,
            "in_progress": los_started - los_mastered,
        },
        "learning_objectives": learning_objectives,
        "strengths": [
            lo for lo in learning_objectives
            if lo["mastery_status"] in ("mastered", "proficient")
        ],
        "needs_improvement": [
            lo for lo in learning_objectives
            if lo["attempted"] > 0 and lo["mastery_status"] in ("needs_improvement", "developing")
        ],
    }


def get_progress_summary_data(student_id: str = None, course_id: str = None, limit: int = 50):
    """Teacher/admin roll-up across students."""
    query = {}
    if student_id:
        query["student"] = ObjectId(student_id)
    if course_id:
        query["course"] = ObjectId(course_id)

    records = list(adaptive_learning_collection.find(query))
    if not records:
        return {
            "total_students": 0,
            "student_id": student_id,
            "course_id": course_id,
            "students": [],
            "message": "No learning records found",
        }

    students: Dict[str, Dict[str, Any]] = {}

    for record in records:
        sid = str(record.get("student", ""))
        summary = summarize_record(record)
        attempted = summary["totalAttempts"]
        correct = sum(
            entry["correct"] for entry in summary["perStat"].values()
        )

        bucket = students.setdefault(sid, {
            "student_id": sid,
            "total_attempted": 0,
            "total_correct": 0,
            "courses_enrolled": 0,
            "mastered_objectives": 0,
            "difficulty_level": "low",
            "current_units": [],
            "recommended_units": [],
            "_mastery_weight": 0.0,
            "_pace_weight": 0.0,
        })

        bucket["total_attempted"] += attempted
        bucket["total_correct"] += correct
        bucket["courses_enrolled"] += 1
        bucket["mastered_objectives"] += summary["masteredObjectives"]
        bucket["_mastery_weight"] += summary["masteryScore"] * max(attempted, 0)
        bucket["_pace_weight"] += summary["paceScore"] * max(attempted, 0)
        bucket["difficulty_level"] = summary["difficultyLevel"]

        course_id_str = str(record.get("course", ""))
        if record.get("currentUnit"):
            bucket["current_units"].append(
                {"course_id": course_id_str, "unit_id": str(record["currentUnit"])}
            )
        if record.get("recommendedUnit"):
            bucket["recommended_units"].append(
                {"course_id": course_id_str, "unit_id": str(record["recommendedUnit"])}
            )

    summary_list = []
    for data in students.values():
        attempted = data["total_attempted"]
        data["accuracy"] = round(data["total_correct"] / attempted, 4) if attempted else 0.0
        data["avg_mastery_score"] = (
            round(data.pop("_mastery_weight") / attempted, 4) if attempted else 0.0
        )
        data["avg_pace_score"] = (
            round(data.pop("_pace_weight") / attempted, 4) if attempted else 0.0
        )
        data.pop("_mastery_weight", None)
        data.pop("_pace_weight", None)
        data["mastery_status"] = mastery_status_from_score(data["avg_mastery_score"], attempted)
        summary_list.append(data)

    summary_list.sort(key=lambda x: x["avg_mastery_score"], reverse=True)

    return {
        "total_students": len(summary_list),
        "student_id": student_id,
        "course_id": course_id,
        "students": summary_list[:limit],
    }
