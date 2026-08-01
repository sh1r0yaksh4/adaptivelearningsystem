# Model Benchmark Protocol

Run the generator, then the learner-grouped benchmark:

```bash
PYTHONPATH=ml-service ml-service/venv/bin/python -m app.research.generate_dataset --learners 200 --items 24
PYTHONPATH=ml-service ml-service/venv/bin/python -m app.research.train_models data/synthetic/interactions.csv
```

The suite compares the required logistic regression, decision tree, random forest, XGBoost, LightGBM, CatBoost, and MLP models. It partitions by `learner_id`, not event, to prevent the same simulated learner appearing in training and test. It reports accuracy, precision, recall, F1, ROC-AUC, training time, and per-row inference time.

Native gradient-boosting imports are checked individually. If a backend cannot load, it appears under `unavailable_models` in the JSON output and must be resolved before claiming a complete required-model comparison. On macOS, XGBoost and LightGBM commonly need `brew install libomp`.

The initial prediction target is `next_correct`. Each feature row is an interaction completed before the next question, and the label is shifted within learner. This makes response-time and behaviour aggregates available at the point of the next decision rather than leaking a response's own trace into its label. Model metrics are predictive benchmarks, not closed-loop evidence of superior learning efficiency.

The training command also persists the held-out ROC-AUC winner at `artifacts/models/best-next-correct.joblib`. Set `ADAPTIVE_POLICY=ml` when starting the Node backend to enable the model-backed policy; otherwise the explainable rule policy remains the default. The service scores easy, medium, and hard candidates and selects the difficulty closest to a 0.72 predicted-success target. Every ML override includes its model name and probability in the API recommendation.
