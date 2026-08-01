"""
Tests for the cold-start online learner (Elo/IRT ability tracking).

This layer is what makes the platform adaptive before any model is trained, so
its behaviour from a standing start matters more than anything else here.
"""

import random
import sys
import types
from datetime import datetime, timedelta, timezone

import mongomock
import pytest
from bson import ObjectId


@pytest.fixture()
def learner(monkeypatch):
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
        ("learner_ability_collection", "learnerability"),
        ("item_parameters_collection", "itemparameters"),
        ("model_evaluations_collection", "modelevaluations"),
    ]:
        setattr(fake, attribute, db[collection])
    fake.db_manager = None

    package = types.ModuleType("config")
    package.__path__ = []
    monkeypatch.setitem(sys.modules, "config", package)
    monkeypatch.setitem(sys.modules, "config.database", fake)
    for name in [m for m in list(sys.modules) if m.startswith("services.")]:
        monkeypatch.delitem(sys.modules, name, raising=False)

    import services.online_learner as module

    return module, db


def test_works_from_the_very_first_question(learner):
    """No data anywhere: it must still make a sensible, cautious choice."""
    module, _ = learner
    recommendation = module.online_learner.recommend_difficulty(
        str(ObjectId()), str(ObjectId()), str(ObjectId()), 0
    )
    assert recommendation["difficulty"] == "low"
    assert recommendation["confidence"] == 0.0  # honest about knowing nothing
    assert 0.6 < recommendation["predicted_success"] < 0.85


def test_ability_tracks_actual_performance(learner):
    module, _ = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())

    strong, weak = str(ObjectId()), str(ObjectId())
    for _ in range(12):
        model.record_answer(strong, course, unit, 0, "mid", True, 40)
        model.record_answer(weak, course, unit, 0, "mid", False, 40)

    assert model.get_ability(strong, course, unit, 0)["theta"] > 0
    assert model.get_ability(weak, course, unit, 0)["theta"] < 0
    assert (
        model.mastery_estimate(strong, course, unit, 0)["mastery"]
        > model.mastery_estimate(weak, course, unit, 0)["mastery"]
    )


def test_item_difficulty_self_corrects(learner):
    """
    Questions are LLM-generated, so a band labelled "high" is often not hard.
    The estimate has to learn that from real responses.
    """
    module, _ = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())

    before = model.get_item_difficulty(course, unit, 0, "high")["b"]
    for _ in range(60):
        model.record_answer(str(ObjectId()), course, unit, 0, "high", True, 30)
    after = model.get_item_difficulty(course, unit, 0, "high")["b"]

    assert after < before


def test_difficulty_bands_never_cross(learner):
    """Ability and item difficulty are weakly identifiable; ordering must hold."""
    module, _ = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())

    random.seed(7)
    for _ in range(80):
        difficulty = random.choice(["low", "mid", "high"])
        model.record_answer(
            str(ObjectId()), course, unit, 0, difficulty, random.random() < 0.5, 40
        )

    bands = [
        model.get_item_difficulty(course, unit, 0, d)["b"]
        for d in ("low", "mid", "high")
    ]
    assert bands[0] < bands[1] < bands[2]


def test_strong_students_are_not_stranded_on_easy_work(learner):
    """
    Picking the band closest to a target success rate leaves a student who
    scores 84% on easy questions sitting there forever. The hardest-viable rule
    has to promote them.
    """
    module, _ = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())

    # Give every band credible exposure so item confidence is real.
    random.seed(3)
    for _ in range(40):
        for difficulty in ("low", "mid", "high"):
            model.record_answer(
                str(ObjectId()), course, unit, 0, difficulty, random.random() < 0.5, 40
            )

    strong = str(ObjectId())
    for _ in range(15):
        model.record_answer(strong, course, unit, 0, "high", True, 40)

    assert model.recommend_difficulty(strong, course, unit, 0)["difficulty"] != "low"


def test_confidence_requires_evidence_on_both_sides(learner):
    """Knowing the student well is useless if the bands are still just priors."""
    module, _ = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())

    student = str(ObjectId())
    for _ in range(20):
        model.record_answer(student, course, unit, 0, "low", True, 40)

    recommendation = model.recommend_difficulty(student, course, unit, 0)
    assert recommendation["student_confidence"] == 1.0
    assert recommendation["item_confidence"] < 1.0
    assert recommendation["confidence"] == recommendation["item_confidence"]


def test_fast_correct_answers_earn_less_credit(learner):
    """A one-second correct answer is a lucky click, not knowledge."""
    module, _ = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())

    considered, rushed = str(ObjectId()), str(ObjectId())
    model.record_answer(considered, course, unit, 0, "mid", True, 45.0)
    model.record_answer(rushed, course, unit, 1, "mid", True, 0.5)

    assert (
        model.get_ability(considered, course, unit, 0)["theta"]
        > model.get_ability(rushed, course, unit, 1)["theta"]
    )


def test_ability_decays_across_a_long_absence(learner):
    module, db = learner
    model = module.online_learner
    course, unit = str(ObjectId()), str(ObjectId())
    student = str(ObjectId())

    for _ in range(10):
        model.record_answer(student, course, unit, 0, "mid", True, 40)
    fresh = model.get_ability(student, course, unit, 0)["theta"]

    db.learnerability.update_one(
        {"student": ObjectId(student)},
        {"$set": {"lastSeen": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=90)}},
    )
    stale = model.get_ability(student, course, unit, 0)["theta"]

    assert stale < fresh
    # Forgetting, not amnesia: prior learning is not wiped out.
    assert stale > fresh * (1 - module.MAX_DECAY_FRACTION) - 1e-6


def test_behaviour_flags_disengagement(learner):
    module, _ = learner
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    rapid_wrong = [
        {"is_correct": False, "time_spent_seconds": 1.0,
         "submitted_at": now - timedelta(minutes=i)}
        for i in range(5)
    ]
    signals = module.online_learner.behaviour_signals("s", "c", rapid_wrong)
    assert signals["likely_disengaged"]
    assert signals["rushing"]

    considered = [
        {"is_correct": True, "time_spent_seconds": 70.0,
         "submitted_at": now - timedelta(minutes=i)}
        for i in range(5)
    ]
    calm = module.online_learner.behaviour_signals("s", "c", considered)
    assert not calm["likely_disengaged"]
    assert calm["correct_streak"] == 5


def test_behaviour_flags_a_returning_student(learner):
    module, _ = learner
    signals = module.online_learner.behaviour_signals(
        "s", "c",
        [{"is_correct": True, "time_spent_seconds": 50,
          "submitted_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=21)}],
    )
    assert signals["returning_after_break"]
    assert signals["days_since_last_answer"] >= 20
