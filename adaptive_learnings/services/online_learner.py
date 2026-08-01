"""
Online learner model: the cold-start adaptive layer.

Why this exists
---------------
A neural knowledge-tracing model cannot work before there is data to train on,
and training on a foreign dataset (ASSISTments, EdNet) transfers nothing useful
because its skill embeddings describe skills this platform does not have.

This layer needs no training at all. It is an Elo/IRT update that runs after
every single answer, starting with a student's first question:

    P(correct) = sigmoid(theta[student, objective] - b[objective, difficulty])

    theta += K_student * (observed - P)     # the student got better/worse
    b     -= K_item    * (observed - P)     # the item was easier/harder than rated

Both K values shrink as evidence accumulates, so early answers move the estimate
a lot and later ones refine it.

Three things this buys that a fixed rule ladder cannot:

1. Difficulty selection becomes principled - serve the band where the student is
   predicted to succeed about TARGET_SUCCESS of the time.
2. Mastery becomes a calibrated probability rather than a hand-tuned average.
3. Item difficulty self-corrects. Questions here are LLM-generated, so a question
   labelled "high" is often not actually hard. The b parameters learn each band's
   real difficulty from how students perform, which no amount of prompt tuning
   fixes reliably.

Behaviour beyond correctness feeds in too: response latency relative to peers,
and decay of ability toward the prior across long gaps, so forgetting is modelled
rather than ignored.
"""

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from config.database import item_parameters_collection, learner_ability_collection

DIFFICULTIES = ("low", "mid", "high")

# Difficulty selection targets the *hardest* band the student can still succeed
# at more often than not, rather than the band closest to a target rate.
#
# Picking "closest to target" sounds right but strands strong students: someone
# succeeding 84% of the time on low questions is closer to a 0.75 target than
# they are on mid (63%), so they never get promoted and their ability estimate
# stops improving. Taking the hardest viable band keeps the stretch on.
SUCCESS_FLOOR = 0.60
TARGET_SUCCESS = 0.75  # reported as the intent; the floor does the selecting

# Starting difficulty of each band on the logit scale, before any evidence.
# These encode only "low is easier than high"; the data corrects the rest.
PRIOR_DIFFICULTY = {"low": -1.0, "mid": 0.0, "high": 1.0}

# Learning rates. Students move faster than items because one student answers
# far fewer questions than an item band receives across a cohort.
STUDENT_K0 = 0.9
STUDENT_K_MIN = 0.15
ITEM_K0 = 0.30
ITEM_K_MIN = 0.02
K_DECAY = 0.08

# Ability decays toward the prior across gaps between sessions: a student who
# has not practised an objective in weeks is not where they left off.
FORGETTING_HALF_LIFE_DAYS = 30.0
MAX_DECAY_FRACTION = 0.4  # never wipe out more than this much of what was learned

# Answers faster than this are treated as not-really-attempted.
MIN_CREDIBLE_SECONDS = 1.5

ABILITY_CLAMP = 4.0
DIFFICULTY_CLAMP = 4.0

# The three bands are ordered by construction: a "high" question is meant to be
# harder than a "mid" one. With few students, ability and item difficulty are
# only weakly identifiable and the estimated bands can cross - which produced
# nonsense like recommending "low" to the strongest student. Enforcing a minimum
# separation keeps the ordering intact while still letting the data set the
# absolute values.
MIN_BAND_SEPARATION = 0.35

# Adaptive selection only ever shows a band to students hovering near its
# threshold, so its estimated difficulty is biased by who saw it - in testing the
# "mid" band drifted to 0.65 when the truth was 0.0, which then stranded strong
# students on easy questions. Shrinking the estimate toward its prior keeps early
# figures stable while still converging once a band has broad exposure.
ITEM_PRIOR_WEIGHT = 15.0

# Item estimates are only trusted for steering once a band has been attempted
# this many times across the cohort.
ITEM_OBSERVATIONS_FOR_CONFIDENCE = 25


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-min(x, 40.0)))
    exp_x = math.exp(max(x, -40.0))
    return exp_x / (1.0 + exp_x)


def adaptive_k(observations: int, k0: float, k_min: float) -> float:
    """Large steps while evidence is thin, small steps once it is plentiful."""
    return max(k_min, k0 / (1.0 + K_DECAY * max(0, observations)))


class OnlineLearnerModel:
    """Elo/IRT ability tracking. No training phase, no checkpoint."""

    # ------------------------------------------------------------- reading --

    @staticmethod
    def ability_key(student_id: str, course_id: str, unit_id: str, lo_index: int) -> Dict:
        return {
            "student": ObjectId(student_id),
            "course": ObjectId(course_id),
            "unit": ObjectId(unit_id),
            "learningObjectiveIndex": int(lo_index),
        }

    @staticmethod
    def item_key(course_id: str, unit_id: str, lo_index: int, difficulty: str) -> Dict:
        return {
            "course": ObjectId(course_id),
            "unit": ObjectId(unit_id),
            "learningObjectiveIndex": int(lo_index),
            "difficulty": difficulty,
        }

    def get_ability(
        self, student_id: str, course_id: str, unit_id: str, lo_index: int
    ) -> Dict[str, Any]:
        record = learner_ability_collection.find_one(
            self.ability_key(student_id, course_id, unit_id, lo_index)
        )
        if not record:
            return {"theta": 0.0, "observations": 0, "last_seen": None}

        theta = float(record.get("theta", 0.0))
        last_seen = record.get("lastSeen")

        # Apply forgetting lazily on read, so a long absence is reflected without
        # needing a background job to sweep every learner.
        if last_seen:
            days = max(0.0, (utcnow() - last_seen).total_seconds() / 86400.0)
            if days > 1.0 and theta > 0:
                retained = 0.5 ** (days / FORGETTING_HALF_LIFE_DAYS)
                retained = max(retained, 1.0 - MAX_DECAY_FRACTION)
                theta *= retained

        return {
            "theta": theta,
            "observations": int(record.get("observations", 0)),
            "last_seen": last_seen,
        }

    def get_item_difficulty(
        self, course_id: str, unit_id: str, lo_index: int, difficulty: str
    ) -> Dict[str, Any]:
        prior = PRIOR_DIFFICULTY.get(difficulty, 0.0)
        record = item_parameters_collection.find_one(
            self.item_key(course_id, unit_id, lo_index, difficulty)
        )
        if not record:
            return {"b": prior, "raw_b": prior, "observations": 0, "median_seconds": None}

        raw = float(record.get("b", prior))
        observations = int(record.get("observations", 0))

        # Shrink toward the prior so a band seen by a handful of borderline
        # students cannot swing the whole difficulty ladder.
        shrunk = (observations * raw + ITEM_PRIOR_WEIGHT * prior) / (
            observations + ITEM_PRIOR_WEIGHT
        )

        return {
            "b": shrunk,
            "raw_b": raw,
            "observations": observations,
            "median_seconds": record.get("medianSeconds"),
        }

    def probability_correct(
        self, student_id: str, course_id: str, unit_id: str, lo_index: int, difficulty: str
    ) -> float:
        theta = self.get_ability(student_id, course_id, unit_id, lo_index)["theta"]
        b = self.get_item_difficulty(course_id, unit_id, lo_index, difficulty)["b"]
        return sigmoid(theta - b)

    # ------------------------------------------------------------ updating --

    def record_answer(
        self,
        student_id: str,
        course_id: str,
        unit_id: str,
        lo_index: int,
        difficulty: str,
        is_correct: bool,
        time_spent_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Update both the student's ability and the item band's difficulty."""
        if difficulty not in DIFFICULTIES:
            difficulty = "low"

        ability = self.get_ability(student_id, course_id, unit_id, lo_index)
        item = self.get_item_difficulty(course_id, unit_id, lo_index, difficulty)

        theta = ability["theta"]
        # Predict with the shrunk estimate (the model's actual belief) but apply
        # the update to the raw one, so shrinkage regularises without also
        # damping the learning signal.
        b = item["b"]
        raw_b = item["raw_b"]
        expected = sigmoid(theta - b)
        observed = 1.0 if is_correct else 0.0
        error = observed - expected

        # A correct answer returned implausibly fast is more likely a lucky
        # click than knowledge, so it earns less credit.
        credibility = 1.0
        if is_correct and time_spent_seconds is not None and time_spent_seconds < MIN_CREDIBLE_SECONDS:
            credibility = 0.4

        k_student = adaptive_k(ability["observations"], STUDENT_K0, STUDENT_K_MIN) * credibility
        k_item = adaptive_k(item["observations"], ITEM_K0, ITEM_K_MIN)

        new_theta = max(-ABILITY_CLAMP, min(theta + k_student * error, ABILITY_CLAMP))
        new_b = max(-DIFFICULTY_CLAMP, min(raw_b - k_item * error, DIFFICULTY_CLAMP))

        learner_ability_collection.update_one(
            self.ability_key(student_id, course_id, unit_id, lo_index),
            {
                "$set": {"theta": new_theta, "lastSeen": utcnow()},
                "$inc": {"observations": 1, "correct": 1 if is_correct else 0},
                "$setOnInsert": {"createdAt": utcnow()},
            },
            upsert=True,
        )

        new_b = self._respect_band_ordering(
            course_id, unit_id, lo_index, difficulty, new_b
        )

        item_update = {
            "$set": {"b": new_b, "updatedAt": utcnow()},
            "$inc": {"observations": 1, "correct": 1 if is_correct else 0},
            "$setOnInsert": {"createdAt": utcnow()},
        }
        if time_spent_seconds:
            # Keep a bounded sample of response times so "typical time on this
            # item" can be compared against, for hesitation signals.
            item_update["$push"] = {
                "recentSeconds": {"$each": [float(time_spent_seconds)], "$slice": -50}
            }
        item_parameters_collection.update_one(
            self.item_key(course_id, unit_id, lo_index, difficulty), item_update, upsert=True
        )

        return {
            "theta": round(new_theta, 4),
            "theta_delta": round(new_theta - theta, 4),
            "item_difficulty": round(new_b, 4),
            "expected": round(expected, 4),
            "surprise": round(abs(error), 4),
            "observations": ability["observations"] + 1,
        }

    def _respect_band_ordering(
        self, course_id: str, unit_id: str, lo_index: int, difficulty: str, proposed: float
    ) -> float:
        """
        Keep low < mid < high after an update.

        Only the band just answered is moved, so it is squeezed between its
        neighbours rather than dragging them along - the data still decides the
        absolute difficulty, the constraint only stops the ordering inverting.
        """
        neighbours = {
            d: self.get_item_difficulty(course_id, unit_id, lo_index, d)["raw_b"]
            for d in DIFFICULTIES
            if d != difficulty
        }
        index = DIFFICULTIES.index(difficulty)

        lower_bound = -DIFFICULTY_CLAMP
        for other_index in range(index):
            other = DIFFICULTIES[other_index]
            lower_bound = max(
                lower_bound,
                neighbours[other] + MIN_BAND_SEPARATION * (index - other_index),
            )

        upper_bound = DIFFICULTY_CLAMP
        for other_index in range(index + 1, len(DIFFICULTIES)):
            other = DIFFICULTIES[other_index]
            upper_bound = min(
                upper_bound,
                neighbours[other] - MIN_BAND_SEPARATION * (other_index - index),
            )

        if lower_bound > upper_bound:  # neighbours already too close; leave as is
            return proposed
        return max(lower_bound, min(proposed, upper_bound))

    # ----------------------------------------------------------- selection --

    def recommend_difficulty(
        self,
        student_id: str,
        course_id: str,
        unit_id: str,
        lo_index: int,
        floor: float = SUCCESS_FLOOR,
    ) -> Dict[str, Any]:
        """
        Pick the hardest band the student is still predicted to pass more often
        than `floor`; if none qualifies, fall back to the easiest.

        This is the core of the cold-start adaptation: it works from the first
        answer, gets sharper as ability and item difficulty are refined, and
        needs no model file.
        """
        ability = self.get_ability(student_id, course_id, unit_id, lo_index)
        theta = ability["theta"]

        predictions = {}
        for difficulty in DIFFICULTIES:
            item = self.get_item_difficulty(course_id, unit_id, lo_index, difficulty)
            predictions[difficulty] = {
                "probability": round(sigmoid(theta - item["b"]), 4),
                "b": round(item["b"], 4),
                "observations": item["observations"],
            }

        viable = [d for d in DIFFICULTIES if predictions[d]["probability"] >= floor]
        # DIFFICULTIES is ordered easiest-first, so the last viable band is the
        # hardest one the student can still handle.
        best = viable[-1] if viable else max(
            DIFFICULTIES, key=lambda d: predictions[d]["probability"]
        )

        # Confidence needs evidence on *both* sides: knowing the student well is
        # useless if the bands they are being compared against are still mostly
        # prior. Taking the weaker of the two stops the model steering on half
        # the picture.
        student_confidence = min(ability["observations"] / 8.0, 1.0)
        item_confidence = min(
            min(predictions[d]["observations"] for d in DIFFICULTIES)
            / ITEM_OBSERVATIONS_FOR_CONFIDENCE,
            1.0,
        )
        confidence = min(student_confidence, item_confidence)

        return {
            "difficulty": best,
            "target": TARGET_SUCCESS,
            "floor": floor,
            "predicted_success": predictions[best]["probability"],
            "theta": round(theta, 4),
            "observations": ability["observations"],
            "confidence": round(confidence, 3),
            "student_confidence": round(student_confidence, 3),
            "item_confidence": round(item_confidence, 3),
            "by_difficulty": predictions,
        }

    def mastery_estimate(
        self, student_id: str, course_id: str, unit_id: str, lo_index: int
    ) -> Dict[str, Any]:
        """
        Mastery as the calibrated probability of answering a hard question
        correctly - a quantity with an actual definition, unlike a weighted
        average of past scores.
        """
        ability = self.get_ability(student_id, course_id, unit_id, lo_index)
        high = self.get_item_difficulty(course_id, unit_id, lo_index, "high")
        mastery = sigmoid(ability["theta"] - high["b"])
        return {
            "mastery": round(mastery, 4),
            "theta": round(ability["theta"], 4),
            "observations": ability["observations"],
            "confidence": round(min(ability["observations"] / 8.0, 1.0), 3),
        }

    # ----------------------------------------------------------- behaviour --

    def behaviour_signals(
        self, student_id: str, course_id: str, recent_submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Summarise how the student is working, not just whether they are right.

        These are the signals a correctness-only model misses: rushing, stalling,
        losing a streak, or drifting away between sessions.
        """
        if not recent_submissions:
            return {"available": False}

        ordered = sorted(recent_submissions, key=lambda s: s.get("submitted_at") or utcnow())
        times = [
            float(s["time_spent_seconds"])
            for s in ordered
            if s.get("time_spent_seconds")
        ]

        streak = 0
        for submission in reversed(ordered):
            if submission.get("is_correct"):
                streak += 1
            else:
                break

        wrong_streak = 0
        for submission in reversed(ordered):
            if not submission.get("is_correct"):
                wrong_streak += 1
            else:
                break

        median_time = None
        if times:
            ordered_times = sorted(times)
            middle = len(ordered_times) // 2
            median_time = (
                ordered_times[middle]
                if len(ordered_times) % 2
                else (ordered_times[middle - 1] + ordered_times[middle]) / 2
            )

        rushing = bool(
            median_time is not None
            and median_time < MIN_CREDIBLE_SECONDS * 2
            and len(times) >= 3
        )

        # A run of fast wrong answers usually means disengagement rather than a
        # genuine difficulty problem, and calls for a different response.
        recent_five = ordered[-5:]
        fast_wrong = sum(
            1 for s in recent_five
            if not s.get("is_correct")
            and s.get("time_spent_seconds")
            and float(s["time_spent_seconds"]) < MIN_CREDIBLE_SECONDS * 2
        )

        last_seen = ordered[-1].get("submitted_at")
        gap_days = (
            round((utcnow() - last_seen).total_seconds() / 86400.0, 2) if last_seen else None
        )

        return {
            "available": True,
            "answers_considered": len(ordered),
            "correct_streak": streak,
            "wrong_streak": wrong_streak,
            "median_seconds": round(median_time, 1) if median_time is not None else None,
            "rushing": rushing,
            "likely_disengaged": fast_wrong >= 3,
            "days_since_last_answer": gap_days,
            "returning_after_break": bool(gap_days is not None and gap_days > 7),
        }


online_learner = OnlineLearnerModel()
