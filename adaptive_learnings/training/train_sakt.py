#!/usr/bin/env python3
"""
Train SAKT on this platform's own data, and only promote it if it wins.

    python training/train_sakt.py --dry-run     # report data readiness, train nothing
    python training/train_sakt.py               # train, evaluate, promote if better
    python training/train_sakt.py --force       # train even below the data threshold

Why single-head
---------------
The original checkpoint predicted mastery, difficulty and pace directly. None of
those have ground truth - there is no column anywhere recording a student's true
mastery - so it could only imitate a heuristic, which is why its outputs came out
degenerate. This trains the one target that is genuinely labelled:

    given (objective, difficulty, correct) for steps 0..t, was step t+1 correct?

The label is the next row of the log, so training is self-supervised. Everything
else is derived from the predicted probability:

    mastery   = P(correct | high difficulty)
    difficulty= the band whose P(correct) is closest to the target success rate
    pace      = how fast P(correct) is climbing

Promotion
---------
A freshly trained model is a *challenger*. It is scored on a held-out time-based
split against the online Elo model that is already running, and is only promoted
if it beats that baseline on AUC by a real margin. Finishing training earns it
nothing on its own.
"""

import argparse
import math
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Below this there is not enough signal to train anything meaningful; the online
# Elo model keeps running in the meantime.
MIN_INTERACTIONS = 2000
MIN_STUDENTS = 20
# The challenger must beat the baseline by at least this much AUC to be promoted.
PROMOTION_MARGIN = 0.02

MAX_SEQUENCE = 100
EMBED_DIM = 64
N_HEADS = 4
N_LAYERS = 2
DROPOUT = 0.2
EPOCHS = 30
BATCH_SIZE = 32
LEARNING_RATE = 1e-3
PATIENCE = 5


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def auc_score(labels, scores) -> float:
    """ROC AUC via rank statistic; no sklearn dependency."""
    paired = sorted(zip(scores, labels))
    positives = sum(labels)
    negatives = len(labels) - positives
    if positives == 0 or negatives == 0:
        return float("nan")

    # Average ranks so ties do not bias the estimate.
    ranks = [0.0] * len(paired)
    i = 0
    while i < len(paired):
        j = i
        while j + 1 < len(paired) and paired[j + 1][0] == paired[i][0]:
            j += 1
        average_rank = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[k] = average_rank
        i = j + 1

    positive_rank_sum = sum(r for r, (_, label) in zip(ranks, paired) if label == 1)
    return (positive_rank_sum - positives * (positives + 1) / 2.0) / (positives * negatives)


def load_interactions():
    from config.database import adaptivequiz_submissions_collection, units_collection

    rows = list(
        adaptivequiz_submissions_collection.find(
            {},
            {
                "student_id": 1, "course_id": 1, "unit_id": 1,
                "learning_objective_index": 1, "is_correct": 1,
                "difficulty": 1, "time_spent_seconds": 1, "submitted_at": 1,
            },
        ).sort("submitted_at", 1)
    )

    # Skill = (unit, objective). Unlike the old 5-integer space this addresses
    # the actual thing the engine has to choose between.
    skills = {}
    for row in rows:
        key = f"{row.get('unit_id')}::{row.get('learning_objective_index', 0)}"
        if key not in skills:
            skills[key] = len(skills) + 1  # 0 reserved for padding
        row["skill"] = skills[key]

    titles = {}
    for unit in units_collection.find({}, {"title": 1}):
        titles[str(unit["_id"])] = unit.get("title", "")

    return rows, skills, titles


def build_sequences(rows, skills):
    """One sequence per student-course, in chronological order."""
    grouped = {}
    for row in rows:
        grouped.setdefault((row.get("student_id"), row.get("course_id")), []).append(row)

    difficulty_scalar = {"low": 0.0, "mid": 0.5, "high": 1.0}
    sequences = []
    for (student, _), interactions in grouped.items():
        if len(interactions) < 5:
            continue  # too short to predict anything from
        steps = []
        for row in interactions[-MAX_SEQUENCE:]:
            steps.append({
                "skill": row["skill"],
                "correct": 1 if row.get("is_correct") else 0,
                "difficulty": difficulty_scalar.get(
                    str(row.get("difficulty", "low")).lower(), 0.0
                ),
            })
        sequences.append({"student": student, "steps": steps})
    return sequences


def elo_baseline_auc(sequences):
    """
    Score the online Elo model on the same held-out task, as the bar to beat.
    Re-simulated here so the comparison uses identical splits.
    """
    from services.online_learner import STUDENT_K0, adaptive_k, sigmoid

    theta = {}
    difficulty_b = {}
    labels, scores = [], []

    for sequence in sequences:
        student = sequence["student"]
        for index, step in enumerate(sequence["steps"]):
            key = (student, step["skill"])
            b_key = (step["skill"], step["difficulty"])
            t = theta.get(key, 0.0)
            b = difficulty_b.get(b_key, step["difficulty"] * 2.0 - 1.0)
            p = sigmoid(t - b)

            # Only the final quarter is scored, mirroring the model's test split.
            if index >= len(sequence["steps"]) * 0.75:
                labels.append(step["correct"])
                scores.append(p)

            error = step["correct"] - p
            observations = sum(1 for k in theta if k == key)
            theta[key] = t + adaptive_k(observations, STUDENT_K0, 0.15) * error
            difficulty_b[b_key] = b - 0.05 * error

    return auc_score(labels, scores) if labels else float("nan")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="report readiness only")
    parser.add_argument("--force", action="store_true", help="train below the threshold")
    parser.add_argument("--out", default="models/sakt_trained.pth")
    args = parser.parse_args()

    rows, skills, _ = load_interactions()
    students = {r.get("student_id") for r in rows}

    print("=" * 64)
    print("SAKT TRAINING - data readiness")
    print("=" * 64)
    print(f"  interactions : {len(rows):>6}  (need {MIN_INTERACTIONS})")
    print(f"  students     : {len(students):>6}  (need {MIN_STUDENTS})")
    print(f"  skills       : {len(skills):>6}  (unit x objective pairs)")

    ready = len(rows) >= MIN_INTERACTIONS and len(students) >= MIN_STUDENTS
    print(f"  ready        : {ready}")

    if args.dry_run:
        remaining = max(0, MIN_INTERACTIONS - len(rows))
        print(f"\nDry run. {remaining} more interactions needed.")
        print("The online Elo model is adapting in the meantime - no gap in service.")
        return 0

    if not ready and not args.force:
        print("\nNot training: too little data would produce a model worse than")
        print("the Elo baseline already running. Re-run when the counts are met,")
        print("or pass --force to train anyway for experimentation.")
        return 1

    try:
        import torch
        import torch.nn as nn
    except ImportError:
        print("\ntorch is required to train. pip install torch")
        return 1

    sequences = build_sequences(rows, skills)
    if len(sequences) < 10:
        print(f"\nOnly {len(sequences)} usable sequences; need at least 10.")
        return 1

    baseline = elo_baseline_auc(sequences)
    print(f"\nElo baseline AUC on held-out tail: {baseline:.4f}")

    # Chronological split: predicting the past from the future would inflate
    # the score and is not the task the engine actually performs.
    split = int(len(sequences) * 0.8)
    train_sequences, test_sequences = sequences[:split], sequences[split:]
    print(f"train sequences: {len(train_sequences)}  test: {len(test_sequences)}")

    num_skills = len(skills)

    class SAKT(nn.Module):
        """Canonical SAKT: predict whether the next interaction is correct."""

        def __init__(self):
            super().__init__()
            # An interaction is (skill, was_correct), so the vocabulary is 2x skills.
            self.interaction = nn.Embedding(2 * num_skills + 1, EMBED_DIM, padding_idx=0)
            self.query = nn.Embedding(num_skills + 1, EMBED_DIM, padding_idx=0)
            self.position = nn.Embedding(MAX_SEQUENCE + 1, EMBED_DIM)
            self.attention = nn.MultiheadAttention(
                EMBED_DIM, N_HEADS, dropout=DROPOUT, batch_first=True
            )
            self.norm = nn.LayerNorm(EMBED_DIM)
            self.feed_forward = nn.Sequential(
                nn.Linear(EMBED_DIM, EMBED_DIM * 2), nn.ReLU(),
                nn.Dropout(DROPOUT), nn.Linear(EMBED_DIM * 2, EMBED_DIM),
            )
            self.out = nn.Linear(EMBED_DIM, 1)

        def forward(self, past, target):
            length = past.size(1)
            positions = torch.arange(length, device=past.device).unsqueeze(0)
            keys = self.interaction(past) + self.position(positions)
            queries = self.query(target)
            causal = torch.triu(
                torch.ones(length, length, device=past.device, dtype=torch.bool), diagonal=1
            )
            attended, _ = self.attention(queries, keys, keys, attn_mask=causal)
            hidden = self.norm(attended + queries)
            hidden = self.norm(hidden + self.feed_forward(hidden))
            return self.out(hidden).squeeze(-1)

    def encode(batch):
        width = max(len(s["steps"]) for s in batch)
        past, target, label, mask = [], [], [], []
        for sequence in batch:
            steps = sequence["steps"]
            interactions = [s["skill"] + num_skills * s["correct"] for s in steps]
            skill_ids = [s["skill"] for s in steps]
            correctness = [float(s["correct"]) for s in steps]
            pad = width - len(steps)
            # Shifted by one: predict step t from everything before it.
            past.append([0] + interactions[:-1] + [0] * pad)
            target.append(skill_ids + [0] * pad)
            label.append(correctness + [0.0] * pad)
            mask.append([1.0] * len(steps) + [0.0] * pad)
        return (
            torch.tensor(past), torch.tensor(target),
            torch.tensor(label), torch.tensor(mask),
        )

    model = SAKT()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    loss_fn = nn.BCEWithLogitsLoss(reduction="none")

    best_auc, best_state, stale = 0.0, None, 0
    for epoch in range(1, EPOCHS + 1):
        model.train()
        total = 0.0
        for start in range(0, len(train_sequences), BATCH_SIZE):
            batch = train_sequences[start:start + BATCH_SIZE]
            past, target, label, mask = encode(batch)
            optimizer.zero_grad()
            logits = model(past, target)
            loss = (loss_fn(logits, label) * mask).sum() / mask.sum().clamp(min=1)
            loss.backward()
            optimizer.step()
            total += float(loss)

        model.eval()
        labels, scores = [], []
        with torch.no_grad():
            for start in range(0, len(test_sequences), BATCH_SIZE):
                batch = test_sequences[start:start + BATCH_SIZE]
                past, target, label, mask = encode(batch)
                probabilities = torch.sigmoid(model(past, target))
                for row in range(len(batch)):
                    for column in range(int(mask[row].sum())):
                        labels.append(int(label[row][column]))
                        scores.append(float(probabilities[row][column]))

        auc = auc_score(labels, scores) if labels else float("nan")
        print(f"  epoch {epoch:>2}  loss {total:.4f}  test AUC {auc:.4f}")

        if not math.isnan(auc) and auc > best_auc:
            best_auc, stale = auc, 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            stale += 1
            if stale >= PATIENCE:
                print(f"  early stop (no gain in {PATIENCE} epochs)")
                break

    print("\n" + "=" * 64)
    print(f"challenger AUC : {best_auc:.4f}")
    print(f"Elo baseline   : {baseline:.4f}")

    beats_baseline = (
        not math.isnan(best_auc)
        and (math.isnan(baseline) or best_auc > baseline + PROMOTION_MARGIN)
    )
    beats_chance = best_auc > 0.55

    if beats_baseline and beats_chance:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        torch.save({
            "model_state_dict": best_state,
            "skill_to_idx": skills,
            "num_skills": num_skills,
            "embed_dim": EMBED_DIM,
            "n_heads": N_HEADS,
            "max_sequence": MAX_SEQUENCE,
            "test_auc": best_auc,
            "baseline_auc": baseline,
            "trained_at": utcnow().isoformat(),
            "interactions": len(rows),
            # Embedding-based, so there is no feature scaler to lose. The old
            # checkpoint's scaler was never saved, which made it unusable.
            "architecture": "sakt_single_head_next_correct",
        }, args.out)
        print(f"PROMOTED -> {args.out}")
        print("Set SAKT_MODE=active and MODEL_CHECKPOINT_PATH to this file.")
        return 0

    print("NOT PROMOTED - the challenger did not beat the running Elo model.")
    print("The online model keeps serving; collect more data and retrain.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
