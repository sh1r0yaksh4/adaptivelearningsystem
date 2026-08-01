# Model Card: Next-Response Performance Predictor (CatBoost Benchmark Leader)

## Model Details
- **Model Name**: CatBoost Next-Correct Classifier (`artifacts/models/best-next-correct.joblib`)
- **Model Version**: `1.0.0`
- **Model Architecture**: Gradient-Boosted Decision Trees (CatBoostClassifier, `iterations=120, depth=5, learning_rate=0.06`)
- **Developer**: Adaptive Learning Research Architect Team
- **Date**: July 2026

## Intended Use
- **Primary Use Case**: Predict the probability of a learner correctly answering their *next* question given behavioral telemetry from the prior interaction.
- **Decision Loop Integration**: Used by the FastAPI service to score item difficulty candidates (`easy`, `medium`, `hard`) and select the difficulty targeting the optimal desirable difficulty zone ($\approx 0.72$ target success probability).
- **Out of Scope**: High-stakes student assessment or grading without human oversight.

## Benchmark Model Comparison

All models trained on 6,525 interaction records (225 training learners) and evaluated on 2,175 held-out interaction records (75 testing learners). Learner-grouped split prevents data leakage.

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Inference (ms/row) |
|---|---|---|---|---|---|---|
| **CatBoost (Selected)** | **0.7977** | **0.7425** | **0.6492** | **0.6927** | **0.8637** | **0.0030** |
| Random Forest | 0.7954 | 0.7465 | 0.6322 | 0.6846 | 0.8580 | 0.0154 |
| XGBoost | 0.8000 | 0.7408 | 0.6623 | 0.6994 | 0.8570 | 0.0037 |
| LightGBM | 0.7963 | 0.7357 | 0.6558 | 0.6934 | 0.8558 | 0.0061 |
| MLP Neural Net | 0.7839 | 0.7149 | 0.6401 | 0.6754 | 0.8405 | 0.0022 |
| Logistic Regression | 0.7724 | 0.7066 | 0.6021 | 0.6502 | 0.8235 | 0.0039 |
| Decision Tree | 0.7738 | 0.7222 | 0.5785 | 0.6424 | 0.8180 | 0.0020 |

---

## Top Feature Importances (CatBoost)

1. `difficulty_score` (32.26%): Numerical difficulty weighting of the item.
2. `knowledge_before` (25.65%): Rule-inferred student mastery level.
3. `total_response_time` (11.89%): Total elapsed seconds on the preceding item.
4. `hover_time` (9.93%): Total hover duration over option buttons.
5. `reading_time` (4.35%): Estimated time spent initial-reading the question text.

---

## Ethical & Privacy Considerations
- **Synthetic Data**: Trained entirely on seeded synthetic learner profiles (`StudentSimulator`).
- **Privacy Minimization**: Operates on aggregated time and count features; does not store raw keystroke content or raw mouse coordinate logs.
