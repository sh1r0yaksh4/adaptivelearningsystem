# Multi-Topic Curriculum Policy

The backend selects a question from three inputs after every response:

1. The history-aware rule policy determines a bounded next difficulty.
2. The concept roadmap identifies the lowest-mastery eligible concept.
3. The topic policy dynamically weights concepts using topic accuracy, roadmap priority, recent exposure, fatigue, and cognitive load.

The policy avoids repeating recently asked topics, prioritizes topics with weak performance, and awards a small co-teaching bonus for compatible topic pairs. Current pairs include recursion with binary trees, algorithms with data structures, operating systems with networks, and DBMS with object-oriented programming.

`backend/src/data/questions/multitopic_cse.json` is a reproducible 1,200-item synthetic-template bank: every item covers exactly two topics, declares a 60/40 primary/secondary topic allocation, and is balanced across easy, medium, and hard. It is suitable for pipeline and simulator experiments, but should be reviewed by subject-matter experts before use with students.

Create a session from the bank without an LLM by posting `{ "topic": "multi-topic cse" }` to `POST /question`.
