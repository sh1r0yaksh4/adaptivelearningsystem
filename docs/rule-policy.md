# Rule Policy v1.2

`backend/src/utils/ruleEngine.js` provides the deterministic **improved rule baseline**. It is deliberately separate from the forthcoming learned policy.

## Inputs and transformations

All signals are aggregate, per-question values. The preprocessor accepts snake_case and camelCase aliases, coerces finite numeric values, bounds count/time features to non-negative values, and parses booleans explicitly. In particular, the strings `"false"`, `"0"`, and `"no"` are false; they are not treated as JavaScript truthy values.

The API derives correctness from the stored answer key whenever a selected answer is present. A browser cannot elevate mastery by supplying `isCorrect: true`.

## State estimates

| State | Evidence used | Intended interpretation |
| --- | --- | --- |
| Knowledge | correctness, difficulty, attempts, short-term accuracy trend | concept-agnostic proficiency proxy |
| Confidence | correctness, relative response time, answer changes, delayed interaction | certainty proxy, not self-report |
| Engagement | tab switches, aggregate pointer movement/speed, idle time | on-task activity proxy |
| Cognitive load | relative response time, correctness, retries, editing and pauses | momentary task-demand proxy |
| Fatigue | session duration, item count, performance and speed drift, idleness | session-level depletion proxy |

Each state is constrained to `[0, 1]`. These values are hypotheses to calibrate against outcomes; they are not validated psychological measurements.

## Difficulty selection

Difficulty is no longer a direct reaction to the latest answer. The policy first assigns a knowledge-band target, then evaluates the latest five interactions for rolling accuracy, response-time ratio, and accuracy trend. It reduces difficulty for sustained struggle, slowing responses, high cognitive load, high fatigue, or low engagement. It promotes difficulty only after at least three accurate and efficient responses with adequate knowledge and confidence. A transition is limited to one level per question to avoid noisy jumps.

## Actions and explanation

The selector preserves the legacy difficulty response and additionally returns a policy version, action, and machine-readable reason codes.

| Trigger | Action | Reason code |
| --- | --- | --- |
| Cognitive load > 0.70 | scaffold | `high_cognitive_load` |
| Fatigue > 0.70 | offer a break | `high_fatigue` |
| Engagement < 0.40 | re-engage | `low_engagement` |
| Knowledge < 0.40 | foundation practice | `low_knowledge` |
| Knowledge and confidence > 0.75, no support trigger | advance hard | `ready_for_challenge` |
| Otherwise | progressive practice | `maintain_progressive_practice` |

Actions are a serving contract and a research logging field. The current UI may only render difficulty; future roadmap work will use the action to choose a concept, scaffold, review item, or break.
