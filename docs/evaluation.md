# Closed-Loop Policy Evaluation

The policy experiment follows the four conditions required by `prompt.pdf`:

1. Static curriculum.
2. Legacy correctness-and-knowledge rule policy.
3. Improved behavioural rule policy.
4. ML-style policy proxy that targets a productive predicted success probability.

Run it reproducibly from the repository root:

```bash
PYTHONPATH=ml-service ml-service/venv/bin/python -m app.research.evaluate_policies --learners 300 --seed 20260726
```

Outputs record mastery rate, time to mastery, questions to mastery, final mastery, and bootstrap 95% confidence intervals. Every policy is evaluated on the same seeded learner cohort. These are simulator results only and must not be presented as results from human participants.
