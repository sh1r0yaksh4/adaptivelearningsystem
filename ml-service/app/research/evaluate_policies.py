"""Closed-loop synthetic benchmark for curriculum and adaptive policies."""
from __future__ import annotations

import argparse
import csv
import json
from math import exp
from pathlib import Path
from random import Random
from statistics import mean, median

from app.research.concept_graph import CONCEPTS, next_roadmap_item
from app.research.simulator import StudentSimulator, clamp


POLICIES = ("static", "legacy_rule", "improved_rule", "ml_based")


def sigmoid(value: float) -> float:
    return 1 / (1 + exp(-value))


def difficulty_for(policy: str, knowledge: float, fatigue: float, confidence: float, event: int) -> int:
    if policy == "static":
        return min(10, 1 + event // 3)
    if policy == "legacy_rule":
        return 1 if knowledge < .4 else 5 if knowledge < .75 else 9
    if policy == "improved_rule":
        base = 1 if knowledge < .4 else 5 if knowledge < .75 else 9
        return int(clamp(base - (2 if fatigue > .7 else 0) - (1 if confidence < .35 else 0), 1, 10))
    # A deliberately simple ML-policy proxy: it maximizes predicted success
    # close to a productive-desirable-difficulty band, not raw correctness.
    candidates = range(1, 11)
    scored = [(score, sigmoid(4.2 * (knowledge - score / 10) + 1.1 * confidence - 1.6 * fatigue)) for score in candidates]
    return min(scored, key=lambda pair: abs(pair[1] - .72))[0]


def bootstrap_interval(values: list[float], seed: int, samples: int = 1000) -> tuple[float, float]:
    generator = Random(seed)
    estimates = sorted(mean([generator.choice(values) for _ in values]) for _ in range(samples))
    return estimates[int(samples * .025)], estimates[int(samples * .975)]


def run_policy(profile, policy: str, max_items: int, mastery_threshold: float):
    random = Random(f"{profile.learner_id}:{policy}")
    knowledge, confidence, fatigue = profile.initial_knowledge, profile.confidence, 0.0
    mastery = {concept.concept_id: knowledge * .65 for concept in CONCEPTS}
    elapsed = 0.0
    for event in range(1, max_items + 1):
        roadmap = next_roadmap_item(mastery)
        difficulty = difficulty_for(policy, knowledge, fatigue, confidence, event)
        probability = sigmoid(4.2 * (knowledge - difficulty / 10) + 1.1 * confidence - 1.6 * fatigue)
        correct = random.random() < probability
        response_time = max(4, 18 + difficulty * 5 + fatigue * 28 - knowledge * 8 + random.gauss(0, 4))
        elapsed += response_time
        learning_gain = profile.learning_rate * (1 if correct else .22) * (1.1 - difficulty / 20)
        mastery[roadmap["concept_id"]] = clamp(mastery[roadmap["concept_id"]] * profile.retention + learning_gain)
        knowledge = mean(mastery.values())
        confidence = clamp(confidence + (.045 if correct else -.05))
        fatigue = clamp(fatigue + profile.fatigue_growth * (1 + difficulty / 10))
        if all(value >= mastery_threshold for value in mastery.values()):
            return {"mastered": True, "questions": event, "time_seconds": elapsed, "final_mastery": knowledge}
    return {"mastered": False, "questions": max_items, "time_seconds": elapsed, "final_mastery": knowledge}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--learners", type=int, default=300)
    parser.add_argument("--seed", type=int, default=20260726)
    parser.add_argument("--max-items", type=int, default=80)
    parser.add_argument("--mastery-threshold", type=float, default=.80)
    parser.add_argument("--output", type=Path, default=Path("artifacts/evaluation/policy-results.json"))
    args = parser.parse_args()
    profiles = StudentSimulator(args.seed).make_profiles(args.learners)
    raw = {policy: [run_policy(profile, policy, args.max_items, args.mastery_threshold) for profile in profiles] for policy in POLICIES}
    summary = {}
    for offset, (policy, rows) in enumerate(raw.items()):
        times = [row["time_seconds"] for row in rows]
        questions = [row["questions"] for row in rows]
        summary[policy] = {
            "mastery_rate": round(mean(row["mastered"] for row in rows), 6),
            "mean_time_seconds": round(mean(times), 6),
            "median_time_seconds": round(median(times), 6),
            "mean_questions": round(mean(questions), 6),
            "mean_final_mastery": round(mean(row["final_mastery"] for row in rows), 6),
            "time_mean_95_ci": [round(value, 6) for value in bootstrap_interval(times, args.seed + offset)],
        }
    # Statistical Significance Testing between Policy Pairs
    import itertools
    import numpy as np
    from scipy import stats

    pairs_results = []
    policy_names = list(POLICIES)
    num_comparisons = len(list(itertools.combinations(policy_names, 2)))

    for p_a, p_b in itertools.combinations(policy_names, 2):
        times_a = np.array([row["time_seconds"] for row in raw[p_a]])
        times_b = np.array([row["time_seconds"] for row in raw[p_b]])
        diff = times_a - times_b

        # Normality test
        _, shapiro_p = stats.shapiro(diff) if len(diff) <= 5000 else (0, 0)
        is_normal = shapiro_p > 0.05

        if is_normal:
            stat_val, p_val = stats.ttest_rel(times_a, times_b)
            test_name = "paired_ttest"
        else:
            stat_val, p_val = stats.wilcoxon(times_a, times_b)
            test_name = "wilcoxon_signed_rank"

        p_bonf = min(1.0, p_val * num_comparisons)
        std_diff = np.std(diff, ddof=1)
        cohens_d = float(np.mean(diff) / std_diff) if std_diff != 0 else 0.0

        pairs_results.append({
            "policy_a": p_a,
            "policy_b": p_b,
            "test_name": test_name,
            "statistic": round(float(stat_val), 6),
            "p_value": round(float(p_val), 8),
            "p_value_bonferroni": round(float(p_bonf), 8),
            "cohens_d": round(cohens_d, 6),
            "significant_alpha_005": bool(p_bonf < 0.05)
        })

    result = {
        "evaluation_type": "synthetic_closed_loop",
        "seed": args.seed,
        "learners": args.learners,
        "max_items": args.max_items,
        "mastery_threshold": args.mastery_threshold,
        "policies": summary,
        "statistical_tests": pairs_results
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    # Export pairwise test CSV
    with (args.output.parent / "pairwise-tests.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=["policy_a", "policy_b", "test_name", "statistic", "p_value", "p_value_bonferroni", "cohens_d", "significant_alpha_005"])
        writer.writeheader()
        writer.writerows(pairs_results)

    with args.output.with_suffix(".csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=["policy", "learner_index", "mastered", "questions", "time_seconds", "final_mastery"])
        writer.writeheader()
        for policy, rows in raw.items():
            writer.writerows({"policy": policy, "learner_index": index, **row} for index, row in enumerate(rows, 1))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
