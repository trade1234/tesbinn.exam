import { z } from "zod";
import { Course } from "../models/Course.js";
import { Exam } from "../models/Exam.js";
import { canManageCourse } from "../utils/examOwnership.js";
import { logActivity } from "../utils/logger.js";
import { findAssignedCourseForStudent } from "../utils/courseAccess.js";

export const courseSchema = z.object({
  body: z.object({
    courseName: z.string().min(2),
    courseCode: z.string().min(2),
    description: z.string().optional()
  })
});

function duplicateCodeError(error) {
  if (error?.code !== 11000) return error;
  const conflict = new Error("A course with this code already exists");
  conflict.statusCode = 409;
  return conflict;
}

export async function listCourses(req, res, next) {
  try {
    const search = req.query.search;
    const query = search
      ? { $or: [{ courseName: new RegExp(search, "i") }, { courseCode: new RegExp(search, "i") }] }
      : {};
    if (req.user.role === "STUDENT") {
      const assignedCourse = await findAssignedCourseForStudent(req.user);
      if (!assignedCourse) return res.json([]);
      query._id = assignedCourse._id;
    }
    const courses = await Course.find(query).populate("createdBy", "name role").sort({ createdAt: -1 });
    const exams = await Exam.aggregate([{ $group: { _id: "$courseId", count: { $sum: 1 } } }]);
    const counts = new Map(exams.map((item) => [String(item._id), item.count]));
    res.json(courses.map((course) => ({ ...course.toObject(), examCount: counts.get(String(course._id)) || 0 })));
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await Course.create({ ...req.body, createdBy: req.user._id });
    await logActivity(req, "CREATE_COURSE", `Created course "${course.courseName}" (${course.courseCode})`);
    res.status(201).json(course);
  } catch (error) {
    next(duplicateCodeError(error));
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!canManageCourse(req.user, course)) return res.status(403).json({ message: "You can only edit courses you created" });
    course.set(req.body);
    await course.save();
    await logActivity(req, "UPDATE_COURSE", `Updated course "${course.courseName}" (${course.courseCode})`);
    res.json(course);
  } catch (error) {
    next(duplicateCodeError(error));
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    await Exam.deleteMany({ courseId: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

