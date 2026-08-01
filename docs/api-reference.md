# Adaptive Learning Platform: API Reference

Base URL: `http://localhost:4000`  
ML Service URL: `http://localhost:8000`

---

## 1. User Endpoints

### `POST /user/login`
Authenticates or registers a learner session username.

**Request Body:**
```json
{
  "username": "student_01"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "username": "student_01"
  }
}
```

---

## 2. Question & Session Endpoints

### `POST /question`
Initializes a new adaptive learning session and generates/stores the topic question bank.

**Request Body:**
```json
{
  "topic": "multi-topic cse"
}
```

**Response (201 Created):**
```json
{
  "message": "Questions fetched and session created successfully",
  "session_id": "c7a8b9f0-1234-4567-89ab-cdef01234567"
}
```

---

### `GET /question/start-session`
Retrieves the first diagnostic question (easy level) for an initialized session.

**Query Parameters:**
- `session_id` (string, required): The UUID of the session.

**Response (200 OK):**
```json
{
  "question": {
    "question_id": "q-uuid-101",
    "id": "ds-easy-1",
    "difficulty": "easy",
    "questionType": "mcq",
    "question": "Which data structure follows LIFO?",
    "options": ["Queue", "Stack", "Graph", "Hash table"],
    "correctAnswer": "Stack",
    "explanation": "A stack removes the most recently inserted item first.",
    "estimatedTimeSeconds": 30,
    "concepts": ["Data Structures", "Stack"]
  }
}
```

---

### `POST /question/submit`
Submits an answer along with behavioral telemetry. Updates the 5-dimensional latent state and returns the next adaptive question and roadmap recommendation.

**Request Body:**
```json
{
  "session_id": "c7a8b9f0-1234-4567-89ab-cdef01234567",
  "question_id": "ds-easy-1",
  "selected_answer": "Stack",
  "timeTaken": 14.5,
  "readingTime": 3.2,
  "timeAfterLastInteraction": 1.1,
  "attempts": 1,
  "option_changes": 0,
  "mouse_distance": 450.2,
  "mouse_speed": 85.0,
  "hover_time": 8.0,
  "typing_speed": 40.0,
  "backspaces": 0,
  "delete_frequency": 0,
  "pause_duration": 0.5,
  "questionNumber": 1,
  "sessionDuration": 14.5,
  "tab_switches": 0
}
```

**Response (200 OK):**
```json
{
  "next_question": {
    "question_id": "q-uuid-102",
    "id": "ds-medium-1",
    "difficulty": "medium",
    "question": "What is average search complexity in a Hash Table?",
    "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    "correctAnswer": "O(1)"
  },
  "topic_mastered": false,
  "mastery": 0.15,
  "is_correct": true,
  "current_difficulty": "medium",
  "student_state": {
    "knowledge": 0.15,
    "confidence": 0.60,
    "engagement": 0.83,
    "cognitive_load": 0.20,
    "fatigue": 0.01
  },
  "recommendation": {
    "policy_version": "rule-v1.2",
    "action": "advance",
    "difficulty": "medium",
    "reasons": ["knowledge_band"]
  },
  "learning_roadmap": {
    "roadmap_version": "concept-roadmap-v1",
    "target_concept": "Data Structures",
    "action": "practice_target_concept"
  }
}
```

---

## 3. ML Service Endpoint

### `POST /predict` (FastAPI Service on port 8000)
Scores item difficulty candidates against a fitted classifier artifact.

**Request Body:**
```json
{
  "isCorrect": true,
  "timeTaken": 14.5,
  "attempts": 1,
  "pastAccuracy": 0.80,
  "difficulty_score": 2,
  "knowledge_before": 0.10,
  "fatigue_before": 0.01,
  "total_response_time": 14.5,
  "reading_time": 3.2,
  "time_after_last_interaction": 1.1,
  "skip": false,
  "option_changes": 0,
  "mouse_distance": 450.2,
  "mouse_speed": 85.0,
  "hover_time": 8.0,
  "typing_speed": 40.0,
  "backspaces": 0,
  "delete_frequency": 0,
  "pause_duration": 0.5,
  "question_number": 1,
  "session_duration": 14.5,
  "tab_switches": 0
}
```

**Response (200 OK):**
```json
{
  "nextDifficulty": "medium",
  "predictedSuccess": 0.732,
  "policy": "ml",
  "model": "catboost"
}
```
