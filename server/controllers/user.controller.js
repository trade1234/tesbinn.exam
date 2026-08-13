import crypto from "crypto";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { User } from "../models/User.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Answer } from "../models/Answer.js";
import { Exam } from "../models/Exam.js";
import { Course } from "../models/Course.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { findAssignedCourseForStudent } from "../utils/courseAccess.js";
import { logActivity } from "../utils/logger.js";

function generateStudentPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const characters = [pick(upper), pick(lower), pick(digits), pick(all), pick(all)];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

async function uniqueStudentPassword(studentId) {
  let password = generateStudentPassword();
  const query = { generatedPassword: password };
  if (studentId) query._id = { $ne: studentId };

  while (await User.exists(query)) {
    password = generateStudentPassword();
    query.generatedPassword = password;
  }

  return password;
}

export async function createStudent(req, res, next) {
  try {
    const { name, batchYear, trainingTaken } = req.body;

    // Check for unique numeric ID within this batch year
    const prefix = `TSE/`;
    const suffix = `/${batchYear}`;
    // Find the highest existing enrollment number for this batch year
    const existing = await User.find({
      enrollmentNumber: { $regex: new RegExp(`^TSE/\\d+/${batchYear}$`) }
    }).select("enrollmentNumber");

    let nextNum = 1;
    if (existing.length > 0) {
      const nums = existing.map((u) => {
        const match = u.enrollmentNumber.match(/^TSE\/(\d+)\//);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNum = Math.max(...nums) + 1;
    }

    const enrollmentNumber = `${prefix}${String(nextNum).padStart(4, "0")}${suffix}`;

    // Generate a simple email from enrollment number (for login purposes)
    const email = `${enrollmentNumber.replace(/\//g, "").toLowerCase()}@student.tse.edu`;
    const password = await uniqueStudentPassword();

    const student = await User.create({
      name,
      email,
      enrollmentNumber,
      batchYear,
      trainingTaken,
      password,
      generatedPassword: password,
      role: "STUDENT"
    });

    const sanitized = student.toObject();
    delete sanitized.password;
    res.status(201).json(sanitized);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A student with this enrollment number already exists" });
    }
    next(error);
  }
}

export async function listStudents(req, res, next) {
  try {
    const search = req.query.search;
    const query = { role: "STUDENT" };

    if (req.query.courseId) {
      const course = await Course.findById(req.query.courseId).select("courseName");
      if (!course) return res.json([]);
      query.trainingTaken = course.courseName;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { enrollmentNumber: new RegExp(search, "i") }
      ];
    }
    const students = await User.find(query).select("-password +generatedPassword").sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    next(error);
  }
}

async function studentRegistrationRows(filters = {}) {
  const query = { role: "STUDENT" };
  if (filters.courseId) {
    const course = await Course.findById(filters.courseId).select("courseName");
    if (!course) return [];
    query.trainingTaken = course.courseName;
  }
  if (filters.search) query.$or = [{ name: new RegExp(filters.search, "i") }, { email: new RegExp(filters.search, "i") }, { enrollmentNumber: new RegExp(filters.search, "i") }];
  const students = await User.find(query).select("name enrollmentNumber email batchYear trainingTaken isActive createdAt").sort({ createdAt: -1 }).lean();
  return students.map((student, index) => ({ number: index + 1, name: student.name || "", enrollmentNumber: student.enrollmentNumber || "", email: student.email || "", batchYear: student.batchYear || "", trainingTaken: student.trainingTaken || "", status: student.isActive ? "Active" : "Inactive", registeredAt: student.createdAt ? new Date(student.createdAt).toLocaleDateString("en-GB") : "" }));
}

export async function exportStudentRegistrationsPdf(req, res, next) {
  try {
    const rows = await studentRegistrationRows(req.query);
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=student-registrations.pdf");
    doc.pipe(res);
    doc.fontSize(18).text("Student Registrations", { align: "center" });
    doc.moveDown(0.3).fontSize(9).fillColor("#64748b").text(`Exported ${new Date().toLocaleString()} | ${rows.length} student${rows.length === 1 ? "" : "s"}`, { align: "center" });
    doc.moveDown().fillColor("#0f172a");
    rows.forEach((row) => {
      if (doc.y > doc.page.height - 55) doc.addPage();
      doc.fontSize(9).text(`${row.number}. ${row.name} | ${row.enrollmentNumber} | ${row.batchYear} | ${row.trainingTaken} | ${row.status} | Registered: ${row.registeredAt}`, { width: doc.page.width - 72 });
      doc.moveDown(0.35);
    });
    if (!rows.length) doc.fontSize(11).text("No student registrations found.", { align: "center" });
    doc.end();
  } catch (error) { next(error); }
}

export async function exportStudentRegistrationsExcel(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Student Registrations");
    sheet.columns = [{ header: "No.", key: "number", width: 8 }, { header: "Full Name", key: "name", width: 30 }, { header: "Student ID", key: "enrollmentNumber", width: 20 }, { header: "Email", key: "email", width: 32 }, { header: "Batch Year", key: "batchYear", width: 14 }, { header: "Training Taken", key: "trainingTaken", width: 30 }, { header: "Status", key: "status", width: 12 }, { header: "Registered Date", key: "registeredAt", width: 18 }];
    sheet.addRows(await studentRegistrationRows(req.query));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F88D2" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "H1" };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=student-registrations.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
}

export async function updateStudent(req, res, next) {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "STUDENT" }).select("+password +generatedPassword");
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.name = req.body.name;
    student.batchYear = req.body.batchYear;
    student.trainingTaken = req.body.trainingTaken;
    if (typeof req.body.isActive === "boolean") student.isActive = req.body.isActive;
    if (req.body.generatePassword) {
      const password = await uniqueStudentPassword(student._id);
      student.password = password;
      student.generatedPassword = password;
    }

    await student.save();
    const sanitized = student.toObject();
    delete sanitized.password;
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "STUDENT" });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const attempts = await ExamAttempt.find({ studentId: student._id }).select("_id");
    const attemptIds = attempts.map((attempt) => attempt._id);
    if (attemptIds.length) await Answer.deleteMany({ attemptId: { $in: attemptIds } });
    await ExamAttempt.deleteMany({ studentId: student._id });
    await User.deleteOne({ _id: student._id });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
export async function setStudentActive(req, res, next) {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "STUDENT" },
      { isActive: req.body.isActive },
      { new: true }
    ).select("-password +generatedPassword");
    if (!user) return res.status(404).json({ message: "Student not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function studentDashboard(req, res, next) {
  try {
    const assignedCourse = await findAssignedCourseForStudent(req.user);
    const courseQuery = assignedCourse ? { _id: assignedCourse._id } : { _id: null };
    const examQuery = assignedCourse
      ? { courseId: assignedCourse._id, startDate: { $gte: new Date() } }
      : { _id: null };

    const [courses, upcomingExams, recentResults] = await Promise.all([
      Course.find(courseQuery).limit(6).sort({ createdAt: -1 }),
      Exam.find(examQuery).populate("courseId").limit(6).sort({ startDate: 1 }),
      ExamAttempt.find({ studentId: req.user._id, status: { $nin: ["IN_PROGRESS", "RETAKE_GRANTED"] } })
        .populate({ path: "examId", populate: { path: "courseId" } })
        .limit(5)
        .sort({ submittedAt: -1 })
    ]);
    res.json({ profile: req.user, courses, upcomingExams, recentResults });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    user.password = req.body.newPassword;
    if (user.role === "STUDENT") user.generatedPassword = req.body.newPassword;
    await user.save();
    await logActivity(req, "PASSWORD_CHANGE", "Changed password successfully");
    res.json({ message: "Password changed" });
  } catch (error) {
    next(error);
  }
}

export async function listOnlineStudents(req, res, next) {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const onlineStudents = await User.find({
      role: "STUDENT",
      lastActive: { $gte: twoMinutesAgo }
    }).select("-password").sort({ lastActive: -1 });
    res.json(onlineStudents);
  } catch (error) {
    next(error);
  }
}

export async function listActivityLogs(req, res, next) {
  try {
    const logs = await ActivityLog.find()
      .populate("userId", "name email role enrollmentNumber")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(logs);
  } catch (error) {
    next(error);
  }
}
