import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { Answer } from "../models/Answer.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { scheduledExamEnd } from "../utils/examTiming.js";

function normalizeAnswer(value = "") {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function isCorrectAnswer(question, selectedAnswer) {
  if (question.questionType === "SHORT_ANSWER") {
    return normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correctAnswer);
  }
  return selectedAnswer === question.correctAnswer;
}
function attemptEndsAt(attempt) {
  const exam = attempt.examId;
  if (!exam || exam.isPaused) return null;
  return scheduledExamEnd(exam);
}

async function scoreAttempt(attempt, submittedAt = new Date()) {
  const exam = attempt.examId?._id ? attempt.examId : await Exam.findById(attempt.examId);
  if (!exam) return;

  const questions = await Question.find({ examId: exam._id });
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
  attempt.submittedAt = submittedAt;
  await attempt.save();
}

async function finalizeExpiredAttempts() {
  const now = new Date();
  const activeAttempts = await ExamAttempt.find({ status: "IN_PROGRESS" }).populate("examId");
  await Promise.all(activeAttempts.map(async (attempt) => {
    const endTime = attemptEndsAt(attempt);
    if (endTime && now >= endTime) {
      await scoreAttempt(attempt, endTime);
    }
  }));
}

async function examIdsForCourse(courseId) {
  if (!courseId) return null;
  const exams = await Exam.find({ courseId }).select("_id");
  return exams.map((exam) => exam._id);
}

async function studentIdsForFilters({ search, batchYear }) {
  if (!search && !batchYear) return null;
  const studentQuery = { role: "STUDENT" };
  if (batchYear) studentQuery.batchYear = Number(batchYear);
  if (search) {
    const term = String(search).trim().replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    studentQuery.$or = [
      { name: { $regex: term, $options: "i" } },
      { enrollmentNumber: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } }
    ];
  }
  return User.find(studentQuery).distinct("_id");
}
function applyDateRange(query, field, { from, to }) {
  if (!from && !to) return;
  query[field] = {};
  if (from) query[field].$gte = new Date(from);
  if (to) query[field].$lte = new Date(to);
}

export async function listResults(req, res, next) {
  try {
    await finalizeExpiredAttempts();

    const query = req.user.role === "STUDENT" ? { studentId: req.user._id } : {};
    if (req.query.examId) query.examId = req.query.examId;
    if (req.user.role === "ADMIN") {
      const studentIds = await studentIdsForFilters(req.query);
      if (studentIds) query.studentId = { $in: studentIds };
      if (req.query.status) query.status = req.query.status;
    }

    const courseExamIds = await examIdsForCourse(req.query.courseId);
    if (courseExamIds) query.examId = req.query.examId ? query.examId : { $in: courseExamIds };
    applyDateRange(query, "submittedAt", { from: req.query.from, to: req.query.to });

    const completedStatus = query.status || { $nin: ["IN_PROGRESS", "RETAKE_GRANTED"] };
    delete query.status;
    const results = await ExamAttempt.find({ ...query, status: completedStatus })
      .populate("studentId", "name email enrollmentNumber batchYear")
      .populate({ path: "examId", populate: { path: "courseId" } })
      .sort({ submittedAt: -1 });
    res.json(results);
  } catch (error) {
    next(error);
  }
}

export async function listActiveAttempts(req, res, next) {
  try {
    await finalizeExpiredAttempts();

    const query = {};
    if (req.query.examId) query.examId = req.query.examId;
    const studentIds = await studentIdsForFilters(req.query);
    if (studentIds) query.studentId = { $in: studentIds };
    if (req.query.status) query.status = req.query.status;

    const courseExamIds = await examIdsForCourse(req.query.courseId);
    if (courseExamIds) query.examId = req.query.examId ? query.examId : { $in: courseExamIds };
    applyDateRange(query, "startedAt", { from: req.query.from, to: req.query.to });

    const activeAttempts = await ExamAttempt.find({ ...query, status: "IN_PROGRESS" })
      .populate("studentId", "name email enrollmentNumber batchYear")
      .populate({ path: "examId", populate: { path: "courseId" } })
      .sort({ startedAt: -1 });
    res.json(activeAttempts);
  } catch (error) {
    next(error);
  }
}

export async function listDisqualifiedAttempts(req, res, next) {
  try {
    const attempts = await ExamAttempt.find({ status: "DISQUALIFIED" })
      .populate("studentId", "name email enrollmentNumber batchYear")
      .populate({ path: "examId", populate: { path: "courseId" } })
      .sort({ submittedAt: -1 });
    res.json(attempts);
  } catch (error) {
    next(error);
  }
}

export async function listDisqualificationHistory(req, res, next) {
  try {
    const attempts = await ExamAttempt.find({
      $or: [{ wasDisqualified: true }, { status: "DISQUALIFIED" }]
    })
      .populate("studentId", "name email enrollmentNumber batchYear")
      .populate({ path: "examId", populate: { path: "courseId" } })
      .populate("retakeGrantedBy", "name email")
      .sort({ lastDisqualifiedAt: -1, submittedAt: -1 });
    res.json(attempts);
  } catch (error) {
    next(error);
  }
}

export async function analytics(req, res, next) {
  try {
    await finalizeExpiredAttempts();

    const [students, courses, exams, attempts, monthly, passFail] = await Promise.all([
      User.countDocuments({ role: "STUDENT" }),
      Course.countDocuments(),
      Exam.countDocuments(),
      ExamAttempt.countDocuments(),
      ExamAttempt.aggregate([
        { $match: { submittedAt: { $exists: true } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$submittedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      ExamAttempt.aggregate([
        { $match: { status: { $in: ["PASS", "FAIL"] } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);
    const passed = passFail.find((item) => item._id === "PASS")?.count || 0;
    const failed = passFail.find((item) => item._id === "FAIL")?.count || 0;
    res.json({
      totals: { students, courses, exams, attempts },
      monthlyExams: monthly.map((item) => ({ month: item._id, attempts: item.count })),
      passRate: passed + failed ? Math.round((passed / (passed + failed)) * 100) : 0,
      studentPerformance: [
        { name: "Passed", value: passed },
        { name: "Failed", value: failed }
      ]
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewResult(req, res, next) {
  try {
    await finalizeExpiredAttempts();

    const query = { _id: req.params.attemptId, status: { $nin: ["IN_PROGRESS", "RETAKE_GRANTED"] } };
    if (req.user.role === "STUDENT") query.studentId = req.user._id;

    const attempt = await ExamAttempt.findOne(query)
      .populate("studentId", "name email enrollmentNumber trainingTaken")
      .populate({ path: "examId", populate: { path: "courseId" } });
    if (!attempt) return res.status(404).json({ message: "Completed result not found" });
    const examObjectId = attempt.examId?._id || attempt.examId;
    if (!examObjectId) return res.status(404).json({ message: "Exam for this result was not found" });

    const [questions, answers] = await Promise.all([
      Question.find({ examId: examObjectId }).sort({ createdAt: 1 }),
      Answer.find({ attemptId: attempt._id })
    ]);
    const answerMap = new Map(answers.map((answer) => [String(answer.questionId), answer.selectedAnswer || ""]));
    const totalMarks = questions.reduce((total, question) => total + question.marks, 0) || attempt.examId?.totalMarks || 0;
    const items = questions.map((question, index) => {
      const selectedAnswer = answerMap.get(String(question._id)) || "";
      const correct = isCorrectAnswer(question, selectedAnswer);
      return {
        questionId: question._id,
        number: index + 1,
        questionType: question.questionType,
        questionText: question.questionText,
        options: {
          A: question.optionA,
          B: question.optionB,
          C: question.optionC,
          D: question.optionD
        },
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: correct,
        marks: question.marks,
        earnedMarks: correct ? question.marks : 0
      };
    });

    res.json({ attempt, totalMarks, items });
  } catch (error) {
    next(error);
  }
}
export async function exportPdf(req, res, next) {
  try {
    await finalizeExpiredAttempts();

    const results = await resultRows(req.query);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=exam-results.pdf");
    doc.pipe(res);
    doc.fontSize(18).text("Online Examination Results", { align: "center" }).moveDown();
    results.forEach((row) => {
      doc.fontSize(10).text(`${row.student} | ${row.course} | ${row.exam} | ${row.score} | ${row.percentage}% | ${row.status}`);
    });
    doc.end();
  } catch (error) {
    next(error);
  }
}

export async function exportExcel(req, res, next) {
  try {
    await finalizeExpiredAttempts();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");
    sheet.columns = [
      { header: "Student", key: "student", width: 24 },
      { header: "Enrollment", key: "enrollment", width: 18 },
      { header: "Batch Year", key: "batchYear", width: 12 },
      { header: "Course", key: "course", width: 24 },
      { header: "Exam", key: "exam", width: 24 },
      { header: "Score", key: "score", width: 10 },
      { header: "Percentage", key: "percentage", width: 14 },
      { header: "Status", key: "status", width: 12 }
    ];
    sheet.addRows(await resultRows(req.query));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=exam-results.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

async function resultRows(filters = {}) {
  const query = { status: filters.status || { $nin: ["IN_PROGRESS", "RETAKE_GRANTED"] } };
  const studentIds = await studentIdsForFilters(filters);
  if (studentIds) query.studentId = { $in: studentIds };
  const courseExamIds = await examIdsForCourse(filters.courseId);
  if (courseExamIds) query.examId = { $in: courseExamIds };
  applyDateRange(query, "submittedAt", { from: filters.from, to: filters.to });
  const results = await ExamAttempt.find(query)
    .populate("studentId", "name enrollmentNumber batchYear")
    .populate({ path: "examId", populate: { path: "courseId" } });
  return results.map((result) => ({
    student: result.studentId?.name || "Unknown",
    enrollment: result.studentId?.enrollmentNumber || "",
    batchYear: result.studentId?.batchYear || "",
    course: result.examId?.courseId?.courseName || "",
    exam: result.examId?.title || "",
    score: result.score,
    percentage: result.percentage,
    status: result.status
  }));
}
