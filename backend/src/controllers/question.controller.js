import path from "path";
import fs from "fs/promises";
import { get_question_by_topic } from "../services/ai.service.js";
import { predict_next_difficulty } from "../services/ml.service.js";
import { calculateStateAndNextQuestion } from "../utils/ruleEngine.js";
import { buildLearningRoadmap } from "../utils/conceptRoadmap.js";
import { chooseNextQuestion } from "../utils/questionPolicy.js";
import { v4 as uuidv4 } from "uuid";
import prisma from "../config/db.js";

const MASTERY_THRESHOLD_NEW = 0.9;

const getSessionId = (req) => req.body?.session_id ?? req.query?.session_id;

const getQuestionsFromSession = async (session) => {
    return await prisma.question.findMany({
        where: { session_id: session.session_id }
    });
};

const pickQuestion = (questions, difficulty, askedQuestions = [], history = [], studentState = {}, roadmap = {}) => {
    const policySelection = chooseNextQuestion(questions, difficulty, askedQuestions, history, studentState, roadmap);
    if (policySelection.question) return policySelection.question;
    // 1. Try to find an unasked question of the target difficulty
    const targetUnasked = questions.find(
        question =>
            question.difficulty === difficulty &&
            !askedQuestions.includes(question.id)
    );
    if (targetUnasked) return targetUnasked;

    // 2. Try to find any unasked question regardless of difficulty (ordered by closeness to target difficulty)
    const order = ["easy", "medium", "hard"];
    const targetIdx = order.indexOf(difficulty);
    
    // Sort remaining difficulties by closeness to target difficulty
    const difficultiesSorted = [...order].sort((a, b) => {
        return Math.abs(order.indexOf(a) - targetIdx) - Math.abs(order.indexOf(b) - targetIdx);
    });

    for (const diff of difficultiesSorted) {
        const unasked = questions.find(
            question => question.difficulty === diff && !askedQuestions.includes(question.id)
        );
        if (unasked) return unasked;
    }

    // 3. Fallback: return any question of the target difficulty, even if asked
    return questions.find(question => question.difficulty === difficulty) ?? questions[0];
};

export const fetch_questions = async (req, res) => {
    const { topic } = req.body;

    if (!topic) {
        return res.status(400).json({
            error: "topic is required"
        });
    }

    try {
        const generatedData = await get_question_by_topic(topic);
        const questionsList = generatedData.questions ?? [];

        console.log("before session creation");
        const session = await prisma.session.create({
            data: {
                session_id: uuidv4(),
                topic,
                asked_questions: [],
                mastery: 0.2, // starting knowledge (closer to easy→medium threshold)
                confidence: 0.5,
                engagement: 0.8,
                cognitive_load: 0.2,
                fatigue: 0.0,
                history: [],
                questions: {
                    create: questionsList.map(q => ({
                        id: q.id,
                        difficulty: q.difficulty,
                        questionType: q.questionType ?? "mcq",
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation ?? "",
                        estimatedTimeSeconds: q.estimatedTimeSeconds ?? 30,
                        concepts: q.concepts ?? [],
                        tags: q.tags ?? [],
                        learningObjective: q.learningObjective ?? "",
                        prerequisiteLevel: q.prerequisiteLevel ?? 1,
                        difficultyScore: q.difficultyScore ?? 1,
                        sourceType: q.sourceType ?? "generated",
                        asked: false
                    }))
                }
            }
        });
        console.log("Session created with questions:", session);
        console.log(session.session_id);
        return res.status(201).json({
            message: "Questions fetched and session created successfully",
            session_id: session.session_id
        });

    } catch (error) {
        console.error("Error creating session:", error);

        return res.status(500).json({
            message: "Failed to create session",
            error: error.message
        });
    } 
};

export const get_first_question = async (req, res) => {
    const session_id = getSessionId(req);

    if (!session_id) {
        return res.status(400).json({
            error: "session_id is required"
        });
    }

    try {
        const curr_session = await prisma.session.findUnique({
            where: {
                session_id
            }
        });

        if (!curr_session) {
            return res.status(404).json({
                error: "Session not found"
            });
        }

        const questions = await getQuestionsFromSession(curr_session);
        const askedQuestions = curr_session.asked_questions ?? [];
        const question = pickQuestion(questions, "easy", askedQuestions);

        if (!question) {
            return res.status(404).json({
                error: "No easy question found"
            });
        }

        await prisma.$transaction([
            prisma.question.update({
                where: {
                    question_id: question.question_id
                },
                data: {
                    asked: true
                }
            }),
            prisma.session.update({
                where: {
                    session_id
                },
                data: {
                    asked_questions: [
                        ...askedQuestions,
                        question.id
                    ],
                    current_difficulty: question.difficulty
                }
            })
        ]);

        return res.status(200).json({
            question,
            total_questions: questions.length,
            questions_asked: 1
        });

    } catch (error) {
        console.error("Error getting first question:", error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

export const get_next_question = async (req, res) => {
    const features = req.body ?? {};
    const session_id = getSessionId(req);

    if (!session_id) {
        return res.status(400).json({
            error: "session_id is required"
        });
    }

    if (!features.question_id) {
        return res.status(400).json({
            error: "question_id is required"
        });
    }

    try {
        const curr_session = await prisma.session.findUnique({
            where: {
                session_id
            }
        });

        if (!curr_session) {
            return res.status(404).json({
                error: "Session not found"
            });
        }

        const questions = await getQuestionsFromSession(curr_session);
        const curr_question = questions.find(q => q.id === features.question_id);

        if (!curr_question) {
            return res.status(404).json({
                error: "Question not found in session question list"
            });
        }

        // Calculate next student state and next difficulty level
        // Correctness is a server-side fact. Client telemetry may include an
        // `isCorrect` hint for legacy callers, but it must never override the
        // answer key held by this session's question record.
        const submittedAnswer = features.selected_answer ?? features.selectedAnswer ?? features.answer;
        const engineFeatures = {
            ...features,
            ...(submittedAnswer !== undefined
                ? { isCorrect: String(submittedAnswer).trim() === String(curr_question.correctAnswer).trim() }
                : {})
        };

        const { studentState, nextDifficulty, recommendation, updatedHistory, isCorrect, normalizedFeatures } = calculateStateAndNextQuestion(
            curr_session,
            curr_question,
            engineFeatures
        );
        let effectiveDifficulty = nextDifficulty;
        let effectiveRecommendation = recommendation;
        if (process.env.ADAPTIVE_POLICY === "ml") {
            try {
                const mlResult = await predict_next_difficulty({
                    isCorrect,
                    timeTaken: normalizedFeatures.total_response_time,
                    attempts: normalizedFeatures.attempts,
                    pastAccuracy: curr_session.correct_answers / Math.max(1, curr_session.correct_answers + curr_session.wrong_answers),
                    difficulty_score: curr_question.difficultyScore,
                    knowledge_before: studentState.knowledge,
                    fatigue_before: studentState.fatigue,
                    total_response_time: normalizedFeatures.total_response_time,
                    reading_time: normalizedFeatures.reading_time,
                    time_after_last_interaction: normalizedFeatures.time_after_last_interaction,
                    skip: normalizedFeatures.skip,
                    option_changes: normalizedFeatures.option_changes,
                    mouse_distance: normalizedFeatures.mouse_distance,
                    mouse_speed: normalizedFeatures.mouse_speed,
                    hover_time: normalizedFeatures.hover_time,
                    typing_speed: normalizedFeatures.typing_speed,
                    backspaces: normalizedFeatures.backspaces,
                    delete_frequency: normalizedFeatures.delete_frequency,
                    pause_duration: normalizedFeatures.pause_duration,
                    question_number: updatedHistory.length,
                    session_duration: normalizedFeatures.session_duration,
                    tab_switches: normalizedFeatures.tab_switches,
                });
                if (["easy", "medium", "hard"].includes(mlResult.nextDifficulty)) {
                    effectiveDifficulty = mlResult.nextDifficulty;
                    effectiveRecommendation = { ...recommendation, difficulty: effectiveDifficulty, policy_version: "ml-v1", model: mlResult.model, predicted_success: mlResult.predictedSuccess, reasons: [...recommendation.reasons, "ml_policy_override"] };
                }
            } catch (error) {
                console.warn("ML policy unavailable; retaining rule recommendation:", error.message);
            }
        }

        const answerCounts = {
            correct_answers: isCorrect
                ? curr_session.correct_answers + 1
                : curr_session.correct_answers,
            wrong_answers: isCorrect
                ? curr_session.wrong_answers
                : curr_session.wrong_answers + 1
        };

        const updated_session_data = {
            mastery: studentState.knowledge, // map knowledge to mastery
            confidence: studentState.confidence,
            engagement: studentState.engagement,
            cognitive_load: studentState.cognitive_load,
            fatigue: studentState.fatigue,
            history: updatedHistory,
            ...answerCounts
        };
        const learningRoadmap = buildLearningRoadmap(questions, updatedHistory, studentState);

        // Check if student has achieved mastery
        if (studentState.knowledge >= MASTERY_THRESHOLD_NEW) {
            await prisma.session.update({
                where: {
                    session_id
                },
                data: updated_session_data
            });

            return res.status(200).json({
                topic_mastered: true,
                mastery: studentState.knowledge,
                is_correct: isCorrect,
                student_state: studentState,
                recommendation: effectiveRecommendation,
                learning_roadmap: learningRoadmap
            });
        }

        // Select the next question based on the calculated next difficulty
        const askedQuestions = curr_session.asked_questions ?? [];
        const { question: nextQuestionFromPolicy, topicWeights } = chooseNextQuestion(
            questions,
            effectiveDifficulty,
            askedQuestions,
            updatedHistory,
            studentState,
            learningRoadmap
        );
        const next_question = nextQuestionFromPolicy;

        if (!next_question) {
            return res.status(404).json({
                error: "No question found for difficulty level"
            });
        }

        await prisma.$transaction([
            prisma.question.update({
                where: {
                    question_id: next_question.question_id
                },
                data: {
                    asked: true
                }
            }),
            prisma.session.update({
                where: {
                    session_id
                },
                data: {
                    ...updated_session_data,
                    current_difficulty: effectiveDifficulty,
                    asked_questions: [
                        ...askedQuestions,
                        next_question.id
                    ]
                }
            })
        ]);

        return res.status(200).json({
            next_question,
            topic_mastered: false,
            mastery: studentState.knowledge,
            is_correct: isCorrect,
            current_difficulty: effectiveDifficulty,
            student_state: studentState,
            recommendation: effectiveRecommendation,
            learning_roadmap: learningRoadmap,
            topic_weights: topicWeights,
            total_questions: questions.length,
            questions_asked: askedQuestions.length + 1
        });

    } catch (error) {
        console.error("Error while getting next question:", error);

        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
};
