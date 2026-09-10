import { randomBytes } from "node:crypto";
import { Certificate } from "../models/Certificate.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";

const COMPANY_NAME = "Trade Ethiopia School of Business and Innovation";

function certificateCourseName(student, course) {
  const name = student?.trainingTaken || course?.courseName || "Professional Examination";
  return ["International Import Export", "International Import and Export"].includes(name)
    ? "International Trade and Import-Export"
    : name;
}

export async function issueCertificate({ attempt, student, exam, course, totalMarks }) {
  if (attempt.status !== "PASS" && attempt.status !== "FAIL") return null;
  const status = attempt.status || "PASS";

  let finalTotalMarks = Number(totalMarks);
  if (!Number.isFinite(finalTotalMarks) || finalTotalMarks <= 0) {
    const questions = await Question.find({ examId: exam?._id || exam });
    const qTotal = questions.reduce((acc, q) => acc + (q.marks || 0), 0);
    finalTotalMarks = qTotal > 0 ? qTotal : (exam?.totalMarks || 100);
  }
  finalTotalMarks = Math.round(finalTotalMarks * 100) / 100;

  const rawScore = Number(attempt.score) || 0;
  const finalScore = Math.round(rawScore * 100) / 100;
  const finalPercentage = finalTotalMarks > 0
    ? Math.round((finalScore / finalTotalMarks) * 10000) / 100
    : (Number(attempt.percentage) || 0);

  const studentObj = student?._id ? student : (await User.findById(student || attempt.studentId)) || {};
  const studentName = studentObj.name || attempt.studentId?.name || "Student";
  const enrollmentNumber = studentObj.enrollmentNumber || attempt.studentId?.enrollmentNumber || "";
  const batchYear = studentObj.batchYear || attempt.studentId?.batchYear;

  return Certificate.findOneAndUpdate(
    { attemptId: attempt._id },
    {
      $set: {
        companyName: COMPANY_NAME,
        courseName: certificateCourseName(studentObj, course),
        examName: exam?.title || "Final Examination",
        score: finalScore,
        totalMarks: finalTotalMarks,
        percentage: finalPercentage,
        status
      },
      $setOnInsert: {
        certificateId: "TES-" + new Date().getFullYear() + "-" + randomBytes(4).toString("hex").toUpperCase(),
        attemptId: attempt._id,
        studentId: studentObj._id || attempt.studentId,
        examId: exam?._id || exam,
        studentName,
        enrollmentNumber,
        batchYear,
        issueDate: attempt.submittedAt || new Date()
      }
    },
    { new: true, upsert: true }
  );
}

export async function listCertificates(req, res, next) {
  try {
    const completedQuery = req.user.role === "STUDENT"
      ? { status: { $in: ["PASS", "FAIL"] }, studentId: req.user._id }
      : { status: { $in: ["PASS", "FAIL"] } };

    const attempts = await ExamAttempt.find(completedQuery)
      .populate("studentId")
      .populate({ path: "examId", populate: { path: "courseId" } });

    await Promise.all(
      attempts
        .filter((a) => a.studentId && a.examId)
        .map(async (a) => {
          const questions = await Question.find({ examId: a.examId._id });
          const qTotal = questions.reduce((acc, q) => acc + (q.marks || 0), 0);
          const totalMarks = qTotal > 0 ? qTotal : a.examId.totalMarks;
          return issueCertificate({
            attempt: a,
            student: a.studentId,
            exam: a.examId,
            course: a.examId.courseId,
            totalMarks
          });
        })
    );

    const q = req.user.role === "STUDENT" ? { studentId: req.user._id } : {};
    const term = String(req.query.search || req.query.name || "").trim();
    if (term) {
      q.$or = [
        { studentName: { $regex: term, $options: "i" } },
        { enrollmentNumber: { $regex: term, $options: "i" } },
        { certificateId: { $regex: term, $options: "i" } }
      ];
    }
    if (req.query.course) q.courseName = { $regex: String(req.query.course), $options: "i" };
    let items = await Certificate.find(q)
      .populate("studentId", "batchYear")
      .sort({ issueDate: -1 })
      .lean();

    items = items.map((item) => ({
      ...item,
      batchYear: item.batchYear || item.studentId?.batchYear || null
    }));

    if (req.query.batchYear) {
      items = items.filter((item) => String(item.batchYear) === String(req.query.batchYear));
    }
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function verifyCertificate(req, res, next) {
  try {
    let item = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate("studentId")
      .populate({ path: "examId", populate: { path: "courseId" } });

    if (!item) return res.status(404).json({ verified: false, message: "Certificate not found or invalid" });

    if (item.attemptId) {
      const attempt = await ExamAttempt.findById(item.attemptId);
      if (attempt && (attempt.status === "PASS" || attempt.status === "FAIL") && item.examId) {
        const questions = await Question.find({ examId: item.examId._id || item.examId });
        const qTotal = questions.reduce((acc, q) => acc + (q.marks || 0), 0);
        const totalMarks = qTotal > 0 ? qTotal : (item.examId.totalMarks || item.totalMarks);
        item = await issueCertificate({
          attempt,
          student: item.studentId,
          exam: item.examId,
          course: item.examId.courseId,
          totalMarks
        });
      }
    }
    res.json({ verified: true, certificate: item });
  } catch (e) {
    next(e);
  }
}

export async function getCertificate(req, res, next) {
  try {
    const q = { _id: req.params.id };
    if (req.user.role === "STUDENT") q.studentId = req.user._id;
    let item = await Certificate.findOne(q)
      .populate("studentId")
      .populate({ path: "examId", populate: { path: "courseId" } });

    if (!item) return res.status(404).json({ message: "Certificate not found" });

    if (item.attemptId) {
      const attempt = await ExamAttempt.findById(item.attemptId);
      if (attempt && (attempt.status === "PASS" || attempt.status === "FAIL") && item.examId) {
        const questions = await Question.find({ examId: item.examId._id || item.examId });
        const qTotal = questions.reduce((acc, q) => acc + (q.marks || 0), 0);
        const totalMarks = qTotal > 0 ? qTotal : (item.examId.totalMarks || item.totalMarks);
        item = await issueCertificate({
          attempt,
          student: item.studentId || req.user,
          exam: item.examId,
          course: item.examId.courseId,
          totalMarks
        });
      }
    }
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function recordDownload(req, res, next) {
  try {
    const q = { _id: req.params.id };
    if (req.user.role === "STUDENT") q.studentId = req.user._id;
    const item = await Certificate.findOneAndUpdate(
      q,
      { $inc: { downloadCount: 1 }, $set: { lastDownloadedAt: new Date() } },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Certificate not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function updateCertificate(req, res, next) {
  try {
    const allowed = ["studentName", "courseName", "examName", "signatoryName", "companyName"];
    const updates = Object.fromEntries(
      allowed.filter((k) => typeof req.body[k] === "string").map((k) => [k, req.body[k].trim()])
    );
    const item = await Certificate.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Certificate not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function removeCertificate(req, res, next) {
  try {
    const item = await Certificate.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Certificate not found" });
    res.json({ message: "Certificate removed" });
  } catch (e) {
    next(e);
  }
}

