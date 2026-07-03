import crypto from "crypto";
import { User } from "../models/User.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Answer } from "../models/Answer.js";
import { Exam } from "../models/Exam.js";
import { Course } from "../models/Course.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { logActivity } from "../utils/logger.js";

function generateStudentPassword() {
  return crypto.randomBytes(9).toString("base64url");
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
    const [courses, upcomingExams, recentResults] = await Promise.all([
      Course.find().limit(6).sort({ createdAt: -1 }),
      Exam.find({ startDate: { $gte: new Date() } }).populate("courseId").limit(6).sort({ startDate: 1 }),
      ExamAttempt.find({ studentId: req.user._id, status: { $ne: "IN_PROGRESS" } })
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
