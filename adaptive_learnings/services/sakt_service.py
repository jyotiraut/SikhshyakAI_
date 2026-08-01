"""
SAKT (Self-Attentive Knowledge Tracing) inference.

What this model can and cannot do
---------------------------------
The shipped checkpoint was trained with **5 skills** (`skill_embed` is 6x128 and
`skill_to_idx` is {1..5}), so its skill space is unit-level, not objective-level.
It therefore drives:

    * difficulty selection  - its difficulty head is exactly this prediction
    * pace                  - direct output
    * unit-level mastery    - a sequence-aware second opinion
    * next-unit preference  - its next-skill head

It does **not** decide which learning objective a student has finished. That
stays with the evidence-based rules in `adaptive_service`, because a 5-skill
model cannot address individual objectives and would be guessing.

Everything here fails soft: if torch is missing, the checkpoint is absent, or the
student has too little history, `predict()` returns None and the caller falls
back to the rule engine.
"""

import os
from typing import Any, Dict, List, Optional

from bson import ObjectId

from config.database import adaptivequiz_submissions_collection, units_collection
from core.logger import logger

# The checkpoint was trained on quiz-level aggregates (~5 questions per step,
# minutes of work per step, hints counted per quiz). The adaptive loop records
# one question at a time, so consecutive answers are aggregated back into
# quiz-sized windows before inference. Feeding raw single answers puts five of
# the sixteen features far out of distribution and the outputs become garbage —
# a ~67%-accuracy student scored 0.10 mastery in testing.
WINDOW_SIZE = 5

# The model needs a sequence to attend over; below this it is noise.
MIN_WINDOWS = 3
# Full confidence once the student has this many windows of history.
FULL_CONFIDENCE_WINDOWS = 8
MAX_SEQUENCE_LENGTH = 250  # raw answers, i.e. up to 50 windows

# Difficulty encoded as the continuous value the model was trained on, and the
# thresholds used to read its difficulty head back out.
DIFFICULTY_TO_SCALAR = {"low": 0.3, "mid": 0.5, "high": 0.7}
DIFFICULTY_BANDS = ((0.40, "low"), (0.62, "mid"))  # else "high"

CHECKPOINT_CANDIDATES = (
    os.getenv("MODEL_CHECKPOINT_PATH", ""),
    "models/best_adaptive_sakt.pth",
    "checkpoints/best_adaptive_sakt.pth",
)

# How much authority the model is given:
#   off       - do not load it at all
#   advisory  - run it, report predictions, but never override the rules
#   active    - let it blend mastery/pace and nudge difficulty
# Defaults to advisory: a model that has not passed the calibration probe below
# must not be allowed to steer a student's difficulty.
SAKT_MODE = os.getenv("SAKT_MODE", "advisory").strip().lower()

# Calibration probe thresholds. A usable model must (a) separate a weak student
# from a strong one and (b) not sit pinned at the ends of its sigmoids.
MIN_MASTERY_SPREAD = 0.25
SATURATION_LIMIT = 0.98


def scalar_to_difficulty(value: float) -> str:
    for threshold, label in DIFFICULTY_BANDS:
        if value < threshold:
            return label
    return "high"


class SAKTService:
    """Loads the checkpoint once and serves predictions, or stays disabled."""

    def __init__(self):
        self.model = None
        self.metadata: Dict[str, Any] = {}
        self.num_skills = 0
        self.enabled = False
        self.status = "not_loaded"
        self.checkpoint_path: Optional[str] = None
        self.mode = SAKT_MODE
        self.calibration: Dict[str, Any] = {}

    @property
    def steers_difficulty(self) -> bool:
        """True only when the model is trusted to change what a student sees."""
        return self.enabled and self.mode == "active"

    # ------------------------------------------------------------- loading --

    def initialize(self) -> bool:
        if self.mode == "off":
            self.status = "disabled by SAKT_MODE=off"
            return False

        try:
            import torch  # noqa: F401
        except ImportError:
            self.status = "torch not installed"
            logger.warning("SAKT disabled: torch is not installed")
            return False

        path = self._resolve_checkpoint()
        if not path:
            self.status = "checkpoint not found"
            logger.warning(
                "SAKT disabled: no checkpoint at any of %s",
                [p for p in CHECKPOINT_CANDIDATES if p],
            )
            return False

        try:
            from models.adaptive_sakt import load_sakt_model

            self.model, self.metadata = load_sakt_model(path, device="cpu")
            self.num_skills = int(self.metadata.get("num_skills", 0))
            self.checkpoint_path = path
            self.enabled = True
            logger.info(
                "SAKT loaded from %s (skills=%s, epoch=%s, val_loss=%.4f)",
                path, self.num_skills,
                self.metadata.get("epoch"), self.metadata.get("val_loss", float("nan")),
            )

            self.calibration = self.run_calibration_probe()
            if self.calibration["usable"]:
                self.status = "ready"
            else:
                # Loaded, but not trustworthy enough to steer a student. Demote
                # to advisory rather than let it pick difficulties.
                if self.mode == "active":
                    self.mode = "advisory"
                    logger.warning(
                        "SAKT demoted to advisory: %s", self.calibration["reason"]
                    )
                self.status = f"advisory ({self.calibration['reason']})"
            return True
        except Exception as e:  # noqa: BLE001
            self.status = f"load failed: {e}"
            logger.error("SAKT disabled: %s", e)
            return False

    def run_calibration_probe(self) -> Dict[str, Any]:
        """
        Check the loaded model against synthetic weak and strong students.

        A knowledge-tracing model that scores a 15%-accuracy student the same as
        a 95% one cannot personalise anything, and one whose sigmoid is pinned at
        an endpoint is being fed inputs outside its training range — usually a
        missing feature scaler. Either way it must not choose difficulties.
        """
        try:
            import torch

            def synthetic(accuracy: float, steps: int = 6):
                sequence = []
                cumulative = 0
                previous = 0.0
                for step in range(steps):
                    questions = WINDOW_SIZE
                    correct = round(questions * accuracy)
                    rate = correct / questions
                    cumulative += questions
                    minutes = questions * 2.0
                    hints = float(questions - correct)
                    sequence.append([
                        1.0, float(questions), float(correct),
                        1.0 if correct == questions else 0.0, rate, minutes,
                        hints, hints / questions, rate, float(step + 1), 0.5,
                        rate * 100.0 / minutes, 1.0 if rate < 0.5 else 0.0,
                        float(cumulative), 1.0, max(0.0, rate - previous),
                    ])
                    previous = rate
                return sequence

            readings = {}
            for label, accuracy in (("weak", 0.15), ("strong", 0.95)):
                tensor = torch.tensor([synthetic(accuracy)], dtype=torch.float32)
                with torch.no_grad():
                    mastery, difficulty, pace, _, _ = self.model(tensor)
                readings[label] = {
                    "mastery": float(mastery.item()),
                    "difficulty": float(difficulty.item()),
                    "pace": float(pace.item()),
                }

            spread = readings["strong"]["mastery"] - readings["weak"]["mastery"]
            saturated = [
                head for head in ("mastery", "difficulty", "pace")
                if all(
                    readings[s][head] > SATURATION_LIMIT or readings[s][head] < 1 - SATURATION_LIMIT
                    for s in ("weak", "strong")
                )
            ]

            if saturated:
                reason = (
                    f"output head(s) {', '.join(saturated)} are saturated - the "
                    "checkpoint saved no feature scaler, so inputs fall outside "
                    "its training range"
                )
                usable = False
            elif spread < MIN_MASTERY_SPREAD:
                reason = (
                    f"mastery separates a 15% student from a 95% one by only "
                    f"{spread:.3f} (need {MIN_MASTERY_SPREAD})"
                )
                usable = False
            else:
                reason = "passed"
                usable = True

            return {
                "usable": usable,
                "reason": reason,
                "mastery_spread": round(spread, 4),
                "saturated_heads": saturated,
                "readings": readings,
            }
        except Exception as e:  # noqa: BLE001
            return {"usable": False, "reason": f"probe failed: {e}", "readings": {}}

    @staticmethod
    def _resolve_checkpoint() -> Optional[str]:
        service_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for candidate in CHECKPOINT_CANDIDATES:
            if not candidate:
                continue
            for path in (candidate, os.path.join(service_root, candidate)):
                if os.path.isfile(path):
                    return path
        return None

    # ------------------------------------------------------------ features --

    def skill_index_for_unit(self, unit_ordinals: Dict[str, int], unit_id: str) -> int:
        """
        Map a course unit onto the model's fixed skill space.

        The checkpoint knows 5 skills indexed 1..5 (0 is the embedding's padding
        slot). Courses with more units are clamped onto the last skill, which is
        a real loss of resolution — `coverage_warning` reports when it happens.
        """
        ordinal = unit_ordinals.get(str(unit_id), 1)
        return max(1, min(ordinal, self.num_skills or 1))

    def unit_ordinals(self, course_id: str) -> Dict[str, int]:
        units = units_collection.find(
            {"course": ObjectId(course_id)}, {"unitNumber": 1}
        ).sort("unitNumber", 1)
        return {str(u["_id"]): i + 1 for i, u in enumerate(units)}

    def build_feature_sequence(
        self, student_id: str, course_id: str, unit_ordinals: Dict[str, int]
    ) -> List[List[float]]:
        """
        Build the 16-feature-per-step sequence the model expects, from the
        adaptive submission history.

        Note this reads `adaptivequiz_submissions` — the collection the adaptive
        loop actually writes to. `StudentTracker` built its sequence from
        `quizsubmissions`, which the adaptive flow never touches, so it would
        have produced an empty sequence for every adaptive learner.
        """
        submissions = list(
            adaptivequiz_submissions_collection.find(
                {"student_id": str(student_id), "course_id": str(course_id)}
            ).sort("submitted_at", 1).limit(MAX_SEQUENCE_LENGTH)
        )
        if not submissions:
            return []

        # Group consecutive answers into quiz-sized windows so each step matches
        # the shape the model was trained on.
        windows = [
            submissions[i:i + WINDOW_SIZE]
            for i in range(0, len(submissions), WINDOW_SIZE)
        ]
        # A trailing window of one or two answers is too thin to look like a
        # quiz; drop it rather than feed a distorted final step.
        if len(windows) > 1 and len(windows[-1]) < 3:
            windows.pop()

        features: List[List[float]] = []
        cumulative_attempts = 0
        cumulative_correct = 0
        units_seen = set()
        previous_accuracy = 0.0

        for index, window in enumerate(windows):
            total_questions = len(window)
            correct_answers = sum(1 for s in window if s.get("is_correct"))
            accuracy = correct_answers / total_questions

            cumulative_attempts += total_questions
            cumulative_correct += correct_answers

            # Skill = the unit the student spent most of this window in.
            unit_counts: Dict[str, int] = {}
            for s in window:
                unit = str(s.get("unit_id", ""))
                units_seen.add(unit)
                unit_counts[unit] = unit_counts.get(unit, 0) + 1
            dominant_unit = max(unit_counts, key=unit_counts.get)
            skill_index = self.skill_index_for_unit(unit_ordinals, dominant_unit)

            difficulty = sum(
                DIFFICULTY_TO_SCALAR.get(str(s.get("difficulty", "low")).lower(), 0.3)
                for s in window
            ) / total_questions

            # Real time on task where recorded, else the same 2 min/question
            # default the training pipeline used.
            recorded = [
                float(s["time_spent_seconds"]) / 60.0
                for s in window
                if s.get("time_spent_seconds")
            ]
            time_spent = sum(recorded) if recorded else total_questions * 2.0
            # Students leave tabs open; cap so one idle window cannot dominate.
            time_spent = max(0.1, min(time_spent, total_questions * 10.0))

            # Training used incorrect-answer count as the hints proxy, so match
            # it rather than sending a constant zero the model never saw.
            hints_used = float(total_questions - correct_answers)
            hint_dependency = hints_used / total_questions

            score_percentage = accuracy * 100.0
            efficiency = score_percentage / max(time_spent, 0.1)
            all_correct = 1.0 if correct_answers == total_questions else 0.0
            average_time = time_spent / total_questions
            struggling = 1.0 if (
                hint_dependency > 0.5 or average_time > 5.0 or accuracy < 0.5
            ) else 0.0
            mastery_gain = max(0.0, accuracy - previous_accuracy)
            previous_accuracy = accuracy

            features.append([
                float(skill_index),           # 0  skill index (embedded)
                float(total_questions),       # 1  questions attempted
                float(correct_answers),       # 2  questions correct
                all_correct,                  # 3  is_correct (whole window)
                float(accuracy),              # 4  accuracy rate
                float(time_spent),            # 5  minutes on task
                hints_used,                   # 6  hints used
                float(hint_dependency),       # 7  hint dependency
                float(score_percentage / 100.0),  # 8  normalised score
                float(index + 1),             # 9  attempt number
                float(difficulty),            # 10 question difficulty
                float(efficiency),            # 11 efficiency
                float(struggling),            # 12 struggling flag
                float(cumulative_attempts),   # 13 cumulative attempts
                float(len(units_seen)),       # 14 units touched
                float(mastery_gain),          # 15 mastery gain
            ])

        return features

    # ----------------------------------------------------------- inference --

    def predict(self, student_id: str, course_id: str) -> Optional[Dict[str, Any]]:
        """
        Run knowledge tracing over the student's history.

        Returns None whenever the prediction would not be trustworthy, so the
        caller can fall back to the rule engine rather than act on noise.
        """
        if not self.enabled:
            return None

        try:
            import torch

            ordinals = self.unit_ordinals(course_id)
            sequence = self.build_feature_sequence(student_id, course_id, ordinals)
            if len(sequence) < MIN_WINDOWS:
                return None

            tensor = torch.tensor([sequence], dtype=torch.float32)
            with torch.no_grad():
                mastery, difficulty, pace, next_skill_logits, _ = self.model(tensor)

            probabilities = next_skill_logits.softmax(dim=1).squeeze(0)
            predicted_skill = int(probabilities.argmax().item()) + 1  # 1-based

            # Confidence grows with history: three windows is a much weaker
            # signal than eight, and the blend must reflect that.
            confidence = min(len(sequence) / FULL_CONFIDENCE_WINDOWS, 1.0)

            difficulty_score = float(difficulty.item())
            return {
                "mastery": float(mastery.item()),
                "difficulty_score": difficulty_score,
                "difficulty": scalar_to_difficulty(difficulty_score),
                "pace": float(pace.item()),
                "predicted_skill": predicted_skill,
                "skill_probabilities": [float(p) for p in probabilities],
                "confidence": round(confidence, 3),
                "sequence_length": len(sequence),
                # True when the course has more units than the model has skills,
                # so several units are sharing one embedding.
                "coverage_warning": len(ordinals) > self.num_skills,
                "units_in_course": len(ordinals),
                "model_skills": self.num_skills,
            }
        except Exception as e:  # noqa: BLE001
            logger.error("SAKT prediction failed, falling back to rules: %s", e)
            return None

    def recommended_unit_id(
        self, course_id: str, prediction: Dict[str, Any]
    ) -> Optional[str]:
        """Translate the predicted skill index back to a unit in this course."""
        if not prediction:
            return None
        ordinals = self.unit_ordinals(course_id)
        target = prediction.get("predicted_skill")
        for unit_id, ordinal in ordinals.items():
            if ordinal == target:
                return unit_id
        return None

    def health(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "mode": self.mode,
            "steers_difficulty": self.steers_difficulty,
            "status": self.status,
            "checkpoint": self.checkpoint_path,
            "num_skills": self.num_skills,
            "epoch": self.metadata.get("epoch"),
            "val_loss": self.metadata.get("val_loss"),
            "calibration": {
                k: v for k, v in self.calibration.items() if k != "readings"
            },
        }


sakt_service = SAKTService()
