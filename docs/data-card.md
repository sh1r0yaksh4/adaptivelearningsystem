# Data Card: Synthetic ALP Student Interaction Dataset

## Dataset Overview
- **Dataset Identifier**: `alp-synthetic-v1`
- **File Location**: `artifacts/datasets/interactions.csv`
- **Manifest Location**: `artifacts/datasets/interactions.manifest.json`
- **Record Count**: 9,000 interaction records (300 simulated learners, 30 items per learner)
- **Generation Seed**: `20260726`
- **SHA-256 Checksum**: `626a5ceddfe5ba64588686f7f81dd1b411d5c541535d114764a28b96b13f8776`

---

## Learner Archetype Distribution

The 300 simulated learners are sampled across four distinct behavioral archetypes:

| Archetype | Cohort Size | Learning Rate | Initial Knowledge | Confidence | Guessing Prob | Fatigue Growth | Persistence |
|---|---|---|---|---|---|---|---|
| **Steady** | 75 learners | 0.075 | Gaussian(0.35, 0.12) | 0.62 | 0.12 | 0.025 | 0.76 |
| **Rapid** | 75 learners | 0.115 | Gaussian(0.48, 0.12) | 0.72 | 0.10 | 0.020 | 0.72 |
| **Careful** | 75 learners | 0.060 | Gaussian(0.35, 0.12) | 0.48 | 0.06 | 0.030 | 0.88 |
| **Fatigable** | 75 learners | 0.75 learners | Gaussian(0.35, 0.12) | 0.57 | 0.13 | 0.060 | 0.58 |

---

## Schema & Feature Definitions

| Field Name | Type | Description |
|---|---|---|
| `learner_id` | String | Unique learner identifier (e.g. `sim-00001`) |
| `archetype` | String | Learner behavioral archetype (`steady`, `rapid`, `careful`, `fatigable`) |
| `event_index` | Integer | Chronological sequence index of the question item (1 to 30) |
| `question_id` | String | Item identifier |
| `difficulty` | String | Discrete item difficulty (`easy`, `medium`, `hard`) |
| `difficulty_score` | Integer | Numerical difficulty rating (1 to 10) |
| `knowledge_before` | Float | Inferred student knowledge prior to answering |
| `fatigue_before` | Float | Simulated student fatigue prior to answering |
| `correct` | Boolean | True if learner answered correctly |
| `guessed` | Boolean | True if item was answered via random guessing |
| `total_response_time` | Float | Total elapsed time on question in seconds |
| `reading_time` | Float | Initial reading time prior to interaction in seconds |
| `time_after_last_interaction` | Float | Idle time prior to submission in seconds |
| `attempts` | Integer | Number of attempt retries |
| `skip` | Boolean | True if learner skipped the item |
| `option_changes` | Integer | Number of times option selection was toggled |
| `mouse_distance` | Float | Total mouse cursor travel distance in pixels |
| `mouse_speed` | Float | Average mouse cursor movement speed in px/sec |
| `hover_time` | Float | Total hover time over option buttons in seconds |
| `typing_speed` | Float | Typing speed in words per minute |
| `backspaces` | Integer | Keystroke backspace count |
| `delete_frequency` | Integer | Keystroke delete count |
| `pause_duration` | Float | Long typing pause duration in seconds |
| `question_number` | Integer | Session item index |
| `session_duration` | Float | Cumulative session duration in seconds |
| `tab_switches` | Integer | Window blur / tab switch count |
