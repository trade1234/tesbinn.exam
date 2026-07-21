import { z } from "zod";
import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Answer } from "../models/Answer.js";
import { courseMatchesTraining, findAssignedCourseForStudent } from "../utils/courseAccess.js";
import { logActivity } from "../utils/logger.js";
import { scheduledExamEnd, scheduledRemainingSeconds } from "../utils/examTiming.js";
import { canGrantRetake } from "../utils/retakePolicy.js";
import { issueCertificate } from "./certificate.controller.js";

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

    if (req.user.role === "STUDENT") {
      const assignedCourse = await findAssignedCourseForStudent(req.user);
      if (!assignedCourse) return res.json([]);

      if (query.courseId && String(query.courseId) !== String(assignedCourse._id)) {
        return res.json([]);
      }

      query.courseId = assignedCourse._id;
    }

    const exams = await Exam.find(query).populate("courseId").sort({ startDate: 1 });
    if (req.user.role === "STUDENT" && exams.length) {
      const attempts = await ExamAttempt.find({ studentId: req.user._id, examId: { $in: exams.map((exam) => exam._id) } }).select("examId status violationCount");
      const attemptMap = new Map(attempts.map((attempt) => [String(attempt.examId), attempt]));
      const serverNow = Date.now();
      return res.json(exams.map((exam) => {
        const studentAttempt = attemptMap.get(String(exam._id)) || null;
        const referenceTime = exam.isPaused && exam.pausedAt ? new Date(exam.pausedAt).getTime() : serverNow;
        return {
          ...exam.toObject(),
          studentAttempt,
          serverRemainingSeconds: scheduledRemainingSeconds(exam, referenceTime)
        };
      }));
    }
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

    if (req.user.role === "STUDENT" && !courseMatchesTraining(exam.courseId, req.user.trainingTaken)) {
      return res.status(403).json({ message: "This exam is not assigned to your training course." });
    }

    let attempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId: req.user._id
    });
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

    if (attempt?.status === "RETAKE_GRANTED") {
      attempt.status = "IN_PROGRESS";
      attempt.startedAt = exam.startDate;
      attempt.retakeExpiresAt = undefined;
      await attempt.save();
    } else if (attempt && attempt.status !== "IN_PROGRESS") {
      return res.status(409).json({ message: "You have already taken this exam. Only one attempt is allowed." });
    } else if (attempt) {
      // Normal attempts always belong to the shared scheduled exam clock.
      // A late login must never become a new personal start time.
      attempt.startedAt = exam.startDate;
      await attempt.save();
    }
    if (!attempt) {
      try {
        attempt = await ExamAttempt.create({ examId: exam._id, studentId: req.user._id, startedAt: exam.startDate });
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
    
    const effectiveEnd = scheduledExamEnd(exam);
    const remainingSeconds = scheduledRemainingSeconds(exam);
    res.status(201).json({ attempt, exam, questions, answers, timing: { serverNow: new Date(), effectiveEnd, remainingSeconds } });
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

export async function recordViolation(req, res, next) {
  try {
    const attempt = await ExamAttempt.findOne({ _id: req.params.attemptId, studentId: req.user._id, status: "IN_PROGRESS" });
    if (!attempt) return res.status(404).json({ message: "Active attempt not found" });
    const exam = await Exam.findById(attempt.examId);
    const now = new Date();
    const effectiveEnd = scheduledExamEnd(exam);
    if (!exam || exam.isPaused || now < exam.startDate || !effectiveEnd || now > effectiveEnd) {
      return res.status(409).json({ message: "The exam is not currently live" });
    }
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const operations = answers.filter((answer) => answer?.questionId).map((answer) => ({
      updateOne: {
        filter: { attemptId: attempt._id, questionId: answer.questionId },
        update: { $set: { selectedAnswer: answer.selectedAnswer || "", markedForReview: Boolean(answer.markedForReview) } },
        upsert: true
      }
    }));
    if (operations.length) await Answer.bulkWrite(operations);
    attempt.violationCount = 3;
    attempt.status = "DISQUALIFIED";
    attempt.score = 0;
    attempt.percentage = 0;
    attempt.submittedAt = now;
    attempt.terminationReason = "Student remained outside the live exam for 3 seconds";
    attempt.wasDisqualified = true;
    attempt.disqualificationCount = Number(attempt.disqualificationCount || 0) + 1;
    attempt.lastDisqualifiedAt = now;
    attempt.lastDisqualificationReason = attempt.terminationReason;
    await attempt.save();
    await logActivity(req, "EXAM_DISQUALIFIED", "Exam attempt disqualified after the student remained outside the live exam for 3 seconds");
    res.json({ attempt });
  } catch (error) { next(error); }
}

export async function grantRetake(req, res, next) {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: "Exam attempt not found" });
    if (!canGrantRetake(attempt)) return res.status(409).json({ message: "Retake permission is allowed only for a currently disqualified student" });
    const exam = await Exam.findById(attempt.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    await Answer.deleteMany({ attemptId: attempt._id });
    attempt.startedAt = undefined;
    attempt.submittedAt = undefined;
    attempt.score = 0;
    attempt.percentage = 0;
    attempt.status = "RETAKE_GRANTED";
    attempt.violationCount = 0;
    attempt.terminationReason = "";
    attempt.retakeGrantedAt = new Date();
    attempt.retakeExpiresAt = undefined;
    attempt.retakeGrantedBy = req.user._id;
    attempt.wasDisqualified = true;
    await attempt.save();
    await logActivity(req, "GRANT_RETAKE", `Granted a fresh retake for attempt ${attempt._id}`);
    res.json({ message: "Retake granted. Previous answers were cleared.", attempt });
  } catch (error) { next(error); }
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

    await exam.populate("courseId");
    const certificate = await issueCertificate({ attempt, student: req.user, exam, course: exam.courseId, totalMarks });

    await logActivity(req, "SUBMIT_EXAM", `Submitted exam: "${exam.title}". Score: ${score}/${totalMarks} (${percentage}%, status: ${attempt.status})`);

    res.json({ attempt, certificate, totalQuestions: questions.length, correctAnswers: questions.filter((q) => isCorrectAnswer(q, answerMap.get(String(q._id)))).length });
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
