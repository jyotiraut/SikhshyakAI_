"""
Question generation with Gemini.

The generator is the only place the platform turns course material into
assessment items, so it validates hard: a malformed question corrupts a
student's mastery record, and a silent failure breaks the whole drill loop.
"""

import json
import os
import random
import re
import time
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from dotenv import load_dotenv

from core.logger import logger

load_dotenv()

VALID_DIFFICULTIES = ("low", "mid", "high")
OPTIONS_PER_QUESTION = 4
MAX_ATTEMPTS = 3
RETRY_BASE_DELAY = 1.5

DIFFICULTY_BRIEF = {
    "low": "recall and recognition of a stated fact or definition",
    "mid": "applying a concept to a short scenario, or comparing two ideas",
    "high": "multi-step reasoning, analysis, or judging a non-obvious edge case",
}


class QuizGenerationError(RuntimeError):
    """Raised when a usable quiz could not be produced."""


class AssessmentChain:
    """Generate adaptive quizzes using Gemini"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": 0.6,
                "max_output_tokens": 8000,
                "top_p": 0.95,
                "response_mime_type": "application/json",
            },
        )

    # ------------------------------------------------------------------ api --

    def generate_quiz_from_adaptive_output(
        self,
        adaptive_output: Dict[str, Any],
        assessment_type: str = "quiz",
        avoid_questions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        context = adaptive_output.get("adaptive_context", {}) or {}
        question_count = max(1, int(adaptive_output.get("question_count", 1) or 1))
        difficulty_level = self._normalize_difficulty(context.get("difficulty_level", "low"))

        last_error: Optional[Exception] = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            prompt = self._build_prompt(
                adaptive_output,
                assessment_type,
                avoid_questions or [],
                # Nudge the model harder on retries after a validation failure.
                strict_retry=attempt > 1,
            )
            try:
                raw_text = self._call_model(prompt)
                payload = self._extract_json(raw_text)
                return self._validate_quiz(payload, question_count, difficulty_level)
            except Exception as exc:  # noqa: BLE001 - retried below, re-raised at the end
                last_error = exc
                logger.warning(
                    "Quiz generation attempt %s/%s failed: %s", attempt, MAX_ATTEMPTS, exc
                )
                if attempt < MAX_ATTEMPTS:
                    time.sleep(RETRY_BASE_DELAY * attempt)

        raise QuizGenerationError(
            f"Could not generate a valid quiz after {MAX_ATTEMPTS} attempts: {last_error}"
        )

    # -------------------------------------------------------------- internals --

    def _call_model(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        return self._response_text(response)

    @staticmethod
    def _response_text(response) -> str:
        """
        Read the text out of a Gemini response without assuming a candidate
        exists — `response.text` raises when the answer was blocked or hit the
        output limit, which surfaced to students as an opaque 500.
        """
        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            parts = getattr(getattr(candidate, "content", None), "parts", None) or []
            text = "".join(getattr(p, "text", "") or "" for p in parts).strip()
            if text:
                return text

        feedback = getattr(response, "prompt_feedback", None)
        reason = getattr(feedback, "block_reason", None) if feedback else None
        finish = getattr(candidates[0], "finish_reason", None) if candidates else None
        raise QuizGenerationError(
            f"Gemini returned no usable text (block_reason={reason}, finish_reason={finish})"
        )

    @staticmethod
    def _normalize_difficulty(value: Any) -> str:
        text = str(value or "").strip().lower()
        if text in VALID_DIFFICULTIES:
            return text
        aliases = {
            "easy": "low", "beginner": "low", "basic": "low", "simple": "low",
            "medium": "mid", "moderate": "mid", "intermediate": "mid",
            "hard": "high", "difficult": "high", "advanced": "high",
        }
        return aliases.get(text, "low")

    def _build_prompt(
        self,
        adaptive_output: Dict[str, Any],
        assessment_type: str,
        avoid_questions: List[str],
        strict_retry: bool = False,
    ) -> str:
        context = adaptive_output.get("adaptive_context", {}) or {}
        mastery = context.get("objective_mastery", context.get("mastery_score", 0))
        difficulty_level = self._normalize_difficulty(context.get("difficulty_level", "low"))
        focus_areas = context.get("focus_areas") or []
        question_count = max(1, int(adaptive_output.get("question_count", 1) or 1))
        learning_action = context.get("learning_action", "PRACTICE")
        lo_index = int(context.get("learning_objective_index", 0) or 0)

        unit_content = context.get("unit_content", {}) or {}
        content_text = (unit_content.get("content") or "").strip()
        objectives = unit_content.get("learning_objectives") or []
        focus_objective = unit_content.get("focus_objective") or (
            focus_areas[0] if focus_areas else ""
        )

        if content_text:
            source_block = content_text
            grounding_rule = (
                "Every question MUST be answerable from the UNIT MATERIAL below. "
                "Do not introduce facts, names, or numbers that do not appear there."
            )
        else:
            # No material uploaded yet — say so instead of letting the model
            # quietly invent a syllabus.
            source_block = (
                "(No unit material has been uploaded yet. Write questions that cover the "
                "learning objective using standard, widely-agreed subject knowledge only.)"
            )
            grounding_rule = (
                "No unit material is available. Stay strictly on the target learning "
                "objective and use only mainstream, uncontroversial subject knowledge."
            )

        objectives_block = "\n".join(
            f"{'>>' if i == lo_index else '  '} [{i}] {obj}"
            for i, obj in enumerate(objectives)
        ) or "  (none defined)"

        focus_text = "\n".join(f"- {area}" for area in focus_areas) or "- Core unit concepts"

        avoid_block = ""
        if avoid_questions:
            recent = "\n".join(f"- {q}" for q in avoid_questions[:12])
            avoid_block = (
                "\nALREADY ASKED — do not repeat these, and do not just reword them:\n"
                f"{recent}\n"
            )

        strict_block = ""
        if strict_retry:
            strict_block = (
                "\nThe previous response was rejected for not matching the schema. "
                "Return ONLY the JSON object, with exactly the required keys and types.\n"
            )

        return f"""You are an expert assessment designer writing one adaptive {assessment_type} item at a time for a single student.

TARGET LEARNING OBJECTIVE (index {lo_index})
{focus_objective or 'Core unit concepts'}

ALL OBJECTIVES IN THIS UNIT (>> marks the target)
{objectives_block}

FOCUS AREAS
{focus_text}

STUDENT STATE
- Mastery of the target objective: {round(float(mastery or 0), 2)} on a 0-1 scale
- Recommended next step: {learning_action}

REQUIRED DIFFICULTY: {difficulty_level}
That means: {DIFFICULTY_BRIEF[difficulty_level]}.
{avoid_block}{strict_block}
UNIT MATERIAL
{source_block}

RULES
- {grounding_rule}
- Produce EXACTLY {question_count} multiple-choice question(s).
- Every question targets objective index {lo_index} and nothing else.
- EXACTLY {OPTIONS_PER_QUESTION} options, exactly one correct.
- "correctAnswer" is the 0-based index of the correct option (0-{OPTIONS_PER_QUESTION - 1}).
- Distractors must be plausible and reflect real misconceptions — never "none of the above",
  never joke options, never options that are obviously wrong on length or grammar alone.
- Vary which position holds the correct answer.
- "difficulty" must be exactly "{difficulty_level}".
- "explanation" (1-3 sentences) explains WHY the correct option is right and why a
  tempting wrong option is wrong. This is shown to the student as feedback, so make it teach.
- "learningObjectiveIndex" must be {lo_index}.

Return ONLY this JSON object, no markdown fence, no commentary:
{{
  "title": "short quiz title",
  "difficulty_level": "{difficulty_level}",
  "questions": [
    {{
      "question": "question text",
      "type": "mcq",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": 0,
      "difficulty": "{difficulty_level}",
      "explanation": "why the correct answer is right and a common wrong choice is not",
      "learningObjectiveIndex": {lo_index}
    }}
  ]
}}"""

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        text = (text or "").strip()
        if not text:
            raise QuizGenerationError("Empty response from Gemini")

        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
            text = re.sub(r"```$", "", text).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise QuizGenerationError("No JSON object found in Gemini output")

        candidate = re.sub(r",(\s*[}\]])", r"\1", match.group())
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            raise QuizGenerationError(f"Gemini output was not valid JSON: {exc}") from exc

    def _validate_quiz(
        self, payload: Any, expected_count: int, difficulty_level: str
    ) -> Dict[str, Any]:
        """
        Reject anything the adaptive engine cannot safely consume. An out-of-range
        correctAnswer or a stray difficulty string used to be written straight
        into the student's record.
        """
        if not isinstance(payload, dict):
            raise QuizGenerationError("Expected a JSON object at the top level")

        raw_questions = payload.get("questions")
        if not isinstance(raw_questions, list) or not raw_questions:
            raise QuizGenerationError("Response contained no questions")

        questions: List[Dict[str, Any]] = []
        for index, raw in enumerate(raw_questions[:expected_count]):
            if not isinstance(raw, dict):
                raise QuizGenerationError(f"Question {index} is not an object")

            text = str(raw.get("question", "")).strip()
            if len(text) < 8:
                raise QuizGenerationError(f"Question {index} has no usable text")

            options = raw.get("options")
            if not isinstance(options, list):
                raise QuizGenerationError(f"Question {index} has no options list")
            options = [str(o).strip() for o in options if str(o).strip()]
            if len(options) != OPTIONS_PER_QUESTION:
                raise QuizGenerationError(
                    f"Question {index} has {len(options)} options, expected {OPTIONS_PER_QUESTION}"
                )
            if len({o.lower() for o in options}) != OPTIONS_PER_QUESTION:
                raise QuizGenerationError(f"Question {index} has duplicate options")

            try:
                correct = int(raw.get("correctAnswer"))
            except (TypeError, ValueError) as exc:
                raise QuizGenerationError(
                    f"Question {index} has a non-numeric correctAnswer"
                ) from exc
            if not 0 <= correct < OPTIONS_PER_QUESTION:
                raise QuizGenerationError(
                    f"Question {index} correctAnswer {correct} is out of range"
                )

            explanation = str(raw.get("explanation", "")).strip()
            if not explanation:
                explanation = f"The correct answer is: {options[correct]}."

            questions.append({
                "question": text,
                "type": "mcq",
                "options": options,
                "correctAnswer": correct,
                "difficulty": self._normalize_difficulty(raw.get("difficulty", difficulty_level)),
                "explanation": explanation,
                "learningObjectiveIndex": max(0, int(raw.get("learningObjectiveIndex", 0) or 0)),
            })

        if len(questions) < expected_count:
            raise QuizGenerationError(
                f"Expected {expected_count} questions, got {len(questions)}"
            )

        return {
            "title": str(payload.get("title") or "Adaptive Quiz").strip()[:120],
            "difficulty_level": difficulty_level,
            "questions": questions,
        }

    @staticmethod
    def shuffle_options(question: Dict[str, Any]) -> Dict[str, Any]:
        """
        Randomise option order. Models have a strong positional bias toward the
        first option, which a student notices within a handful of questions.
        """
        options = list(question["options"])
        correct_text = options[question["correctAnswer"]]
        random.shuffle(options)
        question["options"] = options
        question["correctAnswer"] = options.index(correct_text)
        return question
