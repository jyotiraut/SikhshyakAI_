"""
Tests for the adaptive mastery engine.

Run from the adaptive_learnings directory:
    pip install pytest mongomock
    pytest tests/

MongoDB is stubbed with mongomock, so no database or API key is needed.
"""

import sys
import types

import mongomock
import pytest
from bson import ObjectId


@pytest.fixture()
def engine(monkeypatch):
    """Install an in-memory config.database, then import the engine against it."""
    client = mongomock.MongoClient()
    db = client["test"]

    fake = types.ModuleType("config.database")
    for attribute, collection in [
        ("adaptive_learning_collection", "adaptivelearnings"),
        ("units_collection", "units"),
        ("courses_collection", "courses"),
        ("adaptivequiz_collection", "adaptivequiz"),
        ("adaptivequiz_submissions_collection", "adaptivequiz_submissions"),
        ("users_collection", "users"),
        ("enrollments_collection", "enrollments"),
        ("quiz_submissions_collection", "quizsubmissions"),
    ]:
        setattr(fake, attribute, db[collection])
    fake.db_manager = None

    package = types.ModuleType("config")
    package.__path__ = []
    monkeypatch.setitem(sys.modules, "config", package)
    monkeypatch.setitem(sys.modules, "config.database", fake)
    for name in [m for m in list(sys.modules) if m.startswith("services.")]:
        monkeypatch.delitem(sys.modules, name, raising=False)

    import services.adaptive_service as service

    return service, db


def make_course(db, objectives_per_unit=(2, 1), unit_numbers=(1, 3)):
    course = ObjectId()
    units = []
    for number, count in zip(unit_numbers, objectives_per_unit):
        unit_id = ObjectId()
        db.units.insert_one({
            "_id": unit_id,
            "course": course,
            "unitNumber": number,
            "title": f"Unit {number}",
            "outlineText": "Some real teaching material for this unit.",
            "learningObjectives": [f"Objective {i}" for i in range(count)],
        })
        units.append(unit_id)
    return course, units


def buckets(service, **levels):
    result = service.empty_by_difficulty()
    for level, (attempted, correct) in levels.items():
        recent = ([1] * correct + [0] * (attempted - correct))[-service.RECENT_WINDOW:]
        result[level] = {"attempted": attempted, "correct": correct, "recent": recent}
    return result


# ------------------------------------------------------------------ mastery --

def test_perfect_easy_answers_do_not_reach_mastery(engine):
    """Easy questions alone must not signal mastery — that was the old bug's twin."""
    service, _ = engine
    b = buckets(service, low=(6, 6))
    mastery = service.compute_lo_mastery(b)
    assert mastery == pytest.approx(service.DIFFICULTY_CEILING["low"])
    assert not service.lo_is_mastered(b, mastery)


def test_mastery_requires_evidence_at_high_difficulty(engine):
    service, _ = engine
    mid_only = buckets(service, low=(3, 3), mid=(3, 3))
    assert not service.lo_is_mastered(mid_only, service.compute_lo_mastery(mid_only))

    with_high = buckets(service, low=(2, 2), mid=(2, 2), high=(4, 4))
    assert service.lo_is_mastered(with_high, service.compute_lo_mastery(with_high))


def test_mastery_is_reachable(engine):
    """The old weighting capped mastery at 0.33/0.67, below the 0.85 threshold."""
    service, _ = engine
    b = buckets(service, low=(2, 2), mid=(2, 2), high=(4, 4))
    assert service.compute_lo_mastery(b) == pytest.approx(1.0)


def test_learning_action_uses_the_zero_to_one_scale(engine):
    """The old code compared a 0-1 mastery against 50/70/90 and always said REVIEW."""
    service, _ = engine
    assert service.learning_action_for(0.0, 0) == "BEGIN"
    assert service.learning_action_for(0.2, 3) == "REVIEW"
    assert service.learning_action_for(0.5, 5) == "PRACTICE"
    assert service.learning_action_for(0.7, 8) == "ADVANCE"
    assert service.learning_action_for(0.95, 10) == "MASTER"


def test_legacy_documents_are_read_without_migration(engine):
    service, _ = engine
    legacy = {"attemptedQuestions": 6, "correctAnswers": 5, "difficulty": "high"}
    b = service.read_by_difficulty(legacy)
    assert b["high"]["attempted"] == 6
    assert service.compute_lo_mastery(b) == pytest.approx(5 / 6, abs=1e-3)


# ---------------------------------------------------------------- recording --

def test_answers_are_recorded_per_difficulty(engine):
    """Counters must land in the right bucket, not at the wrong nesting level."""
    service, db = engine
    course, (unit, _) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    service.record_answer(str(student), str(course), str(unit), 0, True, "low")
    service.record_answer(str(student), str(course), str(unit), 0, True, "mid")
    service.record_answer(str(student), str(course), str(unit), 0, False, "mid")

    stat = db.adaptivelearnings.find_one({})["quizStats"][0]
    assert stat["byDifficulty"]["low"] == {"attempted": 1, "correct": 1, "recent": [1]}
    assert stat["byDifficulty"]["mid"]["attempted"] == 2
    assert stat["byDifficulty"]["mid"]["correct"] == 1
    assert stat["attemptedQuestions"] == 3


def test_missing_objective_slot_is_created(engine):
    """Objectives added by a teacher after enrolment must still be trackable."""
    service, db = engine
    course, (unit, _) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    result = service.update_adaptive_learning_with_recalculation(
        str(student), str(course), str(unit), 9, True, "low"
    )
    assert result["lo_attempts"] == 1


# --------------------------------------------------------------- next question --

def test_none_lo_stats_does_not_crash(engine):
    """This raised AttributeError and surfaced as a 500."""
    service, db = engine
    course, (unit, _) = make_course(db)
    result = service.get_next_question_parameters(
        str(ObjectId()), str(course), str(unit), 0, "low", True, None
    )
    assert result["difficulty"] == "low"


def test_promotion_needs_evidence_at_the_current_level(engine):
    """Cumulative counting let two easy answers push a student straight to hard."""
    service, db = engine
    course, (unit, _) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    difficulty, seen = "low", []
    for _ in range(4):
        stats = service.update_adaptive_learning_with_recalculation(
            str(student), str(course), str(unit), 0, True, difficulty
        )
        nxt = service.get_next_question_parameters(
            str(student), str(course), str(unit), 0, difficulty, True, stats["lo_stats"]
        )
        seen.append(difficulty)
        difficulty = nxt["difficulty"]

    # low is held for two questions before mid is offered.
    assert seen[:2] == ["low", "low"]
    assert "mid" in seen


def test_student_recovers_from_a_bad_start(engine):
    """A single early mistake used to block the objective permanently."""
    service, db = engine
    course, (unit, _) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    for _ in range(4):
        service.record_answer(str(student), str(course), str(unit), 0, False, "low")
    for level, count in (("low", 3), ("mid", 3), ("high", 4)):
        for _ in range(count):
            stats = service.update_adaptive_learning_with_recalculation(
                str(student), str(course), str(unit), 0, True, level
            )

    assert stats["lo_accuracy"] < 1.0  # lifetime accuracy is still imperfect
    assert stats["lo_stats"]["is_mastered"]


def test_progression_crosses_a_gap_in_unit_numbers(engine):
    """Units numbered 1 and 3: the old next-unit lookup stopped at the gap."""
    service, db = engine
    course, (unit_one, unit_three) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    difficulty, lo_index, unit = "low", 0, str(unit_one)
    for _ in range(30):
        stats = service.update_adaptive_learning_with_recalculation(
            str(student), str(course), unit, lo_index, True, difficulty
        )
        nxt = service.get_next_question_parameters(
            str(student), str(course), unit, lo_index, difficulty, True, stats["lo_stats"]
        )
        difficulty, lo_index, unit = nxt["difficulty"], nxt["lo_index"], nxt["unit_id"]
        if unit == str(unit_three):
            break

    assert unit == str(unit_three)
    record = db.adaptivelearnings.find_one({"student": student})
    assert record["currentUnit"] == unit_three  # position is persisted


# ------------------------------------------------------------------ reporting --

def test_mastery_is_not_diluted_by_untouched_objectives(engine):
    """Averaging over every objective in the course pinned the score near zero."""
    service, db = engine
    course, (unit, _) = make_course(db, objectives_per_unit=(2, 1))
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    for level, count in (("low", 2), ("mid", 2), ("high", 3)):
        for _ in range(count):
            service.record_answer(str(student), str(course), str(unit), 0, True, level)

    progress = service.get_student_course_progress_data(str(student), str(course))
    assert progress["mastery_score"] > 0.8       # one objective, fully mastered
    assert progress["coverage_score"] < 0.5      # but most of the course is untouched


def test_difficulty_distribution_counts_questions_not_objectives(engine):
    """The old distribution counted objectives and was always ~100% low."""
    service, db = engine
    course, (unit, _) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    for level, count in (("low", 2), ("mid", 4), ("high", 2)):
        for _ in range(count):
            service.record_answer(str(student), str(course), str(unit), 0, True, level)

    record = db.adaptivelearnings.find_one({"student": student})
    distribution = record["difficultyDistribution"]
    assert distribution["mid"] == pytest.approx(50.0)
    assert distribution["low"] == pytest.approx(25.0)
    assert distribution["high"] == pytest.approx(25.0)


def test_pace_reflects_efficiency_not_just_mastery(engine):
    """pace was literally mastery * 0.8 and carried no extra information."""
    service, db = engine
    course, (unit, _) = make_course(db)

    quick = ObjectId()
    service.initialize_adaptive_learning(str(quick), str(course))
    for level, count in (("low", 2), ("mid", 2), ("high", 3)):
        for _ in range(count):
            service.record_answer(str(quick), str(course), str(unit), 0, True, level)

    slow = ObjectId()
    service.initialize_adaptive_learning(str(slow), str(course))
    for _ in range(12):
        service.record_answer(str(slow), str(course), str(unit), 0, False, "low")
    for level, count in (("low", 3), ("mid", 3), ("high", 4)):
        for _ in range(count):
            service.record_answer(str(slow), str(course), str(unit), 0, True, level)

    quick_record = db.adaptivelearnings.find_one({"student": quick})
    slow_record = db.adaptivelearnings.find_one({"student": slow})
    assert quick_record["paceScore"] > slow_record["paceScore"]


def test_normalize_difficulty_absorbs_model_output(engine):
    """An unexpected value used to raise KeyError and poison the record."""
    service, _ = engine
    assert service.normalize_difficulty("Easy") == "low"
    assert service.normalize_difficulty("MEDIUM") == "mid"
    assert service.normalize_difficulty("Advanced") == "high"
    assert service.normalize_difficulty(None) == "low"
    assert service.normalize_difficulty("nonsense") == "low"


# ----------------------------------------------------------- knowledge tracing --

def test_sakt_blending_is_anchored_on_the_rules(engine):
    """The model's share is capped and scales with confidence."""
    service, _ = engine
    assert service.blend_with_sakt(0.6, 0.2, 0.0) == 0.6           # no confidence, no shift
    assert service.blend_with_sakt(0.6, None, 1.0) == 0.6          # no prediction, no shift
    full = service.blend_with_sakt(0.6, 0.2, 1.0)
    assert 0.6 - full == pytest.approx(0.4 * service.SAKT_MAX_WEIGHT, abs=1e-4)
    assert full > 0.2                                              # rules still dominate


def test_sakt_cannot_skip_a_difficulty_rung(engine):
    service, _ = engine
    confident_high = {"difficulty": "high", "confidence": 0.9}

    # Rules chose mid while the student is still on low: no double jump.
    difficulty, note = service.apply_sakt_difficulty("mid", "low", confident_high, 5)
    assert difficulty == "mid" and note is None

    # One rung above the rules is allowed once there is evidence at this level.
    difficulty, note = service.apply_sakt_difficulty("mid", "mid", confident_high, 3)
    assert difficulty == "high" and note


def test_sakt_cannot_promote_without_evidence_at_the_current_level(engine):
    service, _ = engine
    confident_high = {"difficulty": "high", "confidence": 0.9}
    difficulty, note = service.apply_sakt_difficulty("low", "low", confident_high, 0)
    assert difficulty == "low" and note is None


def test_low_confidence_predictions_are_ignored(engine):
    service, _ = engine
    unsure = {"difficulty": "high", "confidence": 0.2}
    difficulty, note = service.apply_sakt_difficulty("low", "low", unsure, 5)
    assert difficulty == "low" and note is None


def test_engine_works_without_any_prediction(engine):
    """Rules must stand alone when the model is off, absent, or unconfident."""
    service, db = engine
    course, (unit, _) = make_course(db)
    student = ObjectId()
    service.initialize_adaptive_learning(str(student), str(course))

    stats = service.update_adaptive_learning_with_recalculation(
        str(student), str(course), str(unit), 0, True, "low", sakt=None
    )
    assert stats["knowledge_tracing"] == {"active": False}
    assert stats["mastery_score"] == stats["evidence_mastery_score"]

    nxt = service.get_next_question_parameters(
        str(student), str(course), str(unit), 0, "low", True, stats["lo_stats"], sakt=None
    )
    assert nxt["difficulty_source"] == "rules"
