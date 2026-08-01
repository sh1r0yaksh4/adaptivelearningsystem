# Adaptive Learning System

Run the research app with one command:

```bash
./scripts/dev.sh
```

This starts:

- a local PostgreSQL container on port `54329` (Docker)
- ML service: `http://localhost:8000`
- Express backend and app: `http://localhost:4000/index.html`

The script applies the Prisma schema and enables the trained ML policy by default. The UI starts a `multi-topic cse` backend session, so its recommendations, concept roadmap, and topic weights come from the research backend rather than the old static demo bank.

The backend serves the frontend, so you do not need a separate frontend server for normal development.

If you still want the static frontend on port `3000`, run:

```bash
WITH_FRONTEND=1 ./scripts/dev.sh
```

Useful port overrides:

```bash
ML_PORT=8001 PORT=4001 FRONTEND_PORT=3001 WITH_FRONTEND=1 ./scripts/dev.sh
```

Press `Ctrl-C` to stop all services started by the script.
