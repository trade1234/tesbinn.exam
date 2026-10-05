import { randomBytes } from "node:crypto";
import { Certificate } from "../models/Certificate.js";
import { Course } from "../models/Course.js";
import { Exam } from "../models/Exam.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { logActivity } from "../utils/logger.js";

const COMPANY_NAME = "Trade Ethiopia School of Business and Innovation";

function certificateCourseName(student, course) {
  const name = student?.trainingTaken || course?.courseName || "Professional Examination";
  return ["International Import Export", "International Import and Export"].includes(name)
    ? "International Trade and Import-Export"
    : name;
}

const COURSE_ACCESS_FIELDS = "courseName courseCode certificatesVisible certificatesActive certificateDeactivationReason";

// A certificate is visible/active only when both its own flag and its course's flag allow it.
export function certificateAccess(certificate, course) {
  const courseVisible = course?.certificatesVisible !== false;
  const courseActive = course?.certificatesActive !== false;
  const visible = certificate?.isVisible !== false && courseVisible;
  const active = certificate?.isActive !== false && courseActive;
  let reason = "";
  if (certificate?.isActive === false) reason = certificate.deactivationReason || "";
  if (!reason && !courseActive) reason = course?.certificateDeactivationReason || "";
  return { visible, active, courseVisible, courseActive, reason };
}

async function coursesByExamId(examIds) {
  const exams = await Exam.find({ _id: { $in: examIds } })
    .select("courseId")
    .populate("courseId", COURSE_ACCESS_FIELDS)
    .lean();
  return new Map(exams.map((exam) => [String(exam._id), exam.courseId || null]));
}

export async function isCertificateVisibleToStudent(certificate) {
  if (!certificate) return false;
  const examId = String(certificate.examId?._id || certificate.examId);
  const courses = await coursesByExamId([examId]);
  return certificateAccess(certificate, courses.get(examId)).visible;
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

    const courses = await coursesByExamId([...new Set(items.map((item) => String(item.examId)))]);
    items = items.map((item) => {
      const course = courses.get(String(item.examId)) || null;
      const access = certificateAccess(item, course);
      return {
        ...item,
        batchYear: item.batchYear || item.studentId?.batchYear || null,
        courseId: course?._id || null,
        courseCode: course?.courseCode || "",
        courseVisible: access.courseVisible,
        courseActive: access.courseActive,
        effectiveVisible: access.visible,
        effectiveActive: access.active
      };
    });

    if (req.user.role === "STUDENT") items = items.filter((item) => item.effectiveVisible);
    if (req.query.courseId) items = items.filter((item) => String(item.courseId) === String(req.query.courseId));

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

    const access = certificateAccess(item, item.examId?.courseId);
    if (!access.active) {
      return res.json({
        verified: false,
        deactivated: true,
        message: access.reason || "This certificate has been deactivated by the issuing institution and is no longer valid.",
        certificate: {
          certificateId: item.certificateId,
          studentName: item.studentName,
          courseName: item.courseName,
          companyName: item.companyName
        }
      });
    }

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
    if (req.user.role === "STUDENT" && !certificateAccess(item, item.examId?.courseId).visible) {
      return res.status(404).json({ message: "Certificate not found" });
    }

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
    if (req.user.role === "STUDENT") {
      q.studentId = req.user._id;
      const existing = await Certificate.findOne(q);
      if (!(await isCertificateVisibleToStudent(existing))) return res.status(404).json({ message: "Certificate not found" });
    }
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


export async function updateCertificateAccess(req, res, next) {
  try {
    const updates = {};
    if (typeof req.body.isVisible === "boolean") updates.isVisible = req.body.isVisible;
    if (typeof req.body.isActive === "boolean") {
      updates.isActive = req.body.isActive;
      updates.deactivationReason = req.body.isActive ? "" : String(req.body.reason || "").trim();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide isVisible or isActive" });
    updates.accessUpdatedAt = new Date();

    const item = await Certificate.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!item) return res.status(404).json({ message: "Certificate not found" });

    const changes = [];
    if ("isVisible" in updates) changes.push(updates.isVisible ? "visible" : "hidden");
    if ("isActive" in updates) changes.push(updates.isActive ? "activated" : "deactivated");
    await logActivity(req, "CERTIFICATE_ACCESS", `Certificate ${item.certificateId} (${item.studentName}) ${changes.join(", ")}`);
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function listCourseCertificateAccess(req, res, next) {
  try {
    const [courses, exams, stats] = await Promise.all([
      Course.find().select(COURSE_ACCESS_FIELDS).sort({ courseName: 1 }).lean(),
      Exam.find().select("courseId").lean(),
      Certificate.aggregate([
        {
          $group: {
            _id: "$examId",
            total: { $sum: 1 },
            hidden: { $sum: { $cond: [{ $eq: ["$isVisible", false] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } }
          }
        }
      ])
    ]);

    const courseByExam = new Map(exams.map((exam) => [String(exam._id), String(exam.courseId)]));
    const totals = new Map();
    for (const row of stats) {
      const courseId = courseByExam.get(String(row._id));
      if (!courseId) continue;
      const current = totals.get(courseId) || { total: 0, hidden: 0, inactive: 0 };
      current.total += row.total;
      current.hidden += row.hidden;
      current.inactive += row.inactive;
      totals.set(courseId, current);
    }

    res.json(courses.map((course) => {
      const counts = totals.get(String(course._id)) || { total: 0, hidden: 0, inactive: 0 };
      return {
        ...course,
        certificatesVisible: course.certificatesVisible !== false,
        certificatesActive: course.certificatesActive !== false,
        certificateCount: counts.total,
        hiddenCount: counts.hidden,
        inactiveCount: counts.inactive
      };
    }));
  } catch (e) {
    next(e);
  }
}

export async function updateCourseCertificateAccess(req, res, next) {
  try {
    const updates = {};
    if (typeof req.body.certificatesVisible === "boolean") updates.certificatesVisible = req.body.certificatesVisible;
    if (typeof req.body.certificatesActive === "boolean") {
      updates.certificatesActive = req.body.certificatesActive;
      updates.certificateDeactivationReason = req.body.certificatesActive ? "" : String(req.body.reason || "").trim();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide certificatesVisible or certificatesActive" });

    const course = await Course.findByIdAndUpdate(req.params.courseId, { $set: updates }, { new: true }).select(COURSE_ACCESS_FIELDS);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const changes = [];
    if ("certificatesVisible" in updates) changes.push(updates.certificatesVisible ? "visible" : "hidden");
    if ("certificatesActive" in updates) changes.push(updates.certificatesActive ? "activated" : "deactivated");
    await logActivity(req, "COURSE_CERTIFICATE_ACCESS", `Certificates for course ${course.courseName} ${changes.join(", ")}`);
    res.json(course);
  } catch (e) {
    next(e);
  }
}
