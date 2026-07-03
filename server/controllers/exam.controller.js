import { z } from "zod";
import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Answer } from "../models/Answer.js";
import { logActivity } from "../utils/logger.js";

function normalizeAnswer(value = "") {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function isCorrectAnswer(question, selectedAnswer) {
  if (question.questionType === "SHORT_ANSWER") {
    return normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correctAnswer);
  }
  return selectedAnswer === question.correctAnswer;
}
function calculateEndDate(startDate, durationMinutes, extraTimeMinutes = 0) {
  const totalMinutes = Number(durationMinutes) + Number(extraTimeMinutes || 0);
  return new Date(new Date(startDate).getTime() + totalMinutes * 60000);
}

export const examSchema = z.object({
  body: z.object({
    courseId: z.string().min(1),
    title: z.string().min(2),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().min(1),
    extraTimeMinutes: z.coerce.number().min(0).default(0),
    totalMarks: z.coerce.number().min(1),
    passPercentage: z.coerce.number().min(0).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional()
  }).superRefine((exam, ctx) => {
    const calculatedEnd = calculateEndDate(exam.startDate, exam.durationMinutes, exam.extraTimeMinutes);
    const startDay = new Date(exam.startDate);
    const endDay = new Date(calculatedEnd);
    if (startDay.getFullYear() !== endDay.getFullYear() || startDay.getMonth() !== endDay.getMonth() || startDay.getDate() !== endDay.getDate()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exam duration must end on the same date as the selected start date."
      });
    }
  }).transform((exam) => ({
    ...exam,
    endDate: calculateEndDate(exam.startDate, exam.durationMinutes, exam.extraTimeMinutes)
  }))
});

export async function listExams(req, res, next) {
  try {
    const query = req.query.courseId ? { courseId: req.query.courseId } : {};
    const exams = await Exam.find(query).populate("courseId").sort({ startDate: 1 });
    res.json(exams);
  } catch (error) {
    next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    res.status(201).json(await Exam.create(req.body));
  } catch (error) {
    next(error);
  }
}

export async function updateExam(req, res, next) {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  } catch (error) {
    next(error);
  }
}

export async function deleteExam(req, res, next) {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    await Question.deleteMany({ examId: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function startExam(req, res, next) {
  try {
    const exam = await Exam.findById(req.body.examId).populate("courseId");
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const now = new Date();
    if (now < exam.startDate) {
      return res.status(400).json({ message: `Exam has not started yet. It starts at ${exam.startDate.toLocaleString()}.` });
    }
    if (now > exam.endDate) {
      return res.status(400).json({ message: "Exam has ended." });
    }
    if (exam.isPaused) {
      return res.status(400).json({ message: "Exam is paused by the administrator." });
    }

    let attempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId: req.user._id
    });
    if (attempt && attempt.status !== "IN_PROGRESS") {
      return res.status(409).json({ message: "You have already taken this exam. Only one attempt is allowed." });
    }
    if (!attempt) {
      try {
        attempt = await ExamAttempt.create({ examId: exam._id, studentId: req.user._id });
      } catch (error) {
        if (error.code === 11000) {
          attempt = await ExamAttempt.findOne({ examId: exam._id, studentId: req.user._id });
          if (attempt?.status !== "IN_PROGRESS") {
            return res.status(409).json({ message: "You have already taken this exam. Only one attempt is allowed." });
          }
        } else {
          throw error;
        }
      }
    }

    const questions = await Question.find({ examId: exam._id }).select("-correctAnswer").sort({ order: 1, createdAt: 1 });
    const answers = await Answer.find({ attemptId: attempt._id });
    
    await logActivity(req, "START_EXAM", `Started exam: "${exam.title}" for course "${exam.courseId?.courseName}"`);
    
    res.status(201).json({ attempt, exam, questions, answers });
  } catch (error) {
    next(error);
  }
}

export async function saveAnswers(req, res, next) {
  try {
    const attempt = await ExamAttempt.findOne({ _id: req.params.attemptId, studentId: req.user._id });
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return res.status(404).json({ message: "Active attempt not found" });
    }

    const operations = req.body.answers.map((answer) => ({
      updateOne: {
        filter: { attemptId: attempt._id, questionId: answer.questionId },
        update: {
          $set: {
            selectedAnswer: answer.selectedAnswer || "",
            markedForReview: Boolean(answer.markedForReview)
          }
        },
        upsert: true
      }
    }));
    if (operations.length) await Answer.bulkWrite(operations);
    res.json({ message: "Answers saved" });
  } catch (error) {
    next(error);
  }
}

export async function submitExam(req, res, next) {
  try {
    const attempt = await ExamAttempt.findOne({ _id: req.body.attemptId, studentId: req.user._id });
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return res.status(404).json({ message: "Active attempt not found" });
    }

    const exam = await Exam.findById(attempt.examId);
    const questions = await Question.find({ examId: attempt.examId }).sort({ order: 1, createdAt: 1 });
    const answers = await Answer.find({ attemptId: attempt._id });
    const answerMap = new Map(answers.map((answer) => [String(answer.questionId), answer.selectedAnswer]));
    const score = questions.reduce((total, question) => {
      return total + (isCorrectAnswer(question, answerMap.get(String(question._id))) ? question.marks : 0);
    }, 0);
    const totalMarks = questions.reduce((total, question) => total + question.marks, 0) || exam.totalMarks;
    const percentage = Math.round((score / totalMarks) * 10000) / 100;

    attempt.score = score;
    attempt.percentage = percentage;
    attempt.status = percentage >= exam.passPercentage ? "PASS" : "FAIL";
    attempt.submittedAt = new Date();
    await attempt.save();

    await logActivity(req, "SUBMIT_EXAM", `Submitted exam: "${exam.title}". Score: ${score}/${totalMarks} (${percentage}%, status: ${attempt.status})`);

    res.json({ attempt, totalQuestions: questions.length, correctAnswers: questions.filter((q) => isCorrectAnswer(q, answerMap.get(String(q._id)))).length });
  } catch (error) {
    next(error);
  }
}
export async function pauseExam(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.isPaused) return res.json(exam);

    exam.isPaused = true;
    exam.pausedAt = new Date();
    await exam.save();
    res.json(exam);
  } catch (error) {
    next(error);
  }
}

export async function resumeExam(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!exam.isPaused) return res.json(exam);

    const pausedAt = exam.pausedAt ? new Date(exam.pausedAt).getTime() : Date.now();
    const pauseDuration = Math.max(Date.now() - pausedAt, 0);
    exam.endDate = new Date(new Date(exam.endDate).getTime() + pauseDuration);
    exam.isPaused = false;
    exam.pausedAt = undefined;
    await exam.save();
    res.json(exam);
  } catch (error) {
    next(error);
  }
}