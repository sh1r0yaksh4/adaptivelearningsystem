# Adaptive Learning Platform (ALP)

A research-grade adaptive learning system that uses deep behavioral analysis and machine learning to personalize question sequencing for Computer Science students. The platform tracks 19 behavioral features per question, infers 5 latent cognitive dimensions (knowledge, confidence, engagement, cognitive load, fatigue), and uses a CatBoost ML model to select optimally challenging questions.

---

## Prerequisites

Install these before proceeding:

| Dependency | Version | macOS Install | Windows Install |
|---|---|---|---|
| **Node.js** | 18+ | `brew install node` | [nodejs.org](https://nodejs.org/) installer |
| **Python** | 3.10+ | `brew install python@3.12` | [python.org](https://www.python.org/downloads/) installer (check "Add to PATH") |
| **Docker Desktop** | Latest | `brew install --cask docker` | [docker.com](https://www.docker.com/products/docker-desktop/) installer |
| **Git** | Latest | `brew install git` | [git-scm.com](https://git-scm.com/downloads) installer |

> **Note**: Docker Desktop must be **running** before you start the project. It provides the PostgreSQL database.

---

## Quick Start (macOS)

```bash
# 1. Clone the repo
git clone https://github.com/sh1r0yaksh4/adaptivelearningsystem.git
cd adaptivelearningsystem

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Create Python virtual environment and install ML dependencies
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# 4. Make sure Docker Desktop is running, then start everything
./scripts/dev.sh
```

The dev script will:
- Start PostgreSQL via Docker (port `54329`)
- Apply the Prisma database schema
- Start the ML service (port `8000`)
- Start the backend + serve the frontend (port `4000`)

**Open**: [http://localhost:4000/index.html](http://localhost:4000/index.html)

---

## Quick Start (Windows)

Use **PowerShell** or **Git Bash** for all commands.

```powershell
# 1. Clone the repo
git clone https://github.com/sh1r0yaksh4/adaptivelearningsystem.git
cd adaptivelearningsystem

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Create Python virtual environment and install ML dependencies
cd ml-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..

# 4. Start PostgreSQL with Docker
docker compose -f docker-compose.dev.yml up -d postgres

# 5. Wait a few seconds for Postgres to start, then apply DB schema
cd backend
$env:DATABASE_URL = "postgresql://adaptive_learning:adaptive_learning@127.0.0.1:54329/adaptive_learning?schema=public"
npx prisma db push
npx prisma generate
cd ..

# 6. Start the ML service (in a separate terminal)
cd ml-service
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 7. Start the backend (in another separate terminal)
cd backend
$env:DATABASE_URL = "postgresql://adaptive_learning:adaptive_learning@127.0.0.1:54329/adaptive_learning?schema=public"
$env:ADAPTIVE_POLICY = "ml"
$env:ML_SERVICE_URL = "http://127.0.0.1:8000"
node server.js
```

**Open**: [http://localhost:4000/index.html](http://localhost:4000/index.html)

---

## Environment Variables

Copy `.env.example` to `.env` in the project root (or set them in your shell):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://adaptive_learning:adaptive_learning@127.0.0.1:54329/adaptive_learning?schema=public` | PostgreSQL connection string |
| `ADAPTIVE_POLICY` | `ml` | Question selection policy. `ml` uses the trained CatBoost model, `rule` uses the heuristic engine |
| `ML_SERVICE_URL` | `http://127.0.0.1:8000` | URL of the Python ML prediction service |
| `PORT` | `4000` | Backend server port |
| `ML_PORT` | `8000` | ML service port |

---

## Project Structure

```
adaptivelearningsystem/
│
├── files/                          # Frontend (static HTML/CSS/JS)
│   ├── index.html                  #   Main single-page app
│   ├── script.js                   #   Quiz logic, behavioral tracking, roadmap UI
│   └── style.css                   #   Styling and design tokens
│
├── backend/                        # Node.js Express API server
│   ├── server.js                   #   Entry point (starts on PORT 4000)
│   ├── prisma/
│   │   └── schema.prisma           #   Database schema (Session, Question, Learner)
│   └── src/
│       ├── app.js                  #   Express app setup + route mounting
│       ├── config/
│       │   └── db.js               #   Prisma client initialization
│       ├── controllers/
│       │   ├── question.controller.js  # Quiz session lifecycle + adaptive logic
│       │   ├── roadmap.controller.js   # Learning roadmap CRUD endpoints
│       │   └── user.controller.js      # User management
│       ├── routes/
│       │   ├── question.js         #   /question routes
│       │   ├── roadmap.js          #   /roadmap routes
│       │   └── user.js             #   /user routes
│       ├── services/
│       │   ├── ai.service.js       #   Question bank loader (CSV → JSON)
│       │   ├── ml.service.js       #   HTTP client to ML prediction service
│       │   └── session.service.js  #   Session persistence helpers
│       ├── utils/
│       │   ├── ruleEngine.js       #   Latent-state rule engine (knowledge, confidence, etc.)
│       │   ├── conceptRoadmap.js   #   Prerequisite DAG engine (36 concepts)
│       │   ├── questionPolicy.js   #   Topic weighting + question selection
│       │   └── testRuleEngine.js   #   Diagnostic test suite (run: node backend/src/utils/testRuleEngine.js)
│       └── data/
│           ├── concept_graph.json  #   36-concept prerequisite DAG configuration
│           └── questions/
│               ├── question_bank.csv       # 126 hand-curated CSE questions (editable)
│               ├── question_bank_loader.js # CSV → JSON converter
│               └── multitopic_cse.json     # Generated question bank (consumed by backend)
│
├── ml-service/                     # Python FastAPI ML service
│   ├── requirements.txt            #   Runtime dependencies (FastAPI, Uvicorn, Pydantic)
│   ├── requirements-research.txt   #   Research dependencies (scikit-learn, XGBoost, CatBoost, etc.)
│   └── app/
│       ├── main.py                 #   FastAPI app (GET /, POST /predict)
│       ├── model/
│       │   ├── predictor.py        #   Loads trained model, predicts optimal difficulty
│       │   └── features.py         #   Feature engineering (rolling accuracy, friction index, etc.)
│       ├── schemas/
│       │   └── input_schema.py     #   Pydantic request/response models
│       └── research/               #   Research & experiment pipeline
│           ├── simulator.py        #     Multi-archetype student simulator
│           ├── generate_dataset.py #     Synthetic dataset generator
│           ├── train_models.py     #     Train & benchmark 7 tabular models
│           ├── train_sequence_models.py # Train LSTM & Transformer models
│           ├── evaluate_policies.py#     Closed-loop policy evaluator (4 policies)
│           └── concept_graph.py    #     Concept graph loader for research pipeline
│
├── artifacts/                      # Generated research outputs
│   ├── datasets/
│   │   └── interactions.csv        #   Synthetic interaction dataset (9,000 records)
│   ├── benchmarks/
│   │   ├── metrics.json            #   Model benchmark results (9 models)
│   │   └── feature-importance.csv  #   Per-model feature importances
│   ├── evaluation/
│   │   ├── policy-results.json     #   Policy comparison results
│   │   └── pairwise-tests.csv      #   Statistical significance tests
│   └── models/
│       └── best-next-correct.joblib#   Trained CatBoost model artifact
│
├── docs/                           # Project documentation
│   ├── architecture.md             #   System architecture & design spec
│   ├── paper-draft.md              #   Research paper draft
│   ├── api-reference.md            #   REST API documentation
│   ├── model-card.md               #   ML model documentation
│   └── ...                         #   Additional docs
│
├── scripts/
│   └── dev.sh                      #   One-command dev environment launcher (macOS/Linux)
│
├── docker-compose.dev.yml          # PostgreSQL container config
├── .env.example                    # Environment variable template
└── prompt.pdf                      # Original project specification
```

---

## Key Features

| Feature | Description |
|---|---|
| **126 Curated CSE Questions** | Hand-written questions across 6 subjects, stored in an editable CSV (`backend/src/data/questions/question_bank.csv`) |
| **19 Behavioral Features** | Response time, reading time, mouse dynamics, typing friction, tab switches, and more |
| **5 Latent Cognitive Dimensions** | Knowledge, Confidence, Engagement, Cognitive Load, Fatigue — inferred in real-time |
| **36-Concept Prerequisite DAG** | Concept graph with prerequisite relationships across Data Structures, Algorithms, OOP, DBMS, OS, and Networks |
| **ML-Based Difficulty Selection** | CatBoost model targeting a "desirable difficulty" zone (~72% predicted success probability) |
| **Dynamic Learning Roadmap** | Visual dashboard showing concept mastery, progress per subject, and recommended next concept |
| **Research Pipeline** | Student simulator, synthetic dataset generator, 9-model benchmark suite, and 4-policy statistical evaluation |

---

## Running the Research Pipeline (Optional)

To reproduce the ML experiments, first install the research dependencies:

```bash
# macOS / Linux
source ml-service/venv/bin/activate
pip install -r ml-service/requirements-research.txt

# Windows
.\ml-service\venv\Scripts\activate
pip install -r ml-service\requirements-research.txt
```

Then run the pipeline:

```bash
# 1. Generate synthetic dataset (300 learners × 30 items)
PYTHONPATH=ml-service python -m app.research.generate_dataset \
  --learners 300 --items 30 --seed 20260731 \
  --output artifacts/datasets/interactions.csv

# 2. Train and benchmark all models
PYTHONPATH=ml-service python -m app.research.train_models \
  artifacts/datasets/interactions.csv --seed 20260731

# 3. Evaluate adaptive policies
PYTHONPATH=ml-service python -m app.research.evaluate_policies \
  --learners 300 --seed 20260731 --mastery-threshold 0.80 --max-items 150 \
  --output artifacts/evaluation/policy-results.json
```

> On Windows, set `PYTHONPATH` separately: `$env:PYTHONPATH = "ml-service"` before each command.

---

## Editing the Question Bank

Questions live in [`backend/src/data/questions/question_bank.csv`](backend/src/data/questions/question_bank.csv). Open it in any spreadsheet editor or text editor.

**Columns**: `id`, `subject`, `topic`, `difficulty`, `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct`, `explanation`, `estimated_time`, `concepts`, `tags`, `difficulty_score`

After editing, regenerate the JSON consumed by the backend:

```bash
cd backend
node src/data/questions/question_bank_loader.js
```

---

## Running Tests

```bash
# Rule engine diagnostic suite (8 test suites, ~40 assertions)
node backend/src/utils/testRuleEngine.js
```

---

## Stopping Everything

- **macOS**: Press `Ctrl+C` in the terminal running `./scripts/dev.sh`
- **Windows**: Press `Ctrl+C` in each terminal, then stop Postgres:
  ```powershell
  docker compose -f docker-compose.dev.yml down
  ```

---

## Documentation

| Document | Path |
|---|---|
| Architecture & Design | [`docs/architecture.md`](docs/architecture.md) |
| API Reference | [`docs/api-reference.md`](docs/api-reference.md) |
| Research Paper Draft | [`docs/paper-draft.md`](docs/paper-draft.md) |
| Model Card | [`docs/model-card.md`](docs/model-card.md) |
| Dataset Card | [`docs/data-card.md`](docs/data-card.md) |
| Development Roadmap | [`docs/development-roadmap.md`](docs/development-roadmap.md) |
