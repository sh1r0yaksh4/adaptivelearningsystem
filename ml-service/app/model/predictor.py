from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd


ARTIFACT = Path(__file__).resolve().parents[3] / "artifacts/models/best-next-correct.joblib"


@lru_cache
def load_model():
    if not ARTIFACT.exists():
        return None
    return joblib.load(ARTIFACT)


def predict_difficulty(data):
    artifact = load_model()
    if artifact:
        base = data.model_dump()
        candidates = {"easy": 2, "medium": 5, "hard": 8}
        probabilities = {}
        for difficulty, score in candidates.items():
            row = {**base, "difficulty_score": score}
            probabilities[difficulty] = float(artifact["model"].predict_proba(pd.DataFrame([row]))[0, 1])
        # Choose a productive-success band instead of maximising easy-item accuracy.
        difficulty = min(probabilities, key=lambda name: abs(probabilities[name] - 0.72))
        return {"nextDifficulty": difficulty, "predictedSuccess": probabilities[difficulty], "policy": "ml", "model": artifact["model_name"]}

    if data.isCorrect and data.timeTaken < 60:
        return {"nextDifficulty": "hard", "policy": "fallback_rule"}

    elif data.isCorrect:
        return {"nextDifficulty": "medium", "policy": "fallback_rule"}

    else:
        return {"nextDifficulty": "easy", "policy": "fallback_rule"}
